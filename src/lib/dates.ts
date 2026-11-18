/** Start of today in the shop's time zone: Bukavu, Central Africa Time (UTC+2, no daylight saving). */
export function startOfTodayLocal() {
  const now = new Date();
  const local = new Date(now.getTime() + 2 * 3600_000);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - 2 * 3600_000);
}
