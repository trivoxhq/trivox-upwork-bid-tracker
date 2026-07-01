import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function getUploadRootDir(): string {
  const configured = process.env.CRM_UPLOAD_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "uploads", "crm-attachments");
}

export function getNoteAttachmentDir(noteId: string): string {
  return path.join(getUploadRootDir(), noteId);
}

export function getAttachmentFilePath(noteId: string, storedName: string): string {
  return path.join(getNoteAttachmentDir(noteId), storedName);
}

export async function ensureNoteAttachmentDir(noteId: string): Promise<void> {
  await fs.mkdir(getNoteAttachmentDir(noteId), { recursive: true });
}

export function buildStoredFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase().slice(0, 12);
  return `${randomUUID()}${ext}`;
}

export async function writeAttachmentFile(
  noteId: string,
  storedName: string,
  data: Buffer,
): Promise<void> {
  await ensureNoteAttachmentDir(noteId);
  const target = getAttachmentFilePath(noteId, storedName);
  await fs.writeFile(target, data);
}

export async function deleteAttachmentFile(noteId: string, storedName: string): Promise<void> {
  try {
    await fs.unlink(getAttachmentFilePath(noteId, storedName));
  } catch {
    /* file may already be gone */
  }
}

export async function deleteNoteAttachmentDir(noteId: string): Promise<void> {
  try {
    await fs.rm(getNoteAttachmentDir(noteId), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

export function sanitizeDownloadFileName(name: string): string {
  const base = path.basename(name).replace(/[^\w.\-()+\s]/g, "_").trim();
  return base || "attachment";
}
