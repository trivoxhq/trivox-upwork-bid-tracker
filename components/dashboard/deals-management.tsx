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
  matchDateRange,
  matchNumericRange,
  matchOwnerFilter,
  matchTextSearch,
} from "@/lib/filters/helpers";
import { DEAL_STAGE_OPTIONS } from "@/lib/deals/catalog";
import type { DealRow, DealUserSummary } from "@/lib/deals/types";

type DealFormState = {
  title: string;
  clientName: string;
  value: string;
  stage: string;
  probability: string;
  expectedCloseAt: string;
  notes: string;
  ownerId: string;
};

type DealsManagementProps = {
  initialDeals: DealRow[];
  users: DealUserSummary[];
  isAdmin: boolean;
  readOnly?: boolean;
  currentUserId: string;
  canDeleteNotes?: boolean;
};

const emptyForm: DealFormState = {
  title: "",
  clientName: "",
  value: "0",
  stage: "Qualification",
  probability: "0",
  expectedCloseAt: "",
  notes: "",
  ownerId: "",
};

const inputClass =
  "w-full rounded-lg border border-input-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-secondary/55 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:cursor-not-allowed disabled:bg-bg-secondary disabled:opacity-70";

const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function toDateLabel(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dealToForm(deal: DealRow): DealFormState {
  return {
    title: deal.title,
    clientName: deal.clientName,
    value: String(deal.value),
    stage: deal.stage,
    probability: String(deal.probability),
    expectedCloseAt: toDateInputValue(deal.expectedCloseAt),
    notes: deal.notes ?? "",
    ownerId: deal.ownerId ?? "",
  };
}

function compactPayload(form: DealFormState, isAdmin: boolean) {
  const payload: Record<string, unknown> = {
    title: form.title.trim(),
    clientName: form.clientName.trim(),
    value: Number.parseInt(form.value, 10) || 0,
    stage: form.stage,
    probability: Number.parseInt(form.probability, 10) || 0,
    expectedCloseAt: form.expectedCloseAt
      ? new Date(`${form.expectedCloseAt}T12:00:00`).toISOString()
      : null,
    notes: form.notes.trim() || null,
  };

  if (isAdmin) {
    payload.ownerId = form.ownerId || null;
  }

  return payload;
}

function DealStagePill({ stage }: { stage: string }) {
  const tone =
    stage === "Closed Won"
      ? "border-success/35 bg-success/10 text-success"
      : stage === "Closed Lost"
        ? "border-danger/35 bg-danger/10 text-danger"
        : stage === "Negotiation"
          ? "border-info/35 bg-info/10 text-info"
          : "border-brand-primary/30 bg-brand-primary/10 text-brand-primary";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {stage}
    </span>
  );
}

export function DealsManagement(props: DealsManagementProps) {
  return (
    <Suspense fallback={<p className="mt-8 text-sm text-text-secondary">Loading filters…</p>}>
      <DealsManagementInner {...props} />
    </Suspense>
  );
}

