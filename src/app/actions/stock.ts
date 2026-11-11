"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { dbError } from "@/lib/utils";
import type { ActionResult } from "@/types";

export async function stockIn(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireStaff(["owner", "manager", "storekeeper"]);
  const supabase = await createClient();
  const cost = formData.get("unit_cost");
  const { error } = await supabase.rpc("stock_in", {
    p_unit_id: String(formData.get("unit_id")),
    p_quantity: Number(formData.get("quantity")),
    p_unit_cost: cost ? Number(cost) : null,
    p_supplier: String(formData.get("supplier") || ""),
    p_note: String(formData.get("note") || ""),
  });
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function adjustStock(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireStaff(["owner", "manager", "storekeeper"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("adjust_stock", {
    p_product_id: String(formData.get("product_id")),
    p_type: String(formData.get("type")),
    p_quantity: Number(formData.get("quantity")),
    p_note: String(formData.get("note") || ""),
  });
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/admin", "layout");
  return { ok: true };
}
