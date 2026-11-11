import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatQty } from "@/lib/utils";
import { StockForms } from "@/components/admin/StockForms";
import { Card, PageTitle } from "@/components/ui";
import type { Product } from "@/types";

export default async function StockPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  await requireStaff(["owner", "manager", "storekeeper"]);
  const { product } = await searchParams;
  const t = await getTranslations();
  const supabase = await createClient();
  const [{ data: products }, { data: movements }] = await Promise.all([
    supabase.from("products").select("id, name, base_unit, stock, product_units(*)").eq("is_active", true).order("name"),
    (() => {
      let q = supabase.from("stock_movements").select("*, product:products(name, base_unit), by:profiles(full_name)").order("created_at", { ascending: false }).limit(100);
      if (product) q = q.eq("product_id", product);
      return q;
    })(),
  ]);

  return (
    <div className="grid gap-8">
      <PageTitle>{t("stock.title")}</PageTitle>
      <StockForms products={(products ?? []) as unknown as Product[]} initialProductId={product} />
      <section>
        <h2 className="text-lg font-bold mb-3">{t("stock.history")}</h2>
        {!movements?.length ? <Card><p className="text-steel-600">{t("stock.noHistory")}</p></Card> : (
          <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-steel-950/8">
            <table className="w-full text-sm">
              <thead className="bg-steel-50 text-left text-steel-600">
                <tr><th className="p-3">{t("common.date")}</th><th className="p-3">{t("stock.product")}</th><th className="p-3">{t("stock.type")}</th><th className="p-3 text-right">{t("stock.quantity")}</th><th className="p-3 text-right">{t("stock.after")}</th><th className="p-3">{t("stock.by")}</th><th className="p-3">{t("common.note")}</th></tr>
              </thead>
              <tbody className="divide-y divide-steel-950/8">
                {movements.map((m: any) => (
                  <tr key={m.id}>
                    <td className="p-3 whitespace-nowrap">{new Date(m.created_at).toLocaleString()}</td>
                    <td className="p-3">{m.product?.name}</td>
                    <td className="p-3">{t(`stock.types.${m.type}`)}</td>
                    <td className={cn("p-3 text-right font-semibold whitespace-nowrap", Number(m.quantity) < 0 ? "text-danger" : "text-ok")}>
                      {Number(m.quantity) > 0 ? "+" : ""}{formatQty(m.quantity)} {t(`units.${m.product?.base_unit ?? "piece"}`)}
                    </td>
                    <td className="p-3 text-right">{formatQty(m.stock_after)}</td>
                    <td className="p-3">{m.by?.full_name ?? ""}</td>
                    <td className="p-3 text-steel-600">{[m.supplier, m.note].filter(Boolean).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
