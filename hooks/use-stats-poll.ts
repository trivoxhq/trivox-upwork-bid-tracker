"use client";

import { useEffect, useRef } from "react";

/** Re-runs stats fetch / refresh while `NEXT_PUBLIC_DASH_POLL_SEC` is a positive number (bounded 5–120s). */
export function useStatsPoll(tick: () => void): void {
  const tickRef = useRef(tick);

  useEffect(() => {
    tickRef.current = tick;
  });

  useEffect(() => {
    const sec = Number(process.env.NEXT_PUBLIC_DASH_POLL_SEC ?? "0");
    if (!Number.isFinite(sec) || sec <= 0) return;
    const ms = Math.min(Math.max(sec * 1000, 5000), 120_000);
    const id = window.setInterval(() => tickRef.current(), ms);
    return () => window.clearInterval(id);
  }, []);
}
