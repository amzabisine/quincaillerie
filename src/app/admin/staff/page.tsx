import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/server/auth";
import { listStaff } from "@/server/services/staff";
import { StaffForm } from "@/components/admin/StaffForm";
import { RowLink } from "@/components/admin/RowLink";
import { Badge, Card, PageTitle } from "@/components/ui";

export default async function StaffPage() {
  const me = await requireStaff(["owner"]);
  const t = await getTranslations();
  const staff = await listStaff();

  return (
    <div className="grid gap-6 max-w-5xl">
      <PageTitle>{t("staff.title")} <span className="text-steel-400 font-normal">({staff.length})</span></PageTitle>
      <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-steel-950/8">
        <table className="w-full text-sm">
          <thead className="bg-steel-50 text-left text-steel-600">
            <tr>
              <th className="p-3">{t("common.name")}</th><th className="p-3">{t("staff.email")}</th><th className="p-3">{t("common.phone")}</th>
              <th className="p-3">{t("staff.role")}</th><th className="p-3">{t("staff.status")}</th><th className="p-3">{t("staff.lastLogin")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-950/8">
            {staff.map((s) => (
              <RowLink key={s.id} href={`/admin/staff/${s.id}`} className={s.is_active ? "" : "text-steel-400"}>
                <td className="p-3">
                  <Link href={`/admin/staff/${s.id}`} className="font-semibold hover:underline">{s.full_name || "—"}</Link>
                  {s.id === me.id && <span className="ml-2"><Badge tone="info">{t("staff.you")}</Badge></span>}
                </td>
                <td className="p-3">{s.email}</td>
                <td className="p-3 whitespace-nowrap">{s.phone || "—"}</td>
                <td className="p-3"><Badge tone={s.role === "owner" ? "warn" : "info"}>{t(`roles.${s.role}`)}</Badge></td>
                <td className="p-3">{s.is_active ? <Badge tone="ok">{t("staff.active")}</Badge> : <Badge tone="danger">{t("staff.disabled")}</Badge>}</td>
                <td className="p-3 whitespace-nowrap">{s.last_sign_in_at ? new Date(s.last_sign_in_at).toLocaleString() : t("staff.never")}</td>
              </RowLink>
            ))}
          </tbody>
        </table>
      </div>
      <Card><h2 className="font-bold mb-3">{t("staff.add")}</h2><StaffForm /></Card>
    </div>
  );
}
