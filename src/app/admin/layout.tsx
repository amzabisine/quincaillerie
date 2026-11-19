import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { requireStaff } from "@/server/auth";
import { countNewOrders } from "@/server/services/orders";
import { getPublicSettings } from "@/server/services/settings";
import { logout } from "@/server/actions/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const [t, s, count] = await Promise.all([getTranslations(), getPublicSettings(), countNewOrders()]);
  const keys = ["dashboard", "pos", "orders", "sales", "products", "stock", "customers", "expenses", "reports", "staff", "settings", "viewStore"];
  const labels = Object.fromEntries(keys.map((k) => [k, t(`admin.${k}`)]));

  // On large screens the menu and the page each scroll on their own, with their own scrollbar.
  return (
    <div className="admin-shell min-h-dvh lg:grid lg:h-dvh lg:grid-cols-[230px_1fr] lg:overflow-hidden">
      <aside className="admin-scroll bg-steel-950 text-white lg:h-dvh lg:min-h-0 flex flex-col">
        <div className="px-4 py-4">
          <p className="font-display text-lg font-bold leading-tight [font-stretch:80%]">{s.shop_name}</p>
          <p className="text-xs text-steel-400">{staff.full_name} · {t(`roles.${staff.role}`)}</p>
        </div>
        <div className="admin-scroll scroll-dark px-2 pb-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto"><AdminNav role={staff.role} labels={labels} newOrders={count} /></div>
        <div className="hidden lg:flex items-center justify-between gap-2 border-t border-white/10 p-3">
          <LanguageSwitcher dark />
          <form action={logout}><button className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-steel-100 hover:bg-white/10"><LogOut size={15} aria-hidden /> {t("admin.logout")}</button></form>
        </div>
      </aside>
      <div className="admin-scroll scroll-light min-w-0 lg:h-dvh lg:overflow-y-auto">
        <div className="lg:hidden flex items-center justify-end gap-2 border-b border-steel-950/10 bg-white px-4 py-2">
          <LanguageSwitcher />
          <form action={logout}><button className="text-sm">{t("admin.logout")}</button></form>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
