import "server-only";
import { createClient } from "@/server/db/server";
import type { ExpenseCategory } from "@/types";

export interface SalesReport {
  sales_count: number;
  sales_total: number;
  credit_given: number;
  // The next four are null when the user may not see profit (cashier, storekeeper)
  profit: number | null;           // gross profit: sales - cost of goods sold
  expenses_total: number | null;
  net_profit: number | null;       // gross profit - expenses
  expenses_by_category: Partial<Record<ExpenseCategory, number>> | null;
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

export interface MonthSummary {
  month: string;          // "YYYY-MM"
  sales_count: number;
  sales_total: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
}

/** Last `months` months, newest first. Owner and manager only (empty for others). */
export async function getMonthlySummary(months = 12): Promise<MonthSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("monthly_summary", { p_months: months });
  return (data ?? []) as MonthSummary[];
}
