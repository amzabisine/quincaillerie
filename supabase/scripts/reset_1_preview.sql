-- ============================================================
-- STEP 1 of 2: PREVIEW. Changes nothing.
-- Shows how many rows the fresh start (reset_2_delete.sql) will remove.
-- Run in Supabase > SQL Editor and check the numbers.
-- ============================================================
select 'Products' as "What", count(*) as "Will be deleted" from public.products
union all select 'Selling units', count(*) from public.product_units
union all select 'Stock history', count(*) from public.stock_movements
union all select 'Customers', count(*) from public.customers
union all select 'Sales (receipts)', count(*) from public.sales
union all select 'Sale lines', count(*) from public.sale_items
union all select 'Payments', count(*) from public.payments
union all select 'Online orders', count(*) from public.orders
union all select 'Expenses', count(*) from public.expenses
union all select '-- KEPT: staff accounts', count(*) from public.profiles
union all select '-- KEPT: categories', count(*) from public.categories
union all select '-- KEPT: shop settings', count(*) from public.settings;
