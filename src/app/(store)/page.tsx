import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { MessageCircle, Phone } from "lucide-react";
import { getCatalog, getCategories, getPublicSettings } from "@/lib/catalog";
import { categoryName, whatsappLink } from "@/lib/utils";
import { ProductCard } from "@/components/store/ProductCard";
import { CategoryIcon } from "@/components/CategoryIcon";
import { buttonClass } from "@/components/ui";

export default async function StoreHome() {
  const [t, locale, s, categories, products] = await Promise.all([
    getTranslations(), getLocale(), getPublicSettings(), getCategories(), getCatalog({ limit: 12 }),
  ]);
  const wa = s.whatsapp ?? s.phone;

  return (
    <>
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-10 sm:pt-16">
          <h1 className="max-w-3xl text-4xl sm:text-6xl font-extrabold leading-[0.95] [font-stretch:75%]">{t("store.heroTitle")}</h1>
          <div className="ruler mt-6 max-w-md" aria-hidden />
          <p className="mt-6 max-w-xl text-steel-600 sm:text-lg">{t("store.heroText")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 mt-10">
        <h2 className="text-xl font-bold mb-4">{t("store.categories")}</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/products?category=${c.id}`} className="flex items-center gap-3 rounded-lg bg-white p-4 ring-1 ring-steel-950/8 hover:ring-steel-950/30">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-steel-100 text-steel-800"><CategoryIcon name={c.icon} /></span>
                <span className="text-sm font-semibold leading-tight">{categoryName(c, locale)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 mt-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-bold">{t("store.newArrivals")}</h2>
          <Link href="/products" className="text-sm font-semibold underline underline-offset-4">{t("store.allProducts")}</Link>
        </div>
        {products.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-steel-600 ring-1 ring-steel-950/8">{t("store.noProducts")}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {(s.phone || wa) && (
        <section className="mx-auto max-w-6xl px-4 mt-14">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-signal-50 p-6 ring-1 ring-signal/40">
            <div>
              <h2 className="text-xl font-bold">{t("store.contactTitle")}</h2>
              <p className="text-steel-600">{t("store.contactText")}</p>
            </div>
            <div className="flex gap-2">
              {s.phone && <a href={`tel:${s.phone}`} className={buttonClass("secondary")}><Phone size={16} aria-hidden /> {t("store.callUs")}</a>}
              {wa && <a href={whatsappLink(wa, "")} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}><MessageCircle size={16} aria-hidden /> {t("store.whatsapp")}</a>}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
