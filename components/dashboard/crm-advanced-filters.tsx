"use client";

import type { ReactNode } from "react";
import { DASH_BTN_TABLE, DASH_TRANSITION } from "@/components/dashboard/dashboard-classes";
import { CRM_FILTER_INPUT_CLASS } from "@/lib/filters/constants";

export { CRM_FILTER_INPUT_CLASS };

type CrmFilterToolbarProps = {
  activeCount: number;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
  onReset: () => void;
  children?: ReactNode;
};

export function CrmFilterToolbar({
  activeCount,
  advancedOpen,
  onToggleAdvanced,
  onReset,
  children,
}: CrmFilterToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      <button
        type="button"
        className={`${DASH_BTN_TABLE} ${advancedOpen ? "border-brand-primary/40 bg-brand-primary/10 text-brand-primary" : ""}`}
        onClick={onToggleAdvanced}
        aria-expanded={advancedOpen}
      >
        Advanced filters
        {activeCount > 0 ? (
          <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-white">
            {activeCount > 99 ? "99+" : activeCount}
          </span>
        ) : null}
      </button>
      <button type="button" className={DASH_BTN_TABLE} onClick={onReset}>
        Reset filters
      </button>
    </div>
  );
}

type CrmAdvancedFiltersPanelProps = {
  open: boolean;
  children: ReactNode;
};

export function CrmAdvancedFiltersPanel({ open, children }: CrmAdvancedFiltersPanelProps) {
  if (!open) return null;
  return (
    <div
      className={`mt-3 rounded-xl border border-border/60 bg-bg-secondary/40 p-3 ${DASH_TRANSITION}`}
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
        Advanced filters
      </p>
      {children}
    </div>
  );
}

type CrmFilterFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function CrmFilterField({ label, children, className = "" }: CrmFilterFieldProps) {
  return (
    <label className={`block ${className}`.trim()}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}

type CrmFilterCheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function CrmFilterCheckbox({ label, checked, onChange }: CrmFilterCheckboxProps) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-input-border bg-bg-primary px-3 py-2 text-sm text-text-primary shadow-sm sm:min-h-0">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-input-border text-brand-primary focus:ring-brand-primary/25"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function CrmOwnerSelect({
  value,
  onChange,
  users,
  includeUnassigned = true,
  placeholder = "All owners",
}: {
  value: string;
  onChange: (value: string) => void;
  users: Array<{ id: string; name: string }>;
  includeUnassigned?: boolean;
  placeholder?: string;
}) {
  return (
    <select
      className={CRM_FILTER_INPUT_CLASS}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {includeUnassigned ? <option value="__unassigned__">Unassigned</option> : null}
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.name}
        </option>
      ))}
    </select>
  );
}
