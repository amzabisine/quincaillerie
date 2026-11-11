"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { signIn, signOut } from "@/server/auth";
import type { ActionResult } from "@/types";

export async function login(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const t = await getTranslations("auth");
  const role = await signIn(String(formData.get("email")), String(formData.get("password")));
  if (!role) return { ok: false, error: t("invalid") };
  redirect(role === "storekeeper" ? "/admin/stock" : role === "cashier" ? "/admin/pos" : "/admin");
}

export async function logout() {
  await signOut();
  redirect("/login");
}
