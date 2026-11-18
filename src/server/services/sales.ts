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

/** Every sale of a period, oldest first (for exports). */
export async function listSalesBetween(from: Date, to: Date) {
  const supabase = await createClient();
  const { data } = await supabase.from("sales")
    .select("id, number, channel, customer_name, total, paid_amount, credit_amount, status, created_at, cashier:profiles(full_name)")
    .gte("created_at", from.toISOString()).lte("created_at", to.toISOString())
    .order("created_at").limit(20000);
  return (data ?? []) as unknown as {
    id: string; number: number; channel: "pos" | "online"; customer_name: string; total: number; paid_amount: number;
    credit_amount: number; status: "completed" | "voided"; created_at: string; cashier: { full_name: string } | null;
  }[];
}

/** Quantity (in base units) and revenue per product, for completed sales of a period. Best sellers first. */
export async function listProductsSoldBetween(from: Date, to: Date) {
  const supabase = await createClient();
  const { data } = await supabase.from("sale_items")
    .select("product_id, product_name, quantity, factor, line_total, product:products(base_unit), sale:sales!inner(status, created_at)")
    .eq("sale.status", "completed").gte("sale.created_at", from.toISOString()).lte("sale.created_at", to.toISOString())
    .limit(50000);
  const byProduct = new Map<string, { name: string; base_unit: string; quantity: number; revenue: number }>();
  for (const i of (data ?? []) as any[]) {
    const row = byProduct.get(i.product_id) ?? { name: i.product_name, base_unit: i.product?.base_unit ?? "piece", quantity: 0, revenue: 0 };
    row.quantity += Number(i.quantity) * Number(i.factor);
    row.revenue += Number(i.line_total);
    byProduct.set(i.product_id, row);
  }
  return [...byProduct.values()].sort((a, b) => b.revenue - a.revenue);
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
