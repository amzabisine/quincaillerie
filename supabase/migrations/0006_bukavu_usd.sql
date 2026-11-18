-- ============================================================
-- ETS PACIFIQUE, Bukavu (DR Congo)
--
-- 1. Money is now in US dollars WITH CENTS: every amount column becomes numeric(14,2)
--    (it was a whole number of RWF). Existing numbers are kept as they are: a product
--    that cost 12500 RWF now shows 12 500,00 $. Fix real prices in Products, or delete
--    the demo data.
-- 2. New mobile money: Vodacom M-Pesa and Orange Money (Airtel Money and MTN MoMo stay).
-- 3. Shop details: ETS PACIFIQUE, Bukavu, WhatsApp +250782203526, phone +243902673021.
--
-- Run this once in Supabase > SQL Editor, after 0001 to 0005. Safe to run again.
-- ============================================================

begin;

-- Views that show money columns must be dropped while the column types change.
drop view if exists public.catalog_units;
drop view if exists public.public_settings;
-- Same for this security rule (new customers must start with no debt); recreated below.
drop policy if exists "staff add customers" on public.customers;

-- ------------------------------------------------------------
-- 1. Money columns: whole numbers -> dollars and cents
-- ------------------------------------------------------------
alter table public.settings       alter column delivery_fee    type numeric(14,2);
alter table public.product_units  alter column retail_price    type numeric(14,2),
                                  alter column wholesale_price type numeric(14,2);
alter table public.customers      alter column balance         type numeric(14,2),
                                  alter column credit_limit    type numeric(14,2);
alter table public.sales          alter column subtotal        type numeric(14,2),
                                  alter column discount        type numeric(14,2),
                                  alter column total           type numeric(14,2),
                                  alter column paid_amount     type numeric(14,2),
                                  alter column credit_amount   type numeric(14,2);
alter table public.sale_items     alter column unit_price      type numeric(14,2),
                                  alter column line_total      type numeric(14,2);
alter table public.payments       alter column amount          type numeric(14,2);
alter table public.orders         alter column subtotal        type numeric(14,2),
                                  alter column delivery_fee    type numeric(14,2),
                                  alter column total           type numeric(14,2);
alter table public.order_items    alter column unit_price      type numeric(14,2),
                                  alter column line_total      type numeric(14,2);

create policy "staff add customers" on public.customers for insert
  with check (public.has_role(array['owner', 'manager', 'cashier']) and balance = 0);

-- ------------------------------------------------------------
-- 2. Payment methods
--    Counter / debt payments: cash, momo (MTN Rwanda), airtel, mpesa, orange, bank
--    Online orders: momo_code, airtel_code, mpesa_code, orange_code, on_collect
-- ------------------------------------------------------------
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check
  check (method in ('cash', 'momo', 'airtel', 'mpesa', 'orange', 'bank'));

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('momo_code', 'airtel_code', 'mpesa_code', 'orange_code', 'on_collect'));

alter table public.settings add column if not exists mpesa_code text;   -- Vodacom M-Pesa merchant (till) number
alter table public.settings add column if not exists orange_code text;  -- Orange Money merchant code
comment on column public.settings.momo_code is 'MTN MoMo Pay merchant code (Rwanda)';
comment on column public.settings.tin is 'Tax / company numbers printed on receipts (NIF, RCCM, Id. Nat.)';

-- ------------------------------------------------------------
-- 3. Shop details for Bukavu
-- ------------------------------------------------------------
alter table public.settings alter column address set default 'Bukavu';
alter table public.settings alter column delivery_note set default 'Livraison dans Bukavu';
alter table public.settings alter column shop_name set default 'ETS PACIFIQUE';

