import { NextResponse } from "next/server";
import { getActiveActor } from "@/lib/auth/get-active-actor";
import { readOnlyForbiddenResponse } from "@/lib/auth/api-guards";
import { canWrite } from "@/lib/auth/roles";
import { assertEntityNoteAccess } from "@/lib/notes/entity-access";
import { MAX_NOTE_BODY_LENGTH } from "@/lib/notes/constants";
import { mapNoteToRow, NOTE_INCLUDE } from "@/lib/notes/map-note";
import { buildStoredFileName, deleteNoteAttachmentDir, writeAttachmentFile } from "@/lib/notes/storage";
import { collectValidUploadFiles } from "@/lib/notes/validate-upload";
import { prisma } from "@/lib/prisma";

function jsonError(status: number, message: string) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(request: Request) {
  try {
    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    const url = new URL(request.url);
    const entityType = url.searchParams.get("entityType") ?? "";
    const entityId = url.searchParams.get("entityId") ?? "";

    const access = await assertEntityNoteAccess(actor, entityType, entityId, "read");
    if (!access.ok) return jsonError(access.status, access.message);

    const notes = await prisma.crmNote.findMany({
      where: { entityType: access.entityType, entityId: access.entityId },
      include: NOTE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      notes: notes.map(mapNoteToRow),
    });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}

export async function POST(request: Request) {
  let createdNoteId: string | null = null;

  try {
    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");
    if (!canWrite(actor.role)) return readOnlyForbiddenResponse();

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError(400, "Invalid form data.");
    }

    const entityType = String(form.get("entityType") ?? "");
    const entityId = String(form.get("entityId") ?? "");
    const body = String(form.get("body") ?? "").trim();

    const access = await assertEntityNoteAccess(actor, entityType, entityId, "write");
    if (!access.ok) return jsonError(access.status, access.message);

    const rawFiles = form.getAll("files").filter((entry): entry is File => entry instanceof File);
    const { files, error: filesError } = collectValidUploadFiles(rawFiles);
    if (filesError) return jsonError(400, filesError);

    if (!body && files.length === 0) {
      return jsonError(400, "Add a note or at least one attachment.");
    }
    if (body.length > MAX_NOTE_BODY_LENGTH) {
      return jsonError(400, `Note must be ${MAX_NOTE_BODY_LENGTH} characters or fewer.`);
    }

    const noteBody = body || (files.length > 0 ? "(attachment)" : "");

    const note = await prisma.crmNote.create({
      data: {
        entityType: access.entityType,
        entityId: access.entityId,
        body: noteBody,
        createdById: actor.id,
      },
      select: { id: true },
    });
    createdNoteId = note.id;

    for (const file of files) {
      const storedName = buildStoredFileName(file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeAttachmentFile(note.id, storedName, buffer);

      await prisma.crmAttachment.create({
        data: {
          noteId: note.id,
          storedName,
          originalName: file.name.slice(0, 255),
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          createdById: actor.id,
        },
      });
    }

    const full = await prisma.crmNote.findUnique({
      where: { id: note.id },
      include: NOTE_INCLUDE,
    });

    if (!full) return jsonError(500, "Note was created but could not be loaded.");

    return NextResponse.json({ success: true, note: mapNoteToRow(full) }, { status: 201 });
  } catch {
    if (createdNoteId) {
      await prisma.crmAttachment.deleteMany({ where: { noteId: createdNoteId } });
      await prisma.crmNote.delete({ where: { id: createdNoteId } }).catch(() => undefined);
      await deleteNoteAttachmentDir(createdNoteId);
    }
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
