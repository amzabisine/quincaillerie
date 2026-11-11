import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/server/auth";
import { canSeeProfit } from "@/lib/permissions";
import { getCategories } from "@/server/services/catalog";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageTitle } from "@/components/ui";

export default async function NewProduct() {
  const staff = await requireStaff(["owner", "manager", "storekeeper"]);
  const [t, categories] = await Promise.all([getTranslations("products"), getCategories()]);
  return <div><PageTitle>{t("add")}</PageTitle><ProductForm categories={categories} showCost={canSeeProfit(staff.role)} /></div>;
}
