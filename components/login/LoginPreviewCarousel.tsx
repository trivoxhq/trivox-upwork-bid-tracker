"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  LOGIN_PREVIEW,
  PREVIEW_BAR_HEIGHTS,
  PREVIEW_SLIDE_1,
  PREVIEW_SLIDE_2,
  PREVIEW_SLIDE_3,
  TIMELINE_PREVIEW_EVENTS,
  loginPreviewAriaGoToSlide,
} from "@/app/login/constants";
import {
  PREVIEW_WIDGET_CLASS,
  PREVIEW_WIDGET_CTA_CLASS,
  previewChipClass,
  previewKpiBlockClass,
  previewWidgetFloatProps,
} from "@/components/login/preview-styles";

const SLIDE_COUNT = LOGIN_PREVIEW.SLIDE_COUNT;

const previewSlideTransition = {
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1] as const,
};

const previewVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 28 : direction < 0 ? -28 : 0,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -28 : direction < 0 ? 28 : 0,
    opacity: 0,
  }),
};

type TimelineRow = (typeof TIMELINE_PREVIEW_EVENTS)[number];

function TimelineEventCard({ row }: { row: TimelineRow }) {
  return (
    <div className="min-w-0 shrink-0 rounded-xl border border-border/80 bg-bg-primary/95 p-3 shadow-sm ring-1 ring-white/50 sm:p-3.5">
      <div className="flex min-w-0 items-start gap-2">
        <p className="min-w-0 flex-1 wrap-break-word text-xs font-medium leading-snug text-text-primary sm:text-[13px]">
          {row.label}
        </p>
        <span className="shrink-0 self-start rounded-md bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-primary sm:px-2 sm:text-[11px]">
          {row.time}
        </span>
      </div>
      <div className="mt-3 h-1 w-full rounded-full bg-border/60">
        <div
          className="h-full rounded-full bg-brand-primary transition-[width] duration-500 ease-out"
          style={{ width: row.progressWidth }}
        />
      </div>
    </div>
  );
}

