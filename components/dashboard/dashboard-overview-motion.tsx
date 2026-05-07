"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Children, type ReactNode } from "react";

const easeOut = [0.22, 1, 0.36, 1] as const;

export function OverviewHeroReveal({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.11,
      delayChildren: 0.06,
    },
  },
};

const panelVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: easeOut },
  },
};

export function OverviewBodyStagger({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="flex min-w-0 flex-col"
      initial="hidden"
      animate="show"
      variants={
        reduce
          ? {
              hidden: {},
              show: {
                transition: { staggerChildren: 0, delayChildren: 0 },
              },
            }
          : containerVariants
      }
    >
      {children}
    </motion.div>
  );
}

export function OverviewStaggerPanel({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={
        reduce
          ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
          : panelVariants
      }
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggers two chart columns (expects exactly two cell nodes, e.g. wrapped chart sections).
 */
export function OverviewChartGridMotion({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const cells = Children.toArray(children);

  return (
    <div className="grid gap-8 xl:grid-cols-12">
      {cells.map((cell, i) => (
        <motion.div
          key={i}
          className={
            i === 0
              ? "min-w-0 xl:col-span-7 [&_section]:mt-0"
              : "min-w-0 xl:col-span-5 [&_section]:mt-0"
          }
          initial={reduce ? false : { opacity: 0, y: 26, scale: 0.985, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{
            duration: 0.58,
            ease: easeOut,
            delay: reduce ? 0 : i * 0.14,
          }}
        >
          {cell}
        </motion.div>
      ))}
    </div>
  );
}

export function OverviewAmbientBackdrop() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute -inset-x-4 bottom-[-12px] top-2 -z-10 rounded-3xl bg-[linear-gradient(180deg,rgba(255_255_255_0.94)_0%,rgba(239_246_239_0.45)_52%,transparent_100%)] ring-1 ring-border/35 dark:bg-[linear-gradient(180deg,#262626_0%,rgb(33_33_33_/0.55)_55%,transparent_100%)] dark:ring-border sm:-inset-x-6"
      initial={reduce ? false : { opacity: 0.35, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.75, ease: easeOut, delay: reduce ? 0 : 0.12 }}
    />
  );
}

export function OverviewAccountCardMotion({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="rounded-2xl border border-border/60 bg-linear-to-br from-bg-primary via-white/92 to-[#eef3ef]/90 p-5 shadow-[0_12px_40px_rgb(17_17_17_/0.05)] dark:border-border dark:bg-[linear-gradient(to_bottom_right,#303030,#2a2a2a,#212121)] dark:shadow-[0_12px_40px_rgb(0_0_0_/0.45)] lg:sticky lg:top-28"
      whileHover={reduce ? undefined : { y: -2, boxShadow: "0 16px 48px rgb(17 17 17 / 0.08)" }}
      transition={{ duration: 0.22, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}
