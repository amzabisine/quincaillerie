"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/server/auth";
import { createStaffAccount, updateStaffProfile } from "@/server/services/staff";
import type { ActionResult, Role } from "@/types";

const STAFF_ROLES: Role[] = ["manager", "cashier", "storekeeper"];

/** Owner creates a staff account. The staff member logs in with this email and password. */
export async function createStaff(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireStaff(["owner"]);
  const role = String(formData.get("role")) as Role;
  if (!STAFF_ROLES.includes(role)) return { ok: false, error: "Invalid role" };
  const password = String(formData.get("password") || "");
  if (password.length < 8) return { ok: false, error: "Password must have at least 8 characters" };

  const res = await createStaffAccount({
    email: String(formData.get("email")).trim(),
    password,
    fullName: String(formData.get("full_name") || "").trim(),
    role,
    phone: String(formData.get("phone") || ""),
  });
  if (!res.ok) return res;
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function updateStaff(id: string, formData: FormData) {
  const me = await requireStaff(["owner"]);
  if (id === me.id) return; // the owner cannot lock themselves out
  const patch: { role?: Role; is_active?: boolean } = {};
  if (formData.has("role")) patch.role = String(formData.get("role")) as Role;
  if (formData.has("is_active")) patch.is_active = formData.get("is_active") === "true";
  await updateStaffProfile(id, patch);
  revalidatePath("/admin/staff");
}
