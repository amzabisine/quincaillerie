import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPublicSettings } from "@/lib/catalog";
import { formatRWF, whatsappLink } from "@/lib/utils";
import { NewCustomerForm } from "@/components/admin/CustomerForms";
import { Badge, Card, Input, PageTitle, Stat, buttonClass } from "@/components/ui";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; debt?: string }> }) {
  await requireStaff(["owner", "manager", "cashier"]);
  const { q, debt } = await searchParams;
  const [t, s] = await Promise.all([getTranslations(), getPublicSettings()]);
  const supabase = await createClient();
  let query = supabase.from("customers").select("*").order("balance", { ascending: false }).order("name").limit(300);
  if (q) query = query.or(`name.ilike.%${q.replace(/[,()%]/g, "")}%,phone.ilike.%${q.replace(/[,()%]/g, "")}%`);
  if (debt) query = query.gt("balance", 0);
  const { data: customers } = await query;
  const owed = (customers ?? []).reduce((sum, c) => sum + c.balance, 0);

  return (
    <div className="grid gap-6">
      <PageTitle>{t("customers.title")}</PageTitle>
      <div className="grid grid-cols-2 gap-3 max-w-md"><Stat label={t("dashboard.debtsTotal")} value={formatRWF(owed)} tone="danger" /></div>
      <Card><h2 className="font-bold mb-3">{t("customers.add")}</h2><NewCustomerForm /></Card>
      <form className="flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder={t("common.search")} className="max-w-xs" aria-label={t("common.search")} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="debt" value="1" defaultChecked={!!debt} /> {t("customers.withDebt")}</label>
        <button className={buttonClass("secondary")}>{t("common.search")}</button>
      </form>
      {!customers?.length ? <Card><p className="text-steel-600">{t("customers.none")}</p></Card> : (
        <ul className="divide-y divide-steel-950/8 rounded-lg bg-white ring-1 ring-steel-950/8">
          {customers.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <Link href={`/admin/customers/${c.id}`} className="font-semibold hover:underline">{c.name}</Link>
              <span className="text-steel-600">{c.phone}</span>
              {c.type === "wholesale" && <Badge tone="info">{t("pos.wholesale")}</Badge>}
              <span className={`ml-auto font-bold ${c.balance > 0 ? "text-danger" : "text-steel-400"}`}>{formatRWF(c.balance)}</span>
              {c.balance > 0 && c.phone && (
                <a href={whatsappLink(c.phone, t("customers.reminderMessage", { name: c.name, shop: s.shop_name, amount: formatRWF(c.balance) }))}
                  target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "h-8 px-3")}>
                  <MessageCircle size={14} aria-hidden /> {t("customers.remind")}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
