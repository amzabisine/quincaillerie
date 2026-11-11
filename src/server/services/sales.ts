import "server-only";
import { createClient } from "@/server/db/server";
import { fail, ok, type Result } from "./result";
import type { PaymentMethod } from "@/types";

export async function listSales(page: number, size: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sales").select("id, number, channel, customer_name, total, credit_amount, status, created_at, cashier:profiles(full_name)")
    .order("created_at", { ascending: false }).range((page - 1) * size, page * size - 1);
  return data ?? [];
}

/** One sale with its items, payments, cashier and customer (for the receipt). */
export async function getSale(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("sales")
    .select("*, sale_items(*), payments(*), cashier:profiles(full_name), customer:customers(name, phone, balance)").eq("id", id).maybeSingle();
  return data;
}

export interface SaleParams {
  items: { unit_id: string; quantity: number }[];
  customerId: string | null;
  discount: number;
  payment: { method: PaymentMethod; amount: number; reference: string } | null;
  note: string;
  orderId: string | null;
}

/** Records a sale. Prices, stock and credit are all handled by the complete_sale database function. Returns the sale id. */
export async function completeSale(p: SaleParams): Promise<Result<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_sale", {
    p_items: p.items,
    p_customer_id: p.customerId,
    p_customer_name: "",
    p_discount: p.discount,
    p_payment: p.payment,
    p_note: p.note,
    p_order_id: p.orderId,
  });
  return error ? fail(error) : ok(data as string);
}

export async function voidSale(saleId: string, reason: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("void_sale", { p_sale_id: saleId, p_reason: reason });
  return error ? fail(error) : ok(null);
}
