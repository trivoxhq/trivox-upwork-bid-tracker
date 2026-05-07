"use client";

import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

function readChromeFromDoc() {
  if (typeof document === "undefined") {
    return {
      bg: "#ffffff",
      border: "#dddddd",
      fg: "#111111",
      brand: "#108a00",
      danger: "#d93025",
      shadow: "0 4px 14px rgba(17, 17, 17, 0.08)",
    };
  }
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  const isDark = root.classList.contains("dark");
  return {
    bg: cs.getPropertyValue("--color-bg-primary").trim() || "#ffffff",
    border: cs.getPropertyValue("--color-border").trim() || "#dddddd",
    fg: cs.getPropertyValue("--color-text-primary").trim() || "#111111",
    brand: cs.getPropertyValue("--color-brand-primary").trim() || "#108a00",
    danger: cs.getPropertyValue("--color-danger").trim() || "#d93025",
    shadow: isDark ? "0 10px 32px rgb(0 0 0 / 0.52)" : "0 4px 14px rgba(17, 17, 17, 0.08)",
  };
}

export function AppToaster() {
  const [chrome, setChrome] = useState(readChromeFromDoc);

  useEffect(() => {
    const sync = () => setChrome(readChromeFromDoc());
    sync();
    window.addEventListener("theme-resolved-change", sync as EventListener);
    const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    mq?.addEventListener("change", sync);
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      window.removeEventListener("theme-resolved-change", sync as EventListener);
      mq?.removeEventListener("change", sync);
      mo.disconnect();
    };
  }, []);

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3200,
        style: {
          borderRadius: "10px",
          border: `1px solid ${chrome.border}`,
          background: chrome.bg,
          color: chrome.fg,
          boxShadow: chrome.shadow,
          fontSize: "14px",
          padding: "12px 14px",
        },
        success: {
          style: {
            borderColor: chrome.brand,
            color: chrome.brand,
          },
          iconTheme: {
            primary: chrome.brand,
            secondary: chrome.bg,
          },
        },
        error: {
          style: {
            borderColor: chrome.danger,
            color: chrome.danger,
          },
          iconTheme: {
            primary: chrome.danger,
            secondary: chrome.bg,
          },
        },
      }}
    />
  );
}
