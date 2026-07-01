import { NextResponse } from "next/server";
import { getActiveActor } from "@/lib/auth/get-active-actor";
import { readOnlyForbiddenResponse } from "@/lib/auth/api-guards";
import { canWrite } from "@/lib/auth/roles";
import { importClientRows } from "@/lib/clients/spreadsheet";
import { parseImportUpload } from "@/lib/spreadsheet/parse-upload";

export async function POST(request: Request) {
  try {
    const actor = await getActiveActor();
    if (!actor?.isActive) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }
    if (!canWrite(actor.role)) return readOnlyForbiddenResponse();

    const upload = await parseImportUpload(request);
    if (!upload.ok) return upload.response;

    const result = await importClientRows(upload.parsed.headers, upload.parsed.rows, actor.id);

    return NextResponse.json({
      success: true,
      message: `Imported ${result.created} client(s). ${result.failed} row(s) failed.`,
      result,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
