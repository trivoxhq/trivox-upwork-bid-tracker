"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type ResolvedTheme,
  type ThemePreference,
  readStoredTheme,
  resolveTheme,
  prefersSystemDark,
  THEME_STORAGE_KEY,
} from "@/lib/theme/constants";

export function applyResolvedTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  window.dispatchEvent(new CustomEvent("theme-resolved-change"));
}

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  ready: boolean;
  cycle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const next = readStoredTheme();
    setPreference(next);
    applyResolvedTheme(resolveTheme(next));
    setReady(true);
  }, []);

  const resolved = useMemo(() => resolveTheme(preference), [preference]);

  useLayoutEffect(() => {
    if (!ready) return;
    applyResolvedTheme(resolved);
  }, [ready, resolved]);

  useEffect(() => {
    if (!ready || preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyResolvedTheme(prefersSystemDark() ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference, ready]);

  const cycle = useCallback(() => {
    const order: ThemePreference[] = ["light", "dark", "system"];
    setPreference((prev) => {
      const idx = Math.max(0, order.indexOf(prev));
      const next = order[(idx + 1) % order.length];
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, ready, cycle }),
    [preference, resolved, ready, cycle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
