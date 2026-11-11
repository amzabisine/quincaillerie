import "server-only";
import { cache } from "react";
import { createClient } from "@/server/db/server";
import { fail, ok, type Result } from "./result";
import type { CatalogProduct, Category, OrderStatus } from "@/types";

// Public online store. Reads only the public views (no cost prices, no exact stock).

export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("sort");
  return (data ?? []) as Category[];
});

/** Online catalog with each product's selling units. */
export async function getCatalog(opts: { q?: string; category?: string; ids?: string[]; limit?: number } = {}): Promise<CatalogProduct[]> {
  const supabase = await createClient();
  let query = supabase.from("catalog_products").select("*");
  if (opts.q) query = query.ilike("name", `%${opts.q.replace(/[%_]/g, "")}%`);
  if (opts.category) query = query.eq("category_id", opts.category);
  if (opts.ids) query = query.in("id", opts.ids);
  const { data: products } = await query.order("name").limit(opts.limit ?? 200);
  if (!products?.length) return [];

  const { data: units } = await supabase.from("catalog_units").select("*").in("product_id", products.map((p) => p.id));
  return products.map((p) => ({
    ...p,
    units: (units ?? [])
      .filter((u) => u.product_id === p.id)
      .sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.factor - b.factor),
  })) as CatalogProduct[];
}

export interface PlaceOrderParams {
  name: string;
  phone: string;
  fulfilment: "pickup" | "delivery";
  address: string;
  note: string;
  paymentMethod: "momo_code" | "airtel_code" | "on_collect";
  paymentReference: string;
  items: { unit_id: string; quantity: number }[];
}

/** Creates an online order. Prices are taken from the database, not from the browser. Returns the order code. */
export async function placeOrder(p: PlaceOrderParams): Promise<Result<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_name: p.name,
    p_phone: p.phone,
    p_fulfilment: p.fulfilment,
    p_address: p.address,
    p_note: p.note,
    p_payment_method: p.paymentMethod,
    p_payment_reference: p.paymentReference,
    p_items: p.items,
  });
  return error ? fail(error) : ok(data as string);
}

export interface TrackedOrder {
  code: string; status: OrderStatus; payment_status: "unpaid" | "claimed" | "confirmed"; fulfilment: "pickup" | "delivery";
  subtotal: number; delivery_fee: number; delivery_fee_set?: boolean; total: number; created_at: string;
  items: { name: string; unit: string; quantity: number; line_total: number }[];
}

/** A customer looks up their order with the code and their phone number. */
export async function trackOrder(code: string, phone: string): Promise<TrackedOrder | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("track_order", { p_code: code, p_phone: phone });
  return data as TrackedOrder | null;
}
