import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/server/auth";
import { getStaffMember } from "@/server/services/staff";
import { DeleteStaffForm, EditStaffForm } from "@/components/admin/StaffForm";
import { Badge, Card, PageTitle, buttonClass } from "@/components/ui";

export default async function StaffMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireStaff(["owner"]);
  const t = await getTranslations();
  const member = await getStaffMember(id);
  if (!member) notFound();
  const isMe = member.id === me.id;
  const locked = isMe || member.role === "owner";

  return (
    <div className="grid gap-6 max-w-2xl">
      <Link href="/admin/staff" className={buttonClass("ghost", "justify-self-start h-8 px-2")}>← {t("staff.title")}</Link>
      <PageTitle>{member.full_name || member.email}</PageTitle>
      <div className="flex flex-wrap gap-2 -mt-3">
        <Badge tone={member.role === "owner" ? "warn" : "info"}>{t(`roles.${member.role}`)}</Badge>
        {member.is_active ? <Badge tone="ok">{t("staff.active")}</Badge> : <Badge tone="danger">{t("staff.disabled")}</Badge>}
        {isMe && <Badge tone="info">{t("staff.you")}</Badge>}
        <span className="text-sm text-steel-600">{t("staff.lastLogin")}: {member.last_sign_in_at ? new Date(member.last_sign_in_at).toLocaleString() : t("staff.never")}</span>
      </div>
      <Card><EditStaffForm member={member} locked={locked} /></Card>
      {!locked && (
        <Card className="ring-danger/30">
          <h2 className="font-bold text-danger">{t("staff.delete")}</h2>
          <p className="mt-1 mb-3 text-sm text-steel-600">{t("staff.deleteHelp")}</p>
          <DeleteStaffForm id={member.id} name={member.full_name || member.email} />
        </Card>
      )}
    </div>
  );
}
