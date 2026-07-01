import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getActiveActor } from "@/lib/auth/get-active-actor";
import { assertEntityNoteAccess, canDeleteAttachment } from "@/lib/notes/entity-access";
import {
  deleteAttachmentFile,
  getAttachmentFilePath,
  sanitizeDownloadFileName,
} from "@/lib/notes/storage";
import { prisma } from "@/lib/prisma";

function jsonError(status: number, message: string) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) return jsonError(400, "Attachment id is required.");

    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    const attachment = await prisma.crmAttachment.findUnique({
      where: { id },
      include: {
        note: { select: { entityType: true, entityId: true } },
      },
    });
    if (!attachment) return jsonError(404, "Attachment not found.");

    const access = await assertEntityNoteAccess(
      actor,
      attachment.note.entityType,
      attachment.note.entityId,
      "read",
    );
    if (!access.ok) return jsonError(access.status, access.message);

    const filePath = getAttachmentFilePath(attachment.noteId, attachment.storedName);
    const data = await fs.readFile(filePath);
    const filename = sanitizeDownloadFileName(attachment.originalName);

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(data.byteLength),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return jsonError(404, "Attachment file not found.");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) return jsonError(400, "Attachment id is required.");

    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    const attachment = await prisma.crmAttachment.findUnique({
      where: { id },
      select: {
        id: true,
        noteId: true,
        storedName: true,
        createdById: true,
      },
    });
    if (!attachment) return jsonError(404, "Attachment not found.");

    if (!canDeleteAttachment(actor, attachment)) {
      return jsonError(403, "You cannot delete this attachment.");
    }

    await prisma.crmAttachment.delete({ where: { id: attachment.id } });
    await deleteAttachmentFile(attachment.noteId, attachment.storedName);

    return NextResponse.json({ success: true });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
