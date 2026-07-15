"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  DASH_BTN_TOOLBAR,
  DASH_SECTION_SUBTITLE,
  DASH_SECTION_TITLE,
  DASH_SURFACE_CARD,
} from "@/components/dashboard/dashboard-classes";

type Settings = {
  shiftTotalMinutes: number;
  breakAllowanceMinutes: number;
  minFullDayWorkingMinutes: number;
  minHalfDayWorkingMinutes: number;
  workingDaysPerMonth: number;
  activityTrackingEnabled: boolean;
  keyConfigured: boolean;
  canEdit: boolean;
};

const inputClass =
  "w-full rounded-lg border border-input-border bg-bg-primary px-3 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15";

export function AttendanceSettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [adminKey, setAdminKey] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/attendance/settings", { credentials: "include" });
    const json = (await res.json().catch(() => null)) as {
      success?: boolean;
      settings?: Settings;
      message?: string;
    } | null;
    if (!res.ok || !json?.success || !json.settings) {
      toast.error(json?.message ?? "Could not load settings.");
      return;
    }
    setSettings(json.settings);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveRules() {
    if (!settings) return;
    setBusy(true);
    try {
      const res = await fetch("/api/attendance/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, adminKey }),
      });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        settings?: Settings;
      } | null;
      if (!res.ok || !json?.success) {
        toast.error(json?.message ?? "Could not save.");
        return;
      }
      setSettings(json.settings ?? settings);
      toast.success("Attendance rules updated.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleTracking() {
    if (!settings) return;
    setBusy(true);
    try {
      const res = await fetch("/api/attendance/activity/toggle", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminKey,
          enabled: !settings.activityTrackingEnabled,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        activityTrackingEnabled?: boolean;
      } | null;
      if (!res.ok || !json?.success) {
        toast.error(json?.message ?? "Could not toggle tracking.");
        return;
      }
      setSettings({
        ...settings,
        activityTrackingEnabled: Boolean(json.activityTrackingEnabled),
      });
      toast.success(
        json.activityTrackingEnabled ? "Activity tracking enabled." : "Activity tracking disabled.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return <p className="mt-8 text-sm text-text-secondary">Loading attendance settings…</p>;
  }

  return (
    <div className={`${DASH_SURFACE_CARD} mt-10 p-5 sm:p-6`}>
      <h2 className={DASH_SECTION_TITLE}>Attendance rules</h2>
      <p className={`${DASH_SECTION_SUBTITLE} mt-1`}>
        Changing rules or toggling activity tracking requires{" "}
        <code className="text-xs">ATTENDANCE_ADMIN_KEY</code> — admin login alone is not enough.
      </p>

      {!settings.keyConfigured ? (
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          Set <code>ATTENDANCE_ADMIN_KEY</code> in server env to enable editing.
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field
          label="Shift total (minutes)"
          value={settings.shiftTotalMinutes}
          onChange={(n) => setSettings({ ...settings, shiftTotalMinutes: n })}
        />
        <Field
          label="Break allowance (minutes)"
          value={settings.breakAllowanceMinutes}
          onChange={(n) => setSettings({ ...settings, breakAllowanceMinutes: n })}
        />
        <Field
          label="Full-day min working (minutes)"
          value={settings.minFullDayWorkingMinutes}
          onChange={(n) => setSettings({ ...settings, minFullDayWorkingMinutes: n })}
        />
        <Field
          label="Half-day min working (minutes)"
          value={settings.minHalfDayWorkingMinutes}
          onChange={(n) => setSettings({ ...settings, minHalfDayWorkingMinutes: n })}
        />
        <Field
          label="Working days per month (salary)"
          value={settings.workingDaysPerMonth}
          onChange={(n) => setSettings({ ...settings, workingDaysPerMonth: n })}
        />
      </div>
      <p className="mt-3 text-xs text-text-secondary">
        Daily pay ≈ monthly salary ÷ working days. Worked minutes are pro-rated against a full work
        day (e.g. 100,000 ÷ 22 ≈ 4,545 for a full day).
      </p>

      <label className="mt-5 block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Attendance admin key
        </span>
        <input
          type="password"
          autoComplete="off"
          className={inputClass}
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          placeholder="Required for save / toggle"
        />
      </label>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          className={`${DASH_BTN_TOOLBAR} border-brand-primary bg-brand-primary text-white`}
          disabled={busy || !settings.keyConfigured}
          onClick={() => void saveRules()}
        >
          Save rules
        </button>
        <button
          type="button"
          className={DASH_BTN_TOOLBAR}
          disabled={busy || !settings.keyConfigured}
          onClick={() => void toggleTracking()}
        >
          {settings.activityTrackingEnabled ? "Deactivate" : "Activate"} activity tracking
        </button>
        <span className="self-center text-xs text-text-secondary">
          Tracking is currently{" "}
          <strong>{settings.activityTrackingEnabled ? "ON" : "OFF"}</strong>
        </span>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      <input
        type="number"
        min={1}
        step={1}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(Number.parseInt(e.target.value, 10) || 0)}
      />
    </label>
  );
}
