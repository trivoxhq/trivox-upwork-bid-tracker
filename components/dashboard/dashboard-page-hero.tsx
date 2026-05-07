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
 * Shared “nav page” header: accent stripe, soft glow, optional breadcrumb trail.
 */
export function DashboardPageHero({ eyebrow, title, description, breadcrumb }: DashboardPageHeroProps) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-border/50 bg-bg-primary/90 px-5 py-6 shadow-[0_4px_36px_rgb(17_17_17_/0.07),0_0_0_1px_rgb(255_255_255_/0.8)_inset] backdrop-blur-sm dark:border-border dark:shadow-[0_4px_36px_rgb(0_0_0_/0.45),inset_0_0_0_1px_rgb(255_255_255_/0.05)] sm:px-8 sm:py-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-linear-to-r from-brand-primary via-[#1aad4a] to-transparent dark:from-brand-primary dark:via-[#12b892] dark:to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 -top-28 h-56 w-56 rounded-full bg-brand-primary/11 blur-3xl dark:bg-brand-primary/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-info/6 blur-3xl dark:bg-[rgb(255_255_255_/0.04)]"
        aria-hidden
      />

      <div className="relative">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav className="text-[13px] text-text-secondary" aria-label="Breadcrumb">
            {breadcrumb.map((item, i) => (
              <span key={`${item.label}-${i}`}>
                {i > 0 ? (
                  <span className="mx-2 font-light text-text-secondary/35" aria-hidden>
                    /
                  </span>
                ) : null}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="font-semibold text-text-secondary transition-colors hover:text-brand-primary"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-text-primary">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}

        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-primary ${breadcrumb?.length ? "mt-5" : ""}`}
        >
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-text-primary sm:text-[1.85rem] sm:leading-[1.15]">
          {title}
        </h1>
        {description ? (
          <div className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">{description}</div>
        ) : null}
      </div>
    </header>
  );
}
