import "server-only";
import { createClient } from "@/server/db/server";
import { createAdminClient } from "@/server/db/admin";
import { fail, ok, type Result } from "./result";
import type { Role, StaffProfile } from "@/types";

export async function listStaff(): Promise<StaffProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("created_at");
  return (data ?? []) as StaffProfile[];
}

/** Creates a login for a staff member. Uses the service role key, so only call it after checking the user is the owner. */
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

export async function updateStaffProfile(id: string, patch: { role?: Role; is_active?: boolean }): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  return error ? fail(error) : ok(null);
}
