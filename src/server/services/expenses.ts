import "server-only";
import { createClient } from "@/server/db/server";
import { monthRange } from "@/lib/dates";
import { fail, ok, type Result } from "./result";
import type { Expense, ExpenseCategory, PaymentMethod } from "@/types";

/** Expenses of one month ("YYYY-MM"), newest first, with who recorded them. */
export async function listExpenses(month: string): Promise<Expense[]> {
  const { first, last } = monthRange(month);
  const supabase = await createClient();
  const { data } = await supabase.from("expenses").select("*, by:profiles(full_name)")
    .gte("spent_on", first).lte("spent_on", last)
    .order("spent_on", { ascending: false }).order("created_at", { ascending: false });
  return (data ?? []) as Expense[];
}

export async function getExpense(id: string): Promise<Expense | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("expenses").select("*, by:profiles(full_name)").eq("id", id).maybeSingle();
  return data as Expense | null;
}

export interface ExpenseFields {
  spent_on: string;
  category: ExpenseCategory;
  amount: number;
  method: PaymentMethod;
  note: string;
}

export async function createExpense(fields: ExpenseFields, createdBy: string): Promise<Result<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("expenses").insert({ ...fields, created_by: createdBy }).select("id").single();
  return error || !data ? fail(error) : ok(data.id as string);
}

export async function updateExpense(id: string, fields: ExpenseFields): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").update(fields).eq("id", id);
  return error ? fail(error) : ok(null);
}

/** Owner only (also enforced by the database). */
export async function deleteExpense(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("expenses").delete({ count: "exact" }).eq("id", id);
  if (error) return fail(error);
  return count ? ok(null) : fail("Not allowed");
}
