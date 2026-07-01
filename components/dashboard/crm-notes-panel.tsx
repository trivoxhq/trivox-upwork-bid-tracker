"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  DASH_BTN_TABLE,
  DASH_BTN_TABLE_DANGER,
  DASH_BTN_TOOLBAR,
  DASH_SECTION_TITLE,
} from "@/components/dashboard/dashboard-classes";
import type { CrmEntityType } from "@/lib/notes/constants";
import type { CrmNoteRow } from "@/lib/notes/map-note";
import toast from "react-hot-toast";

type CrmNotesPanelProps = {
  entityType: CrmEntityType;
  entityId: string;
  entityTitle: string;
  readOnly?: boolean;
  canDelete?: boolean;
  currentUserId: string;
  onClose?: () => void;
  className?: string;
};

const inputClass =
  "w-full rounded-lg border border-input-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-secondary/55 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:cursor-not-allowed disabled:bg-bg-secondary disabled:opacity-70";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CrmNotesPanel({
  entityType,
  entityId,
  entityTitle,
  readOnly = false,
  canDelete = false,
  currentUserId,
  onClose,
  className = "",
}: CrmNotesPanelProps) {
  const bodyId = useId();
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const [notes, setNotes] = useState<CrmNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ entityType, entityId });
      const res = await fetch(`/api/notes?${params.toString()}`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        notes?: CrmNoteRow[];
        message?: string;
      } | null;

      if (!res.ok || !data?.success || !Array.isArray(data.notes)) {
        setLoadError(data?.message ?? "Could not load notes.");
        setNotes([]);
        return;
      }
      setNotes(data.notes);
    } catch {
      setLoadError("Network error loading notes.");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;

    const trimmed = body.trim();
    if (!trimmed && files.length === 0) {
      toast.error("Add a note or choose at least one file.");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("entityType", entityType);
      form.append("entityId", entityId);
      form.append("body", trimmed);
      for (const file of files) form.append("files", file);

      const res = await fetch("/api/notes", {
        method: "POST",
        credentials: "include",
        body: form,
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        note?: CrmNoteRow;
      } | null;

      if (!res.ok || !data?.success || !data.note) {
        toast.error(data?.message ?? "Could not save note.");
        return;
      }

      setNotes((prev) => [data.note!, ...prev]);
      setBody("");
      setFiles([]);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Note added.");
    } catch {
      toast.error("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteNote(noteId: string) {
    if (!window.confirm("Delete this note and its attachments?")) return;
    setBusyId(noteId);
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        toast.error(data?.message ?? "Could not delete note.");
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success("Note deleted.");
    } catch {
      toast.error("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteAttachment(noteId: string, attachmentId: string) {
    if (!window.confirm("Remove this attachment?")) return;
    setBusyId(attachmentId);
    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        toast.error(data?.message ?? "Could not delete attachment.");
        return;
      }
      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId
            ? { ...note, attachments: note.attachments.filter((a) => a.id !== attachmentId) }
            : note,
        ),
      );
      toast.success("Attachment removed.");
    } catch {
      toast.error("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  function canRemoveNote(note: CrmNoteRow): boolean {
    if (readOnly) return false;
    return canDelete || note.createdBy.id === currentUserId;
  }

  function canRemoveAttachment(
    note: CrmNoteRow,
    attachment: CrmNoteRow["attachments"][number],
  ): boolean {
    if (readOnly) return false;
    return canDelete || attachment.createdBy.id === currentUserId || note.createdBy.id === currentUserId;
  }

  return (
    <section
      className={`rounded-[22px] border border-border/55 bg-bg-primary/80 p-4 shadow-sm sm:p-5 ${className}`.trim()}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={DASH_SECTION_TITLE}>Notes & attachments</h2>
          <p className="mt-1.5 text-sm text-text-secondary">{entityTitle}</p>
        </div>
        {onClose ? (
          <button type="button" className={DASH_BTN_TABLE} onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>

      {!readOnly ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-3 border-b border-border/70 pb-5">
          <div>
            <label className={DASH_SECTION_TITLE} htmlFor={bodyId}>
              Add note
            </label>
            <textarea
              id={bodyId}
              className={`${inputClass} mt-2 min-h-24 resize-y`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Meeting summary, follow-up, proposal details…"
              disabled={submitting}
            />
          </div>
          <div>
            <label className={DASH_SECTION_TITLE} htmlFor={fileId}>
              Attach files
            </label>
            <input
              ref={fileRef}
              id={fileId}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,.txt,.zip"
              className="mt-2 block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-brand-primary/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-primary"
              disabled={submitting}
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            <p className="mt-1.5 text-xs text-text-secondary">
              Up to 5 files, 10 MB each. PDF, Office docs, images, CSV, TXT, ZIP.
            </p>
            {files.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-text-secondary">
                {files.map((file) => (
                  <li key={`${file.name}-${file.size}`}>
                    {file.name} ({formatBytes(file.size)})
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button type="submit" disabled={submitting} className={DASH_BTN_TOOLBAR}>
            {submitting ? "Saving…" : "Add note"}
          </button>
        </form>
      ) : null}

      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-text-secondary">Loading notes…</p>
        ) : loadError ? (
          <p className="text-sm text-danger" role="alert">
            {loadError}
          </p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-text-secondary">No notes yet.</p>
        ) : (
          <ul className="space-y-4">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-xl border border-border/70 bg-bg-primary p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{note.createdBy.name}</p>
                    <p className="text-xs text-text-secondary">{formatWhen(note.createdAt)}</p>
                  </div>
                  {canRemoveNote(note) ? (
                    <button
                      type="button"
                      className={DASH_BTN_TABLE_DANGER}
                      disabled={busyId === note.id}
                      onClick={() => void deleteNote(note.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
                {note.body && note.body !== "(attachment)" ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                    {note.body}
                  </p>
                ) : null}
                {note.attachments.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {note.attachments.map((attachment) => (
                      <li
                        key={attachment.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-bg-secondary/40 px-3 py-2"
                      >
                        <a
                          href={`/api/attachments/${attachment.id}`}
                          className="text-sm font-medium text-brand-primary underline decoration-brand-primary/30 underline-offset-2 hover:text-text-primary"
                        >
                          {attachment.originalName}
                        </a>
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <span>{formatBytes(attachment.sizeBytes)}</span>
                          {canRemoveAttachment(note, attachment) ? (
                            <button
                              type="button"
                              className={DASH_BTN_TABLE_DANGER}
                              disabled={busyId === attachment.id}
                              onClick={() => void deleteAttachment(note.id, attachment.id)}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
