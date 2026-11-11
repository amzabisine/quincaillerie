import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { PageTitle } from "@/components/ui";
import type { Settings } from "@/types";

export default async function SettingsPage() {
  await requireStaff(["owner", "manager"]);
  const t = await getTranslations("settings");
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").single();
  return <div><PageTitle>{t("title")}</PageTitle><SettingsForm settings={data as Settings} /></div>;
}
