"use server";

import { createClient } from "@/lib/supabase/server";
import { dbError, normalizeRwandaPhone } from "@/lib/utils";

export interface PlaceOrderInput {
  name: string;
  phone: string;
  fulfilment: "pickup" | "delivery";
  address: string;
  note: string;
  paymentMethod: "momo_code" | "airtel_code" | "on_collect";
  paymentReference: string;
  items: { unit_id: string; quantity: number }[];
}

/** Customers order without an account. Prices are taken from the database, not from the browser. */
export async function placeOrder(input: PlaceOrderInput): Promise<{ ok: boolean; code?: string; phone?: string; error?: string }> {
  const phone = normalizeRwandaPhone(input.phone) ?? input.phone.trim();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_name: input.name,
    p_phone: phone,
    p_fulfilment: input.fulfilment,
    p_address: input.address,
    p_note: input.note,
    p_payment_method: input.paymentMethod,
    p_payment_reference: input.paymentReference,
    p_items: input.items,
  });
  if (error) return { ok: false, error: dbError(error) };
  return { ok: true, code: data as string, phone };
}
