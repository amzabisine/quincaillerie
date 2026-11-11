import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CatalogProduct, Category, Settings } from "@/types";

const FALLBACK: Settings = {
  shop_name: "Quincaillerie", tagline: "", phone: null, whatsapp: null, email: null, address: "Rubavu",
  momo_code: null, momo_name: null, airtel_code: null, pickup_enabled: true, delivery_enabled: true,
  delivery_fee: 0, delivery_note: "",
};

export const getPublicSettings = cache(async (): Promise<Settings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("public_settings").select("*").single();
  return (data as Settings) ?? FALLBACK;
});

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
