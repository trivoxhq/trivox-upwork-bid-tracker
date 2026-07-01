import * as XLSX from "xlsx";

const EQUAL_COL_WIDTH = 26;

export function buildXlsxBuffer(
  headers: readonly string[],
  rows: string[][],
  sheetName = "Sheet1",
): Buffer {
  const aoa: (string | number)[][] = [
    headers as string[],
    ...rows.map((r) => r.map(cellToXlsxCell)),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = Array.from({ length: headers.length }, () => ({ wch: EQUAL_COL_WIDTH }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function cellToXlsxCell(value: string): string | number {
  const n = Number(value);
  if (value !== "" && !Number.isNaN(n) && String(n) === value.trim()) {
    return n;
  }
  return value;
}

export function parseSpreadsheetBuffer(
  buffer: Buffer,
): { headers: string[]; rows: string[][] } {
  const wb = XLSX.read(buffer, { type: "buffer", raw: false });

  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };

  const sheet = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as (string | number | boolean | null | undefined)[][];

  if (aoa.length === 0) return { headers: [], rows: [] };

  const headers = aoa[0].map((cell) => String(cell ?? "").trim());
  const rows = aoa
    .slice(1)
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => headers.map((_, index) => String(row[index] ?? "").trim()));

  return { headers, rows };
}
