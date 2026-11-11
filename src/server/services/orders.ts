import "server-only";
import { createClient } from "@/server/db/server";
import { fail, ok, type Result } from "./result";
import type { OrderStatus } from "@/types";

// Staff handling of online orders. Customers place and track orders through catalog.ts.

const OPEN: OrderStatus[] = ["new", "confirmed", "ready", "out_for_delivery"];

export async function listOrders(tab: "open" | "done") {
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100)
    .in("status", tab === "open" ? OPEN : ["completed", "cancelled"]);
  return data ?? [];
}

/** Oldest new orders first, for the dashboard. */
export async function listNewOrders(limit = 8) {
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("id, code, customer_name, total, created_at").eq("status", "new").order("created_at").limit(limit);
  return data ?? [];
}

export async function countNewOrders(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new");
  return count ?? 0;
}

/** One order with its items. */
export async function getOrder(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  return data;
}

/** Changes the status of an order that has not been turned into a sale yet. */
export async function setOrderStatus(orderId: string, status: OrderStatus): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", orderId).is("sale_id", null);
  return error ? fail(error) : ok(null);
}

export async function confirmPayment(orderId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ payment_status: "confirmed", updated_at: new Date().toISOString() }).eq("id", orderId);
  return error ? fail(error) : ok(null);
}

/** Staff set the delivery fee for the customer's location. The database recalculates the total. */
export async function setDeliveryFee(orderId: string, fee: number): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_delivery_fee", { p_order_id: orderId, p_fee: fee });
  return error ? fail(error) : ok(null);
}
