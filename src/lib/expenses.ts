import type { ExpenseCategory } from "@/types";

/** Expense categories, in the order they are shown. Labels are in messages/*.json under "expenses.categories". */
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "rent", "salaries", "transport", "utilities", "taxes", "communication", "repairs", "other",
];
