"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setDeliveryFee } from "@/server/actions/orders";
import { Button, Field, Input, Notice } from "@/components/ui";

/** Staff enter the delivery fee for the customer's location (0 = free delivery). */
export function DeliveryFeeForm({ orderId, current, isSet }: { orderId: string; current: number; isSet: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [fee, setFee] = useState(isSet ? String(current) : "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const value = Number(fee);
    if (fee.trim() === "" || !Number.isFinite(value) || value < 0) { setError(t("orders.feeInvalid")); return; }
    startTransition(async () => {
      const res = await setDeliveryFee(orderId, value);
      if (!res.ok) { setError(res.error ?? t("common.error")); return; }
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3 max-w-md">
      {!isSet && <Notice>{t("orders.feeRequired")}</Notice>}
      <div className="flex items-end gap-2">
        <Field label={t("orders.setDeliveryFee")} htmlFor="delivery_fee">
          <Input id="delivery_fee" type="number" min={0} step={100} inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} required />
        </Field>
        <Button type="submit" disabled={pending}>{t("orders.saveFee")}</Button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
    </form>
  );
}
