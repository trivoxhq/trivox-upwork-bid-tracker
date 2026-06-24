"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  DASH_BTN_TABLE,
  DASH_BTN_TABLE_DANGER,
  DASH_BTN_TOOLBAR,
  DASH_FILTER_BAR,
  DASH_SECTION_TITLE,
  DASH_TABLE_ROW,
  DASH_TABLE_TH,
} from "@/components/dashboard/dashboard-classes";
import { EmptyState } from "@/components/ui/empty-state";
import { CLIENT_HISTORY_TYPES } from "@/lib/clients/catalog";
import type { ClientRow } from "@/lib/clients/types";
import { LEAD_SOURCE_OPTIONS } from "@/lib/leads/catalog";

type ClientFormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  country: string;
  source: string;
  notes: string;
};

type HistoryFormState = {
  type: string;
  title: string;
  description: string;
  occurredAt: string;
};

type ClientsManagementProps = {
  initialClients: ClientRow[];
  isAdmin: boolean;
};

const emptyClientForm: ClientFormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  country: "",
  source: "",
  notes: "",
};

const emptyHistoryForm: HistoryFormState = {
  type: "Note",
  title: "",
  description: "",
  occurredAt: "",
};

const inputClass =
  "w-full rounded-lg border border-input-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-secondary/55 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:cursor-not-allowed disabled:bg-bg-secondary disabled:opacity-70";

const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary";

function toDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function clientToForm(client: ClientRow): ClientFormState {
  return {
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    company: client.company ?? "",
    country: client.country ?? "",
    source: client.source ?? "",
    notes: client.notes ?? "",
  };
}

function compactClientPayload(form: ClientFormState) {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
  };

  for (const key of ["email", "phone", "company", "country", "source", "notes"] as const) {
    const value = form[key].trim();
    payload[key] = value.length > 0 ? value : null;
  }

  return payload;
}

