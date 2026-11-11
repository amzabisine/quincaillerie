import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role, StaffProfile } from "@/types";

export async function getStaff(): Promise<StaffProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data && data.is_active ? (data as StaffProfile) : null;
}

/** Protects staff pages and actions. Redirects to login, or to /admin if the role is not allowed. */
export async function requireStaff(roles?: Role[]): Promise<StaffProfile> {
  const staff = await getStaff();
  if (!staff) redirect("/login");
  if (roles && !roles.includes(staff.role)) redirect("/admin");
  return staff;
}

/** Who can see cost prices and profit */
export const canSeeProfit = (role: Role) => role === "owner" || role === "manager";
export const canManageStock = (role: Role) => role !== "cashier";
export const canSell = (role: Role) => role !== "storekeeper";
