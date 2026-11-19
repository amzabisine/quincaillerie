-- ============================================================
-- STEP 2 of 2: FRESH START. Cannot be undone.
--
-- Deletes ALL business data: products, stock and stock history, customers and
-- debts, sales, payments, online orders, expenses. Receipt numbers start again at 1.
--
-- Keeps: staff accounts and logins, categories, shop settings (name, phones,
-- merchant codes).
--
-- Run reset_1_preview.sql first. Then run this whole file in Supabase > SQL Editor.
-- It is all-or-nothing: if anything fails, nothing is deleted.
-- Product photos (if any) stay in Storage > product-images; delete them there if you want.
-- ============================================================
begin;

truncate table
  public.payments,
  public.sale_items,
  public.order_items,
  public.sales,
  public.orders,
  public.stock_movements,
  public.product_units,
  public.products,
  public.customers,
  public.expenses
restart identity;

commit;

-- Check: every line should show 0.
select 'Products' as "What", count(*) as "Left" from public.products
union all select 'Customers', count(*) from public.customers
union all select 'Sales', count(*) from public.sales
union all select 'Online orders', count(*) from public.orders
union all select 'Expenses', count(*) from public.expenses
union all select 'Staff accounts (kept)', count(*) from public.profiles;