export function ClientsManagement({ initialClients, isAdmin }: ClientsManagementProps) {
  const router = useRouter();
  const [form, setForm] = useState<ClientFormState>(emptyClientForm);
  const [historyForm, setHistoryForm] = useState<HistoryFormState>(emptyHistoryForm);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [historySubmitting, setHistorySubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const selectedClient = useMemo(
    () => initialClients.find((client) => client.id === selectedClientId) ?? initialClients[0] ?? null,
    [initialClients, selectedClientId],
  );

  const sourceOptions = useMemo(() => {
    const values = new Set<string>(LEAD_SOURCE_OPTIONS);
    for (const client of initialClients) {
      if (client.source) values.add(client.source);
    }
    return Array.from(values).sort();
  }, [initialClients]);

  const countryOptions = useMemo(() => {
    const values = new Set<string>();
    for (const client of initialClients) {
      if (client.country) values.add(client.country);
    }
    return Array.from(values).sort();
  }, [initialClients]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialClients.filter((client) => {
      if (sourceFilter && client.source !== sourceFilter) return false;
      if (countryFilter && client.country !== countryFilter) return false;
      if (!q) return true;

      return [
        client.name,
        client.email,
        client.phone,
        client.company,
        client.country,
        client.source,
        client.notes,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q));
    });
  }, [countryFilter, initialClients, search, sourceFilter]);

  function resetForm() {
    setEditing(null);
    setForm(emptyClientForm);
  }

  function setField<K extends keyof ClientFormState>(key: K, value: ClientFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setHistoryField<K extends keyof HistoryFormState>(
    key: K,
    value: HistoryFormState[K],
  ) {
    setHistoryForm((current) => ({ ...current, [key]: value }));
  }

  async function handleClientSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Client name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(editing ? `/api/clients/${editing.id}` : "/api/clients", {
        method: editing ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(compactClientPayload(form)),
      });
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        errors?: Record<string, string>;
      } | null;

      if (!res.ok) {
        const msg =
          data?.message ??
          (data?.errors ? Object.values(data.errors).join(" ") : null) ??
          "Could not save client.";
        toast.error(msg);
        return;
      }

      toast.success(editing ? "Client updated." : "Client created.");
      resetForm();
      router.refresh();
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHistorySubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedClient) return;
    if (!historyForm.title.trim()) {
      toast.error("History title is required.");
      return;
    }

    setHistorySubmitting(true);
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}/history`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: historyForm.type,
          title: historyForm.title.trim(),
          description: historyForm.description.trim() || null,
          occurredAt: historyForm.occurredAt ? new Date(historyForm.occurredAt).toISOString() : null,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        errors?: Record<string, string>;
      } | null;

      if (!res.ok) {
        const msg =
          data?.message ??
          (data?.errors ? Object.values(data.errors).join(" ") : null) ??
          "Could not add history.";
        toast.error(msg);
        return;
      }

      toast.success("History added.");
      setHistoryForm(emptyHistoryForm);
      router.refresh();
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setHistorySubmitting(false);
    }
  }

  async function handleDelete(client: ClientRow) {
    if (!isAdmin) return;
    const ok = window.confirm(`Delete client "${client.name}" and all history?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        toast.error(data?.message ?? "Could not delete client.");
        return;
      }
      toast.success("Client deleted.");
      if (selectedClientId === client.id) setSelectedClientId(null);
      router.refresh();
    } catch {
      toast.error("Network error. Try again.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
      <section className="rounded-[22px] border border-border/55 bg-bg-primary/80 p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className={DASH_SECTION_TITLE}>{editing ? "Edit client" : "Add client"}</h2>
            <p className="mt-1.5 text-sm text-text-secondary">
              Store contact details, company context, source, and profile notes.
            </p>
          </div>
          {editing ? (
            <button type="button" onClick={resetForm} className={DASH_BTN_TABLE}>
              Cancel
            </button>
          ) : null}
        </div>

        <form onSubmit={handleClientSubmit} className="mt-5 space-y-4">
          <div>
            <label className={labelClass} htmlFor="client-name">
              Client name
            </label>
            <input
              id="client-name"
              className={inputClass}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Client or contact name"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="client-email">
                Email
              </label>
              <input
                id="client-email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="client-phone">
                Phone
              </label>
              <input
                id="client-phone"
                className={inputClass}
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="+1..."
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="client-company">
                Company
              </label>
              <input
                id="client-company"
                className={inputClass}
                value={form.company}
                onChange={(e) => setField("company", e.target.value)}
                placeholder="Company"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="client-country">
                Country
              </label>
              <input
                id="client-country"
                className={inputClass}
                value={form.country}
                onChange={(e) => setField("country", e.target.value)}
                placeholder="Country"
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="client-source">
              Source
            </label>
            <input
              id="client-source"
              list="client-source-options"
              className={inputClass}
              value={form.source}
              onChange={(e) => setField("source", e.target.value)}
              placeholder="Upwork, website, referral"
            />
            <datalist id="client-source-options">
              {sourceOptions.map((source) => (
                <option key={source} value={source} />
              ))}
            </datalist>
          </div>

          <div>
            <label className={labelClass} htmlFor="client-notes">
              Notes
            </label>
            <textarea
              id="client-notes"
              className={`${inputClass} min-h-24 resize-y`}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Client preferences, requirements, budget, context"
            />
          </div>

          <button type="submit" disabled={submitting} className={`${DASH_BTN_TOOLBAR} w-full`}>
            {submitting ? "Saving..." : editing ? "Update client" : "Create client"}
          </button>
        </form>

        {selectedClient ? (
          <form onSubmit={handleHistorySubmit} className="mt-8 border-t border-border/70 pt-5">
            <h3 className={DASH_SECTION_TITLE}>Add history</h3>
            <p className="mt-1.5 text-sm text-text-secondary">
              Add a note, call, email, meeting, proposal, or status update for {selectedClient.name}.
            </p>

            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="history-type">
                    Type
                  </label>
                  <select
                    id="history-type"
                    className={inputClass}
                    value={historyForm.type}
                    onChange={(e) => setHistoryField("type", e.target.value)}
                  >
                    {CLIENT_HISTORY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="history-date">
                    Date/time
                  </label>
                  <input
                    id="history-date"
                    type="datetime-local"
                    className={inputClass}
                    value={historyForm.occurredAt}
                    onChange={(e) => setHistoryField("occurredAt", e.target.value)}
                    placeholder={toDateTimeLocalValue(new Date().toISOString())}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="history-title">
                  Title
                </label>
                <input
                  id="history-title"
                  className={inputClass}
                  value={historyForm.title}
                  onChange={(e) => setHistoryField("title", e.target.value)}
                  placeholder="Followed up about proposal"
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="history-description">
                  Description
                </label>
                <textarea
                  id="history-description"
                  className={`${inputClass} min-h-20 resize-y`}
                  value={historyForm.description}
                  onChange={(e) => setHistoryField("description", e.target.value)}
                  placeholder="Details, outcome, next step"
                />
              </div>

              <button
                type="submit"
                disabled={historySubmitting}
                className={`${DASH_BTN_TOOLBAR} w-full`}
              >
                {historySubmitting ? "Adding..." : "Add history"}
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="min-w-0 rounded-[22px] border border-border/55 bg-bg-primary/80 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className={DASH_SECTION_TITLE}>Client profiles</h2>
            <p className="mt-1.5 text-sm text-text-secondary">
              {filteredClients.length} / {initialClients.length} clients
            </p>
          </div>
          <button
            type="button"
            className={DASH_BTN_TABLE}
            onClick={() => {
              setSearch("");
              setSourceFilter("");
              setCountryFilter("");
            }}
          >
            Reset filters
          </button>
        </div>

        <div className={`${DASH_FILTER_BAR} mt-4`}>
          <div className="grid gap-2 md:grid-cols-3">
            <input
              className={inputClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
            />
            <select
              className={inputClass}
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="">All sources</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
            >
              <option value="">All countries</option>
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
        </div>

        {initialClients.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No clients yet"
            description="Create the first client profile to start building CRM history."
          />
        ) : filteredClients.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No matching clients"
            description="Clear or adjust filters to see more clients."
          />
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/70">
            <table className="min-w-full divide-y divide-border/70 text-sm">
              <thead className="bg-bg-secondary/75 text-left">
                <tr>
                  <th className={DASH_TABLE_TH}>Client</th>
                  <th className={DASH_TABLE_TH}>Source</th>
                  <th className={DASH_TABLE_TH}>History</th>
                  <th className={DASH_TABLE_TH}>Updated</th>
                  <th className={`${DASH_TABLE_TH} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className={`${DASH_TABLE_ROW} ${
                      selectedClient?.id === client.id ? "bg-brand-primary/5" : ""
                    }`}
                  >
                    <td className="min-w-[260px] px-4 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => setSelectedClientId(client.id)}
                        className="text-left font-semibold text-text-primary hover:text-brand-primary"
                      >
                        {client.name}
                      </button>
                      <div className="mt-1 text-xs text-text-secondary">
                        {client.company ?? "No company"}
                        {client.country ? ` - ${client.country}` : ""}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
                        {client.email ? <span>{client.email}</span> : null}
                        {client.phone ? <span>{client.phone}</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-text-secondary">
                      {client.source ?? "-"}
                    </td>
                    <td className="min-w-[260px] px-4 py-3 align-top">
                      {client.history[0] ? (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
                            {client.history[0].type}
                          </div>
                          <div className="mt-1 font-medium text-text-primary">
                            {client.history[0].title}
                          </div>
                          <div className="mt-1 text-xs text-text-secondary">
                            {toDateLabel(client.history[0].occurredAt)} by{" "}
                            {client.history[0].createdBy.name}
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-secondary">No history yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-text-secondary">
                      {toDateLabel(client.updatedAt)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col justify-end gap-2 sm:flex-row">
                        <button
                          type="button"
                          className={DASH_BTN_TABLE}
                          onClick={() => setSelectedClientId(client.id)}
                        >
                          History
                        </button>
                        <button
                          type="button"
                          className={DASH_BTN_TABLE}
                          onClick={() => {
                            setEditing(client);
                            setForm(clientToForm(client));
                            setSelectedClientId(client.id);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Edit
                        </button>
                        {isAdmin ? (
                          <button
                            type="button"
                            className={DASH_BTN_TABLE_DANGER}
                            onClick={() => handleDelete(client)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedClient ? (
          <div className="mt-6 rounded-xl border border-border/70 bg-bg-secondary/45 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-text-primary">{selectedClient.name} history</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Notes and communication history for this client.
                </p>
              </div>
              <button
                type="button"
                className={DASH_BTN_TABLE}
                onClick={() => setSelectedClientId(null)}
              >
                Close
              </button>
            </div>

            {selectedClient.history.length === 0 ? (
              <p className="mt-4 text-sm text-text-secondary">No history entries yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {selectedClient.history.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-lg border border-border/70 bg-bg-primary p-3 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full border border-brand-primary/30 bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-primary">
                        {item.type}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {toDateLabel(item.occurredAt)} by {item.createdBy.name}
                      </span>
                    </div>
                    <h4 className="mt-2 font-semibold text-text-primary">{item.title}</h4>
                    {item.description ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                        {item.description}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
