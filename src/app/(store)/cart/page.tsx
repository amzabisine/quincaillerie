import { getTranslations } from "next-intl/server";
import { getPublicSettings } from "@/server/services/settings";
import { Checkout } from "@/components/store/Checkout";

export default async function CartPage() {
  const [t, settings] = await Promise.all([getTranslations("cart"), getPublicSettings()]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-extrabold [font-stretch:75%] mb-6">{t("title")}</h1>
      <Checkout settings={settings} />
    </div>
  );
}
