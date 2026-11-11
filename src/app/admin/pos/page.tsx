import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/catalog";
import { Pos } from "@/components/admin/Pos";
import type { Customer, Product } from "@/types";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  await requireStaff(["owner", "manager", "cashier"]);
  const supabase = await createClient();
  const [{ data: products }, { data: customers }, categories] = await Promise.all([
    supabase.from("products").select("id, name, sku, category_id, base_unit, stock, low_stock_level, product_units(*)").eq("is_active", true).order("name"),
    supabase.from("customers").select("*").order("name").limit(1000),
    getCategories(),
  ]);
  return <Pos products={(products ?? []) as unknown as Product[]} categories={categories} initialCustomers={(customers ?? []) as Customer[]} />;
}
