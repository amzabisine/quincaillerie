"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { locales, LOCALE_COOKIE, type Locale } from "@/i18n/config";

export async function setLocale(locale: Locale) {
  if (!locales.includes(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}
