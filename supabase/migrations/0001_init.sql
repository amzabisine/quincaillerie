-- Quincaillerie management system: database schema
-- Run in Supabase: SQL Editor > paste everything > Run
--
-- Design rules:
--  * Stock is stored per product in its BASE unit (e.g. kg for nails, piece for rods).
--  * Products can be sold in several units (product_units) with a conversion factor
--    (e.g. "box" = 25 kg). Each unit has its own retail and wholesale price.
--  * Every stock change is written to stock_movements, so nothing disappears silently.
--  * Sales, stock-in, adjustments, debt payments and online orders go through
--    database functions (RPC). They run in one transaction and calculate prices
--    on the server, so the browser can never fake a price or a stock level.

create extension if not exists pgcrypto;

-- ============================================================
-- STAFF (only staff have accounts; customers order without one)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'cashier' check (role in ('owner', 'manager', 'cashier', 'storekeeper')),
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.staff_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

create or replace function public.has_role(roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.staff_role() = any(roles), false);
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.staff_role() is not null;
$$;

-- The very first account becomes the owner. Later accounts are created by the owner.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  chosen text := coalesce(new.raw_user_meta_data->>'role', 'cashier');
begin
  if not exists (select 1 from public.profiles) then
    chosen := 'owner';
  elsif chosen not in ('manager', 'cashier', 'storekeeper') then
    chosen := 'cashier';
  end if;
  insert into public.profiles (id, full_name, role, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), chosen, new.raw_user_meta_data->>'phone');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- SHOP SETTINGS (single row)
-- ============================================================
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  shop_name text not null default 'Quincaillerie',
  tagline text not null default '',
  phone text,
  whatsapp text,
  email text,
  address text not null default 'Gisenyi, Rubavu',
  tin text,                                   -- RRA TIN, printed on receipts
  momo_code text,                             -- MTN MoMo Pay merchant code
  momo_name text,                             -- name shown when paying
  airtel_code text,                           -- Airtel Money merchant code
  pickup_enabled boolean not null default true,
  delivery_enabled boolean not null default true,
  delivery_fee integer not null default 2000,
  delivery_note text not null default 'Livraison dans Rubavu',
  receipt_footer text not null default 'Merci pour votre achat !',
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);

-- ============================================================
-- CATALOG
-- ============================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_fr text not null,
  name_en text not null,
  name_sw text not null,
  name_rw text not null default '',
  icon text not null default 'package',      -- lucide icon name
  sort smallint not null default 0
);

insert into public.categories (name_fr, name_en, name_sw, name_rw, icon, sort) values
  ('Ciment et maçonnerie', 'Cement and masonry', 'Saruji na ujenzi', 'Sima n’ubwubatsi', 'brick-wall', 1),
  ('Fer et tôles', 'Iron and roofing sheets', 'Chuma na mabati', 'Ibyuma n’amabati', 'layers', 2),
  ('Peinture', 'Paint', 'Rangi', 'Irangi', 'paint-bucket', 3),
  ('Plomberie', 'Plumbing', 'Mabomba', 'Ibikoresho by’amazi', 'droplets', 4),
  ('Électricité', 'Electrical', 'Umeme', 'Amashanyarazi', 'zap', 5),
  ('Outils', 'Tools', 'Zana', 'Ibikoresho by’intoki', 'hammer', 6),
  ('Quincaillerie générale', 'General hardware', 'Vifaa vya jumla', 'Ibikoresho rusange', 'wrench', 7),
  ('Bois et menuiserie', 'Wood and carpentry', 'Mbao na useremala', 'Imbaho n’ububaji', 'tree-pine', 8);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  sku text unique,
  base_unit text not null default 'piece',    -- unit stock is counted in
  stock numeric(14,3) not null default 0,     -- in base units
  cost_price numeric(14,2) not null default 0,-- average cost per base unit
  low_stock_level numeric(14,3) not null default 5,
  image_url text,
  is_active boolean not null default true,
  show_online boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id) where is_active;

create table public.product_units (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  unit text not null,                          -- see src/lib/units.ts
  factor numeric(14,3) not null default 1 check (factor > 0), -- base units in one of this unit
  retail_price integer not null check (retail_price >= 0),
  wholesale_price integer check (wholesale_price >= 0),
  barcode text unique,
  is_default boolean not null default false,
  show_online boolean not null default true,
  unique (product_id, unit)
);

