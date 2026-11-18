import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireStaff } from "@/server/auth";
import { listExpenses } from "@/server/services/expenses";
import { addMonths, currentMonth, isMonth, localDate } from "@/lib/dates";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { formatMoney, roundMoney } from "@/lib/utils";
import { ExpenseForm } from "@/components/admin/ExpenseForms";
import { RowLink } from "@/components/admin/RowLink";
import { Card, PageTitle, Stat, buttonClass } from "@/components/ui";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireStaff(["owner", "manager"]);
  const sp = await searchParams;
  const thisMonth = currentMonth();
  const month = isMonth(sp.month) && sp.month <= thisMonth ? sp.month : thisMonth;
  const [t, locale, expenses] = await Promise.all([getTranslations(), getLocale(), listExpenses(month)]);

  const total = roundMoney(expenses.reduce((s, e) => s + Number(e.amount), 0));
  const byCategory = EXPENSE_CATEGORIES
    .map((c) => ({ c, amount: roundMoney(expenses.filter((e) => e.category === c).reduce((s, e) => s + Number(e.amount), 0)) }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const monthName = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

  return (
    <div className="grid gap-6">
      <PageTitle>{t("expenses.title")}</PageTitle>

      <Card><h2 className="font-bold mb-3">{t("expenses.add")}</h2><ExpenseForm today={localDate()} /></Card>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/admin/expenses?month=${addMonths(month, -1)}`} className={buttonClass("secondary", "h-9 px-3")} aria-label={t("expenses.previousMonth")}>←</Link>
        <h2 className="min-w-44 text-center text-lg font-bold capitalize">{monthName}</h2>
        {month < thisMonth
          ? <Link href={`/admin/expenses?month=${addMonths(month, 1)}`} className={buttonClass("secondary", "h-9 px-3")} aria-label={t("expenses.nextMonth")}>→</Link>
          : <span className={buttonClass("secondary", "h-9 px-3 opacity-40")} aria-hidden>→</span>}
        {month !== thisMonth && <Link href="/admin/expenses" className={buttonClass("ghost", "h-9")}>{t("expenses.thisMonth")}</Link>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr] items-start">
        <div className="grid gap-3">
          <Stat label={t("expenses.monthTotal")} value={formatMoney(total)} tone="danger" />
          {byCategory.length > 0 && (
            <Card>
              <h3 className="font-bold mb-2 text-sm">{t("expenses.byCategory")}</h3>
              <dl className="grid gap-1.5 text-sm">
                {byCategory.map(({ c, amount }) => (
                  <div key={c} className="flex justify-between gap-3"><dt>{t(`expenses.categories.${c}`)}</dt><dd className="font-semibold">{formatMoney(amount)}</dd></div>
                ))}
              </dl>
            </Card>
          )}
          <Link href={`/admin/reports?month=${month}`} className="text-sm font-semibold underline underline-offset-4">{t("expenses.seeProfit")}</Link>
        </div>

        {!expenses.length ? <Card><p className="text-steel-600">{t("expenses.none")}</p></Card> : (
          <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-steel-950/8">
            <table className="w-full text-sm">
              <thead className="bg-steel-50 text-left text-steel-600">
                <tr><th className="p-3">{t("common.date")}</th><th className="p-3">{t("expenses.category")}</th><th className="p-3">{t("common.note")}</th><th className="p-3">{t("expenses.paidWith")}</th><th className="p-3">{t("expenses.by")}</th><th className="p-3 text-right">{t("expenses.amount")}</th></tr>
              </thead>
              <tbody className="divide-y divide-steel-950/8">
                {expenses.map((e) => (
                  <RowLink key={e.id} href={`/admin/expenses/${e.id}`}>
                    <td className="p-3 whitespace-nowrap"><Link href={`/admin/expenses/${e.id}`} className="hover:underline">{e.spent_on}</Link></td>
                    <td className="p-3 font-semibold">{t(`expenses.categories.${e.category}`)}</td>
                    <td className="p-3 text-steel-600">{e.note || "—"}</td>
                    <td className="p-3">{t(`methods.${e.method}`)}</td>
                    <td className="p-3">{e.by?.full_name ?? ""}</td>
                    <td className="p-3 text-right font-semibold whitespace-nowrap">{formatMoney(e.amount)}</td>
                  </RowLink>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
