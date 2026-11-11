"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { login } from "@/server/actions/auth";
import { Button, Field, Input, Notice } from "@/components/ui";

export function LoginForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="grid gap-4">
      <Field label={t("email")} htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label={t("password")} htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" disabled={pending}>{t("login")}</Button>
    </form>
  );
}
