/** Shared dashboard UI tokens — 0.2s transitions, subtle shadows, clear hierarchy. */

export const DASH_TRANSITION =
  "transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-200 ease-out";

const CARD_BASE = "rounded-xl border border-border/80 bg-bg-primary shadow-sm";
const CARD_HOVER_SHADOW =
  "hover:shadow-[0_4px_16px_rgb(17_17_17_/0.06)] dark:hover:shadow-[0_4px_16px_rgb(0_0_0_/0.42)]";
const CARD_CSS_LIFT =
  "motion-safe:hover:scale-[1.01]";

/**
 * Raised card hover using CSS alone (plain `div`).
 * Prefer `DASH_SURFACE_CARD` + Framer `whileHover={{ scale: 1.01 }}` on `motion.*` wrappers.
 */
export const DASH_SURFACE_CARD_STATIC =
  `${CARD_BASE} ${CARD_CSS_LIFT} ${CARD_HOVER_SHADOW} ${DASH_TRANSITION}`;

/** Metric / target cards paired with Framer Motion (no CSS scale — avoids transform fights). */
export const DASH_SURFACE_CARD = `${CARD_BASE} p-5 ${CARD_HOVER_SHADOW} ${DASH_TRANSITION}`;

/** Chart wrapper: CSS lift (`div`). */
export const DASH_SURFACE_CHART =
  `${DASH_SURFACE_CARD_STATIC} p-4 sm:p-6`;

/** Filter / toolbar strip above table. */
export const DASH_FILTER_BAR =
  `rounded-xl border border-border/80 bg-bg-primary p-3 shadow-sm sm:p-4 ${DASH_TRANSITION}`;

export const DASH_SECTION_GAP = "mt-10";

export const DASH_SECTION_TITLE =
  "text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary";

export const DASH_SECTION_SUBTITLE =
  "mt-1.5 max-w-prose text-sm leading-relaxed text-text-secondary";

export const DASH_TABLE_ROW = `${DASH_TRANSITION} hover:bg-bg-secondary`;

export const DASH_FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30";

/** Primary toolbar actions (Export, Users, etc.). */
export const DASH_BTN_TOOLBAR = `inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-bg-primary px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-60 ${DASH_TRANSITION} ${DASH_FOCUS_RING}`;

/** Table row actions (Edit, compact). */
export const DASH_BTN_TABLE = `inline-flex min-h-[40px] w-full shrink-0 items-center justify-center rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-secondary sm:min-h-0 sm:w-auto ${DASH_TRANSITION} focus-visible:ring-2 focus-visible:ring-brand-primary/25`;

export const DASH_BTN_TABLE_DANGER = `inline-flex min-h-[40px] w-full shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 dark:border-red-500/35 dark:bg-red-950/45 dark:text-red-200 dark:hover:bg-red-950/62 sm:min-h-0 sm:w-auto ${DASH_TRANSITION} focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/25 dark:focus-visible:ring-red-400/30`;

export const DASH_TABLE_TH =
  "px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary";

export const DASH_BTN_DANGER_GHOST =
  `inline-flex min-h-[44px] items-center justify-center rounded-lg border border-danger/65 bg-bg-primary px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/6 disabled:cursor-not-allowed disabled:opacity-60 ${DASH_TRANSITION} focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/30`;

export const DASH_DRAWER_PANEL =
  "shadow-[0_8px_32px_rgb(17_17_17_/0.08)] dark:shadow-[0_8px_32px_rgb(0_0_0_/0.52)]";

export const DASH_MODAL_PANEL =
  "shadow-[0_16px_48px_rgb(17_17_17_/0.1)] dark:shadow-[0_16px_48px_rgb(0_0_0_/0.58)]";
