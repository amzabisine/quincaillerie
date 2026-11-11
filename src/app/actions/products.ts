"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canSeeProfit, requireStaff } from "@/lib/auth";
import { UNITS } from "@/lib/units";
import { dbError } from "@/lib/utils";
import type { ActionResult } from "@/types";

interface UnitRow {
  id?: string;
  unit: string;
  factor: number;
  retail_price: number;
  wholesale_price: number | null;
  barcode: string;
  is_default: boolean;
  show_online: boolean;
}

/** Create or update a product with all its selling units. */
export async function saveProduct(productId: string | null, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff(["owner", "manager", "storekeeper"]);
  const supabase = await createClient();

  const units = JSON.parse(String(formData.get("units") || "[]")) as UnitRow[];
  const baseUnit = String(formData.get("base_unit"));
  if (!(UNITS as readonly string[]).includes(baseUnit)) return { ok: false, error: "Choose a base unit" };
  if (!units.length) return { ok: false, error: "Add at least one selling unit" };
  if (units.some((u) => !(UNITS as readonly string[]).includes(u.unit) || !(u.factor > 0) || !(u.retail_price >= 0))) {
    return { ok: false, error: "Check the units: each needs a unit, a quantity above 0 and a price" };
  }
  if (new Set(units.map((u) => u.unit)).size !== units.length) return { ok: false, error: "Each unit can only appear once" };
  if (!units.some((u) => u.is_default)) units[0].is_default = true;

  // Optional photo upload
  let imageUrl = String(formData.get("image_url") || "") || null;
  const file = formData.get("image") as File | null;
  if (file && file.size > 0) {
    if (!file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) return { ok: false, error: "Photo must be an image under 4 MB" };
    const path = `${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (error) return { ok: false, error: dbError(error) };
    imageUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }

  const product = {
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    category_id: String(formData.get("category_id") || "") || null,
    sku: String(formData.get("sku") || "").trim() || null,
    base_unit: baseUnit,
    low_stock_level: Number(formData.get("low_stock_level") || 0),
    image_url: imageUrl,
    is_active: formData.get("is_active") === "on",
    show_online: formData.get("show_online") === "on",
  };
  if (product.name.length < 2) return { ok: false, error: "Enter a product name" };

  let id = productId;
  if (id) {
    const { error } = await supabase.from("products").update({ ...product, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return { ok: false, error: dbError(error) };
  } else {
    const { data, error } = await supabase.from("products").insert(product).select("id").single();
    if (error || !data) return { ok: false, error: dbError(error) };
    id = data.id as string;
  }

  // Sync units: delete removed ones, update existing, insert new
  const keepIds = units.filter((u) => u.id).map((u) => u.id!);
  const del = supabase.from("product_units").delete().eq("product_id", id);
  const { error: delError } = keepIds.length ? await del.not("id", "in", `(${keepIds.join(",")})`) : await del;
  if (delError) return { ok: false, error: dbError(delError) };

  for (const u of units) {
    const row = {
      product_id: id, unit: u.unit, factor: u.factor, retail_price: Math.round(u.retail_price),
      wholesale_price: u.wholesale_price ? Math.round(u.wholesale_price) : null,
      barcode: u.barcode?.trim() || null, is_default: u.is_default, show_online: u.show_online,
    };
    const { error } = u.id
      ? await supabase.from("product_units").update(row).eq("id", u.id)
      : await supabase.from("product_units").insert(row);
    if (error) return { ok: false, error: dbError(error) };
  }

  // Buying price (per base unit): owner and manager only, sent only when it was changed.
  const cost = formData.get("cost_price");
  if (cost !== null && canSeeProfit(staff.role)) {
    const value = Number(cost);
    if (!Number.isFinite(value) || value < 0) return { ok: false, error: "Invalid buying price" };
    const { error } = await supabase.rpc("set_cost_price", { p_product_id: id, p_cost: value });
    if (error) return { ok: false, error: dbError(error) };
  }

  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  redirect(productId ? "/admin/products" : `/admin/stock?product=${id}`);
}
