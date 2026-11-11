import { requireStaff } from "@/server/auth";
import { listProductsForPos } from "@/server/services/products";
import { listCustomersByName } from "@/server/services/customers";
import { getCategories } from "@/server/services/catalog";
import { Pos } from "@/components/admin/Pos";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  await requireStaff(["owner", "manager", "cashier"]);
  const [products, customers, categories] = await Promise.all([listProductsForPos(), listCustomersByName(1000), getCategories()]);
  return <Pos products={products} categories={categories} initialCustomers={customers} />;
}
