"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { createStaff } from "@/server/actions/staff";
import { Button, Field, Input, Notice, Select } from "@/components/ui";

export function StaffForm() {
  const t = useTranslations();
  const [state, action, pending] = useActionState(createStaff, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2">
      <Field label={t("common.name")} htmlFor="s_name"><Input id="s_name" name="full_name" required /></Field>
      <Field label={t("common.phone")} htmlFor="s_phone"><Input id="s_phone" name="phone" type="tel" /></Field>
      <Field label={t("staff.email")} htmlFor="s_email"><Input id="s_email" name="email" type="email" required /></Field>
      <Field label={t("staff.password")} htmlFor="s_pw"><Input id="s_pw" name="password" type="text" minLength={8} required /></Field>
      <Field label={t("staff.role")} hint={t("staff.roleHelp")} htmlFor="s_role" className="sm:col-span-2">
        <Select id="s_role" name="role" defaultValue="cashier">
          {(["cashier", "storekeeper", "manager"] as const).map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
        </Select>
      </Field>
      {state?.error && <div className="sm:col-span-2"><Notice tone="error">{state.error}</Notice></div>}
      {state?.ok && <div className="sm:col-span-2"><Notice tone="success">{t("common.saved")}</Notice></div>}
      <Button type="submit" disabled={pending} className="justify-self-start">{t("staff.add")}</Button>
    </form>
  );
}
