import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/server/auth";
import { getShopSettings } from "@/server/services/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { PageTitle } from "@/components/ui";

export default async function SettingsPage() {
  await requireStaff(["owner", "manager"]);
  const t = await getTranslations("settings");
  const settings = await getShopSettings();
  return <div><PageTitle>{t("title")}</PageTitle><SettingsForm settings={settings} /></div>;
}
