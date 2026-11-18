// The shop's time zone: Bukavu, Central Africa Time (UTC+2, no daylight saving).
const OFFSET_MS = 2 * 3600_000;

/** Start of today in Bukavu time */
export function startOfTodayLocal() {
  const local = new Date(Date.now() + OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - OFFSET_MS);
}

/** The Bukavu calendar date of a moment, as "YYYY-MM-DD" */
export function localDate(d: Date = new Date()) {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** The current month in Bukavu, as "YYYY-MM" */
export function currentMonth() {
  return localDate().slice(0, 7);
}

/** True for a valid "YYYY-MM" */
export function isMonth(value: string | undefined): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** True for a valid "YYYY-MM-DD" */
export function isDay(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

/** "2026-11" -> { first: "2026-11-01", last: "2026-11-30" } */
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { first: `${month}-01`, last: `${month}-${String(last).padStart(2, "0")}` };
}

/** "2026-11" plus or minus some months -> "2026-12" */
export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** Start of a Bukavu day ("YYYY-MM-DD") as a moment */
export const dayStart = (day: string) => new Date(`${day}T00:00:00+02:00`);
/** End of a Bukavu day ("YYYY-MM-DD") as a moment */
export const dayEnd = (day: string) => new Date(`${day}T23:59:59.999+02:00`);
