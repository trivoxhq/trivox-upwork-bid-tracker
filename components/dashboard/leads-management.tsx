"use client";

import { Suspense, useMemo, useState, type FormEvent } from "react";
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
import { CrmImportExportToolbar } from "@/components/dashboard/crm-import-export-toolbar";
import { CrmNotesPanel } from "@/components/dashboard/crm-notes-panel";
import {
  CrmAdvancedFiltersPanel,
  CrmFilterCheckbox,
  CrmFilterField,
  CrmFilterToolbar,
  CRM_FILTER_INPUT_CLASS,
  CrmOwnerSelect,
} from "@/components/dashboard/crm-advanced-filters";
import { useCrmFilterParams } from "@/hooks/use-crm-filter-params";
import {
  distinctSorted,
  matchDateRange,
  matchOwnerFilter,
  matchTextSearch,
} from "@/lib/filters/helpers";
import { LEAD_SOURCE_OPTIONS, LEAD_STATUS_OPTIONS } from "@/lib/leads/catalog";
import type { LeadRow, LeadUserSummary } from "@/lib/leads/types";

type LeadFormState = {
  title: string;
  clientName: string;
  email: string;
  phone: string;
  company: string;
  country: string;
  source: string;
  status: string;
  notes: string;
  assignedToId: string;
};

type LeadsManagementProps = {
  initialLeads: LeadRow[];
  users: LeadUserSummary[];
  isAdmin: boolean;
  readOnly?: boolean;
  currentUserId: string;
  canDeleteNotes?: boolean;
};

const emptyForm: LeadFormState = {
  title: "",
  clientName: "",
  email: "",
  phone: "",
  company: "",
  country: "",
  source: "",
  status: "New",
  notes: "",
  assignedToId: "",
};

const inputClass =
  "w-full rounded-lg border border-input-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-secondary/55 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:cursor-not-allowed disabled:bg-bg-secondary disabled:opacity-70";

const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary";

function toDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function leadToForm(lead: LeadRow): LeadFormState {
  return {
    title: lead.title,
    clientName: lead.clientName,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    company: lead.company ?? "",
    country: lead.country ?? "",
    source: lead.source ?? "",
    status: lead.status,
    notes: lead.notes ?? "",
    assignedToId: lead.assignedToId ?? "",
  };
}

function compactPayload(form: LeadFormState, isAdmin: boolean) {
  const payload: Record<string, unknown> = {
    title: form.title.trim(),
    clientName: form.clientName.trim(),
    status: form.status,
  };

  for (const key of ["email", "phone", "company", "country", "source", "notes"] as const) {
    const value = form[key].trim();
    payload[key] = value.length > 0 ? value : null;
  }

  if (isAdmin) {
    payload.assignedToId = form.assignedToId || null;
  }

  return payload;
}

function LeadStatusPill({ status }: { status: string }) {
  const tone =
    status === "Won"
      ? "border-success/35 bg-success/10 text-success"
      : status === "Lost"
        ? "border-danger/35 bg-danger/10 text-danger"
        : status === "Proposal Sent"
          ? "border-info/35 bg-info/10 text-info"
          : "border-brand-primary/30 bg-brand-primary/10 text-brand-primary";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}

export function LeadsManagement(props: LeadsManagementProps) {
  return (
    <Suspense fallback={<p className="mt-8 text-sm text-text-secondary">Loading filters…</p>}>
      <LeadsManagementInner {...props} />
    </Suspense>
  );
}