export function LoginPreviewCarousel() {
  const [[page, direction], setPage] = useState([0, 0]);
  const [autoPlayKey, setAutoPlayKey] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const floatWidgets = prefersReducedMotion !== true;

  const slideIndex = ((page % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT;

  const goTo = useCallback(
    (next: number) => {
      setAutoPlayKey((key) => key + 1);
      const current = slideIndex;
      const diff = (next - current + SLIDE_COUNT) % SLIDE_COUNT;
      const dir = diff === 0 ? 0 : diff <= SLIDE_COUNT / 2 ? 1 : -1;
      setPage([next, dir]);
    },
    [slideIndex],
  );

  const next = useCallback(() => {
    goTo((slideIndex + 1) % SLIDE_COUNT);
  }, [goTo, slideIndex]);

  const prev = useCallback(() => {
    goTo((slideIndex - 1 + SLIDE_COUNT) % SLIDE_COUNT);
  }, [goTo, slideIndex]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPage(([current]) => [(current + 1) % SLIDE_COUNT, 1]);
    }, LOGIN_PREVIEW.AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [autoPlayKey]);

  const slides = useMemo(
    () => [
      {
        title: PREVIEW_SLIDE_1.TITLE,
        body: PREVIEW_SLIDE_1.BODY,
        visual: (
          <div className="grid h-full min-h-0 w-full grid-cols-2 grid-rows-2 gap-2 sm:gap-3 md:gap-5">
            <motion.div
              className={`${previewKpiBlockClass} ${PREVIEW_WIDGET_CLASS} ${floatWidgets ? "will-change-transform" : ""}`}
              {...previewWidgetFloatProps(floatWidgets, 4.5, 7.75, 0)}
            >
              <p className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-text-secondary sm:text-xs">
                {PREVIEW_SLIDE_1.PROPOSALS_SENT_LABEL}
              </p>
              <p className="shrink-0 tabular-nums text-xl font-bold leading-tight tracking-tight text-text-primary sm:text-2xl md:text-[1.75rem]">
                {PREVIEW_SLIDE_1.PROPOSALS_SENT_VALUE}
              </p>
              <p className={`min-h-0 shrink-0 ${previewChipClass}`}>
                {PREVIEW_SLIDE_1.PROPOSALS_DELTA}
              </p>
            </motion.div>
            <motion.div
              className={`row-span-2 flex min-h-0 min-w-0 flex-col items-center justify-center p-3 sm:p-5 md:p-6 ${PREVIEW_WIDGET_CLASS} ${floatWidgets ? "will-change-transform" : ""}`}
              {...previewWidgetFloatProps(floatWidgets, 5.5, 8.25, 0.35)}
            >
              <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-wide text-text-secondary sm:mb-3 sm:text-xs">
                {PREVIEW_SLIDE_1.OFFER_HIRE_LABEL}
              </p>
              <div className="relative mx-auto flex w-full max-w-[200px] min-w-0 flex-1 items-center justify-center sm:max-w-[220px]">
                <div className="relative grid aspect-square w-full max-w-[180px] min-w-0 place-items-center rounded-full bg-conic from-brand-primary via-info/70 to-warning p-1.5 sm:max-w-[200px] sm:p-2">
                  <div className="flex aspect-square w-full max-w-[156px] min-w-0 flex-col items-center justify-center rounded-full bg-bg-primary px-1.5 shadow-inner ring-1 ring-black/6 sm:max-w-[168px] sm:px-2">
                    <p className="text-xl font-bold tabular-nums tracking-tight text-text-primary sm:text-2xl md:text-[1.75rem]">
                      {PREVIEW_SLIDE_1.DONUT_VALUE}
                    </p>
                    <p className="mt-1 max-w-30 wrap-break-word text-center text-[10px] leading-snug text-text-secondary sm:mt-1.5 sm:max-w-35 sm:text-[11px]">
                      {PREVIEW_SLIDE_1.DONUT_CAPTION}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div
              className={`flex min-h-0 min-w-0 flex-col justify-center gap-2 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-5 md:p-6 ${PREVIEW_WIDGET_CTA_CLASS} ${floatWidgets ? "will-change-transform" : ""}`}
              {...previewWidgetFloatProps(floatWidgets, 4.5, 7.95, 0.2)}
            >
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-brand-primary to-brand-hover text-xl font-medium leading-none text-white shadow-md shadow-brand-primary/20 sm:h-12 sm:w-12 sm:text-2xl">
                {PREVIEW_SLIDE_1.CTA_PLUS}
              </div>
              <div className="min-w-0 flex-1">
                <p className="wrap-break-word text-sm font-semibold leading-snug text-text-primary sm:text-[0.9375rem]">
                  {PREVIEW_SLIDE_1.CTA_TITLE}
                </p>
                <p className="mt-1 wrap-break-word text-[11px] leading-snug text-text-secondary sm:text-xs">
                  {PREVIEW_SLIDE_1.CTA_BODY}
                </p>
              </div>
            </motion.div>
          </div>
        ),
      },
      {
        title: PREVIEW_SLIDE_2.TITLE,
        body: PREVIEW_SLIDE_2.BODY,
        visual: (
          <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
            <motion.div
              className={`flex min-h-0 min-w-0 flex-1 flex-col p-3 sm:p-5 md:p-6 ${PREVIEW_WIDGET_CLASS} ${floatWidgets ? "will-change-transform" : ""}`}
              {...previewWidgetFloatProps(floatWidgets, 4, 8.4, 0.15)}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="min-w-0 wrap-break-word text-[11px] font-medium uppercase tracking-wide text-text-secondary sm:text-xs">
                  {PREVIEW_SLIDE_2.CHART_LABEL}
                </p>
                <span className="shrink-0 rounded-md bg-info/12 px-2 py-0.5 text-[10px] font-medium text-info sm:text-[11px]">
                  {PREVIEW_SLIDE_2.CHART_BADGE}
                </span>
              </div>
              <div className="mt-auto flex min-h-28 flex-1 items-end justify-center gap-1 pt-6 sm:min-h-36 sm:gap-1.5 sm:pt-8 md:min-h-44 md:gap-2 md:pt-10 lg:min-h-48 lg:gap-2.5">
                {PREVIEW_BAR_HEIGHTS.map((h, i) => (
                  <motion.div
                    key={`bar-${i}`}
                    className={`w-full max-w-11 rounded-t-lg sm:rounded-t-xl ${i === 3 ? "bg-brand-primary shadow-sm shadow-brand-primary/20" : "bg-info/60"}`}
                    style={{
                      height: `${h}%`,
                      maxHeight: "100%",
                      transformOrigin: "bottom",
                    }}
                    initial={{ scaleY: 0, opacity: 0.65 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    transition={{ duration: 0.55, delay: 0.05 * i, ease: "easeOut" }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        ),
      },
      {
        title: PREVIEW_SLIDE_3.TITLE,
        body: PREVIEW_SLIDE_3.BODY,
        visual: (
          <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2 sm:grid sm:grid-cols-2 sm:grid-rows-2 sm:gap-4 md:gap-5">
            <motion.div
              className={`flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-3 sm:row-span-2 sm:flex-none sm:gap-3 sm:p-5 md:p-6 ${PREVIEW_WIDGET_CLASS}`}
            >
              <p className="shrink-0 wrap-break-word text-[11px] font-medium uppercase tracking-wide text-text-secondary sm:text-xs">
                {PREVIEW_SLIDE_3.RECENT_EVENTS_LABEL}
              </p>
              {prefersReducedMotion ? (
                <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-start gap-2.5 overflow-y-auto pr-0.5 sm:gap-3">
                  {TIMELINE_PREVIEW_EVENTS.map((row, index) => (
                    <motion.div
                      key={`${row.label}-${row.time}`}
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.08,
                        ease: "easeOut",
                      }}
                    >
                      <TimelineEventCard row={row} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="login-preview-marquee-viewport relative min-h-0 min-w-0 flex-1 overflow-hidden">
                  <div className="login-preview-marquee-track gap-2.5 sm:gap-3">
                    {TIMELINE_PREVIEW_EVENTS.map((row) => (
                      <TimelineEventCard key={`a-${row.label}`} row={row} />
                    ))}
                    {TIMELINE_PREVIEW_EVENTS.map((row) => (
                      <TimelineEventCard key={`b-${row.label}`} row={row} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
            <motion.div
              className={`flex min-h-0 min-w-0 flex-col justify-start gap-1.5 p-3 sm:gap-2 sm:p-5 sm:col-start-2 sm:row-start-1 md:p-6 ${PREVIEW_WIDGET_CLASS} ${floatWidgets ? "will-change-transform" : ""}`}
              {...previewWidgetFloatProps(floatWidgets, 4, 7.5, 0.1)}
            >
              <p className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-text-secondary sm:text-xs">
                {PREVIEW_SLIDE_3.BOOKED_LABEL}
              </p>
              <p className="shrink-0 tabular-nums text-xl font-bold leading-tight tracking-tight text-text-primary sm:text-2xl md:text-[1.75rem]">
                {PREVIEW_SLIDE_3.BOOKED_VALUE}
              </p>
              <p className={`min-h-0 shrink-0 ${previewChipClass}`}>
                {PREVIEW_SLIDE_3.BOOKED_CAPTION}
              </p>
            </motion.div>
            <motion.div
              className={`flex min-h-0 min-w-0 flex-col justify-center gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-5 sm:col-start-2 sm:row-start-2 md:gap-4 md:p-6 ${PREVIEW_WIDGET_CLASS} ${floatWidgets ? "will-change-transform" : ""}`}
              {...previewWidgetFloatProps(floatWidgets, 4.5, 7.85, 0.45)}
            >
              <div
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/20 sm:h-11 sm:w-11"
                aria-hidden
              >
                <svg
                  className="h-5 w-5 text-warning"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="wrap-break-word text-[11px] font-medium uppercase tracking-wide text-text-secondary sm:text-xs">
                  {PREVIEW_SLIDE_3.REPLY_LABEL}
                </p>
                <p className="mt-1 text-sm font-semibold leading-tight text-text-primary sm:text-base">
                  {PREVIEW_SLIDE_3.REPLY_VALUE}
                </p>
                <p className={`mt-1 sm:mt-1.5 ${previewChipClass}`}>
                  {PREVIEW_SLIDE_3.REPLY_CAPTION}
                </p>
              </div>
            </motion.div>
          </div>
        ),
      },
    ],
    [floatWidgets, prefersReducedMotion],
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="relative z-10 mb-4 flex min-w-0 shrink-0 items-center gap-2.5 sm:mb-6 md:mb-8 sm:gap-4">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white shadow-md shadow-brand-primary/25 min-[375px]:h-11 min-[375px]:w-11 min-[375px]:text-sm sm:h-12 sm:w-12 sm:text-base">
          {LOGIN_PREVIEW.BRAND_MARK}
        </span>
        <div className="min-w-0">
          <p className="wrap-break-word text-xs font-semibold tracking-wide text-text-secondary sm:text-sm">
            {LOGIN_PREVIEW.BRAND_NAME}
          </p>
          <p className="mt-0.5 wrap-break-word text-base font-bold leading-snug text-text-primary sm:text-lg">
            {LOGIN_PREVIEW.BRAND_TAGLINE}
          </p>
        </div>
      </div>

      <div className="relative z-10 min-h-0 flex-1">
        <div className="relative h-full min-h-[min(42dvh,300px)] flex-1 rounded-xl border border-white/65 bg-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_50px_-28px_rgb(17_17_17/0.08)] backdrop-blur-md dark:border-border dark:bg-[rgb(48_48_48_/0.82)] dark:shadow-[inset_0_1px_0_rgb(255_255_255_/0.05),0_18px_50px_-28px_rgb(0_0_0_/0.5)] min-[400px]:min-h-[min(46dvh,360px)] sm:min-h-[min(44dvh,400px)] sm:rounded-2xl md:min-h-[min(48dvh,440px)] lg:min-h-[min(52dvh,480px)]">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={slideIndex}
              custom={direction}
              variants={previewVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={previewSlideTransition}
              className="absolute inset-0 flex min-h-0 flex-col p-3 sm:p-5 lg:p-6"
            >
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1">{slides[slideIndex].visual}</div>
                <div className="mt-3 min-w-0 shrink-0 border-t border-border/50 pt-3 sm:mt-4 sm:pt-4">
                  <h2 className="text-base font-semibold leading-snug text-text-primary sm:text-lg lg:text-xl">
                    {slides[slideIndex].title}
                  </h2>
                  <p className="mt-1.5 wrap-break-word text-[11px] leading-snug text-text-secondary sm:mt-2 sm:text-sm sm:leading-relaxed">
                    {slides[slideIndex].body}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="relative z-10 mt-4 flex touch-manipulation items-center justify-between gap-3 rounded-xl border border-white/70 bg-white/55 px-2 py-2 shadow-sm backdrop-blur-md dark:border-border dark:bg-[rgb(42_42_42_/0.92)] dark:shadow-[0_6px_28px_rgb(0_0_0_/0.45)] sm:mt-6 sm:gap-4 sm:rounded-2xl sm:px-3">
        <button
          type="button"
          onClick={prev}
          className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/80 bg-bg-primary text-text-secondary shadow-sm transition-all duration-300 hover:-translate-x-0.5 hover:border-brand-primary/50 hover:bg-brand-primary/5 hover:text-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 sm:h-10 sm:w-10"
          aria-label={LOGIN_PREVIEW.ARIA_PREVIOUS_SLIDE}
        >
          <svg
            className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div className="flex items-center gap-2 rounded-full bg-bg-primary/80 px-3 py-1.5 shadow-inner">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 ${
                i === slideIndex
                  ? "h-2.5 w-8 bg-brand-primary shadow-[0_0_0_3px_rgba(16,138,0,0.14)] dark:shadow-[0_0_0_3px_rgb(255_255_255_/0.14)]"
                  : "h-2.5 w-2.5 bg-border hover:bg-text-secondary/40"
              }`}
              aria-label={loginPreviewAriaGoToSlide(i)}
              aria-current={i === slideIndex}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/80 bg-bg-primary text-text-secondary shadow-sm transition-all duration-300 hover:translate-x-0.5 hover:border-brand-primary/50 hover:bg-brand-primary/5 hover:text-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 sm:h-10 sm:w-10"
          aria-label={LOGIN_PREVIEW.ARIA_NEXT_SLIDE}
        >
          <svg
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
