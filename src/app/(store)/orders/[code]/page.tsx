import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatQty, formatRWF } from "@/lib/utils";
import { Badge, Notice, buttonClass } from "@/components/ui";
import type { OrderStatus } from "@/types";

const STEPS: OrderStatus[] = ["new", "confirmed", "ready", "completed"];

interface TrackedOrder {
  code: string; status: OrderStatus; payment_status: "unpaid" | "claimed" | "confirmed"; fulfilment: "pickup" | "delivery";
  subtotal: number; delivery_fee: number; delivery_fee_set?: boolean; total: number; created_at: string;
  items: { name: string; unit: string; quantity: number; line_total: number }[];
}

export default async function OrderPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ phone?: string; new?: string }> }) {
  const { code } = await params;
  const { phone = "", new: isNew } = await searchParams;
  const t = await getTranslations();
  const supabase = await createClient();
  const { data } = await supabase.rpc("track_order", { p_code: decodeURIComponent(code), p_phone: phone });
  const order = data as TrackedOrder | null;

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 grid gap-4">
        <Notice tone="error">{t("order.notFound")}</Notice>
        <Link href="/track" className={buttonClass("secondary")}>{t("order.lookupTitle")}</Link>
      </div>
    );
  }

  const steps = order.fulfilment === "delivery" ? STEPS.map((s) => (s === "ready" ? "out_for_delivery" : s)) : STEPS;
  const idx = steps.indexOf(order.status);
  const current = idx >= 0 ? idx : order.status === "ready" ? 1 : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {isNew && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-ok-50 p-4 text-ok">
          <CheckCircle2 size={22} aria-hidden className="shrink-0" />
          <div><p className="font-semibold">{t("order.thanks")}</p><p className="text-sm">{t("order.saveCode")}</p></div>
        </div>
      )}
      <h1 className="text-3xl font-extrabold [font-stretch:75%]">{t("order.title", { code: order.code })}</h1>
      <p className="mt-1 text-sm text-steel-600">{new Date(order.created_at).toLocaleString()}</p>

      {order.status === "cancelled" ? (
        <div className="mt-6"><Badge tone="danger">{t("order.status.cancelled")}</Badge></div>
      ) : (
        <ol className="mt-6 grid grid-cols-4 gap-2 text-xs sm:text-sm">
          {steps.map((s, i) => (
            <li key={s} className={i <= current ? "font-semibold" : "text-steel-400"}>
              <span className={`block h-1.5 rounded-full mb-2 ${i <= current ? "bg-signal" : "bg-steel-100"}`} />
              {t(`order.status.${s}`)}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6"><Badge tone={order.payment_status === "confirmed" ? "ok" : order.payment_status === "claimed" ? "warn" : "muted"}>{t(`order.payment.${order.payment_status}`)}</Badge></div>

      <ul className="mt-6 divide-y divide-steel-950/8 rounded-lg bg-white ring-1 ring-steel-950/8 text-sm">
        {order.items.map((i, idx) => (
          <li key={idx} className="flex justify-between gap-3 p-3">
            <span>{i.name} · {formatQty(i.quantity)} {t(`units.${i.unit}`)}</span>
            <span className="font-semibold">{formatRWF(i.line_total)}</span>
          </li>
        ))}
        {order.fulfilment === "delivery" && (
          <li className="flex justify-between p-3"><span>{t("cart.deliveryFee")}</span>
            <span>{order.delivery_fee_set === false ? t("cart.feeToConfirm") : formatRWF(order.delivery_fee)}</span></li>
        )}
        <li className="flex justify-between p-3 text-base font-bold"><span>{t("common.total")}</span><span>{formatRWF(order.total)}</span></li>
      </ul>
    </div>
  );
}
