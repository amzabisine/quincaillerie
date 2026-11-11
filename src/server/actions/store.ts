"use server";

import { placeOrder as createOrder, type PlaceOrderParams } from "@/server/services/catalog";
import { normalizeRwandaPhone } from "@/lib/utils";

export type PlaceOrderInput = PlaceOrderParams;

/** Customers order without an account. Prices are taken from the database, not from the browser. */
export async function placeOrder(input: PlaceOrderInput): Promise<{ ok: boolean; code?: string; phone?: string; error?: string }> {
  const phone = normalizeRwandaPhone(input.phone) ?? input.phone.trim();
  const res = await createOrder({ ...input, phone });
  if (!res.ok) return res;
  return { ok: true, code: res.data, phone };
}
