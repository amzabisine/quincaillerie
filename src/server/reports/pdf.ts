import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { PAYMENT_METHODS } from "@/lib/payments";
import { formatMoney, formatQty, roundMoney } from "@/lib/utils";
import type { ReportData } from "./data";

// A4 in points
const W = 595.28, H = 841.89, M = 42;
const DARK = rgb(0.12, 0.16, 0.22), GREY = rgb(0.42, 0.45, 0.5), LINE = rgb(0.86, 0.87, 0.89);
const GREEN = rgb(0.09, 0.5, 0.27), RED = rgb(0.75, 0.15, 0.15), BAND = rgb(0.95, 0.96, 0.97);

/** The built-in PDF fonts only know Western European characters: replace the few others we use. */
function safe(text: string) {
  return text
    .replace(/[−–—]/g, "-").replace(/→/g, "->").replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .normalize("NFC")
    .replace(/[^\x20-\x7E -ÿ€]/g, "");
}

class Writer {
  page!: PDFPage;
  y = 0;
  pages: PDFPage[] = [];
  constructor(private doc: PDFDocument, public font: PDFFont, public bold: PDFFont) { this.newPage(); }

  newPage() {
    this.page = this.doc.addPage([W, H]);
    this.pages.push(this.page);
    this.y = H - M;
  }
  /** Starts a new page if fewer than `h` points are left. */
  need(h: number) { if (this.y - h < M + 20) this.newPage(); }

  text(s: string, x: number, size = 10, opts: { bold?: boolean; color?: ReturnType<typeof rgb>; right?: boolean } = {}) {
    const f = opts.bold ? this.bold : this.font;
    const t = safe(s);
    const dx = opts.right ? f.widthOfTextAtSize(t, size) : 0;
    this.page.drawText(t, { x: x - dx, y: this.y, size, font: f, color: opts.color ?? DARK });
  }
  line(h = 14) { this.y -= h; }
  rule() { this.page.drawLine({ start: { x: M, y: this.y + 4 }, end: { x: W - M, y: this.y + 4 }, thickness: 0.6, color: LINE }); }

  title(s: string) {
    this.need(40);
    this.line(10);
    this.text(s, M, 12, { bold: true });
    this.line(9);
    this.rule();
    this.line(12);
  }

  /** Label on the left, amount on the right. */
  row(label: string, value: string, opts: { bold?: boolean; color?: ReturnType<typeof rgb>; band?: boolean } = {}) {
    this.need(16);
    if (opts.band) this.page.drawRectangle({ x: M - 4, y: this.y - 4, width: W - 2 * M + 8, height: 16, color: BAND });
    this.text(label, M, 10, { bold: opts.bold, color: opts.color });
    this.text(value, W - M, 10, { bold: opts.bold, color: opts.color, right: true });
    this.line(16);
  }

  /** A table: first column left-aligned, the others right-aligned at the given x positions. */
  table(headers: string[], xs: number[], rows: { cells: string[]; color?: ReturnType<typeof rgb> }[]) {
    this.need(30);
    headers.forEach((h, i) => this.text(h, xs[i], 8.5, { bold: true, color: GREY, right: i > 0 }));
    this.line(6);
    this.rule();
    this.line(10);
    for (const r of rows) {
      this.need(15);
      r.cells.forEach((c, i) => this.text(c, xs[i], 9.5, { right: i > 0, color: i === r.cells.length - 1 ? r.color : undefined, bold: i === r.cells.length - 1 && !!r.color }));
      this.line(15);
    }
  }
}

