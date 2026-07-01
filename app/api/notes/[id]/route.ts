import { NextResponse } from "next/server";
import { getActiveActor } from "@/lib/auth/get-active-actor";
import { canDeleteNote } from "@/lib/notes/entity-access";
import { deleteNoteAttachmentDir, deleteAttachmentFile } from "@/lib/notes/storage";
import { prisma } from "@/lib/prisma";

function jsonError(status: number, message: string) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) return jsonError(400, "Note id is required.");

    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    const note = await prisma.crmNote.findUnique({
      where: { id },
      select: {
        id: true,
        createdById: true,
        attachments: { select: { storedName: true } },
      },
    });
    if (!note) return jsonError(404, "Note not found.");

    if (!canDeleteNote(actor, note)) {
      return jsonError(403, "You cannot delete this note.");
    }

    await prisma.crmNote.delete({ where: { id: note.id } });

    for (const attachment of note.attachments) {
      await deleteAttachmentFile(note.id, attachment.storedName);
    }
    await deleteNoteAttachmentDir(note.id);

    return NextResponse.json({ success: true });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
