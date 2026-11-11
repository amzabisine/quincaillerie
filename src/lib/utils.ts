import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRWF(amount: number | null | undefined) {
  return new Intl.NumberFormat("fr-RW").format(Math.round(amount ?? 0)) + " RWF";
}

/** 2.5 -> "2,5", 10 -> "10" */
export function formatQty(q: number | string) {
  return new Intl.NumberFormat("fr-RW", { maximumFractionDigits: 3 }).format(Number(q));
}

export function normalizeRwandaPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let local = input.replace(/\D/g, "");
  if (local.startsWith("250")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);
  return /^7[2389]\d{7}$/.test(local) ? `+250${local}` : null;
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
