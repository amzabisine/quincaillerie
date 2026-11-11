"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { createCustomerForm, receiveDebtPayment, updateCustomer } from "@/server/actions/customers";
import { Button, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import type { Customer } from "@/types";

export function NewCustomerForm() {
  const t = useTranslations();
  const [state, action, pending] = useActionState(createCustomerForm, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto_auto] sm:items-end">
      <Field label={t("common.name")} htmlFor="c_name"><Input id="c_name" name="name" required /></Field>
      <Field label={t("common.phone")} htmlFor="c_phone"><Input id="c_phone" name="phone" type="tel" /></Field>
      <Field label={t("customers.type")} htmlFor="c_type">
        <Select id="c_type" name="type"><option value="retail">{t("pos.retail")}</option><option value="wholesale">{t("pos.wholesale")}</option></Select>
      </Field>
      <Field label={t("customers.creditLimit")} htmlFor="c_limit"><Input id="c_limit" name="credit_limit" type="number" min={0} defaultValue={0} className="w-32" /></Field>
      <Button type="submit" disabled={pending}>{t("common.add")}</Button>
      {state?.error && <div className="sm:col-span-5"><Notice tone="error">{state.error}</Notice></div>}
    </form>
  );
}

export function DebtPaymentForm({ customer }: { customer: Customer }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(receiveDebtPayment.bind(null, customer.id), null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("customers.amount")} htmlFor="amount"><Input id="amount" name="amount" type="number" min={1} max={customer.balance} required /></Field>
        <Field label={t("pos.paymentMethod")} htmlFor="method">
          <Select id="method" name="method">{(["cash", "momo", "airtel", "bank"] as const).map((m) => <option key={m} value={m}>{t(`methods.${m}`)}</option>)}</Select>
        </Field>
      </div>
      <Field label={t("pos.reference")} htmlFor="reference"><Input id="reference" name="reference" /></Field>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{t("common.saved")}</Notice>}
      <Button type="submit" disabled={pending} className="justify-self-start">{t("customers.receivePayment")}</Button>
    </form>
  );
}

export function EditCustomerForm({ customer }: { customer: Customer }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(updateCustomer.bind(null, customer.id), null);
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("common.name")} htmlFor="e_name"><Input id="e_name" name="name" defaultValue={customer.name} required /></Field>
        <Field label={t("common.phone")} htmlFor="e_phone"><Input id="e_phone" name="phone" defaultValue={customer.phone ?? ""} /></Field>
        <Field label={t("customers.type")} htmlFor="e_type">
          <Select id="e_type" name="type" defaultValue={customer.type}><option value="retail">{t("pos.retail")}</option><option value="wholesale">{t("pos.wholesale")}</option></Select>
        </Field>
        <Field label={t("customers.creditLimit")} hint={t("customers.creditLimitHint")} htmlFor="e_limit"><Input id="e_limit" name="credit_limit" type="number" min={0} defaultValue={customer.credit_limit} /></Field>
      </div>
      <Field label={t("common.note")} htmlFor="e_notes"><Textarea id="e_notes" name="notes" defaultValue={customer.notes} rows={2} /></Field>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{t("common.saved")}</Notice>}
      <Button type="submit" variant="secondary" disabled={pending} className="justify-self-start">{t("common.save")}</Button>
    </form>
  );
}
