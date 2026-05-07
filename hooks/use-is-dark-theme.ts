"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  const run = () => onStoreChange();
  if (typeof window === "undefined") return () => {};

  window.addEventListener("theme-resolved-change", run);
  const mo = new MutationObserver(run);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return () => {
    window.removeEventListener("theme-resolved-change", run);
    mo.disconnect();
  };
}

function getSnapshot(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/** Server snapshot: light (script runs before hydrate to correct `html.dark` when needed). */
function getServerSnapshot(): boolean {
  return false;
}

/** Reflects resolved light/dark (including system preference). Use for canvases / inline assets. */
export function useIsDarkTheme(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