-- ============================================================
-- CUSTOMERS AND CREDIT (ideni)
-- ============================================================
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text unique,
  type text not null default 'retail' check (type in ('retail', 'wholesale')), -- wholesale = fundi/contractor price
  balance integer not null default 0,           -- what the customer owes the shop
  credit_limit integer not null default 0,      -- 0 = no limit
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- ============================================================
-- SALES
-- ============================================================
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  number bigserial unique,                     -- receipt number
  channel text not null default 'pos' check (channel in ('pos', 'online')),
  cashier_id uuid references public.profiles(id),
  customer_id uuid references public.customers(id),
  customer_name text not null default '',
  price_level text not null default 'retail' check (price_level in ('retail', 'wholesale')),
  subtotal integer not null,
  discount integer not null default 0,
  total integer not null,
  paid_amount integer not null default 0,
  credit_amount integer not null default 0,    -- added to customer balance
  cost_total numeric(14,2) not null default 0, -- for profit reports
  status text not null default 'completed' check (status in ('completed', 'voided')),
  void_reason text,
  order_id uuid,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index sales_created_idx on public.sales (created_at desc);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  unit_id uuid references public.product_units(id) on delete set null,
  product_name text not null,
  unit text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  factor numeric(14,3) not null,
  unit_price integer not null,
  line_total integer not null,
  cost_total numeric(14,2) not null default 0
);
create index sale_items_sale_idx on public.sale_items (sale_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('sale', 'debt_payment')),
  sale_id uuid references public.sales(id) on delete cascade,
  customer_id uuid references public.customers(id),
  method text not null check (method in ('cash', 'momo', 'airtel', 'bank')),
  amount integer not null check (amount > 0),
  reference text,                              -- MoMo / Airtel transaction ID
  received_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index payments_created_idx on public.payments (created_at desc);

-- ============================================================
-- STOCK HISTORY
-- ============================================================
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  type text not null check (type in ('purchase', 'sale', 'adjustment', 'damage', 'return', 'count', 'void')),
  quantity numeric(14,3) not null,             -- signed, in base units
  stock_after numeric(14,3) not null,
  unit_cost numeric(14,2),                     -- per base unit (purchases)
  supplier text,
  reference_id uuid,                           -- sale id etc.
  note text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);

-- ============================================================
-- ONLINE ORDERS (customers order without an account)
-- ============================================================
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                   -- e.g. CMD-7F3K9A, used for tracking
  customer_name text not null,
  customer_phone text not null,
  fulfilment text not null check (fulfilment in ('pickup', 'delivery')),
  address text not null default '',
  note text not null default '',
  subtotal integer not null,
  delivery_fee integer not null default 0,
  total integer not null,
  payment_method text not null check (payment_method in ('momo_code', 'airtel_code', 'on_collect')),
  payment_reference text,                      -- transaction ID typed by customer
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'claimed', 'confirmed')),
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
  sale_id uuid references public.sales(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  unit_id uuid references public.product_units(id) on delete set null,
  product_name text not null,
  unit text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price integer not null,
  line_total integer not null
);

alter table public.sales add constraint sales_order_fk foreign key (order_id) references public.orders(id);

-- ============================================================
-- PUBLIC CATALOG VIEWS (no cost prices, no exact stock)
-- Views run with the owner's rights, so the online store can read them
-- while the products table itself stays staff-only.
-- ============================================================
create view public.catalog_products as
  select p.id, p.name, p.description, p.category_id, p.base_unit, p.image_url, p.created_at,
         case when p.stock <= 0 then 'out'
              when p.stock <= p.low_stock_level then 'low'
              else 'in' end as stock_status
  from public.products p
  where p.is_active and p.show_online;

create view public.catalog_units as
  select u.id, u.product_id, u.unit, u.factor, u.retail_price, u.is_default
  from public.product_units u
  join public.products p on p.id = u.product_id
  where p.is_active and p.show_online and u.show_online;

create view public.public_settings as
  select shop_name, tagline, phone, whatsapp, email, address, momo_code, momo_name, airtel_code,
         pickup_enabled, delivery_enabled, delivery_fee, delivery_note
  from public.settings;

grant select on public.catalog_products, public.catalog_units, public.public_settings to anon, authenticated;

-- ============================================================
-- FUNCTIONS: SALES
-- ============================================================

