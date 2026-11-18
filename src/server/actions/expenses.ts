"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/server/auth";
import * as expenses from "@/server/services/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { PAYMENT_METHODS } from "@/lib/payments";
import { isDay, localDate } from "@/lib/dates";
import { roundMoney } from "@/lib/utils";
import type { ActionResult, ExpenseCategory, PaymentMethod } from "@/types";

function readExpense(formData: FormData): expenses.ExpenseFields | string {
  const spentOn = String(formData.get("spent_on") || "");
  const category = String(formData.get("category")) as ExpenseCategory;
  const method = String(formData.get("method") || "cash") as PaymentMethod;
  const amount = roundMoney(Number(formData.get("amount")));
  if (!isDay(spentOn)) return "Choose a date";
  if (spentOn > localDate()) return "The date cannot be in the future";
  if (!EXPENSE_CATEGORIES.includes(category)) return "Choose a category";
  if (!PAYMENT_METHODS.includes(method)) return "Choose how it was paid";
  if (!(amount > 0)) return "Enter an amount above 0";
  return { spent_on: spentOn, category, amount, method, note: String(formData.get("note") || "").trim().slice(0, 300) };
}

/** Owner and managers record an expense. */
export async function createExpense(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const me = await requireStaff(["owner", "manager"]);
  const fields = readExpense(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  const res = await expenses.createExpense(fields, me.id);
  if (!res.ok) return res;
  revalidatePath("/admin", "layout");
  return { ok: true, id: res.data };
}

/** Owner and managers correct an expense. */
export async function updateExpense(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireStaff(["owner", "manager"]);
  const fields = readExpense(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  const res = await expenses.updateExpense(id, fields);
  if (!res.ok) return res;
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Only the owner deletes an expense. Goes back to that expense's month. */
export async function deleteExpense(id: string, month: string, _: ActionResult | null): Promise<ActionResult> {
  await requireStaff(["owner"]);
  const res = await expenses.deleteExpense(id);
  if (!res.ok) return res;
  revalidatePath("/admin", "layout");
  redirect(`/admin/expenses?month=${month}`);
}
