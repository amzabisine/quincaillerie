import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/server/auth";
import { canSeeProfit } from "@/lib/permissions";
import { getProduct } from "@/server/services/products";
import { getCategories } from "@/server/services/catalog";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageTitle } from "@/components/ui";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await requireStaff(["owner", "manager", "storekeeper"]);
  const [t, categories] = await Promise.all([getTranslations("products"), getCategories()]);
  const product = await getProduct(id);
  if (!product) notFound();
  return <div><PageTitle>{t("edit")}</PageTitle><ProductForm product={product} categories={categories} showCost={canSeeProfit(staff.role)} /></div>;
}
