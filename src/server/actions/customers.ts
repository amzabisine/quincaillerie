"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/server/auth";
import * as customers from "@/server/services/customers";
import { normalizePhone, roundMoney } from "@/lib/utils";
import type { ActionResult, Customer } from "@/types";

/** Congo or Rwanda number in standard form; any other number is kept as typed (never erased). */
const phoneOrNull = (raw: string) => normalizePhone(raw) ?? (raw.trim() || null);

export async function createCustomer(input: { name: string; phone: string; type: "retail" | "wholesale"; creditLimit?: number })
  : Promise<ActionResult & { customer?: Customer }> {
  await requireStaff(["owner", "manager", "cashier"]);
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required" };
  const res = await customers.createCustomer({
    name,
    phone: phoneOrNull(input.phone),
    type: input.type,
    credit_limit: Math.max(0, roundMoney(input.creditLimit ?? 0)),
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
    phone: phoneOrNull(String(formData.get("phone") || "")),
    type: formData.get("type") === "wholesale" ? "wholesale" : "retail",
    credit_limit: Math.max(0, roundMoney(Number(formData.get("credit_limit") || 0))),
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
    amount: roundMoney(Number(formData.get("amount") || 0)),
    method: String(formData.get("method") || "cash"),
    reference: String(formData.get("reference") || ""),
  });
  if (!res.ok) return res;
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/customers");
  return { ok: true };
}
