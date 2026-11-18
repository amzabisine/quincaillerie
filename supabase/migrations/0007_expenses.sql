-- ============================================================
-- Expenses and net profit
--
-- Owner and managers record the shop's running costs (rent, salaries, transport...).
-- Owner and managers can add and correct expenses; only the owner can delete one.
-- Cashiers and storekeepers cannot see expenses or profit.
--
-- Reports now give: gross profit (sales - cost of goods), expenses, and
-- net profit (gross profit - expenses), for any period and month by month.
--
-- Run this once in Supabase > SQL Editor, after 0006. Safe to run again.
-- ============================================================

begin;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default (now() at time zone 'Africa/Lubumbashi')::date,  -- Bukavu date
  category text not null check (category in
    ('rent', 'salaries', 'transport', 'utilities', 'taxes', 'communication', 'repairs', 'other')),
  amount numeric(14,2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash', 'momo', 'airtel', 'mpesa', 'orange', 'bank')),
  note text not null default '',
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_spent_on_idx on public.expenses (spent_on);

alter table public.expenses enable row level security;
drop policy if exists "managers read expenses" on public.expenses;
drop policy if exists "managers add expenses" on public.expenses;
drop policy if exists "managers edit expenses" on public.expenses;
drop policy if exists "owner deletes expenses" on public.expenses;
create policy "managers read expenses" on public.expenses for select using (public.has_role(array['owner', 'manager']));
create policy "managers add expenses" on public.expenses for insert
  with check (public.has_role(array['owner', 'manager']) and created_by = auth.uid());
create policy "managers edit expenses" on public.expenses for update
  using (public.has_role(array['owner', 'manager'])) with check (public.has_role(array['owner', 'manager']));
create policy "owner deletes expenses" on public.expenses for delete using (public.has_role(array['owner']));

grant select, insert, update, delete on public.expenses to authenticated;
revoke all on public.expenses from anon;

-- Who recorded an expense cannot be changed afterwards.
create or replace function public.protect_expense_fields()
returns trigger language plpgsql as $$
begin
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists expenses_protect on public.expenses;
create trigger expenses_protect before update on public.expenses for each row execute function public.protect_expense_fields();

-- ------------------------------------------------------------
-- Sales report: same as before, plus expenses and net profit (owner and manager only).
-- Expenses are counted by their date (Bukavu time) inside the period.
-- ------------------------------------------------------------
create or replace function public.sales_report(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_can_see_profit boolean := public.has_role(array['owner', 'manager']);
  v_from_day date := (p_from at time zone 'Africa/Lubumbashi')::date;
  v_to_day date := (p_to at time zone 'Africa/Lubumbashi')::date;
  v_profit numeric;
  v_expenses numeric;
  v_result jsonb;
begin
  if not public.is_staff() then raise exception 'Not allowed'; end if;

  if v_can_see_profit then
    select coalesce(sum(total - cost_total), 0) into v_profit
      from public.sales where status = 'completed' and created_at between p_from and p_to;
    select coalesce(sum(amount), 0) into v_expenses
      from public.expenses where spent_on between v_from_day and v_to_day;
  end if;

  select jsonb_build_object(
    'sales_count', (select count(*) from public.sales where status = 'completed' and created_at between p_from and p_to),
    'sales_total', (select coalesce(sum(total), 0) from public.sales where status = 'completed' and created_at between p_from and p_to),
    'credit_given', (select coalesce(sum(credit_amount), 0) from public.sales where status = 'completed' and created_at between p_from and p_to),
    'profit', case when v_can_see_profit then v_profit else null end,
    'expenses_total', case when v_can_see_profit then v_expenses else null end,
    'net_profit', case when v_can_see_profit then v_profit - v_expenses else null end,
    'expenses_by_category', case when v_can_see_profit then
      (select coalesce(jsonb_object_agg(category, amount), '{}') from (
         select category, sum(amount) as amount from public.expenses
         where spent_on between v_from_day and v_to_day group by category) e)
      else null end,
    'by_method', (select coalesce(jsonb_object_agg(method, amount), '{}') from (
        select p.method, sum(p.amount) as amount from public.payments p
        left join public.sales s on s.id = p.sale_id
        where p.created_at between p_from and p_to and (s.id is null or s.status = 'completed')
        group by p.method) m),
    'debt_collected', (select coalesce(sum(amount), 0) from public.payments where kind = 'debt_payment' and created_at between p_from and p_to),
    'top_products', (select coalesce(jsonb_agg(t), '[]') from (
        select i.product_name as name, sum(i.quantity * i.factor) as base_quantity, sum(i.line_total) as revenue
        from public.sale_items i join public.sales s on s.id = i.sale_id
        where s.status = 'completed' and s.created_at between p_from and p_to
        group by i.product_name order by revenue desc limit 10) t),
    'stock_value', case when v_can_see_profit then
      (select coalesce(sum(stock * cost_price), 0) from public.products where is_active and stock > 0) else null end,
    'debts_total', (select coalesce(sum(balance), 0) from public.customers where balance > 0)
  ) into v_result;
  return v_result;
end;
$$;

-- ------------------------------------------------------------
-- Month by month: sales, gross profit, expenses, net profit (owner and manager only).
-- Returns the last p_months months, newest first, in Bukavu time.
-- ------------------------------------------------------------
create or replace function public.monthly_summary(p_months integer default 12)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_this_month date := date_trunc('month', (now() at time zone 'Africa/Lubumbashi'))::date;
  v_result jsonb;
begin
  if not public.has_role(array['owner', 'manager']) then raise exception 'Not allowed'; end if;
  if p_months is null or p_months < 1 or p_months > 60 then raise exception 'Invalid number of months'; end if;

  with months as (
    select (v_this_month - make_interval(months => n))::date as month_start
    from generate_series(0, p_months - 1) as n
  ),
  sales_by_month as (
    select date_trunc('month', created_at at time zone 'Africa/Lubumbashi')::date as month_start,
           count(*) as sales_count, sum(total) as sales_total, sum(total - cost_total) as gross_profit
    from public.sales
    where status = 'completed'
      and created_at >= ((v_this_month - make_interval(months => p_months - 1))::timestamp at time zone 'Africa/Lubumbashi')
    group by 1
  ),
  expenses_by_month as (
    select date_trunc('month', spent_on)::date as month_start, sum(amount) as expenses
    from public.expenses
    where spent_on >= (v_this_month - make_interval(months => p_months - 1))::date
    group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'month', to_char(m.month_start, 'YYYY-MM'),
           'sales_count', coalesce(s.sales_count, 0),
           'sales_total', coalesce(s.sales_total, 0),
           'gross_profit', coalesce(s.gross_profit, 0),
           'expenses', coalesce(e.expenses, 0),
           'net_profit', coalesce(s.gross_profit, 0) - coalesce(e.expenses, 0)
         ) order by m.month_start desc), '[]')
    into v_result
  from months m
  left join sales_by_month s on s.month_start = m.month_start
  left join expenses_by_month e on e.month_start = m.month_start;
  return v_result;
end;
$$;

revoke execute on function public.sales_report, public.monthly_summary from anon;
grant execute on function public.sales_report, public.monthly_summary to authenticated;

commit;