/** Summary PDF (no line-by-line lists: those are in the Excel file). */
export async function buildPdf(d: ReportData): Promise<Uint8Array> {
  const { t, report: r, settings: s } = d;
  const doc = await PDFDocument.create();
  doc.setTitle(safe(`${s.shop_name} - ${d.periodText}`));
  doc.setCreator(safe(s.shop_name));
  const w = new Writer(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold));

  // Header
  w.text(s.shop_name, M, 20, { bold: true });
  w.line(16);
  const contacts = [s.address, s.phone && `${t("sales.phoneLabel")}: ${s.phone}`, s.whatsapp && s.whatsapp !== s.phone && `WhatsApp: ${s.whatsapp}`].filter(Boolean).join("  ·  ");
  w.text(contacts, M, 9.5, { color: GREY });
  if (s.tin) { w.line(12); w.text(s.tin, M, 9.5, { color: GREY }); }
  w.line(26);
  w.text(t("reports.export.reportTitle"), M, 15, { bold: true });
  w.line(17);
  w.text(d.periodText, M, 11);
  w.line(13);
  w.text(d.exportedText, M, 8.5, { color: GREY });
  w.line(8);

  // Profit
  if (r?.profit != null && r.net_profit != null) {
    w.title(t("reports.profitTitle"));
    w.row(t("reports.salesTotal"), formatMoney(r.sales_total));
    w.row(`- ${t("reports.costOfGoods")}`, formatMoney(roundMoney(Number(r.sales_total) - Number(r.profit))), { color: GREY });
    w.row(`= ${t("reports.profit")}`, formatMoney(r.profit), { bold: true });
    w.row(`- ${t("reports.expenses")}`, formatMoney(r.expenses_total), { color: GREY });
    w.row(`= ${t("reports.netProfit")}`, formatMoney(r.net_profit), { bold: true, band: true, color: Number(r.net_profit) < 0 ? RED : GREEN });
  }

  // Key figures
  w.title(t("reports.export.keyFigures"));
  w.row(t("reports.salesCount"), String(r?.sales_count ?? 0));
  w.row(t("reports.creditGiven"), formatMoney(r?.credit_given));
  w.row(t("reports.debtCollected"), formatMoney(r?.debt_collected));
  if (r?.stock_value != null) w.row(t("reports.stockValue"), formatMoney(r.stock_value));
  w.row(t("reports.debtsTotal"), formatMoney(r?.debts_total));

  // Expenses by category
  if (r?.expenses_by_category && Number(r.expenses_total) > 0) {
    w.title(t("reports.expensesByCategory"));
    for (const c of EXPENSE_CATEGORIES) {
      const v = Number(r.expenses_by_category[c] ?? 0);
      if (v > 0) w.row(t(`expenses.categories.${c}`), formatMoney(v));
    }
    w.row(t("common.total"), formatMoney(r.expenses_total), { bold: true });
  }

  // Money received by method
  w.title(t("reports.byMethod"));
  for (const m of PAYMENT_METHODS) {
    const v = Number(r?.by_method?.[m] ?? 0);
    if (v > 0) w.row(t(`methods.${m}`), formatMoney(v));
  }
  if (!PAYMENT_METHODS.some((m) => Number(r?.by_method?.[m] ?? 0) > 0)) w.row("-", formatMoney(0), { color: GREY });

  // Best sellers
  if (d.products.length) {
    w.title(t("reports.topProducts"));
    w.table([t("stock.product"), t("common.quantity"), t("reports.revenue")], [M, W - M - 110, W - M],
      d.products.slice(0, 10).map((p, i) => ({ cells: [`${i + 1}. ${p.name}`.slice(0, 60), `${formatQty(p.quantity)} ${t(`units.${p.base_unit}`)}`, formatMoney(p.revenue)] })));
  }

  // Month by month
  if (d.months.length) {
    w.title(t("reports.byMonth"));
    w.table([t("reports.monthColumn"), t("reports.salesTotal"), t("reports.profit"), t("reports.expenses"), t("reports.netProfit")],
      [M, M + 250, M + 335, M + 420, W - M],
      d.months.map((m) => ({
        cells: [d.monthLabel(m.month), formatMoney(m.sales_total), formatMoney(m.gross_profit), formatMoney(m.expenses), formatMoney(m.net_profit)],
        color: Number(m.net_profit) < 0 ? RED : GREEN,
      })));
  }

  // Page numbers
  w.pages.forEach((p, i) => {
    const label = safe(`${s.shop_name}  ·  ${t("reports.export.page", { n: i + 1, total: w.pages.length })}`);
    p.drawText(label, { x: W - M - w.font.widthOfTextAtSize(label, 8), y: 24, size: 8, font: w.font, color: GREY });
  });

  return doc.save();
}
