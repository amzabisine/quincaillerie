"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Minus, Plus, Search, Trash2, UserPlus, X } from "lucide-react";
import { completeSale } from "@/server/actions/sales";
import { createCustomer } from "@/server/actions/customers";
import { categoryName, cn, formatQty, formatRWF } from "@/lib/utils";
import { Button, Input, Notice, Select } from "@/components/ui";
import { PaymentOptions, computePayment, initialPayment, type PaymentState } from "./PaymentOptions";
import type { Category, Customer, Product } from "@/types";

interface Line {
  unitId: string;
  productId: string;
  name: string;
  unit: string;
  factor: number;
  retail: number;
  wholesale: number | null;
  qty: number;
}

export function Pos({ products, categories, initialCustomers }: { products: Product[]; categories: Category[]; initialCustomers: Customer[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerId, setCustomerId] = useState<string>("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<PaymentState>(initialPayment);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const customer = customers.find((c) => c.id === customerId) ?? null;
  const wholesale = customer?.type === "wholesale";
  const stockById = useMemo(() => new Map(products.map((p) => [p.id, Number(p.stock)])), [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) =>
      (!category || p.category_id === category) &&
      (!q || p.name.toLowerCase().includes(q) || p.sku?.toLowerCase() === q || p.product_units?.some((u) => u.barcode === query.trim()))
    ).slice(0, 60);
  }, [products, query, category]);

  const priceOf = (l: Line) => (wholesale ? l.wholesale ?? l.retail : l.retail);
  const subtotal = lines.reduce((s, l) => s + Math.round(priceOf(l) * l.qty), 0);
  const total = Math.max(0, subtotal - discount);
  const { paid, remaining, partialInvalid } = computePayment(payment, total);

  function usedBase(productId: string, except?: string) {
    return lines.filter((l) => l.productId === productId && l.unitId !== except).reduce((s, l) => s + l.qty * l.factor, 0);
  }

  function addProduct(p: Product, unitId?: string) {
    const unit = p.product_units?.find((u) => u.id === unitId) ?? p.product_units?.find((u) => u.is_default) ?? p.product_units?.[0];
    if (!unit) return;
    setError("");
    const existing = lines.find((l) => l.unitId === unit.id);
    if (usedBase(p.id) + unit.factor > Number(p.stock) + 1e-9) {
      setError(t("pos.stockLeft", { qty: formatQty(p.stock), unit: t(`units.${p.base_unit}`) }) + ` · ${p.name}`);
      return;
    }
    if (existing) setLines(lines.map((l) => (l.unitId === unit.id ? { ...l, qty: l.qty + 1 } : l)));
    else setLines([...lines, { unitId: unit.id, productId: p.id, name: p.name, unit: unit.unit, factor: Number(unit.factor), retail: unit.retail_price, wholesale: unit.wholesale_price, qty: 1 }]);
  }

  function setQty(unitId: string, qty: number) {
    const line = lines.find((l) => l.unitId === unitId);
    if (!line) return;
    const max = ((stockById.get(line.productId) ?? 0) - usedBase(line.productId, unitId)) / line.factor;
    setLines(lines.map((l) => (l.unitId === unitId ? { ...l, qty: Math.max(0, Math.min(qty, max)) } : l)));
  }

  function changeUnit(line: Line, newUnitId: string) {
    const p = products.find((x) => x.id === line.productId);
    const u = p?.product_units?.find((x) => x.id === newUnitId);
    if (!u) return;
    setLines(lines.map((l) => (l.unitId === line.unitId ? { ...l, unitId: u.id, unit: u.unit, factor: Number(u.factor), retail: u.retail_price, wholesale: u.wholesale_price, qty: 1 } : l)));
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const code = query.trim();
    for (const p of products) {
      const u = p.product_units?.find((x) => x.barcode === code);
      if (u || p.sku === code) { addProduct(p, u?.id); setQuery(""); return; }
    }
    if (filtered.length === 1) { addProduct(filtered[0]); setQuery(""); }
  }

  function reset() {
    setLines([]); setDiscount(0); setPayment(initialPayment); setCustomerId(""); setError("");
    searchRef.current?.focus();
  }

  function submit() {
    setError("");
    if (partialInvalid) { setError(t("pos.partialInvalid", { max: formatRWF(total - 1) })); return; }
    if (remaining > 0 && !customer) { setError(t("pos.creditNeedsCustomer")); return; }
    startTransition(async () => {
      const res = await completeSale({
        items: lines.filter((l) => l.qty > 0).map((l) => ({ unit_id: l.unitId, quantity: l.qty })),
        customerId: customer?.id ?? null,
        discount,
        payment: paid > 0 ? { method: payment.method, amount: paid, reference: payment.reference } : null,
      });
      if (!res.ok) { setError(res.error ?? t("common.error")); return; }
      reset();
      router.push(`/admin/sales/${res.id}?print=1`);
    });
  }

  async function addCustomer(form: FormData) {
    const res = await createCustomer({
      name: String(form.get("name") || ""), phone: String(form.get("phone") || ""),
      type: form.get("type") === "wholesale" ? "wholesale" : "retail",
    });
    if (res.ok && res.customer) {
      setCustomers([res.customer, ...customers]);
      setCustomerId(res.customer.id);
      setShowNewCustomer(false);
    } else setError(res.error ?? t("common.error"));
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
      {/* Products */}
      <section className="min-w-0">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" aria-hidden />
          <Input ref={searchRef} autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onSearchKey}
            placeholder={t("pos.search")} aria-label={t("pos.search")} className="h-12 pl-10 text-base" />
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 text-sm">
          <button onClick={() => setCategory(null)} className={cn("whitespace-nowrap rounded-md px-3 py-1.5 ring-1 ring-steel-950/15", !category ? "bg-steel-950 text-white" : "bg-white")}>{t("common.all")}</button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)} className={cn("whitespace-nowrap rounded-md px-3 py-1.5 ring-1 ring-steel-950/15", category === c.id ? "bg-steel-950 text-white" : "bg-white")}>
              {categoryName(c, locale)}
            </button>
          ))}
        </div>
        <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {filtered.map((p) => {
            const u = p.product_units?.find((x) => x.is_default) ?? p.product_units?.[0];
            const low = Number(p.stock) <= Number(p.low_stock_level);
            const out = Number(p.stock) <= 0;
            return (
              <li key={p.id}>
                <button onClick={() => addProduct(p)} disabled={out || !u}
                  className="h-full w-full rounded-lg bg-white p-3 text-left ring-1 ring-steel-950/8 hover:ring-steel-800 disabled:opacity-40">
                  <span className="block text-sm font-semibold leading-tight line-clamp-2">{p.name}</span>
                  <span className={cn("mt-1 block text-xs", low ? "text-danger font-semibold" : "text-steel-600")}>
                    {formatQty(p.stock)} {t(`units.${p.base_unit}`)}
                  </span>
                  {u && <span className="mt-1 block text-sm font-bold">{formatRWF(wholesale ? u.wholesale_price ?? u.retail_price : u.retail_price)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Cart */}
      <section className="xl:sticky xl:top-4 self-start rounded-lg bg-white ring-1 ring-steel-950/8">
        <div className="border-b border-steel-950/8 p-4">
          <h2 className="font-bold">{t("pos.cart")}</h2>
          <div className="mt-3 flex gap-2">
            <Select aria-label={t("pos.customer")} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">{t("pos.walkIn")}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.type === "wholesale" ? " ★" : ""}{c.balance > 0 ? ` (${formatRWF(c.balance)})` : ""}</option>
              ))}
            </Select>
            <Button type="button" variant="secondary" onClick={() => setShowNewCustomer(!showNewCustomer)} aria-label={t("pos.newCustomer")} className="px-3">
              {showNewCustomer ? <X size={16} /> : <UserPlus size={16} />}
            </Button>
          </div>
          {showNewCustomer && (
            <form action={addCustomer} className="mt-2 grid gap-2 rounded-md bg-steel-50 p-3">
              <Input name="name" placeholder={t("common.name")} required />
              <Input name="phone" type="tel" placeholder={t("common.phone")} />
              <Select name="type" defaultValue="retail">
                <option value="retail">{t("pos.retail")}</option>
                <option value="wholesale">{t("pos.wholesale")}</option>
              </Select>
              <Button type="submit" variant="secondary">{t("common.add")}</Button>
            </form>
          )}
          {customer && <p className="mt-2 text-xs text-steel-600">{wholesale ? t("pos.wholesale") : t("pos.retail")}</p>}
        </div>

        {lines.length === 0 ? (
          <p className="p-6 text-center text-sm text-steel-600">{t("pos.empty")}</p>
        ) : (
          <ul className="max-h-[40dvh] overflow-y-auto divide-y divide-steel-950/8">
            {lines.map((l) => {
              const p = products.find((x) => x.id === l.productId);
              const decimal = ["kg", "meter", "liter"].includes(l.unit);
              return (
                <li key={l.unitId} className="p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-tight">{l.name}</p>
                    <button onClick={() => setLines(lines.filter((x) => x.unitId !== l.unitId))} aria-label={t("common.remove")} className="text-steel-400 hover:text-danger"><Trash2 size={15} /></button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex h-9 items-center rounded-md ring-1 ring-steel-950/15">
                      <button onClick={() => setQty(l.unitId, l.qty - (decimal ? 0.5 : 1))} className="px-2 h-full" aria-label="-"><Minus size={13} /></button>
                      <input type="number" inputMode="decimal" step="any" value={l.qty} onChange={(e) => setQty(l.unitId, Number(e.target.value))}
                        className="w-14 bg-transparent text-center focus:outline-none" aria-label={t("common.quantity")} />
                      <button onClick={() => setQty(l.unitId, l.qty + (decimal ? 0.5 : 1))} className="px-2 h-full" aria-label="+"><Plus size={13} /></button>
                    </div>
                    {(p?.product_units?.length ?? 0) > 1 ? (
                      <select value={l.unitId} onChange={(e) => changeUnit(l, e.target.value)} className="h-9 rounded-md px-1 text-sm ring-1 ring-steel-950/15" aria-label={t("products.unit")}>
                        {p!.product_units!.map((u) => <option key={u.id} value={u.id}>{t(`units.${u.unit}`)}</option>)}
                      </select>
                    ) : <span className="text-steel-600">{t(`units.${l.unit}`)}</span>}
                    <span className="ml-auto font-semibold">{formatRWF(priceOf(l) * l.qty)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="grid gap-3 border-t border-steel-950/8 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <label htmlFor="discount">{t("common.discount")}</label>
            <Input id="discount" type="number" min={0} step={100} value={discount || ""} onChange={(e) => setDiscount(Math.min(subtotal, Math.max(0, Number(e.target.value))))} className="h-9 w-32 text-right" />
          </div>
          <div className="flex justify-between text-xl font-bold"><span>{t("common.total")}</span><span>{formatRWF(total)}</span></div>

          <PaymentOptions value={payment} onChange={setPayment} total={total} currentBalance={customer ? customer.balance : null} />
          {remaining > 0 && !customer && <Notice tone="error">{t("pos.creditNeedsCustomer")}</Notice>}

          {error && <Notice tone="error">{error}</Notice>}
          <Button onClick={submit} disabled={pending || lines.length === 0 || total <= 0 || partialInvalid || (remaining > 0 && !customer)} className="h-12 text-base">
            {pending ? t("pos.completing") : t("pos.complete")}
          </Button>
        </div>
      </section>
    </div>
  );
}
