import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/server/auth";
import { listStaff } from "@/server/services/staff";
import { updateStaff } from "@/server/actions/staff";
import { StaffForm } from "@/components/admin/StaffForm";
import { Badge, Card, PageTitle, buttonClass } from "@/components/ui";

export default async function StaffPage() {
  const me = await requireStaff(["owner"]);
  const t = await getTranslations();
  const staff = await listStaff();

  return (
    <div className="grid gap-6 max-w-4xl">
      <PageTitle>{t("staff.title")}</PageTitle>
      <ul className="divide-y divide-steel-950/8 rounded-lg bg-white ring-1 ring-steel-950/8 text-sm">
        {staff.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
            <span className="font-semibold">{s.full_name || "—"}</span>
            <span className="text-steel-600">{s.phone}</span>
            {!s.is_active && <Badge tone="danger">{t("staff.disabled")}</Badge>}
            {s.id === me.id ? (
              <span className="ml-auto"><Badge tone="info">{t(`roles.${s.role}`)}</Badge></span>
            ) : (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <form action={updateStaff.bind(null, s.id)} className="flex gap-1">
                  <select name="role" defaultValue={s.role} className="h-8 rounded-md px-2 ring-1 ring-steel-950/15" aria-label={t("staff.role")}>
                    {(["manager", "cashier", "storekeeper"] as const).map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
                  </select>
                  <button className={buttonClass("secondary", "h-8 px-3")}>{t("common.save")}</button>
                </form>
                <form action={updateStaff.bind(null, s.id)}>
                  <input type="hidden" name="is_active" value={s.is_active ? "false" : "true"} />
                  <button className={buttonClass(s.is_active ? "danger" : "secondary", "h-8 px-3")}>{s.is_active ? t("staff.deactivate") : t("staff.activate")}</button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Card><h2 className="font-bold mb-3">{t("staff.add")}</h2><StaffForm /></Card>
    </div>
  );
}
