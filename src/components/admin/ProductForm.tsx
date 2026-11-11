"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Package, Plus, Trash2 } from "lucide-react";
import { saveProduct } from "@/app/actions/products";
import { UNITS } from "@/lib/units";
import { categoryName, formatRWF } from "@/lib/utils";
import { Button, Card, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import type { Category, Product, ProductUnit } from "@/types";

type UnitDraft = Omit<ProductUnit, "id" | "product_id" | "barcode"> & { id?: string; barcode: string; key: string };

export function ProductForm({ product, categories, showCost = false }: { product?: Product; categories: Category[]; showCost?: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const [state, action, pending] = useActionState(saveProduct.bind(null, product?.id ?? null), null);
  const [baseUnit, setBaseUnit] = useState(product?.base_unit ?? "piece");
  // Buying price per BASE unit. Each unit row shows it multiplied by the unit's factor.
  const [cost, setCost] = useState(Number(product?.cost_price ?? 0));
  const [costChanged, setCostChanged] = useState(false);
  const unitCost = (factor: number) => Math.round(cost * factor * 100) / 100;
  const [units, setUnits] = useState<UnitDraft[]>(
    product?.product_units?.length
      ? product.product_units.map((u) => ({ ...u, barcode: u.barcode ?? "", key: u.id }))
      : [{ key: "new-0", unit: "piece", factor: 1, retail_price: 0, wholesale_price: null, barcode: "", is_default: true, show_online: true }]
  );

  const update = (key: string, patch: Partial<UnitDraft>) =>
    setUnits(units.map((u) => (u.key === key ? { ...u, ...patch } : patch.is_default ? { ...u, is_default: false } : u)));

  return (
    <form action={action} className="grid gap-5 max-w-4xl">
      <input type="hidden" name="units" value={JSON.stringify(units.map(({ key, ...u }) => u))} />
      <input type="hidden" name="image_url" value={product?.image_url ?? ""} />
      {showCost && costChanged && <input type="hidden" name="cost_price" value={cost} />}

      <Card className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-4">
            <Field label={t("products.name")} htmlFor="name"><Input id="name" name="name" defaultValue={product?.name} required /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("products.category")} htmlFor="category_id">
                <Select id="category_id" name="category_id" defaultValue={product?.category_id ?? ""}>
                  <option value="">{t("products.noCategory")}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{categoryName(c, locale)}</option>)}
                </Select>
              </Field>
              <Field label={t("products.sku")} htmlFor="sku"><Input id="sku" name="sku" defaultValue={product?.sku ?? ""} /></Field>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-1.5">{t("products.image")}</p>
            <label className="grid h-36 w-36 cursor-pointer place-items-center overflow-hidden rounded-lg bg-steel-50 ring-1 ring-steel-950/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {product?.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <Package size={32} className="text-steel-400" aria-hidden />}
              <input type="file" name="image" accept="image/*" className="sr-only" />
            </label>
          </div>
        </div>
        <Field label={t("products.description")} htmlFor="description"><Textarea id="description" name="description" rows={3} defaultValue={product?.description} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("products.baseUnit")} hint={t("products.baseUnitHint")} htmlFor="base_unit">
            <Select id="base_unit" name="base_unit" value={baseUnit} onChange={(e) => setBaseUnit(e.target.value)}>
              {UNITS.map((u) => <option key={u} value={u}>{t(`units.${u}`)}</option>)}
            </Select>
          </Field>
          <Field label={`${t("products.lowLevel")} (${t(`units.${baseUnit}`)})`} htmlFor="low_stock_level">
            <Input id="low_stock_level" name="low_stock_level" type="number" step="any" min={0} defaultValue={product?.low_stock_level ?? 5} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} className="h-4 w-4" /> {t("products.active")}</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="show_online" defaultChecked={product?.show_online ?? true} className="h-4 w-4" /> {t("products.showOnline")}</label>
        </div>
      </Card>

      <Card className="grid gap-3">
        <div>
          <h2 className="font-bold">{t("products.units")}</h2>
          <p className="text-sm text-steel-600">{t("products.unitsHint")}</p>
          {showCost && <p className="text-sm text-steel-600">{t("products.buyingPriceHint")}</p>}
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${showCost ? "min-w-[860px]" : "min-w-[720px]"}`}>
            <thead className="text-left text-steel-600">
              <tr>
                <th className="py-2 pr-2">{t("products.unit")}</th><th className="py-2 pr-2">{t("products.factor")}</th>
                {showCost && <th className="py-2 pr-2">{t("products.buyingPrice")}</th>}
                <th className="py-2 pr-2">{t("products.retailPrice")}</th><th className="py-2 pr-2">{t("products.wholesalePrice")}</th>
                <th className="py-2 pr-2">{t("products.barcode")}</th><th className="py-2 pr-2">{t("products.defaultUnit")}</th><th className="py-2">Online</th><th />
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.key} className="align-top">
                  <td className="py-1 pr-2">
                    <Select value={u.unit} onChange={(e) => update(u.key, { unit: e.target.value })} aria-label={t("products.unit")}>
                      {UNITS.map((x) => <option key={x} value={x}>{t(`units.${x}`)}</option>)}
                    </Select>
                  </td>
                  <td className="py-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <Input type="number" step="any" min={0.001} value={u.factor} onChange={(e) => update(u.key, { factor: Number(e.target.value) })} className="w-20" aria-label={t("products.factor")} />
                      <span className="text-steel-600 whitespace-nowrap">{t(`units.${baseUnit}`)}</span>
                    </div>
                  </td>
                  {showCost && (
                    <td className="py-1 pr-2 align-top">
                      <Input type="number" min={0} step="any" value={cost > 0 ? unitCost(u.factor) : ""} className="w-28" aria-label={t("products.buyingPrice")}
                        onChange={(e) => { if (u.factor > 0) { setCost(Number(e.target.value || 0) / u.factor); setCostChanged(true); } }} />
                    </td>
                  )}
                  <td className="py-1 pr-2 align-top">
                    <Input type="number" min={0} value={u.retail_price || ""} onChange={(e) => update(u.key, { retail_price: Number(e.target.value) })} className="w-28" aria-label={t("products.retailPrice")} required />
                    {showCost && <Profit price={u.retail_price} cost={unitCost(u.factor)} label={t("products.profit")} />}
                  </td>
                  <td className="py-1 pr-2 align-top">
                    <Input type="number" min={0} value={u.wholesale_price ?? ""} onChange={(e) => update(u.key, { wholesale_price: e.target.value ? Number(e.target.value) : null })} className="w-28" aria-label={t("products.wholesalePrice")} />
                    {showCost && <Profit price={u.wholesale_price} cost={unitCost(u.factor)} label={t("products.profit")} />}
                  </td>
                  <td className="py-1 pr-2"><Input value={u.barcode} onChange={(e) => update(u.key, { barcode: e.target.value })} className="w-32" aria-label={t("products.barcode")} /></td>
                  <td className="py-1 pr-2 text-center"><input type="radio" name="default_unit" checked={u.is_default} onChange={() => update(u.key, { is_default: true })} aria-label={t("products.defaultUnit")} /></td>
                  <td className="py-1 text-center"><input type="checkbox" checked={u.show_online} onChange={(e) => update(u.key, { show_online: e.target.checked })} aria-label="Online" /></td>
                  <td className="py-1 pl-2">
                    {units.length > 1 && <button type="button" onClick={() => setUnits(units.filter((x) => x.key !== u.key))} aria-label={t("common.remove")} className="p-2 text-steel-400 hover:text-danger"><Trash2 size={16} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="secondary" className="justify-self-start"
          onClick={() => setUnits([...units, { key: `new-${Date.now()}`, unit: UNITS.find((x) => !units.some((u) => u.unit === x)) ?? "box", factor: 1, retail_price: 0, wholesale_price: null, barcode: "", is_default: false, show_online: true }])}>
          <Plus size={16} aria-hidden /> {t("products.addUnit")}
        </Button>
      </Card>

      {!product && <Notice>{t("products.afterSave")}</Notice>}
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" disabled={pending} className="justify-self-start">{t("common.save")}</Button>
    </form>
  );
}

/** Profit for one unit at this selling price: green when positive, red when selling at a loss. */
function Profit({ price, cost, label }: { price: number | null; cost: number; label: string }) {
  if (!price || cost <= 0) return null;
  const profit = Math.round(price - cost);
  return (
    <p className={`mt-0.5 text-xs font-semibold ${profit < 0 ? "text-danger" : "text-ok"}`}>
      {label}: {profit > 0 ? "+" : ""}{formatRWF(profit)}
    </p>
  );
}
