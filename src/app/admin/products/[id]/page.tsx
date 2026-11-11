import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { canSeeProfit, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/catalog";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageTitle } from "@/components/ui";
import type { Product } from "@/types";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await requireStaff(["owner", "manager", "storekeeper"]);
  const [t, categories] = await Promise.all([getTranslations("products"), getCategories()]);
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*, product_units(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  return <div><PageTitle>{t("edit")}</PageTitle><ProductForm product={data as Product} categories={categories} showCost={canSeeProfit(staff.role)} /></div>;
}
