import "server-only";
import { cache } from "react";
import { createClient } from "@/server/db/server";
import { fail, ok, type Result } from "./result";
import type { Settings } from "@/types";

const FALLBACK: Settings = {
  shop_name: "Quincaillerie", tagline: "", phone: null, whatsapp: null, email: null, address: "Rubavu",
  momo_code: null, momo_name: null, airtel_code: null, pickup_enabled: true, delivery_enabled: true,
  delivery_fee: 0, delivery_note: "",
};

/** Shop details anyone may see (store header, footer, checkout). */
export const getPublicSettings = cache(async (): Promise<Settings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("public_settings").select("*").single();
  return (data as Settings) ?? FALLBACK;
});

/** All settings, including TIN and receipt footer. Staff only. */
export const getShopSettings = cache(async (): Promise<Settings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").single();
  return (data as Settings) ?? FALLBACK;
});

export type SettingsUpdate = Omit<Settings, "delivery_fee">;

export async function updateSettings(patch: SettingsUpdate): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
  return error ? fail(error) : ok(null);
}
