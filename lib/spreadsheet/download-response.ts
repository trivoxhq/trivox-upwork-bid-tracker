import { buildCsvText } from "@/lib/spreadsheet/csv";
import { buildXlsxBuffer } from "@/lib/spreadsheet/xlsx";

export type SpreadsheetFormat = "csv" | "xlsx";

export function spreadsheetDownloadResponse(
  headers: readonly string[],
  rows: string[][],
  format: SpreadsheetFormat,
  baseFilename: string,
  sheetName?: string,
): Response {
  const stamp = new Date().toISOString().slice(0, 10);
  const safeBase = baseFilename.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "export";

  if (format === "xlsx") {
    const buffer = buildXlsxBuffer(headers, rows, sheetName ?? safeBase);
    const filename = `${safeBase}-${stamp}.xlsx`;
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const csv = buildCsvText(headers, rows);
  const filename = `${safeBase}-${stamp}.csv`;
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function parseExportFormat(value: string | null): SpreadsheetFormat {
  return value?.toLowerCase() === "xlsx" ? "xlsx" : "csv";
}
