"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { dbError } from "@/lib/utils";
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
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_sale", {
    p_items: input.items,
    p_customer_id: input.customerId,
    p_customer_name: "",
    p_discount: Math.max(0, Math.round(input.discount || 0)),
    p_payment: input.payment,
    p_note: input.note ?? "",
    p_order_id: input.orderId ?? null,
  });
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/admin", "layout");
  return { ok: true, id: data as string };
}

export async function voidSale(saleId: string, formData: FormData) {
  await requireStaff(["owner", "manager"]);
  const supabase = await createClient();
  await supabase.rpc("void_sale", { p_sale_id: saleId, p_reason: String(formData.get("reason") || "") });
  revalidatePath("/admin", "layout");
}
