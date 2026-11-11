import "server-only";
import { createClient } from "@/server/db/server";
import { fail, ok, type Result } from "./result";
import type { Product } from "@/types";

// Staff product management. The online store uses catalog.ts instead.

export async function listProducts(opts: { q?: string } = {}): Promise<Product[]> {
  const supabase = await createClient();
  let query = supabase.from("products").select("*, product_units(*)").order("name").limit(500);
  if (opts.q) query = query.ilike("name", `%${opts.q}%`);
  const { data } = await query;
  return (data ?? []) as Product[];
}

export async function getProduct(id: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*, product_units(*)").eq("id", id).maybeSingle();
  return data as Product | null;
}

/** Active products with their units, for the counter. */
export async function listProductsForPos(): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("products")
    .select("id, name, sku, category_id, base_unit, stock, low_stock_level, product_units(*)").eq("is_active", true).order("name");
  return (data ?? []) as unknown as Product[];
}

/** Active products with their units, for the stock forms. */
export async function listProductsForStock(): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("id, name, base_unit, stock, product_units(*)").eq("is_active", true).order("name");
  return (data ?? []) as unknown as Product[];
}

/** Active products at or below their low-stock level. */
export async function listLowStock(limit = 10) {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("id, name, stock, low_stock_level, base_unit").eq("is_active", true).order("stock").limit(200);
  return (data ?? []).filter((p) => Number(p.stock) <= Number(p.low_stock_level)).slice(0, limit);
}

/** Uploads a product photo and returns its public URL. */
export async function uploadProductImage(file: File): Promise<Result<string>> {
  const supabase = await createClient();
  const path = `${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
  if (error) return fail(error);
  return ok(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
}

export interface ProductFields {
  name: string;
  description: string;
  category_id: string | null;
  sku: string | null;
  base_unit: string;
  low_stock_level: number;
  image_url: string | null;
  is_active: boolean;
  show_online: boolean;
}

export interface UnitFields {
  id?: string;
  unit: string;
  factor: number;
  retail_price: number;
  wholesale_price: number | null;
  barcode: string | null;
  is_default: boolean;
  show_online: boolean;
}

/** Creates (id = null) or updates a product and replaces its selling units. Returns the product id. */
export async function saveProduct(id: string | null, product: ProductFields, units: UnitFields[]): Promise<Result<string>> {
  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from("products").update({ ...product, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return fail(error);
  } else {
    const { data, error } = await supabase.from("products").insert(product).select("id").single();
    if (error || !data) return fail(error);
    id = data.id as string;
  }

  // Sync units: delete removed ones, update existing, insert new
  const keepIds = units.filter((u) => u.id).map((u) => u.id!);
  const del = supabase.from("product_units").delete().eq("product_id", id);
  const { error: delError } = keepIds.length ? await del.not("id", "in", `(${keepIds.join(",")})`) : await del;
  if (delError) return fail(delError);

  for (const { id: unitId, ...fields } of units) {
    const row = { ...fields, product_id: id };
    const { error } = unitId
      ? await supabase.from("product_units").update(row).eq("id", unitId)
      : await supabase.from("product_units").insert(row);
    if (error) return fail(error);
  }
  return ok(id);
}

/** Buying price per base unit (owner and manager; checked again in the database). */
export async function setCostPrice(productId: string, cost: number): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_cost_price", { p_product_id: productId, p_cost: cost });
  return error ? fail(error) : ok(null);
}
