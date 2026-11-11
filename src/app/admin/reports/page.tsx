import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/server/auth";
import { getSalesReport } from "@/server/services/reports";
import { startOfTodayKigali } from "@/lib/dates";
import { formatQty, formatRWF } from "@/lib/utils";
import { Card, Input, PageTitle, Stat, buttonClass } from "@/components/ui";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireStaff(["owner", "manager"]);
  const sp = await searchParams;
  const t = await getTranslations();
  const today = startOfTodayKigali();
  const from = sp.from ? new Date(`${sp.from}T00:00:00+02:00`) : today;
  const to = sp.to ? new Date(`${sp.to}T23:59:59+02:00`) : new Date();
  const r = await getSalesReport(from, to);
  const iso = (d: Date) => new Date(d.getTime() + 2 * 3600_000).toISOString().slice(0, 10);
  const week = new Date(today.getTime() - 6 * 86400_000);
  const month = new Date(Date.UTC(today.getUTCFullYear(), new Date(today.getTime() + 2 * 3600_000).getUTCMonth(), 1));

  return (
    <div className="grid gap-6">
      <PageTitle>{t("reports.title")}</PageTitle>
      <div className="flex flex-wrap items-end gap-2">
        <Link href="/admin/reports" className={buttonClass("secondary", "h-9")}>{t("reports.today")}</Link>
        <Link href={`/admin/reports?from=${iso(week)}&to=${iso(today)}`} className={buttonClass("secondary", "h-9")}>{t("reports.week")}</Link>
        <Link href={`/admin/reports?from=${iso(month)}&to=${iso(today)}`} className={buttonClass("secondary", "h-9")}>{t("reports.month")}</Link>
        <form className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-steel-600">{t("reports.from")}<Input type="date" name="from" defaultValue={iso(from)} className="mt-1 h-9" /></label>
          <label className="text-xs text-steel-600">{t("reports.to")}<Input type="date" name="to" defaultValue={iso(to)} className="mt-1 h-9" /></label>
          <button className={buttonClass("primary", "h-9")}>{t("reports.show")}</button>
        </form>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={t("reports.salesTotal")} value={formatRWF(r?.sales_total)} />
        <Stat label={t("reports.salesCount")} value={r?.sales_count ?? 0} />
        {r?.profit != null && <Stat label={t("reports.profit")} value={formatRWF(r.profit)} tone="ok" />}
        <Stat label={t("reports.creditGiven")} value={formatRWF(r?.credit_given)} tone="danger" />
        <Stat label={t("reports.debtCollected")} value={formatRWF(r?.debt_collected)} />
        {r?.stock_value != null && <Stat label={t("reports.stockValue")} value={formatRWF(r.stock_value)} />}
        <Stat label={t("reports.debtsTotal")} value={formatRWF(r?.debts_total)} tone="danger" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold mb-3">{t("reports.byMethod")}</h2>
          <dl className="grid gap-2 text-sm">
            {(["cash", "momo", "airtel", "bank"] as const).map((m) => (
              <div key={m} className="flex justify-between"><dt>{t(`methods.${m}`)}</dt><dd className="font-semibold">{formatRWF(r?.by_method?.[m] ?? 0)}</dd></div>
            ))}
          </dl>
        </Card>
        <Card>
          <h2 className="font-bold mb-3">{t("reports.topProducts")}</h2>
          <ol className="grid gap-2 text-sm">
            {(r?.top_products ?? []).map((p, i) => (
              <li key={p.name} className="flex justify-between gap-3"><span>{i + 1}. {p.name} <span className="text-steel-600">({formatQty(p.base_quantity)})</span></span><span className="font-semibold">{formatRWF(p.revenue)}</span></li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
