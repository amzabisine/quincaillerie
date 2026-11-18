import "server-only";
import { getTranslations } from "next-intl/server";
import { getMonthlySummary, getSalesReport } from "@/server/services/reports";
import { listProductsSoldBetween, listSalesBetween } from "@/server/services/sales";
import { listExpensesBetween } from "@/server/services/expenses";
import { getShopSettings } from "@/server/services/settings";
import { dayEnd, dayStart, localDate } from "@/lib/dates";
import { choosePeriod, type ReportParams } from "@/lib/report-period";
import type { StaffProfile } from "@/types";

export type Translate = Awaited<ReturnType<typeof getTranslations>>;

/** Everything an exported report shows, for the period in the request. Owner and manager only (checked by the caller). */
export async function gatherReport(params: ReportParams, staff: StaffProfile, locale: string) {
  const today = localDate();
  const { period, fromDay, toDay, month } = choosePeriod(params);
  const from = dayStart(fromDay);
  const to = toDay === today ? new Date() : dayEnd(toDay);
  const [t, settings, report, months, sales, products, expenses] = await Promise.all([
    getTranslations(), getShopSettings(), getSalesReport(from, to), getMonthlySummary(12),
    listSalesBetween(from, to), listProductsSoldBetween(from, to), listExpensesBetween(fromDay, toDay),
  ]);

  const dayLabel = (day: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
  const monthLabel = (m: string) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));
  const periodName = { today: t("reports.today"), week: t("reports.week"), month: t("reports.month"), custom: t("reports.custom") }[period];
  const periodDates = month ? monthLabel(month) : fromDay === toDay ? dayLabel(fromDay) : `${dayLabel(fromDay)} - ${dayLabel(toDay)}`;
  const exportedAt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lubumbashi" }).format(new Date());

  return {
    t, settings, report, months, sales, products, expenses, fromDay, toDay, monthLabel,
    periodText: `${periodName}: ${periodDates}`,
    exportedText: t("reports.export.exportedBy", { name: staff.full_name || "-", date: exportedAt }),
    fileName: `rapport-${settings.shop_name.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "boutique"}-${month ?? (fromDay === toDay ? fromDay : `${fromDay}_${toDay}`)}`,
  };
}

export type ReportData = Awaited<ReturnType<typeof gatherReport>>;
