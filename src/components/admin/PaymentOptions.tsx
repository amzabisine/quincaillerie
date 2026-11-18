"use client";

import { useTranslations } from "next-intl";
import { cn, formatMoney, roundMoney } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/payments";
import { Input } from "@/components/ui";
import type { PaymentMethod } from "@/types";

export type PayMode = "full" | "partial" | "later";

export interface PaymentState {
  mode: PayMode;
  method: PaymentMethod;
  partialAmount: string; // amount paid now (partial)
  cashReceived: string;  // optional, only to calculate change
  reference: string;     // mobile money / bank transaction ID
}

export const initialPayment: PaymentState = { mode: "full", method: "cash", partialAmount: "", cashReceived: "", reference: "" };

/** How much is paid now and how much goes on credit. */
export function computePayment(p: PaymentState, total: number) {
  const paid = p.mode === "full" ? total : p.mode === "partial" ? Math.min(total, Math.max(0, roundMoney(Number(p.partialAmount) || 0))) : 0;
  const remaining = Math.max(0, roundMoney(total - paid));
  const received = Number(p.cashReceived) || 0;
  const change = p.method === "cash" && received > paid ? roundMoney(received - paid) : 0;
  const partialInvalid = p.mode === "partial" && (paid <= 0 || paid >= total);
  return { paid, remaining, change, partialInvalid };
}

/**
 * Paid in full, partial payment (rest becomes debt), or pay later (everything becomes debt).
 * Partial and pay later need a customer; the parent checks that.
 */
export function PaymentOptions({ value, onChange, total, currentBalance }: {
  value: PaymentState;
  onChange: (next: PaymentState) => void;
  total: number;
  currentBalance?: number | null; // selected customer's existing debt
}) {
  const t = useTranslations();
  const set = (patch: Partial<PaymentState>) => onChange({ ...value, ...patch });
  const { paid, remaining, change } = computePayment(value, total);
  const modes: PayMode[] = ["full", "partial", "later"];

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t("pos.paymentType")}>
        {modes.map((m) => (
          <button key={m} type="button" role="radio" aria-checked={value.mode === m} onClick={() => set({ mode: m })}
            className={cn("min-h-10 rounded-md px-1.5 py-1 text-xs font-semibold ring-1 leading-tight",
              value.mode === m ? "bg-steel-800 text-white ring-steel-800" : "ring-steel-950/15 hover:bg-steel-50")}>
            {t(`pos.mode.${m}`)}
          </button>
        ))}
      </div>

      {value.mode !== "later" && (
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t("pos.paymentMethod")}>
          {PAYMENT_METHODS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={value.method === m} onClick={() => set({ method: m })}
              className={cn("h-9 rounded-md text-xs font-semibold ring-1", value.method === m ? "bg-signal text-steel-950 ring-signal" : "ring-steel-950/15 hover:bg-steel-50")}>
              {t(`methods.${m}`)}
            </button>
          ))}
        </div>
      )}

      {value.mode === "partial" && (
        <label className="text-xs text-steel-600">{t("pos.amountPaidNow")}
          <Input type="number" inputMode="decimal" step="0.01" min={0.01} max={Math.max(0.01, roundMoney(total - 0.01))} value={value.partialAmount}
            onChange={(e) => set({ partialAmount: e.target.value })} className="mt-1 h-10 text-base" autoFocus />
        </label>
      )}

      {value.mode !== "later" && (
        <div className="grid grid-cols-2 gap-2">
          {value.method === "cash" ? (
            <label className="text-xs text-steel-600">{t("pos.cashReceived")}
              <Input type="number" inputMode="decimal" step="0.01" min={0} value={value.cashReceived} placeholder={String(paid || "")}
                onChange={(e) => set({ cashReceived: e.target.value })} className="mt-1 h-9" />
            </label>
          ) : (
            <label className="col-span-2 text-xs text-steel-600">{t("pos.reference")}
              <Input value={value.reference} onChange={(e) => set({ reference: e.target.value })} className="mt-1 h-9" />
            </label>
          )}
        </div>
      )}

      <dl className="grid gap-1 rounded-md bg-steel-50 p-3 text-sm">
        <div className="flex justify-between"><dt>{t("pos.paidNow")}</dt><dd className="font-semibold">{formatMoney(paid)}</dd></div>
        {remaining > 0 && <div className="flex justify-between text-danger"><dt>{t("pos.remaining")}</dt><dd className="font-bold">{formatMoney(remaining)}</dd></div>}
        {remaining > 0 && currentBalance != null && (
          <div className="flex justify-between text-steel-600"><dt>{t("pos.newBalance")}</dt><dd>{formatMoney(currentBalance)} → <strong className="text-danger">{formatMoney(currentBalance + remaining)}</strong></dd></div>
        )}
        {change > 0 && <div className="flex justify-between text-ok"><dt>{t("pos.changeLabel")}</dt><dd className="font-bold">{formatMoney(change)}</dd></div>}
      </dl>
    </div>
  );
}
