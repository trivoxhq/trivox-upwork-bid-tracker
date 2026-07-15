import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function getAttendanceUploadRoot(): string {
  const configured = process.env.ATTENDANCE_UPLOAD_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "uploads", "attendance");
}

export function getAttendanceRecordDir(recordId: string): string {
  return path.join(getAttendanceUploadRoot(), recordId);
}

export async function writeAttendanceCapture(
  recordId: string,
  originalName: string,
  data: Buffer,
): Promise<{ storedName: string; sizeBytes: number }> {
  const dir = getAttendanceRecordDir(recordId);
  await fs.mkdir(dir, { recursive: true });
  const ext = path.extname(originalName).toLowerCase().slice(0, 12) || ".bin";
  const storedName = `${randomUUID()}${ext}`;
  await fs.writeFile(path.join(dir, storedName), data);
  return { storedName, sizeBytes: data.length };
}

export function getAttendanceCapturePath(recordId: string, storedName: string): string {
  return path.join(getAttendanceRecordDir(recordId), storedName);
}
