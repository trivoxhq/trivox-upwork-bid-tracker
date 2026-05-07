/** Shared glass-card shells for the login preview carousel. */
export const PREVIEW_WIDGET_CLASS =
  "rounded-2xl border border-white/75 bg-bg-primary/95 shadow-[0_10px_38px_-10px_rgb(17_17_17/0.12)] ring-1 ring-black/4 backdrop-blur-sm";

export const PREVIEW_WIDGET_CTA_CLASS =
  "rounded-2xl border border-dashed border-brand-primary/40 bg-brand-primary/5 shadow-[0_10px_38px_-10px_rgb(17_17_17/0.12)] ring-1 ring-brand-primary/15 backdrop-blur-sm";

const previewFloatEase = [0.42, 0, 0.58, 1] as [number, number, number, number];

/**
 * Gentle vertical drift; mirror repeat avoids a velocity seam at loop reset.
 */
export function previewWidgetFloatProps(
  enabled: boolean,
  travelPx: number,
  durationSec: number,
  delaySec = 0,
) {
  const y = -Math.abs(travelPx);
  if (!enabled) {
    return {
      animate: { y: 0 },
      transition: { duration: 0 },
    };
  }
  return {
    animate: { y },
    transition: {
      y: {
        type: "tween" as const,
        duration: durationSec,
        delay: delaySec,
        repeat: Infinity,
        repeatType: "mirror" as const,
        ease: previewFloatEase,
      },
    },
  };
}

export const previewChipClass =
  "w-fit max-w-full wrap-break-word rounded-md bg-brand-primary/10 px-2 py-0.5 text-[11px] font-medium leading-snug text-brand-primary sm:text-xs";

export const previewKpiBlockClass =
  "flex min-h-0 min-w-0 flex-col justify-start gap-1.5 p-3 sm:gap-2 sm:p-5 md:p-6";
