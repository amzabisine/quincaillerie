import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Package } from "lucide-react";
import { formatRWF } from "@/lib/utils";
import { Badge } from "@/components/ui";
import { AddToCart } from "./AddToCart";
import type { CatalogProduct } from "@/types";

export async function ProductCard({ product }: { product: CatalogProduct }) {
  const t = await getTranslations();
  const main = product.units[0];
  return (
    <div className="flex flex-col rounded-lg bg-white ring-1 ring-steel-950/8 overflow-hidden">
      <Link href={`/products/${product.id}`} className="block aspect-square bg-steel-50">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center text-steel-400"><Package size={40} aria-hidden /></div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link href={`/products/${product.id}`} className="font-semibold leading-snug hover:underline line-clamp-2">{product.name}</Link>
        {main && (
          <p>
            <span className="font-display text-lg font-bold [font-stretch:85%]">{formatRWF(main.retail_price)}</span>
            <span className="text-sm text-steel-600"> {t("store.perUnit", { unit: t(`units.${main.unit}`) })}</span>
          </p>
        )}
        <div>
          {product.stock_status === "in" && <Badge tone="ok">{t("store.inStock")}</Badge>}
          {product.stock_status === "low" && <Badge tone="warn">{t("store.lowStock")}</Badge>}
        </div>
        <div className="mt-auto"><AddToCart product={product} compact /></div>
      </div>
    </div>
  );
}
