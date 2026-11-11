import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { requireStaff } from "@/server/auth";
import { canSeeProfit } from "@/lib/permissions";
import { listProducts } from "@/server/services/products";
import { getCategories } from "@/server/services/catalog";
import { categoryName, cn, formatQty, formatRWF } from "@/lib/utils";
import { Badge, Card, Input, PageTitle, buttonClass } from "@/components/ui";

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<{ q?: string; low?: string }> }) {
  const staff = await requireStaff(["owner", "manager", "storekeeper"]);
  const { q, low } = await searchParams;
  const [t, locale, categories] = await Promise.all([getTranslations(), getLocale(), getCategories()]);
  const products = (await listProducts({ q })).filter((p) => !low || Number(p.stock) <= Number(p.low_stock_level));
  const showCost = canSeeProfit(staff.role);

  return (
    <div>
      <PageTitle action={<Link href="/admin/products/new" className={buttonClass("primary")}><Plus size={16} aria-hidden /> {t("products.add")}</Link>}>{t("products.title")}</PageTitle>
      <form className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder={t("pos.search")} className="max-w-xs" aria-label={t("products.filter")} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="low" value="1" defaultChecked={!!low} /> {t("products.lowOnly")}</label>
        <button className={buttonClass("secondary")}>{t("common.search")}</button>
      </form>
      {!products.length ? <Card><p className="text-steel-600">{t("products.noProducts")}</p></Card> : (
        <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-steel-950/8">
          <table className="w-full text-sm">
            <thead className="bg-steel-50 text-left text-steel-600">
              <tr>
                <th className="p-3">{t("products.name")}</th><th className="p-3">{t("products.category")}</th>
                <th className="p-3 text-right">{t("products.stock")}</th><th className="p-3 text-right">{t("products.retailPrice")}</th>
                {showCost && <th className="p-3 text-right">{t("products.cost")}</th>}
                {showCost && <th className="p-3 text-right">{t("products.value")}</th>}
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-950/8">
              {products.map((p: any) => {
                const cat = categories.find((c) => c.id === p.category_id);
                const def = p.product_units.find((u: any) => u.is_default) ?? p.product_units[0];
                const isLow = Number(p.stock) <= Number(p.low_stock_level);
                return (
                  <tr key={p.id} className={cn(!p.is_active && "text-steel-400")}>
                    <td className="p-3"><Link href={`/admin/products/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>{p.sku && <span className="block text-xs text-steel-600">{p.sku}</span>}</td>
                    <td className="p-3">{cat ? categoryName(cat, locale) : "—"}</td>
                    <td className={cn("p-3 text-right font-semibold whitespace-nowrap", isLow && "text-danger")}>{formatQty(p.stock)} {t(`units.${p.base_unit}`)}</td>
                    <td className="p-3 text-right whitespace-nowrap">{def ? `${formatRWF(def.retail_price)} / ${t(`units.${def.unit}`)}` : "—"}</td>
                    {showCost && <td className="p-3 text-right whitespace-nowrap">{formatRWF(p.cost_price)}</td>}
                    {showCost && <td className="p-3 text-right whitespace-nowrap">{formatRWF(Number(p.stock) * Number(p.cost_price))}</td>}
                    <td className="p-3 text-right space-x-1">
                      {!p.is_active && <Badge>{t("products.inactive")}</Badge>}
                      <Link href={`/admin/stock?product=${p.id}`} className="text-xs font-semibold underline">{t("admin.stock")}</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
