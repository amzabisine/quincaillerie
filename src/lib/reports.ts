import { createClient } from "@/lib/supabase/server";

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

/** Start of today in Rwanda time (UTC+2) */
export function startOfTodayKigali() {
  const now = new Date();
  const kigali = new Date(now.getTime() + 2 * 3600_000);
  kigali.setUTCHours(0, 0, 0, 0);
  return new Date(kigali.getTime() - 2 * 3600_000);
}
