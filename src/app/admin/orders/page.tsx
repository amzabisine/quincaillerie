import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatRWF } from "@/lib/utils";
import { OrdersLive } from "@/components/admin/OrdersLive";
import { Badge, Card, PageTitle } from "@/components/ui";

const OPEN = ["new", "confirmed", "ready", "out_for_delivery"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireStaff(["owner", "manager", "cashier"]);
  const tab = (await searchParams).tab === "done" ? "done" : "open";
  const t = await getTranslations();
  const supabase = await createClient();
  let q = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100);
  q = tab === "open" ? q.in("status", OPEN) : q.in("status", ["completed", "cancelled"]);
  const { data: orders } = await q;

  return (
    <div>
      <OrdersLive />
      <PageTitle>{t("orders.title")}</PageTitle>
      <div className="mb-4 inline-flex rounded-md bg-white p-1 ring-1 ring-steel-950/10 text-sm">
        {(["open", "done"] as const).map((x) => (
          <Link key={x} href={`/admin/orders?tab=${x}`} className={cn("rounded px-3 py-1.5", tab === x && "bg-steel-800 text-white")}>{t(`orders.${x}`)}</Link>
        ))}
      </div>
      {!orders?.length ? <Card><p className="text-steel-600">{t("orders.none")}</p></Card> : (
        <ul className="grid gap-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-4 ring-1 ring-steel-950/8 hover:ring-steel-800">
                <span className="font-semibold">{o.code}</span>
                <span>{o.customer_name} · {o.customer_phone}</span>
                <Badge tone={o.status === "new" ? "warn" : o.status === "cancelled" ? "danger" : "info"}>{t(`order.status.${o.status}`)}</Badge>
                <Badge tone={o.payment_status === "confirmed" ? "ok" : o.payment_status === "claimed" ? "warn" : "muted"}>{t(`order.payment.${o.payment_status}`)}</Badge>
                <span className="text-steel-600 text-sm">{t(`cart.${o.fulfilment}`)}</span>
                {o.fulfilment === "delivery" && !o.delivery_fee_set && o.status !== "cancelled" && <Badge tone="danger">{t("orders.feeToSet")}</Badge>}
                <span className="ml-auto font-bold">{formatRWF(o.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