-- Complete a counter sale (or turn an online order into a sale).
-- p_items:    [{ "unit_id": uuid, "quantity": number }]
-- p_payment:  { "method": "cash|momo|airtel|bank", "amount": int, "reference": text } or null
-- Whatever is not paid goes on the customer's credit (requires a customer).
create or replace function public.complete_sale(
  p_items jsonb,
  p_customer_id uuid default null,
  p_customer_name text default '',
  p_discount integer default 0,
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
  v_price integer;
  v_line integer;
  v_subtotal integer := 0;
  v_cost numeric := 0;
  v_total integer;
  v_paid integer := 0;
  v_credit integer;
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
    v_line := round(v_price * v_qty);

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

  if coalesce(p_discount, 0) < 0 or p_discount > v_subtotal then raise exception 'Invalid discount'; end if;
  v_total := v_subtotal - coalesce(p_discount, 0) + coalesce(v_order.delivery_fee, 0);

  if p_payment is not null and coalesce((p_payment->>'amount')::integer, 0) > 0 then
    v_paid := least((p_payment->>'amount')::integer, v_total);
    insert into public.payments (kind, sale_id, customer_id, method, amount, reference, received_by)
    values ('sale', v_sale_id, p_customer_id, p_payment->>'method', v_paid, nullif(p_payment->>'reference', ''), auth.uid());
  end if;

  v_credit := v_total - v_paid;
  if v_credit > 0 then
    if p_customer_id is null then raise exception 'Choose a customer to sell on credit'; end if;
    if v_customer.credit_limit > 0 and v_customer.balance + v_credit > v_customer.credit_limit then
      raise exception 'Credit limit reached for % (owes % RWF)', v_customer.name, v_customer.balance;
    end if;
    update public.customers set balance = balance + v_credit where id = p_customer_id;
  end if;

  update public.sales set subtotal = v_subtotal, discount = coalesce(p_discount, 0), total = v_total,
         paid_amount = v_paid, credit_amount = v_credit, cost_total = v_cost
  where id = v_sale_id;

  if p_order_id is not null then
    update public.orders set sale_id = v_sale_id, status = 'completed', updated_at = now() where id = p_order_id;
  end if;

  return v_sale_id;
end;
$$;

-- Cancel a sale: stock goes back, credit is removed. Owner and manager only.
create or replace function public.void_sale(p_sale_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_sale public.sales;
  v_item public.sale_items;
  v_stock numeric;
begin
  if not public.has_role(array['owner', 'manager']) then raise exception 'Not allowed'; end if;
  select * into v_sale from public.sales where id = p_sale_id for update;
  if v_sale.id is null or v_sale.status = 'voided' then raise exception 'Sale cannot be voided'; end if;

  for v_item in select * from public.sale_items where sale_id = p_sale_id loop
    update public.products set stock = stock + v_item.quantity * v_item.factor where id = v_item.product_id
      returning stock into v_stock;
    insert into public.stock_movements (product_id, type, quantity, stock_after, reference_id, note, created_by)
    values (v_item.product_id, 'void', v_item.quantity * v_item.factor, v_stock, p_sale_id, coalesce(p_reason, ''), auth.uid());
  end loop;

  if v_sale.credit_amount > 0 and v_sale.customer_id is not null then
    update public.customers set balance = balance - v_sale.credit_amount where id = v_sale.customer_id;
  end if;
  update public.sales set status = 'voided', void_reason = p_reason where id = p_sale_id;
end;
$$;

-- ============================================================
-- FUNCTIONS: STOCK
-- ============================================================

-- Stock in (purchase from a supplier). Quantity and cost are in the chosen unit.
-- Updates the average cost price.
create or replace function public.stock_in(
  p_unit_id uuid, p_quantity numeric, p_unit_cost numeric, p_supplier text default null, p_note text default ''
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_unit public.product_units;
  v_product public.products;
  v_base_qty numeric;
  v_cost_per_base numeric;
  v_new_stock numeric;
begin
  if not public.has_role(array['owner', 'manager', 'storekeeper']) then raise exception 'Not allowed'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Invalid quantity'; end if;

  select * into v_unit from public.product_units where id = p_unit_id;
  select * into v_product from public.products where id = v_unit.product_id for update;
  if v_product.id is null then raise exception 'Unknown product'; end if;

  v_base_qty := p_quantity * v_unit.factor;
  v_cost_per_base := coalesce(p_unit_cost, 0) / v_unit.factor;
  v_new_stock := v_product.stock + v_base_qty;

  update public.products set
    cost_price = case when v_new_stock > 0 and p_unit_cost is not null
      then ((greatest(v_product.stock, 0) * v_product.cost_price) + (v_base_qty * v_cost_per_base)) / (greatest(v_product.stock, 0) + v_base_qty)
      else cost_price end,
    stock = v_new_stock,
    updated_at = now()
  where id = v_product.id;

  insert into public.stock_movements (product_id, type, quantity, stock_after, unit_cost, supplier, note, created_by)
  values (v_product.id, 'purchase', v_base_qty, v_new_stock, v_cost_per_base, nullif(p_supplier, ''), coalesce(p_note, ''), auth.uid());
end;
$$;

-- Adjust stock: damage/loss (negative), returns (positive), or a physical count (set exact level).
create or replace function public.adjust_stock(
  p_product_id uuid, p_type text, p_quantity numeric, p_note text default ''
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_product public.products;
  v_delta numeric;
begin
  if not public.has_role(array['owner', 'manager', 'storekeeper']) then raise exception 'Not allowed'; end if;
  if p_type not in ('adjustment', 'damage', 'return', 'count') then raise exception 'Invalid type'; end if;
  select * into v_product from public.products where id = p_product_id for update;
  if v_product.id is null then raise exception 'Unknown product'; end if;

  v_delta := case p_type
    when 'count' then p_quantity - v_product.stock       -- p_quantity = counted stock
    when 'damage' then -abs(p_quantity)
    when 'return' then abs(p_quantity)
    else p_quantity end;                                  -- adjustment: signed
  if v_product.stock + v_delta < 0 then raise exception 'Stock cannot go below zero'; end if;

  update public.products set stock = stock + v_delta, updated_at = now() where id = p_product_id;
  insert into public.stock_movements (product_id, type, quantity, stock_after, note, created_by)
  values (p_product_id, p_type, v_delta, v_product.stock + v_delta, coalesce(p_note, ''), auth.uid());
end;
$$;

-- ============================================================
-- FUNCTIONS: CREDIT
-- ============================================================
create or replace function public.receive_debt_payment(
  p_customer_id uuid, p_amount integer, p_method text, p_reference text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_customer public.customers;
begin
  if not public.has_role(array['owner', 'manager', 'cashier']) then raise exception 'Not allowed'; end if;
  select * into v_customer from public.customers where id = p_customer_id for update;
  if v_customer.id is null then raise exception 'Customer not found'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > v_customer.balance then
    raise exception 'Amount must be between 1 and % RWF', v_customer.balance;
  end if;
  insert into public.payments (kind, customer_id, method, amount, reference, received_by)
  values ('debt_payment', p_customer_id, p_method, p_amount, nullif(p_reference, ''), auth.uid());
  update public.customers set balance = balance - p_amount where id = p_customer_id;
end;
$$;

-- ============================================================
-- FUNCTIONS: ONLINE ORDERS (callable without login)
-- ============================================================

-- p_items: [{ "unit_id": uuid, "quantity": number }]
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
  v_subtotal integer := 0;
  v_line integer;
  v_fee integer := 0;
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
  if p_fulfilment = 'delivery' then v_fee := v_settings.delivery_fee; end if;

  v_code := 'CMD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.orders (code, customer_name, customer_phone, fulfilment, address, note, subtotal, delivery_fee, total,
                             payment_method, payment_reference, payment_status)
  values (v_code, trim(p_name), trim(p_phone), p_fulfilment, coalesce(p_address, ''), left(coalesce(p_note, ''), 500), 0, v_fee, 0,
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
    v_line := round(v_unit.retail_price * v_qty);
    insert into public.order_items (order_id, product_id, unit_id, product_name, unit, quantity, unit_price, line_total)
    values (v_order_id, v_unit.product_id, v_unit.id, v_unit.name, v_unit.unit, v_qty, v_unit.retail_price, v_line);
    v_subtotal := v_subtotal + v_line;
  end loop;

  update public.orders set subtotal = v_subtotal, total = v_subtotal + v_fee where id = v_order_id;
  return v_code;
end;
$$;

-- Customers track their order with the code and their phone number.
create or replace function public.track_order(p_code text, p_phone text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'code', o.code, 'status', o.status, 'payment_status', o.payment_status, 'payment_method', o.payment_method,
    'fulfilment', o.fulfilment, 'subtotal', o.subtotal, 'delivery_fee', o.delivery_fee, 'total', o.total,
    'created_at', o.created_at,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('name', i.product_name, 'unit', i.unit, 'quantity', i.quantity, 'line_total', i.line_total)), '[]')
              from public.order_items i where i.order_id = o.id)
  )
  from public.orders o
  where o.code = upper(trim(p_code))
    and length(regexp_replace(p_phone, '\D', '', 'g')) >= 9
    and regexp_replace(o.customer_phone, '\D', '', 'g') like '%' || right(regexp_replace(p_phone, '\D', '', 'g'), 9);
$$;

-- ============================================================
-- FUNCTIONS: REPORTS
-- ============================================================
create or replace function public.sales_report(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_can_see_profit boolean := public.has_role(array['owner', 'manager']);
  v_result jsonb;
begin
  if not public.is_staff() then raise exception 'Not allowed'; end if;
  select jsonb_build_object(
    'sales_count', (select count(*) from public.sales where status = 'completed' and created_at between p_from and p_to),
    'sales_total', (select coalesce(sum(total), 0) from public.sales where status = 'completed' and created_at between p_from and p_to),
    'credit_given', (select coalesce(sum(credit_amount), 0) from public.sales where status = 'completed' and created_at between p_from and p_to),
    'profit', case when v_can_see_profit then
      (select coalesce(sum(total - cost_total), 0) from public.sales where status = 'completed' and created_at between p_from and p_to)
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

-- ============================================================
-- ROW LEVEL SECURITY
-- Staff read everything; direct writes are limited by role.
-- Sales, stock changes and debt payments only happen through the functions above.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_units enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments enable row level security;
alter table public.stock_movements enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "staff read profiles" on public.profiles for select using (public.is_staff() or id = auth.uid());
create policy "owner manages staff" on public.profiles for update using (public.has_role(array['owner']));

create policy "staff read settings" on public.settings for select using (public.is_staff());
create policy "owner edits settings" on public.settings for update using (public.has_role(array['owner', 'manager']));

create policy "anyone reads categories" on public.categories for select using (true);
create policy "managers edit categories" on public.categories for all
  using (public.has_role(array['owner', 'manager'])) with check (public.has_role(array['owner', 'manager']));

create policy "staff read products" on public.products for select using (public.is_staff());
create policy "managers create products" on public.products for insert
  with check (public.has_role(array['owner', 'manager', 'storekeeper']) and stock = 0);
-- stock and cost are changed only through stock_in / adjust_stock / complete_sale
create policy "managers edit products" on public.products for update
  using (public.has_role(array['owner', 'manager', 'storekeeper']));
create policy "owner deletes products" on public.products for delete using (public.has_role(array['owner']));

create policy "staff read units" on public.product_units for select using (public.is_staff());
create policy "managers edit units" on public.product_units for all
  using (public.has_role(array['owner', 'manager', 'storekeeper']))
  with check (public.has_role(array['owner', 'manager', 'storekeeper']));

create policy "staff read customers" on public.customers for select using (public.is_staff());
create policy "staff add customers" on public.customers for insert
  with check (public.has_role(array['owner', 'manager', 'cashier']) and balance = 0);
create policy "staff edit customers" on public.customers for update using (public.has_role(array['owner', 'manager', 'cashier']));

create policy "staff read sales" on public.sales for select using (public.is_staff());
create policy "staff read sale items" on public.sale_items for select using (public.is_staff());
create policy "staff read payments" on public.payments for select using (public.is_staff());
create policy "staff read movements" on public.stock_movements for select using (public.is_staff());

create policy "staff read orders" on public.orders for select using (public.is_staff());
create policy "staff update orders" on public.orders for update using (public.has_role(array['owner', 'manager', 'cashier']));
create policy "staff read order items" on public.order_items for select using (public.is_staff());

-- Protect stock, cost and balances from direct edits (only the functions above may change them)
create or replace function public.protect_computed_fields()
returns trigger language plpgsql as $$
begin
  -- current_user is 'authenticated' for direct API calls, but the function owner
  -- inside the security-definer functions above, which are allowed to change these
  if current_user in ('authenticated', 'anon') then
    if tg_table_name = 'products' then
      new.stock := old.stock;
      new.cost_price := old.cost_price;
    elsif tg_table_name = 'customers' then
      new.balance := old.balance;
    end if;
  end if;
  return new;
end;
$$;
create trigger products_protect before update on public.products for each row execute function public.protect_computed_fields();
create trigger customers_protect before update on public.customers for each row execute function public.protect_computed_fields();

-- Only these functions are callable from the app
revoke execute on function public.complete_sale, public.void_sale, public.stock_in, public.adjust_stock,
  public.receive_debt_payment, public.sales_report from anon;
grant execute on function public.place_order, public.track_order to anon, authenticated;

-- New online orders appear live in the staff screen
alter publication supabase_realtime add table public.orders;

-- ============================================================
-- STORAGE: product photos
-- ============================================================
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;
create policy "product images public" on storage.objects for select using (bucket_id = 'product-images');
create policy "staff upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.has_role(array['owner', 'manager', 'storekeeper']));
create policy "staff delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.has_role(array['owner', 'manager', 'storekeeper']));
