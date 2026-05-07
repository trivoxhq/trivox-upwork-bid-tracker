"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthSessionOverlay } from "@/components/auth/auth-session-overlay";
import { AUTH_SESSION_OVERLAY } from "@/components/auth/constants";

type LogoutPhase = "idle" | "signing-out" | "redirecting";

type DashboardLogoutButtonProps = {
  /** Merged after base styles (e.g. `mt-0 w-full` for sidebar). */
  className?: string;
  /** Square icon control for collapsed sidebar. */
  iconOnly?: boolean;
};

export function DashboardLogoutButton({ className = "", iconOnly = false }: DashboardLogoutButtonProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<LogoutPhase>("idle");

  const isBusy = phase !== "idle";
  const overlayMessage =
    phase === "redirecting"
      ? AUTH_SESSION_OVERLAY.LOGOUT_REDIRECT
      : AUTH_SESSION_OVERLAY.LOGOUT_REQUEST;

  async function logout() {
    setPhase("signing-out");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        setPhase("idle");
        return;
      }
      setPhase("redirecting");
      router.push("/login");
      router.refresh();
    } catch {
      setPhase("idle");
    }
  }

  if (iconOnly) {
    return (
      <>
        <motion.button
          type="button"
          onClick={() => void logout()}
          disabled={isBusy}
          title="Log out"
          aria-label={isBusy ? (phase === "redirecting" ? "Finishing sign out" : "Signing out") : "Log out"}
          className={`mt-0 inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-border bg-bg-secondary text-text-primary transition-[background-color,box-shadow,opacity] duration-200 ease-out hover:bg-bg-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-65 ${className}`}
          whileHover={isBusy ? undefined : { scale: 1.06 }}
          whileTap={isBusy ? undefined : { scale: 0.94 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {isBusy ? (
            <span
              className="h-4 w-4 shrink-0 rounded-full border-2 border-text-primary/25 border-t-text-primary motion-safe:animate-spin"
              aria-hidden
            />
          ) : (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span className="sr-only">Log out</span>
        </motion.button>
        <AuthSessionOverlay open={isBusy} message={overlayMessage} />
      </>
    );
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => void logout()}
        disabled={isBusy}
        className={`mt-10 inline-flex min-h-[44px] min-w-34 w-full touch-manipulation items-center justify-center gap-2 rounded-md border border-border bg-bg-secondary px-5 py-2.5 text-sm font-semibold text-text-primary transition-[background-color,box-shadow,opacity] duration-200 ease-out hover:bg-bg-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-65 sm:mt-10 sm:w-auto ${className}`}
        whileHover={isBusy ? undefined : { scale: 1.01 }}
        whileTap={isBusy ? undefined : { scale: 0.99 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {isBusy ? (
          <>
            <span
              className="h-4 w-4 shrink-0 rounded-full border-2 border-text-primary/25 border-t-text-primary motion-safe:animate-spin"
              aria-hidden
            />
            {phase === "redirecting" ? "Finishing…" : "Signing out…"}
          </>
        ) : (
          "Log out"
        )}
      </motion.button>
      <AuthSessionOverlay open={isBusy} message={overlayMessage} />
    </>
  );
}
