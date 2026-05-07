"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  DASH_BTN_DANGER_GHOST,
  DASH_BTN_TOOLBAR,
  DASH_MODAL_PANEL,
  DASH_TRANSITION,
} from "@/components/dashboard/dashboard-classes";
import { modalAnimation } from "@/components/ui/motion";

type DashboardResetBidsButtonProps = {
  triggerClassName?: string;
  /** Icon-only trigger for collapsed sidebar rail. */
  iconOnly?: boolean;
};

export function DashboardResetBidsButton({ triggerClassName = "", iconOnly = false }: DashboardResetBidsButtonProps) {
  const router = useRouter();
  const titleId = useId();
  const noteId = useId();
  const pinInputId = useId();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinRequired, setPinRequired] = useState(false);
  const [pinInput, setPinInput] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/admin/reset-protection", { credentials: "include" });
        const json = (await res.json().catch(() => null)) as { pinRequired?: boolean } | null;
        if (cancelled || !res.ok || !json || typeof json.pinRequired !== "boolean") return;
        setPinRequired(json.pinRequired);
      } catch {
        /* ignore */
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  function close() {
    if (submitting) return;
    setOpen(false);
    setError(null);
    setPinInput("");
  }

  async function confirmReset() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = pinRequired ? ({ pin: pinInput } as Record<string, string>) : undefined;

      const res = await fetch("/api/bids", {
        method: "DELETE",
        credentials: "include",
        headers:
          pinRequired && payload
            ? { "Content-Type": "application/json" }
            : undefined,
        body:
          pinRequired && payload ? JSON.stringify(payload) : undefined,
      });

      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        setError(data?.message ?? "Could not reset bid data.");
        return;
      }

      setOpen(false);
      setPinInput("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Reset all bid data"
        aria-label="Reset all bid data"
        className={`${DASH_BTN_DANGER_GHOST} ${iconOnly ? "inline-flex h-10 w-10 items-center justify-center rounded-lg p-0" : ""} ${triggerClassName}`}
      >
        {iconOnly ? (
          <>
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="sr-only">Reset all bid data</span>
          </>
        ) : (
          "Reset All Data"
        )}
      </button>

      {mounted && typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  role="presentation"
                  className="fixed inset-0 z-200 flex items-center justify-center bg-text-primary/40 p-4 backdrop-blur-[2px] supports-backdrop-filter:bg-text-primary/35"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  onPointerDown={(ev) => {
                    if (ev.target === ev.currentTarget) close();
                  }}
                >
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    aria-describedby={noteId}
                    className={`w-full max-w-md rounded-2xl border border-border/90 bg-bg-primary p-6 sm:p-7 ${DASH_MODAL_PANEL}`}
                    initial={modalAnimation.initial}
                    animate={modalAnimation.animate}
                    exit={modalAnimation.initial}
                    transition={modalAnimation.transition}
                    onPointerDown={(ev) => ev.stopPropagation()}
                  >
                    <h2 id={titleId} className="text-lg font-semibold tracking-tight text-text-primary">
                      Reset all bid data?
                    </h2>
                    <p id={noteId} className="mt-2 max-w-prose text-sm leading-relaxed text-text-secondary">
                      This deletes every bid record from the system. This action cannot be undone.
                    </p>

                    {pinRequired ? (
                      <div className="mt-4">
                        <label htmlFor={pinInputId} className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                          Confirmation PIN
                        </label>
                        <input
                          id={pinInputId}
                          type="password"
                          autoComplete="off"
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value)}
                          className={`mt-2 w-full rounded-lg border border-input-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15`}
                          disabled={submitting}
                        />
                      </div>
                    ) : null}

                    {error ? (
                      <p className="mt-3 text-sm text-danger" role="alert">
                        {error}
                      </p>
                    ) : null}

                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                      <button
                        type="button"
                        onClick={close}
                        disabled={submitting}
                        className={`${DASH_BTN_TOOLBAR} min-h-[44px] w-full disabled:opacity-60 sm:min-h-0 sm:w-auto`}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void confirmReset()}
                        disabled={submitting || (pinRequired && !pinInput.trim())}
                        className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-danger bg-danger px-4 py-2 text-sm font-semibold text-white hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0 sm:w-auto ${DASH_TRANSITION} focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/35`}
                      >
                        {submitting ? "Resetting..." : "Yes, reset all"}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
