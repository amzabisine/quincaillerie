"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { createExpense, deleteExpense, updateExpense } from "@/server/actions/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { PAYMENT_METHODS } from "@/lib/payments";
import { Button, Field, Input, Notice, Select } from "@/components/ui";
import type { Expense } from "@/types";

/** New expense (no `expense`) or correction of an existing one. `today` is the Bukavu date, used as default and maximum. */
export function ExpenseForm({ expense, today }: { expense?: Expense; today: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(expense ? updateExpense.bind(null, expense.id) : createExpense, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && !expense) ref.current?.reset(); }, [state, expense]);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[150px_1fr_140px_1fr]">
      <Field label={t("common.date")} htmlFor="x_date"><Input id="x_date" name="spent_on" type="date" max={today} defaultValue={expense?.spent_on ?? today} required /></Field>
      <Field label={t("expenses.category")} htmlFor="x_cat">
        <Select id="x_cat" name="category" defaultValue={expense?.category ?? ""} required>
          <option value="" disabled>{t("expenses.chooseCategory")}</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`expenses.categories.${c}`)}</option>)}
        </Select>
      </Field>
      <Field label={t("expenses.amount")} htmlFor="x_amount">
        <Input id="x_amount" name="amount" type="number" inputMode="decimal" min={0.01} step="0.01" defaultValue={expense?.amount} required />
      </Field>
      <Field label={t("expenses.paidWith")} htmlFor="x_method">
        <Select id="x_method" name="method" defaultValue={expense?.method ?? "cash"}>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`methods.${m}`)}</option>)}
        </Select>
      </Field>
      <Field label={t("common.note")} htmlFor="x_note" className="sm:col-span-2 lg:col-span-4">
        <Input id="x_note" name="note" maxLength={300} defaultValue={expense?.note} placeholder={t("expenses.notePlaceholder")} />
      </Field>
      {state?.error && <div className="sm:col-span-2 lg:col-span-4"><Notice tone="error">{state.error}</Notice></div>}
      {state?.ok && <div className="sm:col-span-2 lg:col-span-4"><Notice tone="success">{t("common.saved")}</Notice></div>}
      <Button type="submit" disabled={pending} className="justify-self-start">{expense ? t("common.save") : t("expenses.add")}</Button>
    </form>
  );
}

/** Owner only. */
export function DeleteExpenseButton({ id, month }: { id: string; month: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(deleteExpense.bind(null, id, month), null);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(t("expenses.deleteConfirm"))) e.preventDefault(); }} className="grid gap-2">
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" variant="danger" disabled={pending} className="justify-self-start">{t("expenses.delete")}</Button>
    </form>
  );
}
