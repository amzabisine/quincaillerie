"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, Globe, LayoutDashboard, Package, Receipt, Settings, ShoppingBag, Store, UserCog, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const ITEMS = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard, roles: ["owner", "manager"] },
  { href: "/admin/pos", key: "pos", icon: Store, roles: ["owner", "manager", "cashier"] },
  { href: "/admin/orders", key: "orders", icon: ShoppingBag, roles: ["owner", "manager", "cashier"] },
  { href: "/admin/sales", key: "sales", icon: Receipt, roles: ["owner", "manager", "cashier"] },
  { href: "/admin/products", key: "products", icon: Package, roles: ["owner", "manager", "storekeeper"] },
  { href: "/admin/stock", key: "stock", icon: Boxes, roles: ["owner", "manager", "storekeeper"] },
  { href: "/admin/customers", key: "customers", icon: Users, roles: ["owner", "manager", "cashier"] },
  { href: "/admin/reports", key: "reports", icon: BarChart3, roles: ["owner", "manager"] },
  { href: "/admin/staff", key: "staff", icon: UserCog, roles: ["owner"] },
  { href: "/admin/settings", key: "settings", icon: Settings, roles: ["owner", "manager"] },
] as const;

export function AdminNav({ role, labels, newOrders }: { role: Role; labels: Record<string, string>; newOrders: number }) {
  const path = usePathname();
  const items = ITEMS.filter((i) => (i.roles as readonly string[]).includes(role));
  return (
    <nav className="flex lg:flex-col gap-1 overflow-x-auto text-sm" aria-label="Admin">
      {items.map(({ href, key, icon: Icon }) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={cn("flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2", active ? "bg-white/10 text-white" : "text-steel-100 hover:bg-white/5")}>
            <Icon size={17} aria-hidden /> {labels[key]}
            {key === "orders" && newOrders > 0 && <span className="ml-auto rounded-full bg-signal px-1.5 text-xs font-bold text-steel-950">{newOrders}</span>}
          </Link>
        );
      })}
      <Link href="/" target="_blank" className="flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-steel-400 hover:bg-white/5 lg:mt-4">
        <Globe size={17} aria-hidden /> {labels.viewStore}
      </Link>
    </nav>
  );
}
