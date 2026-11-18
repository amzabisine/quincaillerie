import { currentMonth, isDay, isMonth, localDate, monthRange } from "./dates";

export type ReportPeriod = "today" | "week" | "month" | "custom";
export interface ReportParams { period?: string; month?: string; from?: string; to?: string }

/**
 * Which days a report covers (Bukavu dates, "YYYY-MM-DD"). Used by the Reports page and the exports.
 * ?period=week: last 7 days · ?month=YYYY-MM: that month · ?from=&to=: custom · nothing: today.
 */
export function choosePeriod(sp: ReportParams): { period: ReportPeriod; fromDay: string; toDay: string; month?: string } {
  const today = localDate();
  const thisMonth = currentMonth();
  if (sp.period === "week") return { period: "week", fromDay: localDate(new Date(Date.now() - 6 * 86400_000)), toDay: today };
  if (isMonth(sp.month) && sp.month <= thisMonth) {
    const { first, last } = monthRange(sp.month);
    // a past month counts as custom, so "This month" is only highlighted for the current month
    return { period: sp.month === thisMonth ? "month" : "custom", fromDay: first, toDay: last < today ? last : today, month: sp.month };
  }
  if (isDay(sp.from) || isDay(sp.to)) {
    let fromDay = isDay(sp.from) ? sp.from : today;
    let toDay = isDay(sp.to) ? sp.to : today;
    if (fromDay > toDay) [fromDay, toDay] = [toDay, fromDay];
    return { period: "custom", fromDay, toDay };
  }
  return { period: "today", fromDay: today, toDay: today };
}

/** The same period as query string parameters (for export links). */
export function periodQuery(sp: ReportParams) {
  const q = new URLSearchParams();
  for (const k of ["period", "month", "from", "to"] as const) if (sp[k]) q.set(k, sp[k]!);
  return q.toString();
}