function DealsManagementInner({
  initialDeals,
  users,
  isAdmin,
  readOnly = false,
  currentUserId,
  canDeleteNotes = false,
}: DealsManagementProps) {
  const router = useRouter();
  const [notesFor, setNotesFor] = useState<{ id: string; title: string } | null>(null);
  const [form, setForm] = useState<DealFormState>(() => ({
    ...emptyForm,
    ownerId: isAdmin ? "" : currentUserId,
  }));
  const [editing, setEditing] = useState<DealRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filters = useCrmFilterParams({
    stringKeys: ["q", "stage", "owner", "closeFrom", "closeTo", "valueMin", "valueMax"],
    boolKeys: ["openOnly"],
  });

  const search = filters.getString("q");
  const stageFilter = filters.getString("stage");
  const ownerFilter = filters.getString("owner");
  const closeFrom = filters.getString("closeFrom");
  const closeTo = filters.getString("closeTo");
  const valueMin = filters.getString("valueMin");
  const valueMax = filters.getString("valueMax");
  const openOnly = filters.getBool("openOnly");

  const filteredDeals = useMemo(() => {
    return initialDeals.filter((deal) => {
      if (stageFilter && deal.stage !== stageFilter) return false;
      if (!matchOwnerFilter(deal.ownerId, ownerFilter)) return false;
      if (openOnly && (deal.stage === "Closed Won" || deal.stage === "Closed Lost")) return false;
      if (!matchNumericRange(deal.value, valueMin, valueMax)) return false;
      if (!matchDateRange(deal.expectedCloseAt, closeFrom, closeTo)) return false;
      if (
        !matchTextSearch(search, [
          deal.title,
          deal.clientName,
          deal.notes,
          deal.owner?.name,
          deal.createdBy.name,
        ])
      ) {
        return false;
      }
      return true;
    });
  }, [
    closeFrom,
    closeTo,
    initialDeals,
    openOnly,
    ownerFilter,
    search,
    stageFilter,
    valueMax,
    valueMin,
  ]);

  const pipelineSummary = useMemo(() => {
    const open = filteredDeals.filter(
      (d) => d.stage !== "Closed Won" && d.stage !== "Closed Lost",
    );
    const totalValue = open.reduce((sum, d) => sum + d.value, 0);
    const weightedValue = open.reduce((sum, d) => sum + (d.value * d.probability) / 100, 0);
    return { openCount: open.length, totalValue, weightedValue };
  }, [filteredDeals]);

  function resetForm() {
    setEditing(null);
    setForm({ ...emptyForm, ownerId: isAdmin ? "" : currentUserId });
  }

  function setField<K extends keyof DealFormState>(key: K, value: DealFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Deal title is required.");
      return;
    }
    if (!form.clientName.trim()) {
      toast.error("Client name is required.");
      return;
    }

    const probability = Number.parseInt(form.probability, 10);
    if (Number.isNaN(probability) || probability < 0 || probability > 100) {
      toast.error("Probability must be between 0 and 100.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(editing ? `/api/deals/${editing.id}` : "/api/deals", {
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
          "Could not save deal.";
        toast.error(msg);
        return;
      }

      toast.success(editing ? "Deal updated." : "Deal created.");
      resetForm();
      router.refresh();
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(deal: DealRow) {
    if (!isAdmin) return;
    const ok = window.confirm(`Delete deal "${deal.title}"? This cannot be undone.`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        toast.error(data?.message ?? "Could not delete deal.");
        return;
      }
      toast.success("Deal deleted.");
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
            <h2 className={DASH_SECTION_TITLE}>{editing ? "Edit deal" : "Add deal"}</h2>
            <p className="mt-1.5 text-sm text-text-secondary">
              Track deal value, stage, owner, probability, and expected close date.
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
            <label className={labelClass} htmlFor="deal-title">
              Deal title
            </label>
            <input
              id="deal-title"
              className={inputClass}
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Annual retainer opportunity"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="deal-client">
              Client name
            </label>
            <input
              id="deal-client"
              className={inputClass}
              value={form.clientName}
              onChange={(e) => setField("clientName", e.target.value)}
              placeholder="Client or company"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="deal-value">
                Deal value (USD)
              </label>
              <input
                id="deal-value"
                type="number"
                min={0}
                step={1}
                className={inputClass}
                value={form.value}
                onChange={(e) => setField("value", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="deal-probability">
                Probability (%)
              </label>
              <input
                id="deal-probability"
                type="number"
                min={0}
                max={100}
                step={1}
                className={inputClass}
                value={form.probability}
                onChange={(e) => setField("probability", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="deal-stage">
                Stage
              </label>
              <select
                id="deal-stage"
                className={inputClass}
                value={form.stage}
                onChange={(e) => setField("stage", e.target.value)}
              >
                {DEAL_STAGE_OPTIONS.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="deal-close">
                Expected close
              </label>
              <input
                id="deal-close"
                type="date"
                className={inputClass}
                value={form.expectedCloseAt}
                onChange={(e) => setField("expectedCloseAt", e.target.value)}
              />
            </div>
          </div>

          {isAdmin ? (
            <div>
              <label className={labelClass} htmlFor="deal-owner">
                Owner
              </label>
              <select
                id="deal-owner"
                className={inputClass}
                value={form.ownerId}
                onChange={(e) => setField("ownerId", e.target.value)}
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
            <label className={labelClass} htmlFor="deal-notes">
              Notes
            </label>
            <textarea
              id="deal-notes"
              className={`${inputClass} min-h-24 resize-y`}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Scope, objections, next steps"
            />
          </div>

          <button type="submit" disabled={submitting} className={`${DASH_BTN_TOOLBAR} w-full`}>
            {submitting ? "Saving..." : editing ? "Update deal" : "Create deal"}
          </button>
        </form>
      </section>
      ) : null}

      <section className="min-w-0 rounded-[22px] border border-border/55 bg-bg-primary/80 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className={DASH_SECTION_TITLE}>Deal pipeline</h2>
            <p className="mt-1.5 text-sm text-text-secondary">
              {filteredDeals.length} deals · {pipelineSummary.openCount} open ·{" "}
              {formatCurrency(pipelineSummary.totalValue)} pipeline ·{" "}
              {formatCurrency(Math.round(pipelineSummary.weightedValue))} weighted
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CrmImportExportToolbar entity="deals" readOnly={readOnly} />
            <CrmFilterToolbar
              activeCount={filters.activeCount}
              advancedOpen={filters.advancedOpen}
              onToggleAdvanced={() => filters.setAdvancedOpen((open) => !open)}
              onReset={filters.resetAll}
            />
          </div>
        </div>

        <div className={`${DASH_FILTER_BAR} mt-4`}>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <input
              className={CRM_FILTER_INPUT_CLASS}
              value={search}
              onChange={(e) => filters.setString("q", e.target.value)}
              placeholder="Search deals..."
            />
            <select
              className={CRM_FILTER_INPUT_CLASS}
              value={stageFilter}
              onChange={(e) => filters.setString("stage", e.target.value)}
            >
              <option value="">All stages</option>
              {DEAL_STAGE_OPTIONS.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
            {isAdmin ? (
              <CrmOwnerSelect
                value={ownerFilter}
                onChange={(value) => filters.setString("owner", value)}
                users={users}
              />
            ) : null}
            <CrmFilterCheckbox
              label="Open deals only"
              checked={openOnly}
              onChange={(checked) => filters.setBool("openOnly", checked)}
            />
          </div>

          <CrmAdvancedFiltersPanel open={filters.advancedOpen}>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <CrmFilterField label="Expected close from">
                <input
                  type="date"
                  value={closeFrom}
                  onChange={(e) => filters.setString("closeFrom", e.target.value)}
                  className={CRM_FILTER_INPUT_CLASS}
                />
              </CrmFilterField>
              <CrmFilterField label="Expected close to">
                <input
                  type="date"
                  value={closeTo}
                  onChange={(e) => filters.setString("closeTo", e.target.value)}
                  className={CRM_FILTER_INPUT_CLASS}
                />
              </CrmFilterField>
              <CrmFilterField label="Min value ($)">
                <input
                  type="number"
                  min={0}
                  value={valueMin}
                  onChange={(e) => filters.setString("valueMin", e.target.value)}
                  className={CRM_FILTER_INPUT_CLASS}
                  placeholder="Any"
                />
              </CrmFilterField>
              <CrmFilterField label="Max value ($)">
                <input
                  type="number"
                  min={0}
                  value={valueMax}
                  onChange={(e) => filters.setString("valueMax", e.target.value)}
                  className={CRM_FILTER_INPUT_CLASS}
                  placeholder="Any"
                />
              </CrmFilterField>
            </div>
          </CrmAdvancedFiltersPanel>
        </div>

        {filteredDeals.length === 0 ? (
          <EmptyState
            className="mt-6"
            title="No deals yet"
            description="Create a deal to track value, stage, owner, probability, and expected close date."
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className={DASH_TABLE_TH}>Deal</th>
                  <th className={DASH_TABLE_TH}>Client</th>
                  <th className={DASH_TABLE_TH}>Value</th>
                  <th className={DASH_TABLE_TH}>Stage</th>
                  <th className={DASH_TABLE_TH}>Probability</th>
                  <th className={DASH_TABLE_TH}>Close date</th>
                  <th className={DASH_TABLE_TH}>Owner</th>
                  <th className={DASH_TABLE_TH}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((deal) => (
                  <tr key={deal.id} className={DASH_TABLE_ROW}>
                    <td className="px-3 py-3 font-medium text-text-primary">{deal.title}</td>
                    <td className="px-3 py-3 text-text-secondary">{deal.clientName}</td>
                    <td className="px-3 py-3 font-medium tabular-nums text-text-primary">
                      {formatCurrency(deal.value)}
                    </td>
                    <td className="px-3 py-3">
                      <DealStagePill stage={deal.stage} />
                    </td>
                    <td className="px-3 py-3 tabular-nums text-text-secondary">
                      {deal.probability}%
                    </td>
                    <td className="px-3 py-3 text-text-secondary">
                      {toDateLabel(deal.expectedCloseAt)}
                    </td>
                    <td className="px-3 py-3 text-text-secondary">
                      {deal.owner?.name ?? "Unassigned"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={DASH_BTN_TABLE}
                          onClick={() => setNotesFor({ id: deal.id, title: deal.title })}
                        >
                          Notes
                        </button>
                      {!readOnly ? (
                      <>
                        <button
                          type="button"
                          className={DASH_BTN_TABLE}
                          onClick={() => {
                            setEditing(deal);
                            setForm(dealToForm(deal));
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Edit
                        </button>
                        {isAdmin ? (
                          <button
                            type="button"
                            className={DASH_BTN_TABLE_DANGER}
                            onClick={() => handleDelete(deal)}
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
          entityType="deal"
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
