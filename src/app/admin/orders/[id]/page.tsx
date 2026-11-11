import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MessageCircle, Phone } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { confirmPayment, setOrderStatus } from "@/app/actions/orders";
import { formatQty, formatRWF, whatsappLink } from "@/lib/utils";
import { CompleteOrderForm } from "@/components/admin/CompleteOrderForm";
import { DeliveryFeeForm } from "@/components/admin/DeliveryFeeForm";
import { Badge, Card, PageTitle, buttonClass } from "@/components/ui";
import type { PaymentMethod } from "@/types";

export default async function OrderAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff(["owner", "manager", "cashier"]);
  const t = await getTranslations();
  const supabase = await createClient();
  const [{ data: o }, { data: settings }] = await Promise.all([
    supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle(),
    supabase.from("settings").select("shop_name").single(),
  ]);
  if (!o) notFound();
  const open = !o.sale_id && o.status !== "cancelled";
  const isDelivery = o.fulfilment === "delivery";
  const feePending = isDelivery && !o.delivery_fee_set;
  const msg = isDelivery && o.delivery_fee_set
    ? t("orders.feeMessage", { name: o.customer_name, code: o.code, fee: formatRWF(o.delivery_fee), total: formatRWF(o.total), shop: settings?.shop_name ?? "" })
    : t("orders.customerMessage", { name: o.customer_name, code: o.code, shop: settings?.shop_name ?? "" });
  const defaultMethod: PaymentMethod = o.payment_method === "momo_code" ? "momo" : o.payment_method === "airtel_code" ? "airtel" : "cash";

  return (
    <div className="grid gap-5 max-w-3xl">
      <PageTitle>{o.code}</PageTitle>
      <div className="flex flex-wrap gap-2">
        <Badge tone={o.status === "new" ? "warn" : o.status === "cancelled" ? "danger" : "info"}>{t(`order.status.${o.status}`)}</Badge>
        <Badge tone={o.payment_status === "confirmed" ? "ok" : o.payment_status === "claimed" ? "warn" : "muted"}>{t(`order.payment.${o.payment_status}`)}</Badge>
        <Badge>{t(`cart.${o.fulfilment}`)}</Badge>
      </div>

      <Card className="grid gap-2 text-sm">
        <p className="text-base font-semibold">{o.customer_name}</p>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:${o.customer_phone}`} className={buttonClass("secondary", "h-9")}><Phone size={15} aria-hidden /> {o.customer_phone}</a>
          <a href={whatsappLink(o.customer_phone, msg)} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "h-9")}><MessageCircle size={15} aria-hidden /> {t("orders.whatsappCustomer")}</a>
        </div>
        {o.address && <p>{t("cart.address")}: {o.address}</p>}
        {o.note && <p className="italic">“{o.note}”</p>}
        <p>{t("cart.payment")}: {o.payment_method === "momo_code" ? t("cart.payMomo") : o.payment_method === "airtel_code" ? t("cart.payAirtel") : t("cart.payOnCollect")}
          {o.payment_reference && <> · {t("orders.paymentRef")}: <strong>{o.payment_reference}</strong></>}</p>
      </Card>

      <ul className="divide-y divide-steel-950/8 rounded-lg bg-white ring-1 ring-steel-950/8 text-sm">
        {o.order_items.map((i: any) => (
          <li key={i.id} className="flex justify-between gap-3 p-3"><span>{i.product_name} · {formatQty(i.quantity)} {t(`units.${i.unit}`)}</span><span className="font-semibold">{formatRWF(i.line_total)}</span></li>
        ))}
        {isDelivery && (
          <li className="flex justify-between p-3"><span>{t("cart.deliveryFee")}</span>
            <span className={feePending ? "font-semibold text-danger" : undefined}>{feePending ? t("cart.feeToConfirm") : formatRWF(o.delivery_fee)}</span></li>
        )}
        <li className="flex justify-between p-3 text-base font-bold"><span>{t("common.total")}</span><span>{formatRWF(o.total)}</span></li>
      </ul>

      {open && (
        <Card className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {o.payment_status !== "confirmed" && o.payment_method !== "on_collect" && (
              <form action={confirmPayment.bind(null, o.id)}><button className={buttonClass("primary")}>{t("orders.confirmPayment")}</button></form>
            )}
            {o.status === "new" && <form action={setOrderStatus.bind(null, o.id, "confirmed")}><button className={buttonClass("secondary")}>{t("orders.confirm")}</button></form>}
            {o.status !== "ready" && o.status !== "out_for_delivery" && (
              o.fulfilment === "pickup"
                ? <form action={setOrderStatus.bind(null, o.id, "ready")}><button className={buttonClass("secondary")}>{t("orders.markReady")}</button></form>
                : <form action={setOrderStatus.bind(null, o.id, "out_for_delivery")}><button className={buttonClass("secondary")}>{t("orders.outForDelivery")}</button></form>
            )}
          </div>
          {isDelivery && <DeliveryFeeForm orderId={o.id} current={o.delivery_fee} isSet={o.delivery_fee_set} />}
          {!feePending && <CompleteOrderForm orderId={o.id} total={o.total} defaultMethod={defaultMethod} defaultReference={o.payment_reference ?? ""} />}
          <form action={setOrderStatus.bind(null, o.id, "cancelled")}><button className={buttonClass("danger", "h-9")}>{t("orders.cancel")}</button></form>
        </Card>
      )}
      {o.sale_id && <Link href={`/admin/sales/${o.sale_id}`} className={buttonClass("secondary", "justify-self-start")}>{t("sales.receipt")}</Link>}
    </div>
  );
}
