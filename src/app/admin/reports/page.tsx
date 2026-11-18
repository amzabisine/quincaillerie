import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireStaff } from "@/server/auth";
import { getMonthlySummary, getSalesReport } from "@/server/services/reports";
import { currentMonth, dayEnd, dayStart, isDay, isMonth, localDate, monthRange } from "@/lib/dates";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { PAYMENT_METHODS } from "@/lib/payments";
import { canSeeProfit } from "@/lib/permissions";
import { cn, formatQty, formatMoney, roundMoney } from "@/lib/utils";
import { RowLink } from "@/components/admin/RowLink";
import { Card, Input, PageTitle, Stat, buttonClass } from "@/components/ui";

type Period = "today" | "week" | "month" | "custom";

/**
 * Which days the report covers (Bukavu dates, "YYYY-MM-DD").
 * ?period=week: last 7 days · ?month=YYYY-MM: that month · ?from=&to=: custom · nothing: today.
 */
function choosePeriod(sp: { period?: string; month?: string; from?: string; to?: string }) {
  const today = localDate();
  const thisMonth = currentMonth();
  if (sp.period === "week") {
    return { period: "week" as Period, fromDay: localDate(new Date(Date.now() - 6 * 86400_000)), toDay: today };
  }
  if (isMonth(sp.month) && sp.month <= thisMonth) {
    const { first, last } = monthRange(sp.month);
    // a past month is shown as a custom period, so "This month" is only highlighted for the current month
    return { period: (sp.month === thisMonth ? "month" : "custom") as Period, fromDay: first, toDay: last < today ? last : today, month: sp.month };
  }
  if (isDay(sp.from) || isDay(sp.to)) {
    let fromDay = isDay(sp.from) ? sp.from : today;
    let toDay = isDay(sp.to) ? sp.to : today;
    if (fromDay > toDay) [fromDay, toDay] = [toDay, fromDay];
    return { period: "custom" as Period, fromDay, toDay };
  }
  return { period: "today" as Period, fromDay: today, toDay: today };
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string; month?: string; from?: string; to?: string }> }) {
  const staff = await requireStaff(["owner", "manager"]);
  const sp = await searchParams;
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const today = localDate();
  const { period, fromDay, toDay, month } = choosePeriod(sp);
  const showProfit = canSeeProfit(staff.role);
  const [r, months] = await Promise.all([
    getSalesReport(dayStart(fromDay), toDay === today ? new Date() : dayEnd(toDay)),
    showProfit ? getMonthlySummary(12) : Promise.resolve([]),
  ]);

  const dayLabel = (day: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
  const monthLabel = (m: string) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));
  const periodName = { today: t("reports.today"), week: t("reports.week"), month: t("reports.month"), custom: t("reports.custom") }[period];
  const periodDates = month ? monthLabel(month) : fromDay === toDay ? dayLabel(fromDay) : `${dayLabel(fromDay)} → ${dayLabel(toDay)}`;

  const presets: { id: Period; href: string; label: string }[] = [
    { id: "today", href: "/admin/reports", label: t("reports.today") },
    { id: "week", href: "/admin/reports?period=week", label: t("reports.week") },
    { id: "month", href: `/admin/reports?month=${currentMonth()}`, label: t("reports.month") },
  ];
  const costOfGoods = r?.profit != null ? roundMoney(Number(r.sales_total) - Number(r.profit)) : null;
  const netTone = (n: number) => (n < 0 ? "text-danger" : "text-ok");

  return (
    <div className="grid gap-6">
      <PageTitle>{t("reports.title")}</PageTitle>
      <div className="flex flex-wrap items-end gap-2">
        {presets.map((p) => (
          <Link key={p.id} href={p.href} aria-current={period === p.id ? "page" : undefined}
            className={buttonClass(period === p.id ? "primary" : "secondary", "h-9")}>{p.label}</Link>
        ))}
        <form className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-steel-600">{t("reports.from")}<Input type="date" name="from" max={today} defaultValue={fromDay} className="mt-1 h-9" /></label>
          <label className="text-xs text-steel-600">{t("reports.to")}<Input type="date" name="to" max={today} defaultValue={toDay} className="mt-1 h-9" /></label>
          <button className={buttonClass(period === "custom" && !month ? "primary" : "secondary", "h-9")}>{t("reports.show")}</button>
        </form>
      </div>

      <div className="rounded-lg bg-steel-800 px-4 py-3 text-white" aria-live="polite">
        <p className="text-xs uppercase tracking-wide text-steel-100/80">{t("reports.showing")}</p>
        <p className="text-lg font-bold"><span className="capitalize">{periodName}</span>: <span className="capitalize">{periodDates}</span></p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={t("reports.salesTotal")} value={formatMoney(r?.sales_total)} />
        <Stat label={t("reports.salesCount")} value={r?.sales_count ?? 0} />
        {r?.net_profit != null && <Stat label={t("reports.netProfit")} value={formatMoney(r.net_profit)} tone={Number(r.net_profit) < 0 ? "danger" : "ok"} />}
        <Stat label={t("reports.creditGiven")} value={formatMoney(r?.credit_given)} tone="danger" />
        <Stat label={t("reports.debtCollected")} value={formatMoney(r?.debt_collected)} />
        {r?.stock_value != null && <Stat label={t("reports.stockValue")} value={formatMoney(r.stock_value)} />}
        <Stat label={t("reports.debtsTotal")} value={formatMoney(r?.debts_total)} tone="danger" />
      </div>

      {r?.profit != null && r.net_profit != null && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="font-bold mb-3">{t("reports.profitTitle")}</h2>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between"><dt>{t("reports.salesTotal")}</dt><dd className="font-semibold">{formatMoney(r.sales_total)}</dd></div>
              <div className="flex justify-between text-steel-600"><dt>− {t("reports.costOfGoods")}</dt><dd>{formatMoney(costOfGoods)}</dd></div>
              <div className="flex justify-between border-t border-steel-950/10 pt-2"><dt className="font-semibold">= {t("reports.profit")}</dt><dd className="font-bold">{formatMoney(r.profit)}</dd></div>
              <div className="flex justify-between text-steel-600">
                <dt>− <Link href={`/admin/expenses?month=${toDay.slice(0, 7)}`} className="underline underline-offset-2">{t("reports.expenses")}</Link></dt>
                <dd>{formatMoney(r.expenses_total)}</dd>
              </div>
              <div className={cn("flex justify-between border-t border-steel-950/10 pt-2 text-base font-bold", netTone(Number(r.net_profit)))}>
                <dt>= {t("reports.netProfit")}</dt><dd>{formatMoney(r.net_profit)}</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <h2 className="font-bold mb-3">{t("reports.expensesByCategory")}</h2>
            {!Number(r.expenses_total) ? <p className="text-sm text-steel-600">{t("expenses.none")}</p> : (
              <dl className="grid gap-2 text-sm">
                {EXPENSE_CATEGORIES.filter((c) => Number(r.expenses_by_category?.[c] ?? 0) > 0).map((c) => (
                  <div key={c} className="flex justify-between"><dt>{t(`expenses.categories.${c}`)}</dt><dd className="font-semibold">{formatMoney(r.expenses_by_category?.[c])}</dd></div>
                ))}
              </dl>
            )}
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold mb-3">{t("reports.byMethod")}</h2>
          <dl className="grid gap-2 text-sm">
            {PAYMENT_METHODS.map((m) => (
              <div key={m} className="flex justify-between"><dt>{t(`methods.${m}`)}</dt><dd className="font-semibold">{formatMoney(r?.by_method?.[m] ?? 0)}</dd></div>
            ))}
          </dl>
        </Card>
        <Card>
          <h2 className="font-bold mb-3">{t("reports.topProducts")}</h2>
          <ol className="grid gap-2 text-sm">
            {(r?.top_products ?? []).map((p, i) => (
              <li key={p.name} className="flex justify-between gap-3"><span>{i + 1}. {p.name} <span className="text-steel-600">({formatQty(p.base_quantity)})</span></span><span className="font-semibold">{formatMoney(p.revenue)}</span></li>
            ))}
          </ol>
        </Card>
      </div>

      {months.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-1">{t("reports.byMonth")}</h2>
          <p className="mb-3 text-sm text-steel-600">{t("reports.byMonthHelp")}</p>
          <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-steel-950/8">
            <table className="w-full text-sm">
              <thead className="bg-steel-50 text-left text-steel-600">
                <tr>
                  <th className="p-3">{t("reports.monthColumn")}</th><th className="p-3 text-right">{t("reports.salesTotal")}</th>
                  <th className="p-3 text-right">{t("reports.profit")}</th><th className="p-3 text-right">{t("reports.expenses")}</th>
                  <th className="p-3 text-right">{t("reports.netProfit")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-950/8">
                {months.map((m) => (
                  <RowLink key={m.month} href={`/admin/reports?month=${m.month}`} className={m.month === month ? "bg-signal-50" : ""}>
                    <td className="p-3 capitalize"><Link href={`/admin/reports?month=${m.month}`} className="font-semibold hover:underline">{monthLabel(m.month)}</Link></td>
                    <td className="p-3 text-right whitespace-nowrap">{formatMoney(m.sales_total)}</td>
                    <td className="p-3 text-right whitespace-nowrap">{formatMoney(m.gross_profit)}</td>
                    <td className="p-3 text-right whitespace-nowrap text-steel-600">{Number(m.expenses) ? `−${formatMoney(m.expenses)}` : formatMoney(0)}</td>
                    <td className={cn("p-3 text-right whitespace-nowrap font-bold", netTone(Number(m.net_profit)))}>{formatMoney(m.net_profit)}</td>
                  </RowLink>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
