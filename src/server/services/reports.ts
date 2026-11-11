import "server-only";
import { createClient } from "@/server/db/server";

export interface SalesReport {
  sales_count: number;
  sales_total: number;
  credit_given: number;
  profit: number | null;           // null when the user may not see profit
  by_method: Record<string, number>;
  debt_collected: number;
  top_products: { name: string; base_quantity: number; revenue: number }[];
  stock_value: number | null;
  debts_total: number;
}

export async function getSalesReport(from: Date, to: Date): Promise<SalesReport | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("sales_report", { p_from: from.toISOString(), p_to: to.toISOString() });
  return data as SalesReport | null;
}
