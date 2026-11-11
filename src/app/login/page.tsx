import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getPublicSettings } from "@/lib/catalog";
import { LoginForm } from "@/components/admin/LoginForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function LoginPage() {
  const [t, s] = await Promise.all([getTranslations("auth"), getPublicSettings()]);
  return (
    <div className="min-h-dvh grid place-items-center bg-steel-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex items-center justify-between text-white">
          <Link href="/" className="font-display text-2xl font-bold [font-stretch:80%]">{s.shop_name}</Link>
          <LanguageSwitcher dark />
        </div>
        <div className="ruler" aria-hidden />
        <div className="rounded-b-lg bg-white p-6">
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <p className="mb-5 text-sm text-steel-600">{t("staffOnly")}</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
