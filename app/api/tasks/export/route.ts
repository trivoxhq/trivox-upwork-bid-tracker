import { NextResponse } from "next/server";
import { getActiveActor } from "@/lib/auth/get-active-actor";
import { parseExportFormat, spreadsheetDownloadResponse } from "@/lib/spreadsheet/download-response";
import {
  TASK_EXPORT_HEADERS,
  TASK_EXPORT_INCLUDE,
  buildTaskExportRows,
  taskExportWhere,
} from "@/lib/tasks/spreadsheet";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const format = parseExportFormat(new URL(request.url).searchParams.get("format"));
    const actor = await getActiveActor();
    if (!actor?.isActive) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const tasks = await prisma.crmTask.findMany({
      where: taskExportWhere(actor),
      include: TASK_EXPORT_INCLUDE,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    const rows = buildTaskExportRows(tasks);
    return spreadsheetDownloadResponse(TASK_EXPORT_HEADERS, rows, format, "tasks-export", "Tasks");
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
