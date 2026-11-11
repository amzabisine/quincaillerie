"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Minus, Plus } from "lucide-react";
import { formatRWF } from "@/lib/utils";
import { Button, Select } from "@/components/ui";
import { useCart } from "./CartProvider";
import type { CatalogProduct } from "@/types";

/** Unit picker + quantity + add button. Decimal quantities allowed for kg, meter, liter. */
export function AddToCart({ product, compact = false }: { product: CatalogProduct; compact?: boolean }) {
  const t = useTranslations();
  const { add } = useCart();
  const [unitId, setUnitId] = useState(product.units[0]?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const unit = product.units.find((u) => u.id === unitId);
  const decimal = unit && ["kg", "meter", "liter"].includes(unit.unit);

  if (!unit || product.stock_status === "out") {
    return <p className="text-sm font-medium text-danger">{t("store.outOfStock")}</p>;
  }

  function onAdd() {
    add({ unitId: unit!.id, productId: product.id, name: product.name, unit: unit!.unit, price: unit!.retail_price, quantity: qty, image: product.image_url });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="grid gap-2">
      {product.units.length > 1 && (
        <Select aria-label={t("store.chooseUnit")} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          {product.units.map((u) => (
            <option key={u.id} value={u.id}>{t(`units.${u.unit}`)} · {formatRWF(u.retail_price)}</option>
          ))}
        </Select>
      )}
      <div className="flex gap-2">
        <div className="flex h-10 items-center rounded-md ring-1 ring-steel-950/15 bg-white">
          <button type="button" onClick={() => setQty(Math.max(decimal ? 0.5 : 1, qty - (decimal ? 0.5 : 1)))} className="h-full px-2.5" aria-label="-"><Minus size={14} /></button>
          <input
            type="number" inputMode="decimal" min={decimal ? 0.1 : 1} step={decimal ? 0.1 : 1} value={qty}
            onChange={(e) => setQty(Math.max(0, Number(e.target.value)))}
            className="w-14 text-center text-sm bg-transparent focus:outline-none" aria-label={t("common.quantity")}
          />
          <button type="button" onClick={() => setQty(qty + (decimal ? 0.5 : 1))} className="h-full px-2.5" aria-label="+"><Plus size={14} /></button>
        </div>
        <Button type="button" variant="signal" onClick={onAdd} disabled={qty <= 0} className="flex-1">
          {added ? <><Check size={16} aria-hidden /> {compact ? "" : t("store.added")}</> : t("store.addToCart")}
        </Button>
      </div>
    </div>
  );
}
