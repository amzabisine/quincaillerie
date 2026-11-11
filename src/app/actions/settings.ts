"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { dbError, normalizeRwandaPhone } from "@/lib/utils";
import type { ActionResult } from "@/types";

export async function saveSettings(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  await requireStaff(["owner", "manager"]);
  const str = (k: string) => String(f.get(k) || "").trim();
  const supabase = await createClient();
  const { error } = await supabase.from("settings").update({
    shop_name: str("shop_name") || "Quincaillerie",
    tagline: str("tagline"),
    phone: normalizeRwandaPhone(str("phone")) ?? (str("phone") || null),
    whatsapp: normalizeRwandaPhone(str("whatsapp")) ?? (str("whatsapp") || null),
    email: str("email") || null,
    address: str("address"),
    tin: str("tin") || null,
    momo_code: str("momo_code") || null,
    momo_name: str("momo_name") || null,
    airtel_code: str("airtel_code") || null,
    pickup_enabled: f.get("pickup_enabled") === "on",
    delivery_enabled: f.get("delivery_enabled") === "on",
    delivery_note: str("delivery_note"),
    receipt_footer: str("receipt_footer"),
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}
