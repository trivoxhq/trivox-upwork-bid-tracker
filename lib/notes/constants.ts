export const CRM_ENTITY_TYPES = ["lead", "client", "deal", "task", "bid"] as const;

export type CrmEntityType = (typeof CRM_ENTITY_TYPES)[number];

export function isValidCrmEntityType(value: string): value is CrmEntityType {
  return (CRM_ENTITY_TYPES as readonly string[]).includes(value);
}

export const MAX_NOTE_BODY_LENGTH = 10000;
export const MAX_ATTACHMENTS_PER_NOTE = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".txt",
  ".zip",
]);

export const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/zip",
  "application/x-zip-compressed",
]);
