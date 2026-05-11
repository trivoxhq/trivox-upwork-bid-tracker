import * as XLSX from "xlsx";

/** Uniform column width in character units (Excel “wch”) — all columns match. */
const EQUAL_COL_WIDTH = 26;

export function buildBidsXlsxBuffer(headers: readonly string[], rows: string[][]): Buffer {
  const aoa: (string | number)[][] = [headers as string[], ...rows.map((r) => r.map(cellToXlsxCell))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = Array.from({ length: headers.length }, () => ({ wch: EQUAL_COL_WIDTH }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bids");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function cellToXlsxCell(value: string): string | number {
  const n = Number(value);
  if (value !== "" && !Number.isNaN(n) && String(n) === value.trim()) {
    return n;
  }
  return value;
}
