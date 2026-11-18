import { getLocale } from "next-intl/server";
import { getStaff } from "@/server/auth";
import { gatherReport } from "@/server/reports/data";
import { buildExcel } from "@/server/reports/excel";
import { buildPdf } from "@/server/reports/pdf";
import { canSeeProfit } from "@/lib/permissions";

// Download the report of a period: /admin/reports/export?format=xlsx|pdf&period=week|month=YYYY-MM|from=&to=
export async function GET(request: Request) {
  const staff = await getStaff();
  if (!staff || !canSeeProfit(staff.role)) return new Response("Not allowed", { status: 403 });

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const params = Object.fromEntries(["period", "month", "from", "to"].map((k) => [k, url.searchParams.get(k) ?? undefined]));
  const data = await gatherReport(params, staff, await getLocale());

  const body = format === "pdf" ? await buildPdf(data) : await buildExcel(data);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${data.fileName}.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}
