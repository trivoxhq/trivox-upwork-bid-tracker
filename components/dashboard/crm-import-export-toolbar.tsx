"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DASH_BTN_TOOLBAR } from "@/components/dashboard/dashboard-classes";
import toast from "react-hot-toast";

export type CrmEntity = "leads" | "clients" | "deals" | "tasks" | "bids";

type CrmImportExportToolbarProps = {
  entity: CrmEntity;
  readOnly?: boolean;
  className?: string;
};

const ENTITY_LABELS: Record<CrmEntity, string> = {
  leads: "leads",
  clients: "clients",
  deals: "deals",
  tasks: "tasks",
  bids: "bids",
};

async function downloadExport(
  entity: CrmEntity,
  format: "csv" | "xlsx",
  filterQuery?: string,
) {
  const qs = filterQuery?.trim();
  const url = `/api/${entity}/export?format=${format}${qs ? `&${qs}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? "Export failed.");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filenameMatch = disposition.match(/filename="([^"]+)"/i);
  const fallback = `${entity}-export-${new Date().toISOString().slice(0, 10)}.${format === "xlsx" ? "xlsx" : "csv"}`;
  const filename = filenameMatch?.[1] ?? fallback;

  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export function CrmImportExportToolbar({
  entity,
  readOnly = false,
  className = "",
}: CrmImportExportToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | null>(null);
  const [importing, setImporting] = useState(false);
  const label = ENTITY_LABELS[entity];

  async function onExport(format: "csv" | "xlsx") {
    setExporting(format);
    try {
      await downloadExport(entity, format, searchParams.toString());
      toast.success(format === "xlsx" ? "Excel file downloaded." : "CSV exported successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(null);
    }
  }

  async function onImportFile(file: File) {
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`/api/${entity}/import`, {
        method: "POST",
        credentials: "include",
        body: form,
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        result?: { created: number; failed: number; errors: { row: number; message: string }[] };
      } | null;

      if (!res.ok || !data?.success) {
        toast.error(data?.message ?? "Import failed.");
        return;
      }

      toast.success(data.message ?? "Import complete.");
      if (data.result?.errors?.length) {
        const preview = data.result.errors
          .slice(0, 3)
          .map((e) => `Row ${e.row}: ${e.message}`)
          .join("\n");
        console.warn(`Import errors for ${entity}:\n${preview}`);
      }
      router.refresh();
    } catch {
      toast.error("Network error during import.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <button
        type="button"
        className={DASH_BTN_TOOLBAR}
        disabled={exporting !== null}
        onClick={() => void onExport("csv")}
      >
        {exporting === "csv" ? "Exporting…" : "Export CSV"}
      </button>
      <button
        type="button"
        className={DASH_BTN_TOOLBAR}
        disabled={exporting !== null}
        onClick={() => void onExport("xlsx")}
      >
        {exporting === "xlsx" ? "Exporting…" : "Export Excel"}
      </button>
      {!readOnly ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImportFile(file);
            }}
          />
          <button
            type="button"
            className={DASH_BTN_TOOLBAR}
            disabled={importing}
            onClick={() => fileRef.current?.click()}
          >
            {importing ? "Importing…" : `Import ${label}`}
          </button>
        </>
      ) : null}
    </div>
  );
}
