import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/server/auth";
import { getExpense } from "@/server/services/expenses";
import { localDate } from "@/lib/dates";
import { DeleteExpenseButton, ExpenseForm } from "@/components/admin/ExpenseForms";
import { Card, PageTitle, buttonClass } from "@/components/ui";

export default async function ExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireStaff(["owner", "manager"]);
  const [t, expense] = await Promise.all([getTranslations(), getExpense(id)]);
  if (!expense) notFound();
  const month = expense.spent_on.slice(0, 7);

  return (
    <div className="grid gap-6 max-w-4xl">
      <Link href={`/admin/expenses?month=${month}`} className={buttonClass("ghost", "justify-self-start h-8 px-2")}>← {t("expenses.title")}</Link>
      <PageTitle>{t(`expenses.categories.${expense.category}`)}</PageTitle>
      <p className="-mt-4 text-sm text-steel-600">{t("expenses.recordedBy", { name: expense.by?.full_name ?? "—", date: new Date(expense.created_at).toLocaleString() })}</p>
      <Card><ExpenseForm expense={expense} today={localDate()} /></Card>
      {me.role === "owner" && (
        <Card className="ring-danger/30">
          <p className="mb-3 text-sm text-steel-600">{t("expenses.deleteHelp")}</p>
          <DeleteExpenseButton id={expense.id} month={month} />
        </Card>
      )}
    </div>
  );
}
