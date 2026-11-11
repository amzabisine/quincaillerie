import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-display text-6xl font-extrabold [font-stretch:75%]">404</p>
      <Link href="/" className={buttonClass("primary", "mt-6")}>{t("store.allProducts")}</Link>
    </div>
  );
}
