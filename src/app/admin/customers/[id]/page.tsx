import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatRWF } from "@/lib/utils";
import { DebtPaymentForm, EditCustomerForm } from "@/components/admin/CustomerForms";
import { Card, PageTitle, Stat } from "@/components/ui";
import type { Customer } from "@/types";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await requireStaff(["owner", "manager", "cashier"]);
  const t = await getTranslations();
  const supabase = await createClient();
  const [{ data: customer }, { data: sales }, { data: payments }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("sales").select("id, number, total, credit_amount, status, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
    supabase.from("payments").select("*").eq("customer_id", id).eq("kind", "debt_payment").order("created_at", { ascending: false }).limit(50),
  ]);
  if (!customer) notFound();

  const history = [
    ...(sales ?? []).map((s) => ({ date: s.created_at, label: `${t("customers.purchase")} #${s.number}`, href: `/admin/sales/${s.id}`, amount: s.credit_amount, sign: "+", voided: s.status === "voided" })),
    ...(payments ?? []).map((p) => ({ date: p.created_at, label: `${t("customers.debtPayment")} · ${t(`methods.${p.method}`)}`, href: null, amount: p.amount, sign: "-", voided: false })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="grid gap-6 max-w-4xl">
      <PageTitle>{customer.name}</PageTitle>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <Stat label={t("customers.balance")} value={formatRWF(customer.balance)} tone={customer.balance > 0 ? "danger" : undefined} />
        <Stat label={t("customers.creditLimit")} value={customer.credit_limit ? formatRWF(customer.credit_limit) : "∞"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {customer.balance > 0 && <Card><h2 className="font-bold mb-3">{t("customers.receivePayment")}</h2><DebtPaymentForm customer={customer as Customer} /></Card>}
        {staff.role !== "cashier" && <Card><EditCustomerForm customer={customer as Customer} /></Card>}
      </div>
      <section>
        <h2 className="text-lg font-bold mb-3">{t("customers.history")}</h2>
        <ul className="divide-y divide-steel-950/8 rounded-lg bg-white ring-1 ring-steel-950/8 text-sm">
          {history.map((h, i) => (
            <li key={i} className={h.voided ? "line-through text-steel-400" : ""}>
              {(() => {
                const body = (
                  <>
                    <span>{new Date(h.date).toLocaleDateString()} · {h.label}</span>
                    <span className={h.sign === "+" ? "text-danger" : "text-ok"}>{h.amount > 0 ? `${h.sign}${formatRWF(h.amount)}` : "—"}</span>
                  </>
                );
                return h.href
                  ? <Link href={h.href} className="flex justify-between gap-3 p-3 hover:bg-steel-50">{body}</Link>
                  : <div className="flex justify-between gap-3 p-3">{body}</div>;
              })()}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
