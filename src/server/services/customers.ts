import "server-only";
import { createClient } from "@/server/db/server";
import { fail, ok, type Result } from "./result";
import type { Customer } from "@/types";

/** Customers with the largest debts first. */
export async function listCustomers(opts: { q?: string; withDebt?: boolean; limit?: number } = {}): Promise<Customer[]> {
  const supabase = await createClient();
  let query = supabase.from("customers").select("*").order("balance", { ascending: false }).order("name").limit(opts.limit ?? 300);
  if (opts.q) {
    const q = opts.q.replace(/[,()%]/g, "");
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  if (opts.withDebt) query = query.gt("balance", 0);
  const { data } = await query;
  return (data ?? []) as Customer[];
}

/** All customers by name, for the counter. */
export async function listCustomersByName(limit = 1000): Promise<Customer[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("*").order("name").limit(limit);
  return (data ?? []) as Customer[];
}

/** A customer with their latest purchases and debt payments. */
export async function getCustomerAccount(id: string) {
  const supabase = await createClient();
  const [{ data: customer }, { data: sales }, { data: payments }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("sales").select("id, number, total, credit_amount, status, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
    supabase.from("payments").select("*").eq("customer_id", id).eq("kind", "debt_payment").order("created_at", { ascending: false }).limit(50),
  ]);
  if (!customer) return null;
  return { customer: customer as Customer, sales: sales ?? [], payments: payments ?? [] };
}

export async function findCustomerIdByPhone(phone: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("id").eq("phone", phone).maybeSingle();
  return data?.id ?? null;
}

export interface CustomerFields {
  name: string;
  phone: string | null;
  type: "retail" | "wholesale";
  credit_limit: number;
  notes?: string;
}

export async function createCustomer(fields: CustomerFields): Promise<Result<Customer>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").insert(fields).select().single();
  return error ? fail(error) : ok(data as Customer);
}

export async function updateCustomer(id: string, fields: CustomerFields): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update(fields).eq("id", id);
  return error ? fail(error) : ok(null);
}

/** The customer pays back part or all of their debt. The database updates the balance. */
export async function receiveDebtPayment(p: { customerId: string; amount: number; method: string; reference: string }): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("receive_debt_payment", {
    p_customer_id: p.customerId, p_amount: p.amount, p_method: p.method, p_reference: p.reference,
  });
  return error ? fail(error) : ok(null);
}
