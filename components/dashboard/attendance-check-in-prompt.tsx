"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  DASH_BTN_TOOLBAR,
  DASH_MODAL_PANEL,
  DASH_TRANSITION,
} from "@/components/dashboard/dashboard-classes";
import { modalAnimation } from "@/components/ui/motion";
import { getOrCreateDeviceFingerprint } from "@/lib/attendance/device-id";

type AttendanceCheckInPromptProps = {
  enabled: boolean;
};

/**
 * After login / first dashboard load of the day: if the member has no attendance
 * record yet, show a check-in modal so they don't need to open Attendance first.
 */
export function AttendanceCheckInPrompt({ enabled }: AttendanceCheckInPromptProps) {
  const pathname = usePathname();
  const titleId = useId();
  const descId = useId();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  const onAttendancePage = pathname.startsWith("/dashboard/attendance");

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!enabled || !mounted || checked || onAttendancePage) return;

    let cancelled = false;

    async function probe() {
      try {
        const res = await fetch("/api/attendance/today", { credentials: "include" });
        const json = (await res.json().catch(() => null)) as {
          success?: boolean;
          record?: { status?: string } | null;
        } | null;

        if (cancelled) return;
        setChecked(true);

        if (!res.ok || !json?.success) return;
        if (json.record == null) {
          setOpen(true);
        }
      } catch {
        if (!cancelled) setChecked(true);
      }
    }

    void probe();
    return () => {
      cancelled = true;
    };
  }, [enabled, mounted, checked, onAttendancePage]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, close]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function onCheckIn() {
    setBusy(true);
    try {
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceFingerprint: getOrCreateDeviceFingerprint(),
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;
      if (!res.ok || !json?.success) {
        toast.error(json?.message ?? "Could not check in.");
        return;
      }
      toast.success("Checked in.");
      setOpen(false);
    } catch {
      toast.error("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (!mounted || !enabled) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          role="presentation"
          className="fixed inset-0 z-60 flex items-center justify-center bg-text-primary/40 p-4 backdrop-blur-[2px] supports-backdrop-filter:bg-text-primary/35"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onPointerDown={(ev) => {
            if (ev.target === ev.currentTarget && !busy) close();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className={`w-full max-w-md rounded-2xl border border-border/90 bg-bg-primary p-6 sm:p-7 ${DASH_MODAL_PANEL}`}
            initial={modalAnimation.initial}
            animate={modalAnimation.animate}
            exit={modalAnimation.initial}
            transition={modalAnimation.transition}
            onPointerDown={(ev) => ev.stopPropagation()}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-primary">
              Attendance
            </p>
            <h2
              id={titleId}
              className="mt-1.5 text-lg font-semibold tracking-tight text-text-primary"
            >
              Check in for today
            </h2>
            <p id={descId} className="mt-2 text-sm leading-relaxed text-text-secondary">
              You haven&apos;t started your shift yet. Check in now to begin tracking work time —
              you can manage breaks and check-out anytime from Attendance.
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={DASH_BTN_TOOLBAR}
                disabled={busy}
                onClick={close}
              >
                Not now
              </button>
              <Link
                href="/dashboard/attendance"
                className={`${DASH_BTN_TOOLBAR} ${DASH_TRANSITION}`}
                onClick={close}
              >
                Open Attendance
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onCheckIn()}
                className={`${DASH_BTN_TOOLBAR} border-brand-primary bg-brand-primary text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {busy ? "Checking in…" : "Check in"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
