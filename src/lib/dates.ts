/** Start of today in Rwanda time (UTC+2) */
export function startOfTodayKigali() {
  const now = new Date();
  const kigali = new Date(now.getTime() + 2 * 3600_000);
  kigali.setUTCHours(0, 0, 0, 0);
  return new Date(kigali.getTime() - 2 * 3600_000);
}
