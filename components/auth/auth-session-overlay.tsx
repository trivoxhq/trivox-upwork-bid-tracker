"use client";

import { AnimatePresence, motion } from "framer-motion";

type AuthSessionOverlayProps = {
  open: boolean;
  message: string;
};

export function AuthSessionOverlay({ open, message }: AuthSessionOverlayProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="auth-session-overlay"
          className="fixed inset-0 z-200 flex items-center justify-center bg-text-primary/38 backdrop-blur-[3px] supports-backdrop-filter:bg-text-primary/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            role="status"
            aria-live="polite"
            aria-busy="true"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="mx-4 flex min-w-[min(100%,280px)] max-w-sm flex-col items-center gap-5 rounded-2xl border border-border/80 bg-bg-primary px-8 py-9 shadow-[0_20px_50px_rgb(0_0_0_/0.12)]"
          >
            <span
              className="h-10 w-10 shrink-0 rounded-full border-2 border-brand-primary/20 border-t-brand-primary motion-safe:animate-spin"
              aria-hidden
            />
            <p className="text-center text-[0.9375rem] font-semibold leading-snug tracking-tight text-text-primary">
              {message}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
