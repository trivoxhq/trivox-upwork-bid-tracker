"use client";

import { useCallback, useEffect, useState } from "react";
import { DASH_BTN_TABLE } from "@/components/dashboard/dashboard-classes";
import type { CrmEntity } from "@/components/dashboard/crm-import-export-toolbar";

type FilterSnapshot = {
  strings: Record<string, string>;
  bools: Record<string, boolean>;
};

type CrmFilterPresetsProps = {
  entity: CrmEntity;
  getSnapshot: () => FilterSnapshot;
  applySnapshot: (strings: Record<string, string>, bools: Record<string, boolean>) => void;
};

function storageKey(entity: CrmEntity): string {
  return `crm-filter-presets:${entity}`;
}

function readPresets(entity: CrmEntity): Record<string, FilterSnapshot> {
  try {
    const raw = localStorage.getItem(storageKey(entity));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object") return {};
    return parsed as Record<string, FilterSnapshot>;
  } catch {
    return {};
  }
}

function writePresets(entity: CrmEntity, presets: Record<string, FilterSnapshot>) {
  try {
    localStorage.setItem(storageKey(entity), JSON.stringify(presets));
  } catch {
    /* ignore */
  }
}

export function CrmFilterPresets({ entity, getSnapshot, applySnapshot }: CrmFilterPresetsProps) {
  const [names, setNames] = useState<string[]>([]);
  const [selected, setSelected] = useState("");

  const refreshNames = useCallback(() => {
    setNames(Object.keys(readPresets(entity)).sort((a, b) => a.localeCompare(b)));
  }, [entity]);

  useEffect(() => {
    refreshNames();
  }, [refreshNames]);

  function handleSave() {
    const name = window.prompt("Preset name");
    if (!name?.trim()) return;
    const key = name.trim();
    const presets = readPresets(entity);
    presets[key] = getSnapshot();
    writePresets(entity, presets);
    setSelected(key);
    refreshNames();
  }

  function handleLoad() {
    if (!selected) return;
    const preset = readPresets(entity)[selected];
    if (!preset) return;
    applySnapshot(preset.strings, preset.bools);
  }

  function handleDelete() {
    if (!selected) return;
    const ok = window.confirm(`Delete preset "${selected}"?`);
    if (!ok) return;
    const presets = readPresets(entity);
    delete presets[selected];
    writePresets(entity, presets);
    setSelected("");
    refreshNames();
  }

  return (
    <>
      <select
        className="min-w-[8rem] rounded-lg border border-input-border bg-bg-primary px-2 py-1.5 text-xs font-semibold text-text-primary"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        aria-label="Saved filter presets"
      >
        <option value="">Presets…</option>
        {names.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <button type="button" className={DASH_BTN_TABLE} onClick={handleSave}>
        Save preset
      </button>
      <button type="button" className={DASH_BTN_TABLE} disabled={!selected} onClick={handleLoad}>
        Load
      </button>
      <button type="button" className={DASH_BTN_TABLE} disabled={!selected} onClick={handleDelete}>
        Delete
      </button>
    </>
  );
}
