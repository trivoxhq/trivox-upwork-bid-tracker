"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ThemePreference } from "@/lib/theme/constants";
import { useTheme } from "@/components/theme/theme-provider";

type ThemeCycleButtonProps = {
  /** Collapsed sidebar: square icon-only control. */
  iconOnly?: boolean;
  /** Extra Tailwind classes (e.g. `w-full`). */
  className?: string;
};

function prefLabel(pref: ThemePreference): string {
  if (pref === "light") return "Light theme";
  if (pref === "dark") return "Dark theme";
  return "Theme: Match system";
}

function IconForPref({ pref, className }: { pref: ThemePreference; className?: string }) {
  const cn = className ?? "h-4 w-4 shrink-0";
  if (pref === "light") {
    return (
      <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
      </svg>
    );
  }
  if (pref === "dark") {
    return (
      <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" strokeLinecap="round" />
    </svg>
  );
}

export function ThemeCycleButton({ iconOnly = false, className = "" }: ThemeCycleButtonProps) {
  const { preference, resolved, cycle, ready } = useTheme();

  if (!ready) {
    const box = iconOnly ? "h-10 w-10" : "h-11 w-full";
    return <div className={`shrink-0 rounded-lg bg-bg-secondary/40 ring-1 ring-border/30 ${box} motion-safe:animate-pulse ${className}`} aria-hidden />;
  }

  const title =
    preference === "system"
      ? `Match system (${resolved === "dark" ? "dark" : "light"}) — click to cycle`
      : `${prefLabel(preference)} — click for next mode`;

  if (iconOnly) {
    return (
      <motion.button
        type="button"
        onClick={cycle}
        title={title}
        aria-label={title}
        className={`inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-border bg-bg-secondary text-text-secondary shadow-sm transition-[background-color,box-shadow,color] duration-200 ease-out hover:bg-bg-primary hover:text-text-primary dark:border-border dark:bg-bg-primary dark:hover:bg-bg-hover dark:hover:text-text-primary ${className}`}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={preference}
            initial={{ opacity: 0, rotate: -18, scale: 0.86 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 16, scale: 0.86 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center text-current"
          >
            <IconForPref pref={preference} />
          </motion.span>
        </AnimatePresence>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={cycle}
      title={title}
      aria-label={title}
      className={`inline-flex min-h-[44px] w-full touch-manipulation items-center justify-between gap-2 rounded-xl border border-border/80 bg-bg-secondary px-3 py-2 text-left text-sm font-semibold text-text-primary shadow-sm transition-[background-color,box-shadow,transform,color] duration-200 ease-out hover:bg-bg-primary dark:border-border dark:bg-bg-primary dark:hover:bg-bg-hover ${className}`}
      whileHover={{ scale: 1.008 }}
      whileTap={{ scale: 0.992 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-primary ring-1 ring-border/55 text-text-secondary">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={preference}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-center"
            >
              <IconForPref pref={preference} />
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="min-w-0 truncate">
          <span className="block text-[13px] font-semibold leading-snug">{prefLabel(preference)}</span>
          <span className="mt-0.5 block text-[11px] font-medium text-text-secondary">
            Click to cycle: light · dark · system
          </span>
        </span>
      </span>
    </motion.button>
  );
}
