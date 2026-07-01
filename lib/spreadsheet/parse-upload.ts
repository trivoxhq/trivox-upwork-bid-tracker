import { NextResponse } from "next/server";
import { parseSpreadsheetBuffer } from "@/lib/spreadsheet/xlsx";
import { MAX_IMPORT_ROWS } from "@/lib/spreadsheet/import-helpers";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function parseImportUpload(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, message: "Invalid form data." }, { status: 400 }),
    };
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, message: "file is required." }, { status: 400 }),
    };
  }

  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, message: "Upload a .csv or .xlsx file." },
        { status: 400 },
      ),
    };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, message: "File is too large (max 5 MB)." },
        { status: 400 },
      ),
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseSpreadsheetBuffer(buffer);

  if (parsed.headers.length === 0) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, message: "Spreadsheet has no header row." }, { status: 400 }),
    };
  }

  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, message: `Import limited to ${MAX_IMPORT_ROWS} rows per file.` },
        { status: 400 },
      ),
    };
  }

  return { ok: true as const, parsed, filename: file.name };
}
