"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DASH_TRANSITION } from "@/components/dashboard/dashboard-classes";
import { AddBidModal } from "@/components/dashboard/add-bid-modal";

type DashboardAddBidTriggerProps = {
  label?: string;
  className?: string;
  /** Square control for collapsed sidebar rail. */
  iconOnly?: boolean;
};

export function DashboardAddBidTrigger({
  label = "Add bid",
  className = "min-h-[44px] w-full sm:w-auto",
  iconOnly = false,
}: DashboardAddBidTriggerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (iconOnly) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={label}
          aria-label={label}
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-primary bg-brand-primary text-white shadow-md shadow-brand-primary/25 hover:border-brand-hover hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35 ${DASH_TRANSITION} ${className}`}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          <span className="sr-only">{label}</span>
        </button>
        <AddBidModal
          open={open}
          onClose={() => setOpen(false)}
          onCreated={() => router.refresh()}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex min-h-[44px] items-center justify-center rounded-lg border border-brand-primary bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:border-brand-hover hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35 ${DASH_TRANSITION} ${className}`}
      >
        {label}
      </button>
      <AddBidModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
