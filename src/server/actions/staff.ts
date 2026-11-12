"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/server/auth";
import * as staff from "@/server/services/staff";
import { normalizeRwandaPhone } from "@/lib/utils";
import type { ActionResult, Role } from "@/types";

const STAFF_ROLES: Role[] = ["manager", "cashier", "storekeeper"];

/** Owner creates a staff account. The staff member logs in with this email and password. */
export async function createStaff(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireStaff(["owner"]);
  const role = String(formData.get("role")) as Role;
  if (!STAFF_ROLES.includes(role)) return { ok: false, error: "Invalid role" };
  const password = String(formData.get("password") || "");
  if (password.length < 8) return { ok: false, error: "Password must have at least 8 characters" };

  const res = await staff.createStaffAccount({
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

/**
 * Owner edits an account: name, phone, email, new password, and (not for themselves) role and active status.
 * The owner can edit their own account too, but cannot change their own role or disable themselves.
 */
export async function updateStaff(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const me = await requireStaff(["owner"]);
  const member = await staff.getStaffMember(id);
  if (!member) return { ok: false, error: "Account not found" };

  const fullName = String(formData.get("full_name") || "").trim();
  if (fullName.length < 2) return { ok: false, error: "Enter a name" };
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email" };
  const password = String(formData.get("password") || "");
  if (password && password.length < 8) return { ok: false, error: "Password must have at least 8 characters" };
  const phoneInput = String(formData.get("phone") || "").trim();

  const patch: Parameters<typeof staff.updateStaffProfile>[1] = {
    full_name: fullName,
    phone: normalizeRwandaPhone(phoneInput) ?? (phoneInput || null),
  };
  const isLocked = id === me.id || member.role === "owner";
  if (!isLocked) {
    const role = String(formData.get("role")) as Role;
    if (!STAFF_ROLES.includes(role)) return { ok: false, error: "Invalid role" };
    patch.role = role;
    patch.is_active = formData.get("is_active") === "on";
  }

  const login = await staff.updateStaffLogin(id, {
    email: email !== member.email.toLowerCase() ? email : undefined,
    password: password || undefined,
  });
  if (!login.ok) return login;
  const profile = await staff.updateStaffProfile(id, patch);
  if (!profile.ok) return profile;

  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Deletes a staff account. If the person already recorded sales, payments or stock changes,
 * the account is disabled instead so those records keep their name.
 */
export async function deleteStaff(id: string, _: ActionResult | null): Promise<ActionResult & { deactivated?: boolean }> {
  const me = await requireStaff(["owner"]);
  if (id === me.id) return { ok: false, error: "You cannot delete your own account" };
  const member = await staff.getStaffMember(id);
  if (!member) return { ok: false, error: "Account not found" };
  if (member.role === "owner") return { ok: false, error: "The owner account cannot be deleted" };

  if (await staff.staffHasHistory(id)) {
    const res = await staff.updateStaffProfile(id, { is_active: false });
    if (!res.ok) return res;
    revalidatePath("/admin/staff", "layout");
    return { ok: true, deactivated: true };
  }

  const res = await staff.deleteStaffAccount(id);
  if (!res.ok) return res;
  revalidatePath("/admin/staff", "layout");
  redirect("/admin/staff");
}
