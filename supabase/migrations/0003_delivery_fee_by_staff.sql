-- ============================================================
-- Delivery fee set by staff per order (depends on the customer's location)
--
-- Before: every delivery order got the fixed settings.delivery_fee.
-- Now: a delivery order starts with no fee ("to be confirmed"). Staff enter the
-- fee for that location with set_delivery_fee(), which recalculates the total.
-- A delivery order cannot be completed until its fee is set.
-- Run this once in Supabase > SQL Editor.
-- ============================================================

alter table public.orders add column if not exists delivery_fee_set boolean not null default false;
-- existing orders already have their (fixed) fee
update public.orders set delivery_fee_set = true;

-- Online order: delivery fee starts at 0 and is set later by staff.
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
    v_line := round(v_unit.retail_price * v_qty);
    insert into public.order_items (order_id, product_id, unit_id, product_name, unit, quantity, unit_price, line_total)
    values (v_order_id, v_unit.product_id, v_unit.id, v_unit.name, v_unit.unit, v_qty, v_unit.retail_price, v_line);
    v_subtotal := v_subtotal + v_line;
  end loop;

  update public.orders set subtotal = v_subtotal, total = v_subtotal where id = v_order_id;
  return v_code;
end;
$$;

-- Staff set the delivery fee for the customer's location. 0 = free delivery.
create or replace function public.set_delivery_fee(p_order_id uuid, p_fee integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
begin
  if not public.has_role(array['owner', 'manager', 'cashier']) then raise exception 'Not allowed'; end if;
  if p_fee is null or p_fee < 0 or p_fee > 1000000 then raise exception 'Invalid delivery fee'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'Order not found'; end if;
  if v_order.fulfilment <> 'delivery' then raise exception 'This order is not a delivery'; end if;
  if v_order.sale_id is not null or v_order.status = 'cancelled' then raise exception 'Order is already closed'; end if;

  update public.orders
     set delivery_fee = p_fee, delivery_fee_set = true, total = v_order.subtotal + p_fee, updated_at = now()
   where id = p_order_id;
end;
$$;

revoke execute on function public.set_delivery_fee from anon;
grant execute on function public.set_delivery_fee to authenticated;

-- Orders: amounts change only inside the functions, and a delivery order
-- cannot become a sale before its fee is set.
create or replace function public.protect_order_fields()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.subtotal := old.subtotal;
    new.delivery_fee := old.delivery_fee;
    new.delivery_fee_set := old.delivery_fee_set;
    new.total := old.total;
  end if;
  if new.sale_id is not null and old.sale_id is null
     and new.fulfilment = 'delivery' and not new.delivery_fee_set then
    raise exception 'Set the delivery fee before completing this order';
  end if;
  return new;
end;
$$;
drop trigger if exists orders_protect on public.orders;
create trigger orders_protect before update on public.orders for each row execute function public.protect_order_fields();

-- Tracking also says whether the delivery fee is confirmed yet.
create or replace function public.track_order(p_code text, p_phone text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'code', o.code, 'status', o.status, 'payment_status', o.payment_status, 'payment_method', o.payment_method,
    'fulfilment', o.fulfilment, 'subtotal', o.subtotal, 'delivery_fee', o.delivery_fee,
    'delivery_fee_set', o.delivery_fee_set, 'total', o.total,
    'created_at', o.created_at,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('name', i.product_name, 'unit', i.unit, 'quantity', i.quantity, 'line_total', i.line_total)), '[]')
              from public.order_items i where i.order_id = o.id)
  )
  from public.orders o
  where o.code = upper(trim(p_code))
    and length(regexp_replace(p_phone, '\D', '', 'g')) >= 9
    and regexp_replace(o.customer_phone, '\D', '', 'g') like '%' || right(regexp_replace(p_phone, '\D', '', 'g'), 9);
$$;
