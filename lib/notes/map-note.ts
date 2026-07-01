export type CrmAttachmentRow = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  createdBy: { id: string; name: string };
};

export type CrmNoteRow = {
  id: string;
  entityType: string;
  entityId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string; email: string };
  attachments: CrmAttachmentRow[];
};

export const NOTE_INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true } },
  attachments: {
    orderBy: { createdAt: "asc" as const },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  },
} as const;

type NoteWithRelations = {
  id: string;
  entityType: string;
  entityId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; name: string; email: string };
  attachments: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: Date;
    createdBy: { id: string; name: string };
  }>;
};

export function mapNoteToRow(note: NoteWithRelations): CrmNoteRow {
  return {
    id: note.id,
    entityType: note.entityType,
    entityId: note.entityId,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    createdBy: note.createdBy,
    attachments: note.attachments.map((attachment) => ({
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      createdAt: attachment.createdAt.toISOString(),
      createdBy: attachment.createdBy,
    })),
  };
}
