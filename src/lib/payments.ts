import type { OnlinePaymentMethod, PaymentMethod, Settings } from "@/types";

/** Payment methods at the counter and for debt payments, in the order they are shown. */
export const PAYMENT_METHODS: PaymentMethod[] = ["cash", "mpesa", "orange", "airtel", "momo", "bank"];

/**
 * Mobile money the online store can offer. Each one appears at checkout only when its
 * merchant code is filled in Settings. `method` is what the payment is recorded as.
 */
export const ONLINE_PAYMENTS: { id: Exclude<OnlinePaymentMethod, "on_collect">; method: PaymentMethod; codeField: keyof Settings }[] = [
  { id: "mpesa_code", method: "mpesa", codeField: "mpesa_code" },
  { id: "orange_code", method: "orange", codeField: "orange_code" },
  { id: "airtel_code", method: "airtel", codeField: "airtel_code" },
  { id: "momo_code", method: "momo", codeField: "momo_code" },
];

/** The counter payment method that matches what the customer chose online (cash if paying on collection). */
export function methodForOnlinePayment(p: OnlinePaymentMethod): PaymentMethod {
  return ONLINE_PAYMENTS.find((o) => o.id === p)?.method ?? "cash";
}
