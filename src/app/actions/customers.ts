"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { dbError, normalizeRwandaPhone } from "@/lib/utils";
import type { ActionResult, Customer } from "@/types";

export async function createCustomer(input: { name: string; phone: string; type: "retail" | "wholesale"; creditLimit?: number })
  : Promise<ActionResult & { customer?: Customer }> {
  await requireStaff(["owner", "manager", "cashier"]);
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").insert({
    name,
    phone: normalizeRwandaPhone(input.phone) ?? (input.phone.trim() || null),
    type: input.type,
    credit_limit: Math.max(0, Math.round(input.creditLimit ?? 0)),
  }).select().single();
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/admin/customers");
  return { ok: true, customer: data as Customer };
}

export async function createCustomerForm(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return createCustomer({
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    type: formData.get("type") === "wholesale" ? "wholesale" : "retail",
    creditLimit: Number(formData.get("credit_limit") || 0),
  });
}

export async function updateCustomer(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireStaff(["owner", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update({
    name: String(formData.get("name") || "").trim(),
    phone: normalizeRwandaPhone(String(formData.get("phone") || "")) ?? null,
    type: formData.get("type") === "wholesale" ? "wholesale" : "retail",
    credit_limit: Math.max(0, Number(formData.get("credit_limit") || 0)),
    notes: String(formData.get("notes") || ""),
  }).eq("id", id);
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath(`/admin/customers/${id}`);
  return { ok: true };
}

export async function receiveDebtPayment(customerId: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireStaff(["owner", "manager", "cashier"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("receive_debt_payment", {
    p_customer_id: customerId,
    p_amount: Math.round(Number(formData.get("amount") || 0)),
    p_method: String(formData.get("method") || "cash"),
    p_reference: String(formData.get("reference") || ""),
  });
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/customers");
  return { ok: true };
}
