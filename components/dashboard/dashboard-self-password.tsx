"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useId, useState } from "react";
import toast from "react-hot-toast";
import {
  DASH_MODAL_PANEL,
  DASH_SECTION_TITLE,
  DASH_TRANSITION,
} from "@/components/dashboard/dashboard-classes";
import Button from "@/components/ui/button";
import { modalAnimation } from "@/components/ui/motion";

const inputClass =
  "w-full rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15";

const labelClass = `mb-1.5 block ${DASH_SECTION_TITLE}`;

type DashboardSelfPasswordProps = {
  userId: string;
};

export function DashboardSelfPassword({ userId }: DashboardSelfPasswordProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        setError(data?.message ?? "Could not update password.");
        return;
      }
      toast.success("Password updated.");
      setOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-3 text-xs font-semibold text-info underline decoration-info/35 underline-offset-2 hover:decoration-info ${DASH_TRANSITION}`}
      >
        Change password
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="presentation"
            className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4 backdrop-blur-[2px] supports-backdrop-filter:bg-text-primary/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onPointerDown={(ev) => {
              if (ev.target === ev.currentTarget && !saving) closeModal();
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={`w-full max-w-md rounded-2xl border border-border/90 bg-bg-primary p-6 sm:p-7 ${DASH_MODAL_PANEL}`}
              initial={modalAnimation.initial}
              animate={modalAnimation.animate}
              exit={modalAnimation.initial}
              transition={modalAnimation.transition}
              onPointerDown={(ev) => ev.stopPropagation()}
            >
              <h2 id={titleId} className="text-lg font-semibold tracking-tight text-text-primary">
                Change your password
              </h2>

              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <div>
                  <label className={labelClass} htmlFor="self-new-password">
                    New password
                  </label>
                  <input
                    id="self-new-password"
                    type="password"
                    autoComplete="new-password"
                    className={inputClass}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={saving}
                    minLength={8}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="self-confirm-password">
                    Confirm password
                  </label>
                  <input
                    id="self-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    className={inputClass}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={saving}
                    minLength={8}
                  />
                </div>
                {error ? (
                  <p className="text-sm text-danger" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button variant="secondary" type="button" onClick={closeModal}>
                    Cancel
                  </Button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`inline-flex min-h-[44px] items-center justify-center rounded-lg border border-brand-primary bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:border-brand-hover hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 ${DASH_TRANSITION} focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35`}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
