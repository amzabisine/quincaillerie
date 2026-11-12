"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { createStaff, deleteStaff, updateStaff } from "@/server/actions/staff";
import { Button, Field, Input, Notice, Select } from "@/components/ui";
import type { StaffMember } from "@/types";

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

/** Owner edits an account. `locked`: own account or the owner, so role and status cannot be changed. */
export function EditStaffForm({ member, locked }: { member: StaffMember; locked: boolean }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(updateStaff.bind(null, member.id), null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state?.ok && ref.current) ref.current.value = ""; }, [state]);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Field label={t("common.name")} htmlFor="e_name"><Input id="e_name" name="full_name" defaultValue={member.full_name} required /></Field>
      <Field label={t("common.phone")} htmlFor="e_phone"><Input id="e_phone" name="phone" type="tel" defaultValue={member.phone ?? ""} /></Field>
      <Field label={t("staff.email")} hint={t("staff.emailHint")} htmlFor="e_email"><Input id="e_email" name="email" type="email" defaultValue={member.email} required /></Field>
      <Field label={t("staff.newPassword")} hint={t("staff.newPasswordHint")} htmlFor="e_pw">
        <Input ref={ref} id="e_pw" name="password" type="text" minLength={8} autoComplete="new-password" />
      </Field>
      {locked ? (
        <p className="sm:col-span-2 text-sm text-steel-600">{t("staff.lockedHelp")}</p>
      ) : (
        <>
          <Field label={t("staff.role")} hint={t("staff.roleHelp")} htmlFor="e_role">
            <Select id="e_role" name="role" defaultValue={member.role}>
              {(["cashier", "storekeeper", "manager"] as const).map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm self-end h-10">
            <input type="checkbox" name="is_active" defaultChecked={member.is_active} /> {t("staff.canLogin")}
          </label>
        </>
      )}
      {state?.error && <div className="sm:col-span-2"><Notice tone="error">{state.error}</Notice></div>}
      {state?.ok && <div className="sm:col-span-2"><Notice tone="success">{t("common.saved")}</Notice></div>}
      <Button type="submit" disabled={pending} className="justify-self-start">{t("common.save")}</Button>
    </form>
  );
}

/** Deletes the account, or disables it if the person already has sales or stock records. */
export function DeleteStaffForm({ id, name }: { id: string; name: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(deleteStaff.bind(null, id), null);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(t("staff.deleteConfirm", { name }))) e.preventDefault(); }} className="grid gap-3">
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && state.deactivated && <Notice tone="info">{t("staff.deactivatedInstead")}</Notice>}
      <Button type="submit" variant="danger" disabled={pending} className="justify-self-start">{t("staff.delete")}</Button>
    </form>
  );
}
