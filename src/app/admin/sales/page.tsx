import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatRWF } from "@/lib/utils";
import { Badge, Card, PageTitle, buttonClass } from "@/components/ui";
import { RowLink } from "@/components/admin/RowLink";

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireStaff(["owner", "manager", "cashier"]);
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const t = await getTranslations();
  const supabase = await createClient();
  const size = 50;
  const { data: sales } = await supabase
    .from("sales").select("id, number, channel, customer_name, total, credit_amount, status, created_at, cashier:profiles(full_name)")
    .order("created_at", { ascending: false }).range((page - 1) * size, page * size - 1);

  return (
    <div>
      <PageTitle action={<Link href="/admin/pos" className={buttonClass("primary")}>{t("sales.newSale")}</Link>}>{t("sales.title")}</PageTitle>
      {!sales?.length ? <Card><p className="text-steel-600">{t("sales.none")}</p></Card> : (
        <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-steel-950/8">
          <table className="w-full text-sm">
            <thead className="bg-steel-50 text-left text-steel-600">
              <tr><th className="p-3">{t("sales.number")}</th><th className="p-3">{t("common.date")}</th><th className="p-3">{t("orders.customer")}</th><th className="p-3">{t("sales.cashier")}</th><th className="p-3 text-right">{t("common.total")}</th><th className="p-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-steel-950/8">
              {sales.map((s: any) => (
                <RowLink key={s.id} href={`/admin/sales/${s.id}`} className={s.status === "voided" ? "text-steel-400 line-through" : ""}>
                  <td className="p-3"><Link href={`/admin/sales/${s.id}`} className="font-semibold underline-offset-2 hover:underline">#{s.number}</Link></td>
                  <td className="p-3 whitespace-nowrap">{new Date(s.created_at).toLocaleString()}</td>
                  <td className="p-3">{s.customer_name || "—"}</td>
                  <td className="p-3">{s.cashier?.full_name ?? ""}</td>
                  <td className="p-3 text-right font-semibold">{formatRWF(s.total)}</td>
                  <td className="p-3 text-right space-x-1">
                    {s.channel === "online" && <Badge tone="info">{t("sales.online")}</Badge>}
                    {s.credit_amount > 0 && <Badge tone="warn">{t("sales.credit")}</Badge>}
                    {s.status === "voided" && <Badge tone="danger">{t("sales.voided")}</Badge>}
                  </td>
                </RowLink>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        {page > 1 && <Link href={`/admin/sales?page=${page - 1}`} className={buttonClass("secondary")}>←</Link>}
        {sales?.length === size && <Link href={`/admin/sales?page=${page + 1}`} className={buttonClass("secondary")}>→</Link>}
      </div>
    </div>
  );
}