update public.settings set
  shop_name = 'ETS PACIFIQUE',
  whatsapp = '+250782203526',
  phone = '+243902673021',
  address = case when address ilike '%rubavu%' or address ilike '%gisenyi%' then 'Bukavu' else address end,
  tagline = replace(replace(tagline, 'Gisenyi', 'Bukavu'), 'Rubavu', 'Bukavu'),
  delivery_note = replace(replace(delivery_note, 'Gisenyi', 'Bukavu'), 'Rubavu', 'Bukavu'),
  momo_name = case when momo_name ilike '%quincaillerie kivu%' then 'ETS PACIFIQUE' else momo_name end,
  updated_at = now()
where id = 1;

-- ------------------------------------------------------------
-- Public views (same as before, plus the new merchant codes)
-- ------------------------------------------------------------
create view public.catalog_units as
  select u.id, u.product_id, u.unit, u.factor, u.retail_price, u.is_default
  from public.product_units u
  join public.products p on p.id = u.product_id
  where p.is_active and p.show_online and u.show_online;

create view public.public_settings as
  select shop_name, tagline, phone, whatsapp, email, address, momo_code, momo_name, airtel_code, mpesa_code, orange_code,
         pickup_enabled, delivery_enabled, delivery_fee, delivery_note
  from public.settings;

grant select on public.catalog_units, public.public_settings to anon, authenticated;

-- ------------------------------------------------------------
-- Functions with money parameters or variables: recreated with cents.
-- Old versions took whole numbers; drop them so there is only one version of each.
-- ------------------------------------------------------------
drop function if exists public.complete_sale(jsonb, uuid, text, integer, jsonb, text, uuid);
drop function if exists public.receive_debt_payment(uuid, integer, text, text);
drop function if exists public.set_delivery_fee(uuid, integer);

