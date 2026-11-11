"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export async function login(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const t = await getTranslations("auth");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error || !data.user) return { ok: false, error: t("invalid") };
  const { data: profile } = await supabase.from("profiles").select("is_active, role").eq("id", data.user.id).single();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { ok: false, error: t("invalid") };
  }
  redirect(profile.role === "storekeeper" ? "/admin/stock" : profile.role === "cashier" ? "/admin/pos" : "/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
