import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/server/auth";
import { getSalesReport } from "@/server/services/reports";
import { listNewOrders } from "@/server/services/orders";
import { listLowStock } from "@/server/services/products";
import { currentMonth, dayStart, startOfTodayLocal } from "@/lib/dates";
import { PAYMENT_METHODS } from "@/lib/payments";
import { formatQty, formatMoney } from "@/lib/utils";
import { Card, PageTitle, Stat } from "@/components/ui";

export default async function Dashboard() {
  const staff = await requireStaff();
  if (staff.role === "cashier") redirect("/admin/pos");
  if (staff.role === "storekeeper") redirect("/admin/stock");

  const t = await getTranslations();
  const [report, monthReport, orders, low] = await Promise.all([
    getSalesReport(startOfTodayLocal(), new Date()),
    getSalesReport(dayStart(`${currentMonth()}-01`), new Date()),
    listNewOrders(8),
    listLowStock(10),
  ]);

  return (
    <div className="grid gap-8">
      <PageTitle>{t("admin.dashboard")}</PageTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={t("dashboard.todaySales")} value={formatMoney(report?.sales_total)} />
        <Stat label={t("dashboard.todaySales")} value={t("dashboard.todayCount", { count: report?.sales_count ?? 0 })} />
        {report?.profit != null && <Stat label={t("dashboard.profitToday")} value={formatMoney(report.profit)} tone="ok" />}
        <Stat label={t("dashboard.debtsTotal")} value={formatMoney(report?.debts_total)} tone="danger" />
        {monthReport?.net_profit != null && (
          <Link href={`/admin/reports?month=${currentMonth()}`} className="rounded-lg hover:ring-2 hover:ring-steel-800">
            <Stat label={t("dashboard.netProfitMonth")} value={formatMoney(monthReport.net_profit)} tone={Number(monthReport.net_profit) < 0 ? "danger" : "ok"} />
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="font-bold mb-3">{t("dashboard.byMethod")}</h2>
          <dl className="grid gap-2 text-sm">
            {PAYMENT_METHODS.map((m) => (
              <div key={m} className="flex justify-between"><dt>{t(`methods.${m}`)}</dt><dd className="font-semibold">{formatMoney(report?.by_method?.[m] ?? 0)}</dd></div>
            ))}
          </dl>
        </Card>

        <Card>
          <h2 className="font-bold mb-3"><Link href="/admin/orders" className="hover:underline">{t("dashboard.newOrders")}</Link></h2>
          {!orders?.length ? <p className="text-sm text-steel-600">{t("dashboard.noNewOrders")}</p> : (
            <ul className="grid gap-2 text-sm">
              {orders.map((o) => (
                <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="flex justify-between gap-2 hover:underline"><span>{o.code} · {o.customer_name}</span><span className="font-semibold">{formatMoney(o.total)}</span></Link></li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-bold mb-3"><Link href="/admin/products?low=1" className="hover:underline">{t("dashboard.lowStock")}</Link></h2>
          {!low.length ? <p className="text-sm text-steel-600">{t("dashboard.noLowStock")}</p> : (
            <ul className="grid gap-2 text-sm">
              {low.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <Link href={`/admin/products/${p.id}`} className="hover:underline">{p.name}</Link>
                  <span className="font-semibold text-danger">{formatQty(p.stock)} {t(`units.${p.base_unit}`)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
