"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type FilterConfig = {
  stringKeys: readonly string[];
  boolKeys?: readonly string[];
};

function readStrings(searchParams: URLSearchParams, keys: readonly string[]): Record<string, string> {
  return Object.fromEntries(keys.map((key) => [key, searchParams.get(key) ?? ""]));
}

function readBools(searchParams: URLSearchParams, keys: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(keys.map((key) => [key, searchParams.get(key) === "1"]));
}

function emptyStrings(keys: readonly string[]): Record<string, string> {
  return Object.fromEntries(keys.map((key) => [key, ""]));
}

function emptyBools(keys: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

/** Keeps CRM list filters in sync with URL query params (shareable/bookmarkable views). */
export function useCrmFilterParams({ stringKeys, boolKeys = [] }: FilterConfig) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const skipNextSync = useRef(true);

  const [strings, setStrings] = useState<Record<string, string>>(() =>
    readStrings(searchParams, stringKeys),
  );
  const [bools, setBools] = useState<Record<string, boolean>>(() =>
    readBools(searchParams, boolKeys),
  );
  const [advancedOpen, setAdvancedOpen] = useState(() => {
    const urlStrings = readStrings(searchParams, stringKeys);
    const urlBools = readBools(searchParams, boolKeys);
    return (
      stringKeys.some((key) => key !== "q" && urlStrings[key]?.trim()) ||
      boolKeys.some((key) => urlBools[key])
    );
  });

  const syncUrl = useCallback(
    (nextStrings: Record<string, string>, nextBools: Record<string, boolean>) => {
      const params = new URLSearchParams();
      for (const key of stringKeys) {
        const value = nextStrings[key]?.trim();
        if (value) params.set(key, value);
      }
      for (const key of boolKeys) {
        if (nextBools[key]) params.set(key, "1");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [boolKeys, pathname, router, stringKeys],
  );

  useEffect(() => {
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    const delay = strings.q?.trim() ? 300 : 0;
    const id = window.setTimeout(() => syncUrl(strings, bools), delay);
    return () => window.clearTimeout(id);
  }, [strings, bools, syncUrl]);

  const setString = useCallback((key: string, value: string) => {
    setStrings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setBool = useCallback((key: string, value: boolean) => {
    setBools((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetAll = useCallback(() => {
    setStrings(emptyStrings(stringKeys));
    setBools(emptyBools(boolKeys));
    setAdvancedOpen(false);
  }, [boolKeys, stringKeys]);

  const activeCount = useMemo(() => {
    let count = 0;
    for (const key of stringKeys) {
      if (strings[key]?.trim()) count += 1;
    }
    for (const key of boolKeys) {
      if (bools[key]) count += 1;
    }
    return count;
  }, [bools, boolKeys, stringKeys, strings]);

  const getString = useCallback((key: string) => strings[key] ?? "", [strings]);
  const getBool = useCallback((key: string) => bools[key] ?? false, [bools]);

  return {
    getString,
    getBool,
    setString,
    setBool,
    resetAll,
    activeCount,
    advancedOpen,
    setAdvancedOpen,
  };
}
