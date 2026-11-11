"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { completeOrder } from "@/server/actions/orders";
import { formatRWF } from "@/lib/utils";
import { Button, Notice } from "@/components/ui";
import { PaymentOptions, computePayment, initialPayment, type PaymentState } from "./PaymentOptions";
import type { PaymentMethod } from "@/types";

export function CompleteOrderForm({ orderId, total, defaultMethod, defaultReference }: {
  orderId: string; total: number; defaultMethod: PaymentMethod; defaultReference: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentState>({ ...initialPayment, method: defaultMethod, reference: defaultReference });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const { paid, remaining, partialInvalid } = computePayment(payment, total);

  function submit() {
    setError("");
    if (partialInvalid) { setError(t("pos.partialInvalid", { max: formatRWF(total - 1) })); return; }
    startTransition(async () => {
      const res = await completeOrder(orderId, { method: payment.method, amountPaid: paid, reference: payment.reference });
      if (!res.ok) { setError(res.error ?? t("common.error")); return; }
      router.push(`/admin/sales/${res.id}?print=1`);
    });
  }

  return (
    <div className="grid gap-3 max-w-md">
      <PaymentOptions value={payment} onChange={setPayment} total={total} />
      {remaining > 0 && <p className="text-xs text-steel-600">{t("orders.debtNote")}</p>}
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="button" variant="signal" onClick={submit} disabled={pending || partialInvalid} className="justify-self-start">
        {t("orders.completeSale")}
      </Button>
    </div>
  );
}
