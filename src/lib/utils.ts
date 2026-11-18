import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** The shop's currency. Amounts are dollars with cents (numeric(14,2) in the database). */
export const CURRENCY = { code: "USD", symbol: "$" } as const;

/** 1250.5 -> "1 250,50 $" */
export function formatMoney(amount: number | string | null | undefined) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount ?? 0)) + ` ${CURRENCY.symbol}`;
}

/** Rounds to cents and removes floating point noise (0.1 + 0.2 -> 0.3). */
export function roundMoney(amount: number) {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

/** 2.5 -> "2,5", 10 -> "10" */
export function formatQty(q: number | string) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(Number(q));
}

/**
 * Mobile numbers from DR Congo (+243) and Rwanda (+250). Returns "+243XXXXXXXXX" / "+250XXXXXXXXX", or null.
 * Numbers typed without a country code: 09.. / 08.. are Congolese, 07.. are Rwandan.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  const congo = (local: string) => (/^[89]\d{8}$/.test(local) ? `+243${local}` : null);
  const rwanda = (local: string) => (/^7[2389]\d{7}$/.test(local) ? `+250${local}` : null);
  if (digits.startsWith("243")) return congo(digits.slice(3).replace(/^0/, ""));
  if (digits.startsWith("250")) return rwanda(digits.slice(3).replace(/^0/, ""));
  const local = digits.replace(/^0/, "");
  return congo(local) ?? rwanda(local);
}

export function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

/** Category name in the current language */
export function categoryName(c: { name_fr: string; name_en: string; name_sw: string; name_rw?: string }, locale: string) {
  if (locale === "rw" && c.name_rw) return c.name_rw;
  return locale === "en" ? c.name_en : locale === "sw" ? c.name_sw : c.name_fr;
}

/** Turns a Supabase/Postgres error into a readable message */
export function dbError(error: { message: string } | null | undefined) {
  return error?.message?.replace(/^.*?ERROR:\s*/, "") ?? "Unknown error";
}
