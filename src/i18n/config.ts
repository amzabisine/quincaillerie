export const locales = ["fr", "en", "sw", "rw"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const localeNames: Record<Locale, string> = { fr: "Français", en: "English", sw: "Kiswahili", rw: "Kinyarwanda" };
