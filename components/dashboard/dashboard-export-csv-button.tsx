"use client";

import { useState } from "react";
import { DASH_BTN_TOOLBAR } from "@/components/dashboard/dashboard-classes";
import toast from "react-hot-toast";

const ICON_RAIL =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-bg-primary text-text-secondary shadow-sm transition-[background-color,box-shadow,color,transform] duration-200 ease-out hover:bg-bg-secondary hover:text-text-primary hover:shadow disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25";

type DashboardExportCsvButtonProps = {
  /** When set, replaces default toolbar classes entirely. */
  buttonClassName?: string;
  /** Compact square control for collapsed sidebar rail. */
  iconOnly?: boolean;
};

export function DashboardExportCsvButton({ buttonClassName = "", iconOnly = false }: DashboardExportCsvButtonProps) {
  const [exporting, setExporting] = useState(false);
  const customTrigger = buttonClassName.trim();

  async function onExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/bids/export", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        toast.error(data?.message ?? "Could not export CSV.");
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/i);
      const filename = filenameMatch?.[1] ?? `bids-export-${new Date().toISOString().slice(0, 10)}.csv`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("CSV exported successfully.");
    } catch {
      toast.error("Network error. Could not export CSV.");
    } finally {
      setExporting(false);
    }
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={() => void onExport()}
        disabled={exporting}
        title="Export CSV"
        aria-label={exporting ? "Exporting CSV" : "Export bids as CSV"}
        className={`${customTrigger || ICON_RAIL} disabled:opacity-60`}
      >
        {exporting ? (
          <span
            className="h-4 w-4 shrink-0 rounded-full border-2 border-text-secondary/30 border-t-text-secondary motion-safe:animate-spin"
            aria-hidden
          />
        ) : (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className="sr-only">Export CSV</span>
      </button>
    );
  }

  const base = customTrigger || DASH_BTN_TOOLBAR;
  return (
    <button
      type="button"
      onClick={() => void onExport()}
      disabled={exporting}
      className={`${base} disabled:opacity-60`}
    >
      {exporting ? "Exporting..." : "Export CSV"}
    </button>
  );
}
