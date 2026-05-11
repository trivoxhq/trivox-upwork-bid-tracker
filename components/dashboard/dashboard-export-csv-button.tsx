"use client";

import { useState } from "react";
import { DASH_BTN_TOOLBAR } from "@/components/dashboard/dashboard-classes";
import toast from "react-hot-toast";

const ICON_RAIL =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-bg-primary text-text-secondary shadow-sm transition-[background-color,box-shadow,color,transform] duration-200 ease-out hover:bg-bg-secondary hover:text-text-primary hover:shadow disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25";

export type BidExportFormat = "csv" | "xlsx";

type DashboardExportBidsButtonProps = {
  /** `xlsx` uses equal column widths in Excel; `csv` is plain text (no column metadata). */
  format: BidExportFormat;
  /** When set, replaces default toolbar classes entirely. */
  buttonClassName?: string;
  /** Compact square control for collapsed sidebar rail. */
  iconOnly?: boolean;
};

export function DashboardExportBidsButton({
  format,
  buttonClassName = "",
  iconOnly = false,
}: DashboardExportBidsButtonProps) {
  const [exporting, setExporting] = useState(false);
  const customTrigger = buttonClassName.trim();
  const isXlsx = format === "xlsx";
  const labelShort = isXlsx ? "Excel" : "CSV";
  const labelLong = isXlsx ? "Export Excel" : "Export CSV";

  async function onExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/bids/export?format=${format}`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        toast.error(data?.message ?? `Could not export ${labelShort}.`);
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/i);
      const fallback = `bids-export-${new Date().toISOString().slice(0, 10)}.${isXlsx ? "xlsx" : "csv"}`;
      const filename = filenameMatch?.[1] ?? fallback;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(isXlsx ? "Excel file downloaded." : "CSV exported successfully.");
    } catch {
      toast.error(`Network error. Could not export ${labelShort}.`);
    } finally {
      setExporting(false);
    }
  }

  const title = exporting
    ? isXlsx
      ? "Exporting Excel…"
      : "Exporting CSV…"
    : isXlsx
      ? "Download bids as Excel (.xlsx), equal column widths"
      : "Export bids as CSV";

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={() => void onExport()}
        disabled={exporting}
        title={title}
        aria-label={exporting ? (isXlsx ? "Exporting Excel" : "Exporting CSV") : isXlsx ? "Export bids as Excel" : "Export bids as CSV"}
        className={`${customTrigger || ICON_RAIL} disabled:opacity-60`}
      >
        {exporting ? (
          <span
            className="h-4 w-4 shrink-0 rounded-full border-2 border-text-secondary/30 border-t-text-secondary motion-safe:animate-spin"
            aria-hidden
          />
        ) : isXlsx ? (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className="sr-only">{labelLong}</span>
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
      {exporting ? (isXlsx ? "Downloading…" : "Exporting...") : labelLong}
    </button>
  );
}
