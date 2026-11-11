"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/server/auth";
import * as sales from "@/server/services/sales";
import type { ActionResult, PaymentMethod } from "@/types";

export interface SaleInput {
  items: { unit_id: string; quantity: number }[];
  customerId: string | null;
  discount: number;
  payment: { method: PaymentMethod; amount: number; reference: string } | null;
  note?: string;
  orderId?: string;
}

/** Counter sale. Prices, stock and credit are all handled by the complete_sale database function. */
export async function completeSale(input: SaleInput): Promise<ActionResult> {
  await requireStaff(["owner", "manager", "cashier"]);
  const res = await sales.completeSale({
    items: input.items,
    customerId: input.customerId,
    discount: Math.max(0, Math.round(input.discount || 0)),
    payment: input.payment,
    note: input.note ?? "",
    orderId: input.orderId ?? null,
  });
  if (!res.ok) return res;
  revalidatePath("/admin", "layout");
  return { ok: true, id: res.data };
}

export async function voidSale(saleId: string, formData: FormData) {
  await requireStaff(["owner", "manager"]);
  await sales.voidSale(saleId, String(formData.get("reason") || ""));
  revalidatePath("/admin", "layout");
}