function LeadsManagementInner({
  initialLeads,
  users,
  isAdmin,
  readOnly = false,
  currentUserId,
  canDeleteNotes = false,
}: LeadsManagementProps) {
  const router = useRouter();
  const [notesFor, setNotesFor] = useState<{ id: string; title: string } | null>(null);
  const [form, setForm] = useState<LeadFormState>(() => ({
    ...emptyForm,
    assignedToId: isAdmin ? "" : currentUserId,
  }));
  const [editing, setEditing] = useState<LeadRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filters = useCrmFilterParams({
    stringKeys: ["q", "status", "source", "owner", "country", "createdBy", "updatedFrom", "updatedTo"],
    boolKeys: ["openOnly"],
  });

  const search = filters.getString("q");
  const statusFilter = filters.getString("status");
  const sourceFilter = filters.getString("source");
  const ownerFilter = filters.getString("owner");
  const countryFilter = filters.getString("country");
  const createdByFilter = filters.getString("createdBy");
  const updatedFrom = filters.getString("updatedFrom");
  const updatedTo = filters.getString("updatedTo");
  const openOnly = filters.getBool("openOnly");

  const sourceOptions = useMemo(() => {
    const values = new Set<string>(LEAD_SOURCE_OPTIONS);
    for (const lead of initialLeads) {
      if (lead.source) values.add(lead.source);
    }
    return Array.from(values).sort();
  }, [initialLeads]);

  const countryOptions = useMemo(
    () => distinctSorted(initialLeads.map((lead) => lead.country)),
    [initialLeads],
  );

  const filteredLeads = useMemo(() => {
    return initialLeads.filter((lead) => {
      if (statusFilter && lead.status !== statusFilter) return false;
      if (sourceFilter && lead.source !== sourceFilter) return false;
      if (countryFilter && lead.country !== countryFilter) return false;
      if (!matchOwnerFilter(lead.assignedToId, ownerFilter)) return false;
      if (createdByFilter && lead.createdBy.id !== createdByFilter) return false;
      if (openOnly && (lead.status === "Won" || lead.status === "Lost")) return false;
      if (!matchDateRange(lead.updatedAt, updatedFrom, updatedTo)) return false;
      if (
        !matchTextSearch(search, [
          lead.title,
          lead.clientName,
          lead.email,
          lead.phone,
          lead.company,
          lead.country,
          lead.source,
          lead.notes,
          lead.assignedTo?.name,
          lead.createdBy.name,
        ])
      ) {
        return false;
      }
      return true;
    });
  }, [
    countryFilter,
    createdByFilter,
    initialLeads,
    openOnly,
    ownerFilter,
    search,
    sourceFilter,
    statusFilter,
    updatedFrom,
    updatedTo,
  ]);

  function resetForm() {
    setEditing(null);
    setForm({ ...emptyForm, assignedToId: isAdmin ? "" : currentUserId });
  }

  function setField<K extends keyof LeadFormState>(key: K, value: LeadFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Lead title is required.");
      return;
    }
    if (!form.clientName.trim()) {
      toast.error("Client name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(editing ? `/api/leads/${editing.id}` : "/api/leads", {
        method: editing ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(compactPayload(form, isAdmin)),
      });
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        errors?: Record<string, string>;
      } | null;

      if (!res.ok) {
        const msg =
          data?.message ??
          (data?.errors ? Object.values(data.errors).join(" ") : null) ??
          "Could not save lead.";
        toast.error(msg);
        return;
      }

      toast.success(editing ? "Lead updated." : "Lead created.");
      resetForm();
      router.refresh();
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(lead: LeadRow) {
    if (!isAdmin) return;
    const ok = window.confirm(`Delete lead "${lead.title}"? This cannot be undone.`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        toast.error(data?.message ?? "Could not delete lead.");
        return;
      }
      toast.success("Lead deleted.");
      router.refresh();
    } catch {
      toast.error("Network error. Try again.");
    }
  }

  return (
    <div className={`grid gap-6 ${readOnly ? "" : "xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]"}`}>
      {!readOnly ? (
      <section className="rounded-[22px] border border-border/55 bg-bg-primary/80 p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className={DASH_SECTION_TITLE}>{editing ? "Edit lead" : "Add lead"}</h2>
            <p className="mt-1.5 text-sm text-text-secondary">
              Capture client details, source, owner, and pipeline stage.
            </p>
          </div>
          {editing ? (
            <button type="button" onClick={resetForm} className={DASH_BTN_TABLE}>
              Cancel
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className={labelClass} htmlFor="lead-title">
              Lead title
            </label>
            <input
              id="lead-title"
              className={inputClass}
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Website redesign inquiry"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="lead-client">
              Client name
            </label>
            <input
              id="lead-client"
              className={inputClass}
              value={form.clientName}
              onChange={(e) => setField("clientName", e.target.value)}
              placeholder="Client or contact name"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="lead-email">
                Email
              </label>
              <input
                id="lead-email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="lead-phone">
                Phone
              </label>
              <input
                id="lead-phone"
                className={inputClass}
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="+1..."
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="lead-company">
                Company
              </label>
              <input
                id="lead-company"
                className={inputClass}
                value={form.company}
                onChange={(e) => setField("company", e.target.value)}
                placeholder="Company"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="lead-country">
                Country
              </label>
              <input
                id="lead-country"
                className={inputClass}
                value={form.country}
                onChange={(e) => setField("country", e.target.value)}
                placeholder="Country"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="lead-status">
                Stage
              </label>
              <select
                id="lead-status"
                className={inputClass}
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
              >
                {LEAD_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="lead-source">
                Source
              </label>
              <input
                id="lead-source"
                list="lead-source-options"
                className={inputClass}
                value={form.source}
                onChange={(e) => setField("source", e.target.value)}
                placeholder="Upwork, website, referral"
              />
              <datalist id="lead-source-options">
                {sourceOptions.map((source) => (
                  <option key={source} value={source} />
                ))}
              </datalist>
            </div>
          </div>

          {isAdmin ? (
            <div>
              <label className={labelClass} htmlFor="lead-assignee">
                Assign to
              </label>
              <select
                id="lead-assignee"
                className={inputClass}
                value={form.assignedToId}
                onChange={(e) => setField("assignedToId", e.target.value)}
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className={labelClass} htmlFor="lead-notes">
              Notes
            </label>
            <textarea
              id="lead-notes"
              className={`${inputClass} min-h-24 resize-y`}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Requirements, next step, budget, or context"
            />
          </div>

          <button type="submit" disabled={submitting} className={`${DASH_BTN_TOOLBAR} w-full`}>
            {submitting ? "Saving..." : editing ? "Update lead" : "Create lead"}
          </button>
        </form>
      </section>
      ) : null}

      <section className="min-w-0 rounded-[22px] border border-border/55 bg-bg-primary/80 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className={DASH_SECTION_TITLE}>Lead pipeline</h2>
            <p className="mt-1.5 text-sm text-text-secondary">
              {filteredLeads.length} / {initialLeads.length} leads
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CrmImportExportToolbar entity="leads" readOnly={readOnly} />
            <CrmFilterToolbar
              activeCount={filters.activeCount}
              advancedOpen={filters.advancedOpen}
              onToggleAdvanced={() => filters.setAdvancedOpen((open) => !open)}
              onReset={filters.resetAll}
            />
          </div>
        </div>

        <div className={`${DASH_FILTER_BAR} mt-4`}>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
            <input
              className={CRM_FILTER_INPUT_CLASS}
              value={search}
              onChange={(e) => filters.setString("q", e.target.value)}
              placeholder="Search leads..."
            />
            <select
              className={CRM_FILTER_INPUT_CLASS}
              value={statusFilter}
              onChange={(e) => filters.setString("status", e.target.value)}
            >
              <option value="">All stages</option>
              {LEAD_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              className={CRM_FILTER_INPUT_CLASS}
              value={sourceFilter}
              onChange={(e) => filters.setString("source", e.target.value)}
            >
              <option value="">All sources</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
            <select
              className={CRM_FILTER_INPUT_CLASS}
              value={countryFilter}
              onChange={(e) => filters.setString("country", e.target.value)}
            >
              <option value="">All countries</option>
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {isAdmin ? (
              <CrmOwnerSelect
                value={ownerFilter}
                onChange={(value) => filters.setString("owner", value)}
                users={users}
                placeholder="All assignees"
              />
            ) : null}
          </div>

          <CrmAdvancedFiltersPanel open={filters.advancedOpen}>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {isAdmin ? (
                <CrmFilterField label="Created by">
                  <CrmOwnerSelect
                    value={createdByFilter}
                    onChange={(value) => filters.setString("createdBy", value)}
                    users={users}
                    includeUnassigned={false}
                    placeholder="Anyone"
                  />
                </CrmFilterField>
              ) : null}
              <CrmFilterField label="Updated from">
                <input
                  type="date"
                  value={updatedFrom}
                  onChange={(e) => filters.setString("updatedFrom", e.target.value)}
                  className={CRM_FILTER_INPUT_CLASS}
                />
              </CrmFilterField>
              <CrmFilterField label="Updated to">
                <input
                  type="date"
                  value={updatedTo}
                  onChange={(e) => filters.setString("updatedTo", e.target.value)}
                  className={CRM_FILTER_INPUT_CLASS}
                />
              </CrmFilterField>
              <CrmFilterCheckbox
                label="Open leads only"
                checked={openOnly}
                onChange={(checked) => filters.setBool("openOnly", checked)}
              />
            </div>
          </CrmAdvancedFiltersPanel>
        </div>

        {initialLeads.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No leads yet"
            description="Add the first lead to start tracking your CRM pipeline."
          />
        ) : filteredLeads.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No matching leads"
            description="Clear or adjust the filters to see more leads."
          />
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/70">
            <table className="min-w-full divide-y divide-border/70 text-sm">
              <thead className="bg-bg-secondary/75 text-left">
                <tr>
                  <th className={DASH_TABLE_TH}>Lead</th>
                  <th className={DASH_TABLE_TH}>Stage</th>
                  <th className={DASH_TABLE_TH}>Source</th>
                  <th className={DASH_TABLE_TH}>Owner</th>
                  <th className={DASH_TABLE_TH}>Updated</th>
                  <th className={`${DASH_TABLE_TH} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className={DASH_TABLE_ROW}>
                    <td className="min-w-[260px] px-4 py-3 align-top">
                      <div className="font-semibold text-text-primary">{lead.title}</div>
                      <div className="mt-1 text-xs text-text-secondary">
                        {lead.clientName}
                        {lead.company ? ` - ${lead.company}` : ""}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
                        {lead.email ? <span>{lead.email}</span> : null}
                        {lead.phone ? <span>{lead.phone}</span> : null}
                        {lead.country ? <span>{lead.country}</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <LeadStatusPill status={lead.status} />
                    </td>
                    <td className="px-4 py-3 align-top text-text-secondary">
                      {lead.source ?? "-"}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-text-primary">
                        {lead.assignedTo?.name ?? "Unassigned"}
                      </div>
                      <div className="mt-1 text-xs text-text-secondary">
                        Created by {lead.createdBy.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-text-secondary">
                      {toDateLabel(lead.updatedAt)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col justify-end gap-2 sm:flex-row">
                        <button
                          type="button"
                          className={DASH_BTN_TABLE}
                          onClick={() =>
                            setNotesFor({ id: lead.id, title: lead.title })
                          }
                        >
                          Notes
                        </button>
                      {!readOnly ? (
                      <>
                        <button
                          type="button"
                          className={DASH_BTN_TABLE}
                          onClick={() => {
                            setEditing(lead);
                            setForm(leadToForm(lead));
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Edit
                        </button>
                        {isAdmin ? (
                          <button
                            type="button"
                            className={DASH_BTN_TABLE_DANGER}
                            onClick={() => handleDelete(lead)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </>
                      ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {notesFor ? (
        <CrmNotesPanel
          className="mt-6"
          entityType="lead"
          entityId={notesFor.id}
          entityTitle={notesFor.title}
          readOnly={readOnly}
          canDelete={canDeleteNotes}
          currentUserId={currentUserId}
          onClose={() => setNotesFor(null)}
        />
      ) : null}
    </div>
  );
}
