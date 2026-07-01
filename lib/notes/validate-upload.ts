import path from "node:path";
import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_NOTE,
} from "@/lib/notes/constants";

export function validateAttachmentFile(file: File): string | null {
  if (file.size <= 0) return "Empty files are not allowed.";
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `Each file must be ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB or smaller.`;
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(ext)) {
    return `File type not allowed: ${ext || "unknown"}.`;
  }

  const mime = file.type || "application/octet-stream";
  if (mime !== "application/octet-stream" && !ALLOWED_ATTACHMENT_MIME_TYPES.has(mime)) {
    return `MIME type not allowed: ${mime}.`;
  }

  return null;
}

export function collectValidUploadFiles(files: File[]): { files: File[]; error?: string } {
  const uploads = files.filter((f) => f.size > 0);
  if (uploads.length > MAX_ATTACHMENTS_PER_NOTE) {
    return {
      files: [],
      error: `Maximum ${MAX_ATTACHMENTS_PER_NOTE} attachments per note.`,
    };
  }

  for (const file of uploads) {
    const err = validateAttachmentFile(file);
    if (err) return { files: [], error: err };
  }

  return { files: uploads };
}
