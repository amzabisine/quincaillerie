"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/server/auth";
import * as customers from "@/server/services/customers";
import { normalizeRwandaPhone } from "@/lib/utils";
import type { ActionResult, Customer } from "@/types";

export async function createCustomer(input: { name: string; phone: string; type: "retail" | "wholesale"; creditLimit?: number })
  : Promise<ActionResult & { customer?: Customer }> {
  await requireStaff(["owner", "manager", "cashier"]);
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required" };
  const res = await customers.createCustomer({
    name,
    phone: normalizeRwandaPhone(input.phone) ?? (input.phone.trim() || null),
    type: input.type,
    credit_limit: Math.max(0, Math.round(input.creditLimit ?? 0)),
  });
  if (!res.ok) return res;
  revalidatePath("/admin/customers");
  return { ok: true, customer: res.data };
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
  const res = await customers.updateCustomer(id, {
    name: String(formData.get("name") || "").trim(),
    phone: normalizeRwandaPhone(String(formData.get("phone") || "")) ?? null,
    type: formData.get("type") === "wholesale" ? "wholesale" : "retail",
    credit_limit: Math.max(0, Number(formData.get("credit_limit") || 0)),
    notes: String(formData.get("notes") || ""),
  });
  if (!res.ok) return res;
  revalidatePath(`/admin/customers/${id}`);
  return { ok: true };
}

export async function receiveDebtPayment(customerId: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireStaff(["owner", "manager", "cashier"]);
  const res = await customers.receiveDebtPayment({
    customerId,
    amount: Math.round(Number(formData.get("amount") || 0)),
    method: String(formData.get("method") || "cash"),
    reference: String(formData.get("reference") || ""),
  });
  if (!res.ok) return res;
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/customers");
  return { ok: true };
}
