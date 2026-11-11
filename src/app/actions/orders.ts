"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { dbError } from "@/lib/utils";
import { completeSale } from "./sales";
import { createCustomer } from "./customers";
import type { ActionResult, OrderStatus, PaymentMethod } from "@/types";

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  await requireStaff(["owner", "manager", "cashier"]);
  const supabase = await createClient();
  if (status === "completed") return; // use completeOrder so the sale and stock are recorded
  await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", orderId).is("sale_id", null);
  revalidatePath("/admin/orders", "layout");
}

export async function confirmPayment(orderId: string) {
  await requireStaff(["owner", "manager", "cashier"]);
  const supabase = await createClient();
  await supabase.from("orders").update({ payment_status: "confirmed", updated_at: new Date().toISOString() }).eq("id", orderId);
  revalidatePath(`/admin/orders/${orderId}`);
}

/** Staff set the delivery fee for the customer's location. The database recalculates the total. */
export async function setDeliveryFee(orderId: string, fee: number): Promise<ActionResult> {
  await requireStaff(["owner", "manager", "cashier"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_delivery_fee", { p_order_id: orderId, p_fee: Math.max(0, Math.round(fee)) });
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/admin/orders", "layout");
  return { ok: true };
}

/**
 * Turns the online order into a sale: stock goes down and the payment is recorded.
 * Supports paid in full, partial payment, or pay later. Any unpaid amount becomes debt
 * on the customer's account (found by phone number, or created from the order).
 */
export async function completeOrder(
  orderId: string,
  input: { method: PaymentMethod; amountPaid: number; reference: string }
): Promise<ActionResult> {
  await requireStaff(["owner", "manager", "cashier"]);
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("*, order_items(unit_id, quantity)").eq("id", orderId).single();
  if (!order) return { ok: false, error: "Order not found" };
  if (order.fulfilment === "delivery" && !order.delivery_fee_set) return { ok: false, error: "Set the delivery fee before completing this order" };

  const amountPaid = Math.max(0, Math.min(order.total, Math.round(input.amountPaid)));
  let customerId: string | null = null;
  if (amountPaid < order.total) {
    const { data: existing } = await supabase.from("customers").select("id").eq("phone", order.customer_phone).maybeSingle();
    if (existing) customerId = existing.id;
    else {
      const created = await createCustomer({ name: order.customer_name, phone: order.customer_phone, type: "retail" });
      if (!created.ok || !created.customer) return { ok: false, error: created.error };
      customerId = created.customer.id;
    }
  }

  const res = await completeSale({
    items: order.order_items.filter((i: any) => i.unit_id).map((i: any) => ({ unit_id: i.unit_id, quantity: Number(i.quantity) })),
    customerId,
    discount: 0,
    payment: amountPaid > 0 ? { method: input.method, amount: amountPaid, reference: input.reference || order.payment_reference || "" } : null,
    note: `Online ${order.code}`,
    orderId,
  });
  revalidatePath("/admin/orders", "layout");
  return res;
}
