import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getCatalog, getCategories } from "@/lib/catalog";
import { categoryName, cn } from "@/lib/utils";
import { ProductCard } from "@/components/store/ProductCard";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q, category } = await searchParams;
  const [t, locale, categories, products] = await Promise.all([
    getTranslations(), getLocale(), getCategories(), getCatalog({ q, category }),
  ]);
  const active = categories.find((c) => c.id === category);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-extrabold [font-stretch:75%]">
        {q ? `“${q}”` : active ? categoryName(active, locale) : t("store.allProducts")}
      </h1>
      <nav className="mt-4 flex gap-2 overflow-x-auto pb-2 text-sm" aria-label={t("store.categories")}>
        <Link href="/products" className={cn("whitespace-nowrap rounded-md px-3 py-1.5 ring-1 ring-steel-950/15", !category && "bg-steel-950 text-white ring-steel-950")}>{t("common.all")}</Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/products?category=${c.id}`} className={cn("whitespace-nowrap rounded-md px-3 py-1.5 ring-1 ring-steel-950/15 bg-white", category === c.id && "bg-steel-950 text-white ring-steel-950")}>
            {categoryName(c, locale)}
          </Link>
        ))}
      </nav>
      {products.length === 0 ? (
        <p className="mt-6 rounded-lg bg-white p-6 text-steel-600 ring-1 ring-steel-950/8">{t("store.noProducts")}</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
