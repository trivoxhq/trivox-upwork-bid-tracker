import { buildXlsxBuffer } from "@/lib/spreadsheet/xlsx";

/** @deprecated Use buildXlsxBuffer from @/lib/spreadsheet/xlsx */
export function buildBidsXlsxBuffer(headers: readonly string[], rows: string[][]): Buffer {
  return buildXlsxBuffer(headers, rows, "Bids");
}
