import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/server/db/server";
import type { Role, StaffProfile } from "@/types";

/** The logged-in, active staff member, or null. Cached for one request. */
export const getStaff = cache(async (): Promise<StaffProfile | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data && data.is_active ? (data as StaffProfile) : null;
});

/** Protects staff pages and actions. Redirects to login, or to /admin if the role is not allowed. */
export async function requireStaff(roles?: Role[]): Promise<StaffProfile> {
  const staff = await getStaff();
  if (!staff) redirect("/login");
  if (roles && !roles.includes(staff.role)) redirect("/admin");
  return staff;
}

/** Signs in with email and password. Returns the role, or null if the login failed or the account is disabled. */
export async function signIn(email: string, password: string): Promise<Role | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("is_active, role").eq("id", data.user.id).single();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return null;
  }
  return profile.role as Role;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
