"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { setLocale } from "@/app/actions/locale";
import { cn } from "@/lib/utils";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("nav");
  const [pending, startTransition] = useTransition();
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t("language")}</span>
      <Languages size={16} className={cn("absolute left-2.5 pointer-events-none", dark ? "text-steel-100" : "text-steel-600")} aria-hidden />
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => startTransition(() => setLocale(e.target.value as Locale))}
        className={cn("h-9 rounded-md bg-transparent pl-8 pr-2 text-sm cursor-pointer focus:outline-none focus-visible:ring-2",
          dark ? "text-white hover:bg-white/10 [&>option]:text-steel-950" : "hover:bg-steel-950/5")}
      >
        {locales.map((l) => <option key={l} value={l}>{localeNames[l]}</option>)}
      </select>
    </label>
  );
}
