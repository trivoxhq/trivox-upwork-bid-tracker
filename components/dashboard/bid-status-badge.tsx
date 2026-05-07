const STATUS_KEY_STYLES: Record<string, { className: string }> = {
  new: {
    className: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-600/15",
  },
  responded: {
    className: "bg-orange-50 text-orange-900 ring-1 ring-inset ring-orange-600/20",
  },
  interview: {
    className: "bg-[#EEEDFE] text-[#3C3489] ring-1 ring-inset ring-[#3C3489]/20",
  },
  won: {
    className: "bg-emerald-50 text-emerald-900 ring-1 ring-inset ring-emerald-600/20",
  },
  lost: {
    className: "bg-red-50 text-red-800 ring-1 ring-inset ring-red-600/20",
  },
};

const DEFAULT_STYLE = "bg-bg-secondary text-text-primary ring-1 ring-inset ring-border";

function normalizeStatusKey(status: string): string {
  return status.trim().toLowerCase().replace(/\s+/g, "");
}

export function BidStatusBadge({ status }: { status: string }) {
  const key = normalizeStatusKey(status);
  const preset = STATUS_KEY_STYLES[key];
  const className = preset?.className ?? DEFAULT_STYLE;

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-tight ${className}`}
    >
      <span className="truncate">{status.trim() || "—"}</span>
    </span>
  );
}

export const BID_STATUS_OPTIONS = ["New", "Responded", "Interview", "Won", "Lost"] as const;
