import Link from "next/link";
import type { ReactNode } from "react";

export type DashboardPageHeroBreadcrumb = { href?: string; label: string };

type DashboardPageHeroProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  breadcrumb?: DashboardPageHeroBreadcrumb[];
};

/**
 * Compact page header strip — eyebrow + title inline, short description beside on wide screens.
 */
export function DashboardPageHero({
  eyebrow,
  title,
  description,
  breadcrumb,
}: DashboardPageHeroProps) {
  return (
    <header className="relative overflow-hidden rounded-xl border border-border/70 bg-bg-primary shadow-sm">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-brand-primary"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-brand-primary/50 via-brand-primary/15 to-transparent"
        aria-hidden
      />

      <div className="relative pl-[calc(0.75rem+3px)] pr-3 py-3 sm:pl-[calc(1rem+3px)] sm:pr-4 sm:py-3.5">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav
            className="mb-1.5 flex flex-wrap items-center gap-x-1.5 text-[11px] leading-none text-text-secondary"
            aria-label="Breadcrumb"
          >
            {breadcrumb.map((item, i) => (
              <span key={`${item.label}-${i}`} className="inline-flex items-center gap-x-1.5">
                {i > 0 ? (
                  <span className="text-text-secondary/40" aria-hidden>
                    /
                  </span>
                ) : null}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="font-medium text-text-secondary transition-colors hover:text-brand-primary"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-medium text-text-primary">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="inline-flex shrink-0 items-center rounded border border-brand-primary/25 bg-brand-primary/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-primary">
                {eyebrow}
              </span>
              <h1 className="truncate text-lg font-bold tracking-tight text-text-primary sm:text-xl">
                {title}
              </h1>
            </div>
          </div>

          {description ? (
            <div className="max-w-xl text-[13px] leading-snug text-text-secondary sm:max-w-md sm:text-right sm:leading-snug lg:max-w-lg">
              {description}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
