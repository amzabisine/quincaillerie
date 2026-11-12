import "server-only";
import { createClient } from "@/server/db/server";
import { createAdminClient } from "@/server/db/admin";
import { fail, ok, type Result } from "./result";
import type { Role, StaffMember, StaffProfile } from "@/types";

// Staff accounts. Emails, passwords and last login live in Supabase Auth, so reading or changing them
// uses the service role key: only call these after checking the user is the owner.

type AuthInfo = { email: string; created_at: string; last_sign_in_at: string | null };

async function authUsers(): Promise<Map<string, AuthInfo>> {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return new Map((data?.users ?? []).map((u) => [u.id, { email: u.email ?? "", created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null }]));
}

/** Every staff account with email and last login, owner first. */
export async function listStaff(): Promise<StaffMember[]> {
  const supabase = await createClient();
  const [{ data }, auth] = await Promise.all([supabase.from("profiles").select("*").order("created_at"), authUsers()]);
  const order: Record<Role, number> = { owner: 0, manager: 1, cashier: 2, storekeeper: 3 };
  return ((data ?? []) as (StaffProfile & { created_at: string })[])
    .map((p) => ({ ...p, email: "", last_sign_in_at: null, ...auth.get(p.id), created_at: p.created_at }))
    .sort((a, b) => order[a.role] - order[b.role] || Number(b.is_active) - Number(a.is_active) || a.created_at.localeCompare(b.created_at));
}

export async function getStaffMember(id: string): Promise<StaffMember | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) return null;
  const { data } = await createAdminClient().auth.admin.getUserById(id);
  return {
    ...(profile as StaffProfile & { created_at: string }),
    email: data?.user?.email ?? "",
    last_sign_in_at: data?.user?.last_sign_in_at ?? null,
  };
}

/** Creates a login for a staff member. */
export async function createStaffAccount(p: { email: string; password: string; fullName: string; role: Role; phone: string }): Promise<Result> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: p.email,
    password: p.password,
    email_confirm: true,
    user_metadata: { full_name: p.fullName, role: p.role, phone: p.phone },
  });
  return error ? fail(error) : ok(null);
}

/** Name, phone, role and active status. */
export async function updateStaffProfile(id: string, patch: { full_name?: string; phone?: string | null; role?: Role; is_active?: boolean }): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  return error ? fail(error) : ok(null);
}

/** Login email and/or password. The new email works at once (no confirmation email). */
export async function updateStaffLogin(id: string, p: { email?: string; password?: string }): Promise<Result> {
  if (!p.email && !p.password) return ok(null);
  const { error } = await createAdminClient().auth.admin.updateUserById(id, {
    ...(p.email ? { email: p.email, email_confirm: true } : {}),
    ...(p.password ? { password: p.password } : {}),
  });
  return error ? fail(error) : ok(null);
}

/** True if the person recorded any sale, payment or stock movement (their name must stay on those records). */
export async function staffHasHistory(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const counts = await Promise.all([
    admin.from("sales").select("id", { count: "exact", head: true }).eq("cashier_id", id),
    admin.from("payments").select("id", { count: "exact", head: true }).eq("received_by", id),
    admin.from("stock_movements").select("id", { count: "exact", head: true }).eq("created_by", id),
  ]);
  return counts.some(({ count, error }) => error || (count ?? 0) > 0);
}

/** Removes the login and the profile completely. Fails if the person has history. */
export async function deleteStaffAccount(id: string): Promise<Result> {
  const { error } = await createAdminClient().auth.admin.deleteUser(id);
  return error ? fail(error) : ok(null);
}
