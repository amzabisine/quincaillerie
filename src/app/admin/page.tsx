import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSalesReport, startOfTodayKigali } from "@/lib/reports";
import { formatQty, formatRWF } from "@/lib/utils";
import { Card, PageTitle, Stat } from "@/components/ui";

export default async function Dashboard() {
  const staff = await requireStaff();
  if (staff.role === "cashier") redirect("/admin/pos");
  if (staff.role === "storekeeper") redirect("/admin/stock");

  const t = await getTranslations();
  const supabase = await createClient();
  const [report, { data: orders }, { data: products }] = await Promise.all([
    getSalesReport(startOfTodayKigali(), new Date()),
    supabase.from("orders").select("id, code, customer_name, total, created_at").eq("status", "new").order("created_at").limit(8),
    supabase.from("products").select("id, name, stock, low_stock_level, base_unit").eq("is_active", true).order("stock").limit(200),
  ]);
  const low = (products ?? []).filter((p) => Number(p.stock) <= Number(p.low_stock_level)).slice(0, 10);

  return (
    <div className="grid gap-8">
      <PageTitle>{t("admin.dashboard")}</PageTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={t("dashboard.todaySales")} value={formatRWF(report?.sales_total)} />
        <Stat label={t("dashboard.todaySales")} value={t("dashboard.todayCount", { count: report?.sales_count ?? 0 })} />
        {report?.profit != null && <Stat label={t("dashboard.profitToday")} value={formatRWF(report.profit)} tone="ok" />}
        <Stat label={t("dashboard.debtsTotal")} value={formatRWF(report?.debts_total)} tone="danger" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="font-bold mb-3">{t("dashboard.byMethod")}</h2>
          <dl className="grid gap-2 text-sm">
            {(["cash", "momo", "airtel", "bank"] as const).map((m) => (
              <div key={m} className="flex justify-between"><dt>{t(`methods.${m}`)}</dt><dd className="font-semibold">{formatRWF(report?.by_method?.[m] ?? 0)}</dd></div>
            ))}
          </dl>
        </Card>

        <Card>
          <h2 className="font-bold mb-3"><Link href="/admin/orders" className="hover:underline">{t("dashboard.newOrders")}</Link></h2>
          {!orders?.length ? <p className="text-sm text-steel-600">{t("dashboard.noNewOrders")}</p> : (
            <ul className="grid gap-2 text-sm">
              {orders.map((o) => (
                <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="flex justify-between gap-2 hover:underline"><span>{o.code} · {o.customer_name}</span><span className="font-semibold">{formatRWF(o.total)}</span></Link></li>
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
