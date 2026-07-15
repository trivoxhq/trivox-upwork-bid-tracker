"use client";

import { useEffect, useRef } from "react";
import { getOrCreateDeviceFingerprint } from "@/lib/attendance/device-id";

type AttendanceActivityTrackerProps = {
  enabled: boolean;
  hasOpenSession: boolean;
};

/** Heartbeats + lightweight canvas “screenshot” while tracking is ON and user is checked in. */
export function AttendanceActivityTracker({
  enabled,
  hasOpenSession,
}: AttendanceActivityTrackerProps) {
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    if (!enabled || !hasOpenSession) return;

    function bump() {
      lastActivity.current = Date.now();
    }
    window.addEventListener("mousemove", bump, { passive: true });
    window.addEventListener("keydown", bump, { passive: true });
    window.addEventListener("click", bump, { passive: true });

    const interval = window.setInterval(() => {
      void sendSample(Date.now() - lastActivity.current);
    }, 5 * 60_000);

    void sendSample(0);

    return () => {
      window.removeEventListener("mousemove", bump);
      window.removeEventListener("keydown", bump);
      window.removeEventListener("click", bump);
      window.clearInterval(interval);
    };
  }, [enabled, hasOpenSession]);

  return null;
}

async function sendSample(idleMs: number) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "16px sans-serif";
    ctx.fillText("Attendance activity snapshot", 24, 40);
    ctx.fillText(new Date().toISOString(), 24, 70);
    ctx.fillText(`Path: ${window.location.pathname}`, 24, 100);
    ctx.fillText(`Idle ms: ${idleMs}`, 24, 130);
    ctx.fillText(`Visible: ${document.visibilityState}`, 24, 160);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
    if (!blob) return;

    const form = new FormData();
    form.append("type", "screenshot");
    form.append("deviceFingerprint", getOrCreateDeviceFingerprint());
    form.append(
      "meta",
      JSON.stringify({
        idleMs,
        visibility: document.visibilityState,
        path: window.location.pathname,
      }),
    );
    form.append("file", blob, "activity.png");

    await fetch("/api/attendance/activity", {
      method: "POST",
      credentials: "include",
      body: form,
    });
  } catch {
    /* non-blocking */
  }
}
