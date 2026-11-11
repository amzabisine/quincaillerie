import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MessageCircle, Package } from "lucide-react";
import { getCatalog } from "@/server/services/catalog";
import { getPublicSettings } from "@/server/services/settings";
import { formatRWF, whatsappLink } from "@/lib/utils";
import { AddToCart } from "@/components/store/AddToCart";
import { Badge, buttonClass } from "@/components/ui";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, s, [product]] = await Promise.all([getTranslations(), getPublicSettings(), getCatalog({ ids: [id] })]);
  if (!product) notFound();
  const wa = s.whatsapp ?? s.phone;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 grid gap-8 md:grid-cols-2">
      <div className="aspect-square rounded-lg bg-white ring-1 ring-steel-950/8 overflow-hidden">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-steel-400"><Package size={64} aria-hidden /></div>
        )}
      </div>
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight [font-stretch:75%]">{product.name}</h1>
        <div className="mt-3">
          {product.stock_status === "in" && <Badge tone="ok">{t("store.inStock")}</Badge>}
          {product.stock_status === "low" && <Badge tone="warn">{t("store.lowStock")}</Badge>}
          {product.stock_status === "out" && <Badge tone="danger">{t("store.outOfStock")}</Badge>}
        </div>
        <table className="mt-5 w-full text-sm">
          <caption className="text-left text-steel-600 mb-1">{t("store.chooseUnit")}</caption>
          <tbody className="divide-y divide-steel-950/8">
            {product.units.map((u) => (
              <tr key={u.id}>
                <td className="py-2">{t(`units.${u.unit}`)}</td>
                <td className="py-2 text-right font-semibold">{formatRWF(u.retail_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-5"><AddToCart product={product} /></div>
        {product.description && <p className="mt-6 whitespace-pre-line leading-relaxed text-steel-800">{product.description}</p>}
        {wa && (
          <a href={whatsappLink(wa, `${product.name}?`)} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "mt-6")}>
            <MessageCircle size={16} aria-hidden /> {t("store.whatsapp")}
          </a>
        )}
      </div>
    </div>
  );
}
