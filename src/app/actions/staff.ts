"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { dbError } from "@/lib/utils";
import type { ActionResult } from "@/types";

/** Owner creates a staff account. The staff member logs in with this email and password. */
export async function createStaff(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireStaff(["owner"]);
  const role = String(formData.get("role"));
  if (!["manager", "cashier", "storekeeper"].includes(role)) return { ok: false, error: "Invalid role" };
  const password = String(formData.get("password") || "");
  if (password.length < 8) return { ok: false, error: "Password must have at least 8 characters" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: String(formData.get("email")).trim(),
    password,
    email_confirm: true,
    user_metadata: { full_name: String(formData.get("full_name") || "").trim(), role, phone: String(formData.get("phone") || "") },
  });
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function updateStaff(id: string, formData: FormData) {
  const me = await requireStaff(["owner"]);
  if (id === me.id) return; // the owner cannot lock themselves out
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (formData.has("role")) patch.role = String(formData.get("role"));
  if (formData.has("is_active")) patch.is_active = formData.get("is_active") === "true";
  await supabase.from("profiles").update(patch).eq("id", id);
  revalidatePath("/admin/staff");
}
