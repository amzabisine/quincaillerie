"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Package, Trash2 } from "lucide-react";
import { placeOrder } from "@/app/actions/store";
import { cn, formatRWF } from "@/lib/utils";
import { Button, Field, Input, Notice, Textarea, buttonClass } from "@/components/ui";
import { useCart } from "./CartProvider";
import type { Settings } from "@/types";

type Pay = "momo_code" | "airtel_code" | "on_collect";

export function Checkout({ settings }: { settings: Settings }) {
  const t = useTranslations();
  const router = useRouter();
  const { items, subtotal, setQuantity, remove, clear } = useCart();
  const [fulfilment, setFulfilment] = useState<"pickup" | "delivery">(settings.pickup_enabled ? "pickup" : "delivery");
  const [pay, setPay] = useState<Pay>(settings.momo_code ? "momo_code" : "on_collect");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // The delivery fee depends on the location: the shop sets it after the order is placed.
  const isDelivery = fulfilment === "delivery";
  const total = subtotal;

  if (items.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center ring-1 ring-steel-950/8">
        <p className="text-steel-600">{t("cart.empty")}</p>
        <Link href="/products" className={buttonClass("primary", "mt-4")}>{t("cart.continue")}</Link>
      </div>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError("");
    startTransition(async () => {
      const res = await placeOrder({
        name: String(f.get("name")),
        phone: String(f.get("phone")),
        fulfilment,
        address: String(f.get("address") ?? ""),
        note: String(f.get("note") ?? ""),
        paymentMethod: pay,
        paymentReference: String(f.get("reference") ?? ""),
        items: items.map((i) => ({ unit_id: i.unitId, quantity: i.quantity })),
      });
      if (!res.ok) { setError(res.error ?? t("common.error")); return; }
      clear();
      router.push(`/orders/${res.code}?phone=${encodeURIComponent(res.phone ?? "")}&new=1`);
    });
  }

  const payOptions: { id: Pay; label: string; show: boolean }[] = [
    { id: "momo_code", label: t("cart.payMomo"), show: !!settings.momo_code },
    { id: "airtel_code", label: t("cart.payAirtel"), show: !!settings.airtel_code },
    { id: "on_collect", label: t("cart.payOnCollect"), show: true },
  ];

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="grid gap-6 content-start">
        <ul className="divide-y divide-steel-950/8 rounded-lg bg-white ring-1 ring-steel-950/8">
          {items.map((i) => (
            <li key={i.unitId} className="flex items-center gap-3 p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-steel-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i.image ? <img src={i.image} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-steel-400"><Package size={20} aria-hidden /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">{i.name}</p>
                <p className="text-sm text-steel-600">{formatRWF(i.price)} / {t(`units.${i.unit}`)}</p>
              </div>
              <input type="number" min={0.1} step="any" value={i.quantity} aria-label={t("common.quantity")}
                onChange={(e) => setQuantity(i.unitId, Number(e.target.value))}
                className="h-9 w-20 rounded-md px-2 text-center text-sm ring-1 ring-steel-950/15" />
              <p className="w-28 text-right font-semibold">{formatRWF(i.price * i.quantity)}</p>
              <button type="button" onClick={() => remove(i.unitId)} aria-label={t("common.remove")} className="p-2 text-steel-600 hover:text-danger"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>

        <fieldset className="rounded-lg bg-white p-5 ring-1 ring-steel-950/8 grid gap-4">
          <legend className="sr-only">{t("cart.yourDetails")}</legend>
          <h2 className="text-lg font-bold">{t("cart.yourDetails")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("cart.fullName")} htmlFor="name"><Input id="name" name="name" autoComplete="name" required /></Field>
            <Field label={t("cart.phone")} hint={t("cart.phoneHint")} htmlFor="phone"><Input id="phone" name="phone" type="tel" autoComplete="tel" required /></Field>
          </div>
          <div>
            <p className="text-sm font-medium mb-1.5">{t("cart.fulfilment")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {settings.pickup_enabled && (
                <Choice checked={fulfilment === "pickup"} onChange={() => setFulfilment("pickup")} name="fulfilment" label={t("cart.pickup")} sub={settings.address} />
              )}
              {settings.delivery_enabled && (
                <Choice checked={fulfilment === "delivery"} onChange={() => setFulfilment("delivery")} name="fulfilment"
                  label={t("cart.delivery")} sub={`${t("cart.feeByLocation")}${settings.delivery_note ? ` · ${settings.delivery_note}` : ""}`} />
              )}
            </div>
          </div>
          {fulfilment === "delivery" && (
            <Field label={t("cart.address")} htmlFor="address"><Input id="address" name="address" placeholder={t("cart.addressPlaceholder")} required /></Field>
          )}
          <Field label={t("cart.note")} htmlFor="note"><Textarea id="note" name="note" rows={2} maxLength={500} /></Field>
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-24 self-start rounded-lg bg-white p-5 ring-1 ring-steel-950/8 grid gap-4">
        <h2 className="text-lg font-bold">{t("cart.payment")}</h2>
        <div className="grid gap-2">
          {payOptions.filter((o) => o.show).map((o) => (
            <Choice key={o.id} checked={pay === o.id} onChange={() => setPay(o.id)} name="pay" label={o.label} />
          ))}
        </div>
        {pay === "momo_code" && (
          <Notice>{t("cart.payInstructionsMomo", { code: settings.momo_code ?? "", amount: formatRWF(total), name: settings.momo_name || settings.shop_name })}</Notice>
        )}
        {pay === "airtel_code" && (
          <Notice>{t("cart.payInstructionsAirtel", { code: settings.airtel_code ?? "", amount: formatRWF(total) })}</Notice>
        )}
        {pay !== "on_collect" && (
          <Field label={t("cart.transactionId")} hint={t("cart.transactionHint")} htmlFor="reference"><Input id="reference" name="reference" /></Field>
        )}
        <dl className="grid gap-1 border-t border-steel-950/8 pt-4 text-sm">
          <div className="flex justify-between"><dt>{t("common.subtotal")}</dt><dd>{formatRWF(subtotal)}</dd></div>
          {isDelivery && <div className="flex justify-between"><dt>{t("cart.deliveryFee")}</dt><dd>{t("cart.feeToConfirm")}</dd></div>}
          <div className="flex justify-between text-lg font-bold"><dt>{t("common.total")}</dt><dd>{formatRWF(total)}</dd></div>
        </dl>
        {isDelivery && <Notice>{t("cart.feeNotice")}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" variant="signal" disabled={pending} className="h-12 text-base">{pending ? t("cart.placing") : t("cart.placeOrder")}</Button>
      </aside>
    </form>
  );
}

function Choice({ checked, onChange, name, label, sub }: { checked: boolean; onChange: () => void; name: string; label: string; sub?: string }) {
  return (
    <label className={cn("cursor-pointer rounded-md p-3 ring-1 text-sm", checked ? "ring-2 ring-steel-800 bg-steel-50" : "ring-steel-950/15")}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span className="font-semibold">{label}</span>
      {sub && <span className="block text-xs text-steel-600 mt-0.5">{sub}</span>}
    </label>
  );
}
