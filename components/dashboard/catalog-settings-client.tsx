"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  DASH_BTN_DANGER_GHOST,
  DASH_BTN_TOOLBAR,
  DASH_SECTION_TITLE,
  DASH_SURFACE_CARD_STATIC,
  DASH_TABLE_ROW,
  DASH_TABLE_TH,
  DASH_TRANSITION,
} from "@/components/dashboard/dashboard-classes";

type Row = { id: string; name: string; isActive: boolean; createdAt: string };

function CatalogBlock({
  title,
  kind,
}: {
  title: string;
  kind: "profiles" | "niches";
}) {
  const base = kind === "profiles" ? "/api/profiles" : "/api/niches";
  const key = kind === "profiles" ? "profiles" : "niches";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}?includeInactive=1`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        profiles?: Row[];
        niches?: Row[];
        message?: string;
      } | null;
      if (!res.ok || !data?.success) {
        toast.error(data?.message ?? `Could not load ${kind}.`);
        setRows([]);
        return;
      }
      const list = (kind === "profiles" ? data.profiles : data.niches) ?? [];
      setRows(
        list.map((r) => ({
          ...r,
          createdAt: typeof r.createdAt === "string" ? r.createdAt : String(r.createdAt),
        })),
      );
    } catch {
      toast.error("Network error.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [base, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      toast.error("Enter a name.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(base, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null;
      if (!res.ok) {
        toast.error(data?.message ?? "Could not add.");
        return;
      }
      toast.success("Added.");
      setNewName("");
      await load();
    } catch {
      toast.error("Network error.");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(row: Row) {
    setEditingId(row.id);
    setEditName(row.name);
  }

  async function saveEdit(id: string) {
    const name = editName.trim();
    if (!name) {
      toast.error("Name is required.");
      return;
    }
    setSavingId(id);
    try {
      const res = await fetch(`${base}/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null;
      if (!res.ok) {
        toast.error(data?.message ?? "Could not update.");
        return;
      }
      toast.success("Updated.");
      setEditingId(null);
      await load();
    } catch {
      toast.error("Network error.");
    } finally {
      setSavingId(null);
    }
  }

  async function deactivate(id: string, label: string) {
    if (!window.confirm(`Deactivate “${label}”? It will disappear from new bids but existing bids stay linked.`)) {
      return;
    }
    try {
      const res = await fetch(`${base}/${id}`, { method: "DELETE", credentials: "include" });
      const data = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null;
      if (!res.ok) {
        toast.error(data?.message ?? "Could not deactivate.");
        return;
      }
      toast.success("Deactivated.");
      await load();
    } catch {
      toast.error("Network error.");
    }
  }

  return (
    <section className="mt-10 min-w-0">
      <h2 className={DASH_SECTION_TITLE}>{title}</h2>
      <div className={`${DASH_SURFACE_CARD_STATIC} mt-4 p-4 sm:p-5`}>
        <form onSubmit={handleAdd} className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor={`${key}-new`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              New name
            </label>
            <input
              id={`${key}-new`}
              type="text"
              value={newName}
              onChange={(ev) => setNewName(ev.target.value)}
              disabled={adding}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
              placeholder={`Add ${kind === "profiles" ? "profile" : "niche"}…`}
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className={`${DASH_BTN_TOOLBAR} shrink-0 justify-center px-4 py-2.5 text-sm font-semibold`}
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-text-secondary">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-secondary">No entries yet.</p>
        ) : (
          <div className="min-w-0 overflow-x-auto rounded-lg border border-border/80">
            <table className="min-w-[480px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-secondary/60">
                  <th className={DASH_TABLE_TH}>Name</th>
                  <th className={`whitespace-nowrap ${DASH_TABLE_TH}`}>Status</th>
                  <th className={`text-right ${DASH_TABLE_TH}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {rows.map((row) => (
                  <tr key={row.id} className={DASH_TABLE_ROW}>
                    <td className="px-4 py-3">
                      {editingId === row.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(ev) => setEditName(ev.target.value)}
                          disabled={savingId === row.id}
                          className="w-full min-w-[12rem] rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
                        />
                      ) : (
                        <span className="font-medium text-text-primary">{row.name}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.isActive ? "bg-emerald-500/12 text-emerald-800" : "bg-bg-secondary text-text-secondary"
                        }`}
                      >
                        {row.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {editingId === row.id ? (
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={savingId === row.id}
                            onClick={() => {
                              setEditingId(null);
                            }}
                            className={`rounded-lg border border-border px-3 py-1.5 text-xs font-semibold ${DASH_TRANSITION} hover:bg-bg-secondary`}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={savingId === row.id}
                            onClick={() => void saveEdit(row.id)}
                            className="rounded-lg border border-brand-primary bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:border-brand-hover hover:bg-brand-hover"
                          >
                            {savingId === row.id ? "Saving…" : "Save"}
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            className={`rounded-lg border border-border px-3 py-1.5 text-xs font-semibold ${DASH_TRANSITION} hover:bg-bg-secondary`}
                          >
                            Edit
                          </button>
                          {row.isActive ? (
                            <button
                              type="button"
                              onClick={() => void deactivate(row.id, row.name)}
                              className={`${DASH_BTN_DANGER_GHOST} px-3 py-1.5 text-xs font-semibold`}
                            >
                              Deactivate
                            </button>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export function CatalogSettingsClient() {
  return (
    <div className="flex min-w-0 flex-col">
      <CatalogBlock title="Manage profiles" kind="profiles" />
      <CatalogBlock title="Manage niches" kind="niches" />
    </div>
  );
}
