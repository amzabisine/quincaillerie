import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button, Field, Input } from "@/components/ui";

async function lookup(formData: FormData) {
  "use server";
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const phone = String(formData.get("phone") || "").trim();
  redirect(`/orders/${encodeURIComponent(code)}?phone=${encodeURIComponent(phone)}`);
}

export default async function TrackPage() {
  const t = await getTranslations();
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-extrabold [font-stretch:75%]">{t("order.lookupTitle")}</h1>
      <p className="mt-2 text-steel-600">{t("order.lookupText")}</p>
      <form action={lookup} className="mt-6 grid gap-4 rounded-lg bg-white p-5 ring-1 ring-steel-950/8">
        <Field label={t("order.code")} htmlFor="code"><Input id="code" name="code" placeholder="CMD-XXXXXX" required /></Field>
        <Field label={t("cart.phone")} htmlFor="phone"><Input id="phone" name="phone" type="tel" required /></Field>
        <Button type="submit">{t("order.lookup")}</Button>
      </form>
    </div>
  );
}
