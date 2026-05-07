"use client";

import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

const defaultIcon = (
  <svg
    className="h-5 w-5 text-text-secondary"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
  </svg>
);

export function EmptyState({ title, description, action, icon, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`rounded-xl border border-dashed border-border bg-bg-secondary/30 px-6 py-12 text-center transition-[background-color,border-color] duration-200 ease-out ${className}`}
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-primary">
        {icon ?? defaultIcon}
      </div>
      <p className="mt-4 text-sm font-semibold text-text-primary">{title}</p>
      {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
