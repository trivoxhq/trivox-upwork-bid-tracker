import { NextResponse } from "next/server";
import { jsonError, requireAttendanceWriteActor } from "@/lib/attendance/auth";
import { getWorkDate } from "@/lib/attendance/get-work-date";
import { assertClientMeta, extractClientMeta } from "@/lib/attendance/request-meta";
import { getOrCreateAttendanceSettings } from "@/lib/attendance/settings";
import { writeAttendanceCapture } from "@/lib/attendance/storage";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const gate = await requireAttendanceWriteActor();
    if (!gate.ok) return gate.response;

    const settings = await getOrCreateAttendanceSettings();
    if (!settings.activityTrackingEnabled) {
      return jsonError(403, "Activity tracking is currently disabled.");
    }

    const contentType = request.headers.get("content-type") ?? "";
    let type = "heartbeat";
    let deviceFingerprint: string | undefined;
    let metaJson: string | null = null;
    let fileBuffer: Buffer | null = null;
    let mimeType: string | null = null;
    let originalName = "capture.png";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      type = String(form.get("type") ?? "screenshot");
      deviceFingerprint = String(form.get("deviceFingerprint") ?? "") || undefined;
      const meta = form.get("meta");
      if (typeof meta === "string" && meta.trim()) metaJson = meta.trim().slice(0, 4000);
      const file = form.get("file");
      if (file instanceof File && file.size > 0) {
        if (file.size > 2_000_000) return jsonError(400, "Capture file too large (max 2MB).");
        fileBuffer = Buffer.from(await file.arrayBuffer());
        mimeType = file.type || "application/octet-stream";
        originalName = file.name || originalName;
      }
    } else {
      let body: Record<string, unknown>;
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return jsonError(400, "Invalid body.");
      }
      type = typeof body.type === "string" ? body.type : "heartbeat";
      deviceFingerprint =
        typeof body.deviceFingerprint === "string" ? body.deviceFingerprint : undefined;
      if (body.meta && typeof body.meta === "object") {
        metaJson = JSON.stringify(body.meta).slice(0, 4000);
      }
    }

    const meta = extractClientMeta(request, deviceFingerprint);
    const metaError = assertClientMeta(meta);
    if (metaError) return jsonError(400, metaError);

    const user = await prisma.user.findUnique({
      where: { id: gate.actor.id },
      select: { id: true, timezone: true },
    });
    if (!user) return jsonError(401, "Unauthorized.");

    const workDate = getWorkDate(new Date(), user.timezone || undefined);
    const record = await prisma.attendanceRecord.findUnique({
      where: { userId_workDate: { userId: user.id, workDate } },
    });
    if (!record || record.status !== "open") {
      return jsonError(400, "No open attendance session for activity capture.");
    }

    let storedName: string | null = null;
    let sizeBytes: number | null = null;
    if (fileBuffer) {
      const written = await writeAttendanceCapture(record.id, originalName, fileBuffer);
      storedName = written.storedName;
      sizeBytes = written.sizeBytes;
      type = type === "heartbeat" ? "screenshot" : type;
    }

    const capture = await prisma.attendanceActivityCapture.create({
      data: {
        recordId: record.id,
        type,
        storedName,
        mimeType,
        sizeBytes,
        metaJson,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return NextResponse.json({ success: true, captureId: capture.id }, { status: 201 });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
