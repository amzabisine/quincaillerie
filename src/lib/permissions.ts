import type { Role } from "@/types";

// Shared by the backend (to check access) and the frontend (to show or hide buttons).

/** Who can see cost prices and profit */
export const canSeeProfit = (role: Role) => role === "owner" || role === "manager";
export const canManageStock = (role: Role) => role !== "cashier";
export const canSell = (role: Role) => role !== "storekeeper";
