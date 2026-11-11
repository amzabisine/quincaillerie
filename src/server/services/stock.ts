import "server-only";
import { createClient } from "@/server/db/server";
import { fail, ok, type Result } from "./result";

/** Latest stock movements, optionally for one product. */
export async function listStockMovements(productId?: string) {
  const supabase = await createClient();
  let q = supabase.from("stock_movements")
    .select("*, product:products(name, base_unit), by:profiles(full_name)").order("created_at", { ascending: false }).limit(100);
  if (productId) q = q.eq("product_id", productId);
  const { data } = await q;
  return data ?? [];
}

export async function stockIn(p: { unitId: string; quantity: number; unitCost: number | null; supplier: string; note: string }): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("stock_in", {
    p_unit_id: p.unitId, p_quantity: p.quantity, p_unit_cost: p.unitCost, p_supplier: p.supplier, p_note: p.note,
  });
  return error ? fail(error) : ok(null);
}

/** Damage, return or physical count. */
export async function adjustStock(p: { productId: string; type: string; quantity: number; note: string }): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("adjust_stock", {
    p_product_id: p.productId, p_type: p.type, p_quantity: p.quantity, p_note: p.note,
  });
  return error ? fail(error) : ok(null);
}
