"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/server/auth";
import * as stock from "@/server/services/stock";
import type { ActionResult } from "@/types";

export async function stockIn(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireStaff(["owner", "manager", "storekeeper"]);
  const cost = formData.get("unit_cost");
  const res = await stock.stockIn({
    unitId: String(formData.get("unit_id")),
    quantity: Number(formData.get("quantity")),
    unitCost: cost ? Number(cost) : null,
    supplier: String(formData.get("supplier") || ""),
    note: String(formData.get("note") || ""),
  });
  if (!res.ok) return res;
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function adjustStock(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireStaff(["owner", "manager", "storekeeper"]);
  const res = await stock.adjustStock({
    productId: String(formData.get("product_id")),
    type: String(formData.get("type")),
    quantity: Number(formData.get("quantity")),
    note: String(formData.get("note") || ""),
  });
  if (!res.ok) return res;
  revalidatePath("/admin", "layout");
  return { ok: true };
}
