import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { requireStaff } from "@/server/auth";
import { getSale } from "@/server/services/sales";
import { getShopSettings } from "@/server/services/settings";
import { voidSale } from "@/server/actions/sales";
import { formatQty, formatRWF, whatsappLink } from "@/lib/utils";
import { PrintButton } from "@/components/admin/AutoPrint";
import { Badge, Input, buttonClass } from "@/components/ui";

export default async function SalePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ print?: string }> }) {
  const { id } = await params;
  const { print } = await searchParams;
  const staff = await requireStaff(["owner", "manager", "cashier"]);
  const t = await getTranslations();
  const [sale, settings] = await Promise.all([getSale(id), getShopSettings()]);
  if (!sale) notFound();

  const message = t("sales.receiptMessage", { number: sale.number, shop: settings?.shop_name ?? "", total: formatRWF(sale.total) })
    + "\n" + sale.sale_items.map((i: any) => `${i.product_name} ${formatQty(i.quantity)} ${t(`units.${i.unit}`)}: ${formatRWF(i.line_total)}`).join("\n");

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr] items-start">
      <div className="receipt w-full max-w-sm rounded-lg bg-white p-5 font-mono text-[13px] shadow-sm ring-1 ring-steel-950/8">
        <div className="text-center">
          <p className="font-sans text-base font-bold">{settings?.shop_name}</p>
          <p>{settings?.address}</p>
          {settings?.phone && <p>{settings.phone}</p>}
          {settings?.tin && <p>TIN: {settings.tin}</p>}
        </div>
        <div className="my-3 border-t border-dashed border-steel-400" />
        <p>{t("sales.receipt")} #{sale.number}</p>
        <p>{new Date(sale.created_at).toLocaleString()}</p>
        <p>{t("sales.cashier")}: {sale.cashier?.full_name}</p>
        {sale.customer_name && <p>{t("orders.customer")}: {sale.customer_name}</p>}
        <div className="my-3 border-t border-dashed border-steel-400" />
        <table className="w-full">
          <tbody>
            {sale.sale_items.map((i: any) => (
              <tr key={i.id} className="align-top">
                <td className="pb-1.5">{i.product_name}<br /><span className="text-steel-600">{formatQty(i.quantity)} {t(`units.${i.unit}`)} × {formatRWF(i.unit_price)}</span></td>
                <td className="pb-1.5 text-right whitespace-nowrap">{formatRWF(i.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="my-3 border-t border-dashed border-steel-400" />
        <dl className="grid gap-0.5">
          <div className="flex justify-between"><dt>{t("common.subtotal")}</dt><dd>{formatRWF(sale.subtotal)}</dd></div>
          {sale.discount > 0 && <div className="flex justify-between"><dt>{t("common.discount")}</dt><dd>-{formatRWF(sale.discount)}</dd></div>}
          {sale.total - sale.subtotal + sale.discount > 0 && <div className="flex justify-between"><dt>{t("cart.deliveryFee")}</dt><dd>{formatRWF(sale.total - sale.subtotal + sale.discount)}</dd></div>}
          <div className="flex justify-between text-base font-bold"><dt>{t("common.total")}</dt><dd>{formatRWF(sale.total)}</dd></div>
          {sale.payments.map((p: any) => (
            <div key={p.id} className="flex justify-between"><dt>{t(`methods.${p.method}`)}{p.reference ? ` (${p.reference})` : ""}</dt><dd>{formatRWF(p.amount)}</dd></div>
          ))}
          {sale.credit_amount > 0 && <div className="flex justify-between font-bold"><dt>{t("pos.remaining")}</dt><dd>{formatRWF(sale.credit_amount)}</dd></div>}
          {sale.credit_amount > 0 && sale.customer && <div className="flex justify-between"><dt>{t("pos.newBalance")}</dt><dd>{formatRWF(sale.customer.balance)}</dd></div>}
        </dl>
        {sale.status === "voided" && <p className="mt-3 text-center font-bold text-danger">{t("sales.voided")}</p>}
        <div className="my-3 border-t border-dashed border-steel-400" />
        <p className="text-center">{settings?.receipt_footer}</p>
      </div>

      <div className="no-print grid gap-3 content-start">
        <div className="flex flex-wrap gap-2">
          <PrintButton label={t("common.print")} auto={print === "1" && sale.status !== "voided"} />
          {sale.customer?.phone && (
            <a href={whatsappLink(sale.customer.phone, message)} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
              <MessageCircle size={16} aria-hidden /> {t("sales.shareWhatsapp")}
            </a>
          )}
          <Link href="/admin/pos" className={buttonClass("signal")}>{t("sales.newSale")}</Link>
        </div>
        {sale.status === "voided" && sale.void_reason && <Badge tone="danger">{sale.void_reason}</Badge>}
        {sale.status === "completed" && (staff.role === "owner" || staff.role === "manager") && (
          <form action={voidSale.bind(null, sale.id)} className="flex max-w-md gap-2">
            <Input name="reason" placeholder={t("sales.voidReason")} required />
            <button className={buttonClass("danger")}>{t("sales.void")}</button>
          </form>
        )}
      </div>
    </div>
  );
}
