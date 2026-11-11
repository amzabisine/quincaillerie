"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { saveSettings } from "@/app/actions/settings";
import { Button, Card, Field, Input, Notice } from "@/components/ui";
import type { Settings } from "@/types";

export function SettingsForm({ settings: s }: { settings: Settings }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(saveSettings, null);
  const text = (name: keyof Settings, label: string, type = "text") => (
    <Field label={label} htmlFor={name}><Input id={name} name={name} type={type} defaultValue={(s[name] as string) ?? ""} /></Field>
  );
  return (
    <form action={action} className="grid gap-5 max-w-3xl">
      <Card className="grid gap-4 sm:grid-cols-2">
        {text("shop_name", t("shopName"))}
        {text("tagline", t("tagline"))}
        {text("phone", t("phone"), "tel")}
        {text("whatsapp", t("whatsapp"), "tel")}
        {text("email", t("email"), "email")}
        {text("address", t("address"))}
        {text("tin", t("tin"))}
        {text("receipt_footer", t("receiptFooter"))}
      </Card>
      <Card className="grid gap-4 sm:grid-cols-2">
        {text("momo_code", t("momoCode"))}
        {text("momo_name", t("momoName"))}
        {text("airtel_code", t("airtelCode"))}
      </Card>
      <Card className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pickup_enabled" defaultChecked={s.pickup_enabled} className="h-4 w-4" /> {t("pickup")}</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="delivery_enabled" defaultChecked={s.delivery_enabled} className="h-4 w-4" /> {t("delivery")}</label>
        {text("delivery_note", t("deliveryNote"))}
      </Card>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{tc("saved")}</Notice>}
      <Button type="submit" disabled={pending} className="justify-self-start">{tc("save")}</Button>
    </form>
  );
}
