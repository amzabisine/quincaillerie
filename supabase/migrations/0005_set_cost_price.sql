-- ============================================================
-- Owner or manager enter the buying price directly on the product.
-- p_cost is per BASE unit (the form converts from the unit the owner typed it in).
-- Sales recorded after this use the new buying price for profit; past sales keep theirs.
-- "Stock in" with a unit cost still updates the price as a weighted average.
-- Run this once in Supabase > SQL Editor.
-- ============================================================
create or replace function public.set_cost_price(p_product_id uuid, p_cost numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(array['owner', 'manager']) then raise exception 'Not allowed'; end if;
  if p_cost is null or p_cost < 0 then raise exception 'Invalid buying price'; end if;
  update public.products set cost_price = round(p_cost, 2), updated_at = now() where id = p_product_id;
  if not found then raise exception 'Unknown product'; end if;
end;
$$;

revoke execute on function public.set_cost_price from anon;
grant execute on function public.set_cost_price to authenticated;