-- Complete a counter sale (or turn an online order into a sale).
-- p_items:    [{ "unit_id": uuid, "quantity": number }]
-- p_payment:  { "method": "cash|momo|airtel|mpesa|orange|bank", "amount": number, "reference": text } or null
-- Whatever is not paid goes on the customer's credit (requires a customer).
create or replace function public.complete_sale(
  p_items jsonb,
  p_customer_id uuid default null,
  p_customer_name text default '',
  p_discount numeric default 0,
  p_payment jsonb default null,
  p_note text default '',
  p_order_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_customer public.customers;
  v_level text := 'retail';
  v_sale_id uuid;
  v_item jsonb;
  v_unit public.product_units;
  v_product public.products;
  v_qty numeric;
  v_base_qty numeric;
  v_price numeric;
  v_line numeric;
  v_subtotal numeric := 0;
  v_cost numeric := 0;
  v_discount numeric := round(coalesce(p_discount, 0), 2);
  v_total numeric;
  v_paid numeric := 0;
  v_credit numeric;
  v_order public.orders;
begin
  if not public.has_role(array['owner', 'manager', 'cashier']) then
    raise exception 'Not allowed';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'The sale is empty';
  end if;

  if p_customer_id is not null then
    select * into v_customer from public.customers where id = p_customer_id;
    if v_customer.id is null then raise exception 'Customer not found'; end if;
    v_level := v_customer.type;
  end if;

  if p_order_id is not null then
    select * into v_order from public.orders where id = p_order_id for update;
    if v_order.id is null or v_order.sale_id is not null or v_order.status = 'cancelled' then
      raise exception 'Order cannot be completed';
    end if;
  end if;

  insert into public.sales (channel, cashier_id, customer_id, customer_name, price_level, subtotal, discount, total, note, order_id)
  values (case when p_order_id is null then 'pos' else 'online' end, auth.uid(), p_customer_id,
          coalesce(v_customer.name, nullif(p_customer_name, ''), coalesce(v_order.customer_name, '')),
          v_level, 0, 0, 0, coalesce(p_note, ''), p_order_id)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then raise exception 'Invalid quantity'; end if;

    select * into v_unit from public.product_units where id = (v_item->>'unit_id')::uuid;
    if v_unit.id is null then raise exception 'Unknown product unit'; end if;
    select * into v_product from public.products where id = v_unit.product_id for update;
    if not v_product.is_active then raise exception 'Product % is not active', v_product.name; end if;

    v_base_qty := v_qty * v_unit.factor;
    if v_product.stock < v_base_qty then
      raise exception 'Not enough stock for % (available: % %)', v_product.name, v_product.stock, v_product.base_unit;
    end if;

    -- online orders keep the price the customer saw; counter sales use the customer's price level
    if p_order_id is not null then
      select unit_price into v_price from public.order_items where order_id = p_order_id and unit_id = v_unit.id limit 1;
    end if;
    if v_price is null then
      v_price := case when v_level = 'wholesale' then coalesce(v_unit.wholesale_price, v_unit.retail_price) else v_unit.retail_price end;
    end if;
    v_line := round(v_price * v_qty, 2);

    insert into public.sale_items (sale_id, product_id, unit_id, product_name, unit, quantity, factor, unit_price, line_total, cost_total)
    values (v_sale_id, v_product.id, v_unit.id, v_product.name, v_unit.unit, v_qty, v_unit.factor, v_price, v_line,
            v_base_qty * v_product.cost_price);

    update public.products set stock = stock - v_base_qty, updated_at = now() where id = v_product.id;
    insert into public.stock_movements (product_id, type, quantity, stock_after, reference_id, created_by)
    values (v_product.id, 'sale', -v_base_qty, v_product.stock - v_base_qty, v_sale_id, auth.uid());

    v_subtotal := v_subtotal + v_line;
    v_cost := v_cost + v_base_qty * v_product.cost_price;
    v_price := null;
  end loop;

  if v_discount < 0 or v_discount > v_subtotal then raise exception 'Invalid discount'; end if;
  v_total := v_subtotal - v_discount + coalesce(v_order.delivery_fee, 0);

  if p_payment is not null and coalesce((p_payment->>'amount')::numeric, 0) > 0 then
    if p_payment->>'method' not in ('cash', 'momo', 'airtel', 'mpesa', 'orange', 'bank') then
      raise exception 'Invalid payment method';
    end if;
    v_paid := least(round((p_payment->>'amount')::numeric, 2), v_total);
    insert into public.payments (kind, sale_id, customer_id, method, amount, reference, received_by)
    values ('sale', v_sale_id, p_customer_id, p_payment->>'method', v_paid, nullif(p_payment->>'reference', ''), auth.uid());
  end if;

  v_credit := v_total - v_paid;
  if v_credit > 0 then
    if p_customer_id is null then raise exception 'Choose a customer to sell on credit'; end if;
    if v_customer.credit_limit > 0 and v_customer.balance + v_credit > v_customer.credit_limit then
      raise exception 'Credit limit reached for % (owes % $)', v_customer.name, v_customer.balance;
    end if;
    update public.customers set balance = balance + v_credit where id = p_customer_id;
  end if;

  update public.sales set subtotal = v_subtotal, discount = v_discount, total = v_total,
         paid_amount = v_paid, credit_amount = v_credit, cost_total = v_cost
  where id = v_sale_id;

  if p_order_id is not null then
    update public.orders set sale_id = v_sale_id, status = 'completed', updated_at = now() where id = p_order_id;
  end if;

  return v_sale_id;
end;
$$;

-- A customer pays back part or all of their debt.
create or replace function public.receive_debt_payment(
  p_customer_id uuid, p_amount numeric, p_method text, p_reference text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_customer public.customers;
  v_amount numeric := round(p_amount, 2);
begin
  if not public.has_role(array['owner', 'manager', 'cashier']) then raise exception 'Not allowed'; end if;
  select * into v_customer from public.customers where id = p_customer_id for update;
  if v_customer.id is null then raise exception 'Customer not found'; end if;
  if v_amount is null or v_amount <= 0 or v_amount > v_customer.balance then
    raise exception 'Amount must be between 0.01 and % $', v_customer.balance;
  end if;
  insert into public.payments (kind, customer_id, method, amount, reference, received_by)
  values ('debt_payment', p_customer_id, p_method, v_amount, nullif(p_reference, ''), auth.uid());
  update public.customers set balance = balance - v_amount where id = p_customer_id;
end;
$$;

-- Staff set the delivery fee for the customer's location. 0 = free delivery.
create or replace function public.set_delivery_fee(p_order_id uuid, p_fee numeric)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
  v_fee numeric := round(p_fee, 2);
begin
  if not public.has_role(array['owner', 'manager', 'cashier']) then raise exception 'Not allowed'; end if;
  if v_fee is null or v_fee < 0 or v_fee > 100000 then raise exception 'Invalid delivery fee'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'Order not found'; end if;
  if v_order.fulfilment <> 'delivery' then raise exception 'This order is not a delivery'; end if;
  if v_order.sale_id is not null or v_order.status = 'cancelled' then raise exception 'Order is already closed'; end if;

  update public.orders
     set delivery_fee = v_fee, delivery_fee_set = true, total = v_order.subtotal + v_fee, updated_at = now()
   where id = p_order_id;
end;
$$;

-- Online order: prices come from the catalog, in dollars and cents. Delivery fee is set later by staff.
create or replace function public.place_order(
  p_name text, p_phone text, p_fulfilment text, p_address text, p_note text,
  p_payment_method text, p_payment_reference text, p_items jsonb
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_settings public.settings;
  v_order_id uuid;
  v_code text;
  v_item jsonb;
  v_unit record;
  v_qty numeric;
  v_subtotal numeric := 0;
  v_line numeric;
begin
  select * into v_settings from public.settings where id = 1;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then raise exception 'Name and phone are required'; end if;
  if p_fulfilment = 'delivery' and (not v_settings.delivery_enabled or coalesce(trim(p_address), '') = '') then
    raise exception 'Delivery address is required';
  end if;
  if p_fulfilment = 'pickup' and not v_settings.pickup_enabled then raise exception 'Pickup is not available'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Invalid cart';
  end if;

  v_code := 'CMD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.orders (code, customer_name, customer_phone, fulfilment, address, note, subtotal, delivery_fee,
                             delivery_fee_set, total, payment_method, payment_reference, payment_status)
  values (v_code, trim(p_name), trim(p_phone), p_fulfilment, coalesce(p_address, ''), left(coalesce(p_note, ''), 500), 0, 0,
          p_fulfilment = 'pickup', 0,
          p_payment_method, nullif(trim(coalesce(p_payment_reference, '')), ''),
          case when coalesce(trim(p_payment_reference), '') <> '' then 'claimed' else 'unpaid' end)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 or v_qty > 10000 then raise exception 'Invalid quantity'; end if;
    select u.id, u.unit, u.retail_price, u.product_id, p.name into v_unit
      from public.catalog_units u join public.catalog_products p on p.id = u.product_id
      where u.id = (v_item->>'unit_id')::uuid;
    if v_unit.id is null then raise exception 'A product in your cart is no longer available'; end if;
    v_line := round(v_unit.retail_price * v_qty, 2);
    insert into public.order_items (order_id, product_id, unit_id, product_name, unit, quantity, unit_price, line_total)
    values (v_order_id, v_unit.product_id, v_unit.id, v_unit.name, v_unit.unit, v_qty, v_unit.retail_price, v_line);
    v_subtotal := v_subtotal + v_line;
  end loop;

  update public.orders set subtotal = v_subtotal, total = v_subtotal where id = v_order_id;
  return v_code;
end;
$$;

-- Same permissions as before
revoke execute on function public.complete_sale, public.receive_debt_payment, public.set_delivery_fee from anon;
grant execute on function public.complete_sale, public.receive_debt_payment, public.set_delivery_fee to authenticated;
grant execute on function public.place_order, public.track_order to anon, authenticated;

commit;
