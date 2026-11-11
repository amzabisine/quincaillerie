"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { adjustStock, stockIn } from "@/server/actions/stock";
import { formatQty } from "@/lib/utils";
import { Button, Card, Field, Input, Notice, Select } from "@/components/ui";
import type { Product } from "@/types";

export function StockForms({ products, initialProductId }: { products: Product[]; initialProductId?: string }) {
  const t = useTranslations();
  const [productId, setProductId] = useState(initialProductId ?? products[0]?.id ?? "");
  const product = products.find((p) => p.id === productId);
  const [unitId, setUnitId] = useState("");
  const [inState, inAction, inPending] = useActionState(stockIn, null);
  const [adjState, adjAction, adjPending] = useActionState(adjustStock, null);
  const [adjType, setAdjType] = useState("damage");
  const inForm = useRef<HTMLFormElement>(null);
  const adjForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const def = product?.product_units?.find((u) => u.is_default) ?? product?.product_units?.[0];
    setUnitId(def?.id ?? "");
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (inState?.ok) inForm.current?.reset(); }, [inState]);
  useEffect(() => { if (adjState?.ok) adjForm.current?.reset(); }, [adjState]);

  const unit = product?.product_units?.find((u) => u.id === unitId);

  return (
    <div className="grid gap-4">
      <Card>
        <Field label={t("stock.product")} htmlFor="product">
          <Select id="product" value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({formatQty(p.stock)} {t(`units.${p.base_unit}`)})</option>)}
          </Select>
        </Field>
      </Card>

      {product && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="font-bold mb-3">{t("stock.stockIn")}</h2>
            <form ref={inForm} action={inAction} className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("stock.unit")} htmlFor="unit_id">
                  <Select id="unit_id" name="unit_id" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                    {product.product_units?.map((u) => (
                      <option key={u.id} value={u.id}>{t(`units.${u.unit}`)}{u.factor !== 1 ? ` (${formatQty(u.factor)} ${t(`units.${product.base_unit}`)})` : ""}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("stock.quantity")} htmlFor="quantity"><Input id="quantity" name="quantity" type="number" step="any" min={0.001} required /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`${t("stock.unitCost")}${unit ? ` / ${t(`units.${unit.unit}`)}` : ""}`} htmlFor="unit_cost"><Input id="unit_cost" name="unit_cost" type="number" min={0} /></Field>
                <Field label={t("stock.supplier")} htmlFor="supplier"><Input id="supplier" name="supplier" /></Field>
              </div>
              <Field label={t("common.note")} htmlFor="in_note"><Input id="in_note" name="note" /></Field>
              {inState?.error && <Notice tone="error">{inState.error}</Notice>}
              {inState?.ok && <Notice tone="success">{t("common.saved")}</Notice>}
              <Button type="submit" disabled={inPending} className="justify-self-start">{t("common.save")}</Button>
            </form>
          </Card>

          <Card>
            <h2 className="font-bold mb-3">{t("stock.adjust")}</h2>
            <form ref={adjForm} action={adjAction} className="grid gap-3">
              <input type="hidden" name="product_id" value={product.id} />
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("stock.type")} htmlFor="type">
                  <Select id="type" name="type" value={adjType} onChange={(e) => setAdjType(e.target.value)}>
                    {(["damage", "return", "count", "adjustment"] as const).map((x) => <option key={x} value={x}>{t(`stock.types.${x}`)}</option>)}
                  </Select>
                </Field>
                <Field label={`${t("stock.quantity")} (${t(`units.${product.base_unit}`)})`} htmlFor="adj_qty">
                  <Input id="adj_qty" name="quantity" type="number" step="any" required min={adjType === "adjustment" ? undefined : 0} />
                </Field>
              </div>
              {adjType === "count" && <p className="text-xs text-steel-600">{t("stock.countHint")}</p>}
              <Field label={t("common.note")} htmlFor="adj_note"><Input id="adj_note" name="note" required={adjType !== "count"} /></Field>
              {adjState?.error && <Notice tone="error">{adjState.error}</Notice>}
              {adjState?.ok && <Notice tone="success">{t("common.saved")}</Notice>}
              <Button type="submit" variant="secondary" disabled={adjPending} className="justify-self-start">{t("common.save")}</Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
