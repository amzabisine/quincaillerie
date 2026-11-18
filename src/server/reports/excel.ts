import "server-only";
import ExcelJS from "exceljs";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { PAYMENT_METHODS } from "@/lib/payments";
import { roundMoney } from "@/lib/utils";
import type { ReportData } from "./data";

const MONEY = '"$"#,##0.00;[Red]-"$"#,##0.00';
const QTY = "#,##0.###";
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };

/** Sheet names: max 31 characters, none of []:*?/\ */
const sheetName = (s: string) => s.replace(/[[\]:*?/\\]/g, " ").slice(0, 31);

function table(ws: ExcelJS.Worksheet, columns: { header: string; width: number; money?: boolean; qty?: boolean }[], rows: unknown[][], totals?: (string | number | null)[]) {
  ws.columns = columns.map((c) => ({ header: c.header, width: c.width, style: c.money ? { numFmt: MONEY } : c.qty ? { numFmt: QTY } : {} }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.eachCell((cell) => { cell.fill = HEADER_FILL; });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  rows.forEach((r) => ws.addRow(r));
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  if (totals && rows.length) {
    const last = rows.length + 1;
    const row = ws.addRow(totals.map((v, i) => (v === "SUM" ? { formula: `SUM(${col(i)}2:${col(i)}${last})` } : v)));
    row.font = { bold: true };
  }
}
const col = (i: number) => String.fromCharCode(65 + i);

/** Excel workbook: summary, every sale, every expense, products sold, month by month. */
export async function buildExcel(d: ReportData): Promise<Buffer> {
  const { t, report: r } = d;
  const wb = new ExcelJS.Workbook();
  wb.creator = d.settings.shop_name;
  wb.created = new Date();

  // 1. Summary
  const ws = wb.addWorksheet(sheetName(t("reports.export.sheetSummary")));
  ws.columns = [{ width: 38 }, { width: 22 }];
  ws.addRow([d.settings.shop_name]).font = { bold: true, size: 16 };
  ws.addRow([[d.settings.address, d.settings.phone, d.settings.whatsapp && `WhatsApp ${d.settings.whatsapp}`].filter(Boolean).join(" · ")]);
  ws.addRow([`${t("reports.export.reportTitle")} · ${d.periodText}`]).font = { bold: true, size: 12 };
  ws.addRow([d.exportedText]).font = { italic: true, color: { argb: "FF6B7280" } };
  ws.addRow([]);
  const line = (label: string, value: number | null | undefined, opts: { bold?: boolean; money?: boolean } = { money: true }) => {
    const row = ws.addRow([label, value == null ? "-" : Number(value)]);
    if (opts.money !== false) row.getCell(2).numFmt = MONEY;
    if (opts.bold) row.font = { bold: true };
  };
  const section = (title: string) => { ws.addRow([]); ws.addRow([title]).font = { bold: true, size: 12 }; };
  ws.addRow([t("reports.profitTitle")]).font = { bold: true, size: 12 };
  line(t("reports.salesTotal"), r?.sales_total);
  if (r?.profit != null) {
    line(`- ${t("reports.costOfGoods")}`, roundMoney(Number(r.sales_total) - Number(r.profit)));
    line(`= ${t("reports.profit")}`, r.profit, { bold: true, money: true });
    line(`- ${t("reports.expenses")}`, r.expenses_total);
    line(`= ${t("reports.netProfit")}`, r.net_profit, { bold: true, money: true });
  }
  section(t("reports.export.keyFigures"));
  line(t("reports.salesCount"), r?.sales_count, { money: false });
  line(t("reports.creditGiven"), r?.credit_given);
  line(t("reports.debtCollected"), r?.debt_collected);
  if (r?.stock_value != null) line(t("reports.stockValue"), r.stock_value);
  line(t("reports.debtsTotal"), r?.debts_total);
  section(t("reports.byMethod"));
  for (const m of PAYMENT_METHODS) line(t(`methods.${m}`), r?.by_method?.[m] ?? 0);
  if (r?.expenses_by_category) {
    section(t("reports.expensesByCategory"));
    for (const c of EXPENSE_CATEGORIES) if (Number(r.expenses_by_category[c] ?? 0) > 0) line(t(`expenses.categories.${c}`), r.expenses_by_category[c]);
  }

  // 2. Every sale
  table(wb.addWorksheet(sheetName(t("reports.export.sheetSales"))), [
    { header: t("common.date"), width: 18 }, { header: t("sales.number"), width: 9 }, { header: t("orders.customer"), width: 26 },
    { header: t("sales.cashier"), width: 20 }, { header: t("reports.export.channel"), width: 12 },
    { header: t("common.total"), width: 14, money: true }, { header: t("reports.export.paid"), width: 14, money: true },
    { header: t("sales.credit"), width: 14, money: true }, { header: t("reports.export.status"), width: 12 },
  ], d.sales.map((s) => [
    bukavuTime(s.created_at), s.number, s.customer_name || "", s.cashier?.full_name ?? "",
    s.channel === "online" ? t("sales.online") : t("admin.pos"),
    // a cancelled sale is listed for the record but counts 0 in the totals
    s.status === "voided" ? 0 : Number(s.total), s.status === "voided" ? 0 : Number(s.paid_amount), s.status === "voided" ? 0 : Number(s.credit_amount),
    s.status === "voided" ? t("sales.voided") : t("reports.export.completed"),
  ]), [t("common.total"), null, null, null, null, "SUM", "SUM", "SUM", null]);
  const salesSheet = wb.getWorksheet(sheetName(t("reports.export.sheetSales")))!;
  salesSheet.getColumn(1).numFmt = "yyyy-mm-dd hh:mm";

  // 3. Every expense
  table(wb.addWorksheet(sheetName(t("reports.export.sheetExpenses"))), [
    { header: t("common.date"), width: 12 }, { header: t("expenses.category"), width: 24 }, { header: t("common.note"), width: 40 },
    { header: t("expenses.paidWith"), width: 16 }, { header: t("expenses.by"), width: 20 }, { header: t("expenses.amount"), width: 14, money: true },
  ], d.expenses.map((e) => [e.spent_on, t(`expenses.categories.${e.category}`), e.note, t(`methods.${e.method}`), e.by?.full_name ?? "", Number(e.amount)]),
  [t("common.total"), null, null, null, null, "SUM"]);

  // 4. Products sold
  table(wb.addWorksheet(sheetName(t("reports.export.sheetProducts"))), [
    { header: t("stock.product"), width: 36 }, { header: t("common.quantity"), width: 12, qty: true },
    { header: t("reports.export.unit"), width: 12 }, { header: t("reports.revenue"), width: 16, money: true },
  ], d.products.map((p) => [p.name, roundQty(p.quantity), t(`units.${p.base_unit}`), roundMoney(p.revenue)]),
  [t("common.total"), null, null, "SUM"]);

  // 5. Month by month
  table(wb.addWorksheet(sheetName(t("reports.export.sheetMonths"))), [
    { header: t("reports.monthColumn"), width: 18 }, { header: t("reports.salesTotal"), width: 16, money: true },
    { header: t("reports.profit"), width: 16, money: true }, { header: t("reports.expenses"), width: 16, money: true },
    { header: t("reports.netProfit"), width: 16, money: true },
  ], d.months.map((m) => [d.monthLabel(m.month), Number(m.sales_total), Number(m.gross_profit), Number(m.expenses), Number(m.net_profit)]));

  return Buffer.from(await wb.xlsx.writeBuffer());
}

const roundQty = (q: number) => Math.round(q * 1000) / 1000;
/** Excel has no time zones: write the Bukavu clock time (UTC+2). */
const bukavuTime = (iso: string) => new Date(new Date(iso).getTime() + 2 * 3600_000);
