import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MapPin, MessageCircle, Phone, Search } from "lucide-react";
import { getPublicSettings } from "@/server/services/settings";
import { whatsappLink } from "@/lib/utils";
import { CartProvider } from "@/components/store/CartProvider";
import { CartButton } from "@/components/store/CartButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  const s = await getPublicSettings();
  const wa = s.whatsapp ?? s.phone;

  return (
    <CartProvider>
      <header className="sticky top-0 z-30 bg-steel-950 text-white">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-3">
          <Link href="/" className="font-display text-xl font-bold [font-stretch:80%] shrink-0">{s.shop_name}</Link>
          <form action="/products" className="relative ml-2 hidden md:block flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" aria-hidden />
            <input name="q" placeholder={t("store.searchPlaceholder")} aria-label={t("common.search")}
              className="h-10 w-full rounded-md bg-white/10 pl-9 pr-3 text-sm placeholder:text-steel-400 focus:bg-white focus:text-steel-950 focus:outline-none" />
          </form>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/track" className="hidden sm:inline-flex h-9 items-center rounded-md px-3 text-sm hover:bg-white/10">{t("nav.track")}</Link>
            <LanguageSwitcher dark />
            <CartButton />
          </div>
        </div>
        <form action="/products" className="md:hidden px-4 pb-3">
          <input name="q" placeholder={t("store.searchPlaceholder")} aria-label={t("common.search")}
            className="h-10 w-full rounded-md bg-white/10 px-3 text-sm placeholder:text-steel-400 focus:bg-white focus:text-steel-950 focus:outline-none" />
        </form>
      </header>

      <main>{children}</main>

      <footer className="mt-16 bg-steel-950 text-steel-100">
        <div className="mx-auto max-w-6xl px-4 py-10 grid gap-6 sm:grid-cols-3 text-sm">
          <div>
            <p className="font-display text-lg font-bold text-white [font-stretch:80%]">{s.shop_name}</p>
            {s.tagline && <p className="mt-1 text-steel-400">{s.tagline}</p>}
          </div>
          <ul className="grid gap-2">
            <li className="flex items-center gap-2"><MapPin size={15} aria-hidden /> {s.address}</li>
            {s.phone && <li><a href={`tel:${s.phone}`} className="flex items-center gap-2 hover:text-white"><Phone size={15} aria-hidden /> {s.phone}</a></li>}
            {wa && <li><a href={whatsappLink(wa, "")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white"><MessageCircle size={15} aria-hidden /> WhatsApp</a></li>}
          </ul>
          <div className="sm:text-right">
            <Link href="/login" className="text-steel-400 hover:text-white">{t("nav.staffLogin")}</Link>
          </div>
        </div>
      </footer>
    </CartProvider>
  );
}
