import { NextResponse } from "next/server";
import { getActiveActor, getActiveUsersForImport } from "@/lib/auth/get-active-actor";
import { readOnlyForbiddenResponse } from "@/lib/auth/api-guards";
import { canWrite } from "@/lib/auth/roles";
import { importDealRows } from "@/lib/deals/spreadsheet";
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

    const users = await getActiveUsersForImport();
    const result = await importDealRows(upload.parsed.headers, upload.parsed.rows, actor, users);

    return NextResponse.json({
      success: true,
      message: `Imported ${result.created} deal(s). ${result.failed} row(s) failed.`,
      result,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
