"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  DASH_BTN_TABLE,
  DASH_BTN_TABLE_DANGER,
  DASH_FILTER_BAR,
  DASH_SECTION_GAP,
  DASH_SECTION_TITLE,
  DASH_TABLE_ROW,
  DASH_TABLE_TH,
} from "@/components/dashboard/dashboard-classes";
import { DashboardAddBidTrigger } from "@/components/dashboard/dashboard-add-bid-trigger";
import { BID_STATUS_OPTIONS, BidStatusBadge } from "@/components/dashboard/bid-status-badge";
import { BidsTableRowsSkeleton } from "@/components/dashboard/dashboard-skeletons";
import type { BidTableRow } from "@/components/dashboard/bids-types";
import { EditBidModal } from "@/components/dashboard/edit-bid-modal";
import { CrmImportExportToolbar } from "@/components/dashboard/crm-import-export-toolbar";
import { CrmNotesPanel } from "@/components/dashboard/crm-notes-panel";
import {
  CrmAdvancedFiltersPanel,
  CrmFilterField,
  CrmFilterToolbar,
  CRM_FILTER_INPUT_CLASS,
  CrmOwnerSelect,
} from "@/components/dashboard/crm-advanced-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { useStatsPoll } from "@/hooks/use-stats-poll";
import { useCrmFilterParams } from "@/hooks/use-crm-filter-params";
import {
  matchDateRange,
  matchNumericRange,
  matchOwnerFilter,
  matchTextSearch,
} from "@/lib/filters/helpers";

function formatTableDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}/${dd}`;
}

function safeUpworkJobHref(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

function formatValue(n: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(n);
}

export function BidsTable(props: {
  bids: BidTableRow[];
  isAdmin: boolean;
  readOnly?: boolean;
  showAddedBy?: boolean;
  canDelete?: boolean;
  currentUserId?: string;
  canDeleteNotes?: boolean;
  tableHeading?: string;
  sectionGapClassName?: string;
}) {
  return (
    <Suspense fallback={<BidsTableRowsSkeleton />}>
      <BidsTableInner {...props} />
    </Suspense>
  );
}

function BidsTableInner({
  bids,
  isAdmin,
  readOnly = false,
  showAddedBy = false,
  canDelete = false,
  currentUserId = "",
  canDeleteNotes = false,
  tableHeading = "Bids",
  sectionGapClassName = DASH_SECTION_GAP,
}: {
  bids: BidTableRow[];
  isAdmin: boolean;
  readOnly?: boolean;
  showAddedBy?: boolean;
  canDelete?: boolean;
  currentUserId?: string;
  canDeleteNotes?: boolean;
  tableHeading?: string;
  sectionGapClassName?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<BidTableRow | null>(null);
  const [notesFor, setNotesFor] = useState<{ id: string; title: string } | null>(null);

  const filters = useCrmFilterParams({
    stringKeys: [
      "q",
      "status",
      "profile",
      "niche",
      "dateFrom",
      "dateTo",
      "addedBy",
      "valueMin",
      "valueMax",
    ],
  });

  const statusFilter = filters.getString("status");
  const profileFilter = filters.getString("profile");
  const nicheFilter = filters.getString("niche");
  const dateFrom = filters.getString("dateFrom");
  const dateTo = filters.getString("dateTo");
  const search = filters.getString("q");
  const addedByFilter = filters.getString("addedBy");
  const valueMin = filters.getString("valueMin");
  const valueMax = filters.getString("valueMax");

  const statusOptions = useMemo(
    () => Array.from(new Set(bids.map((b) => b.status.trim()).filter(Boolean))).sort(),
    [bids],
  );
  const profileOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bids) {
      if (b.profileId) map.set(b.profileId, b.profileName);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bids]);
  const nicheOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bids) {
      if (b.nicheId) map.set(b.nicheId, b.nicheName);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bids]);

  const addedByOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bids) {
      map.set(b.addedById, b.addedBy.name);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bids]);

  const filteredBids = useMemo(() => {
    return bids.filter((bid) => {
      if (statusFilter && bid.status !== statusFilter) return false;
      if (profileFilter && bid.profileId !== profileFilter) return false;
      if (nicheFilter && bid.nicheId !== nicheFilter) return false;
      if (!matchOwnerFilter(bid.addedById, addedByFilter)) return false;
      if (!matchNumericRange(bid.value, valueMin, valueMax)) return false;
      if (!matchDateRange(bid.date, dateFrom, dateTo)) return false;
      if (
        !matchTextSearch(search, [
          bid.client,
          bid.notes,
          bid.bidLink,
          bid.profileName,
          bid.nicheName,
          bid.addedBy.name,
        ])
      ) {
        return false;
      }
      return true;
    });
  }, [
    addedByFilter,
    bids,
    dateFrom,
    dateTo,
    nicheFilter,
    profileFilter,
    search,
    statusFilter,
    valueMax,
    valueMin,
  ]);

  useStatsPoll(() => {
    router.refresh();
  });

  async function handleDelete(bid: BidTableRow) {
    if (!canDelete) return;
    const ok = window.confirm(
      `Delete this bid for “${bid.client}”? This cannot be undone.`,
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/bids/${bid.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        toast.error(data?.message ?? "Could not delete bid.");
        return;
      }
      toast.success("Bid deleted successfully.");
      router.refresh();
    } catch {
      toast.error("Network error. Try again.");
    }
  }

  return (
    <>
      <section className={`${sectionGapClassName} w-full`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className={DASH_SECTION_TITLE}>{tableHeading}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-medium tracking-wide text-text-secondary">
              {filteredBids.length} / {bids.length} bids
            </p>
            <CrmImportExportToolbar entity="bids" readOnly={readOnly} />
            <CrmFilterToolbar
              activeCount={filters.activeCount}
              advancedOpen={filters.advancedOpen}
              onToggleAdvanced={() => filters.setAdvancedOpen((open) => !open)}
              onReset={filters.resetAll}
            />
          </div>
        </div>

        {bids.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No bids yet"
            description="Start by adding your first bid"
            action={
              readOnly ? undefined : (
                <DashboardAddBidTrigger label="+ Add Bid" className="px-4 py-2" />
              )
            }
          />
        ) : (
          <div className="mt-4 space-y-3">
            <div
              className={`flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
              role="tablist"
              aria-label="Filter by status"
            >
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === ""}
                onClick={() => filters.setString("status", "")}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-[background-color,color,border-color] duration-200 sm:text-sm ${
                  statusFilter === ""
                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary ring-2 ring-brand-primary/15"
                    : "border-border bg-bg-primary text-text-secondary hover:bg-bg-secondary"
                }`}
              >
                All
              </button>
              {BID_STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === status}
                  onClick={() => filters.setString("status", status)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-[background-color,color,border-color] duration-200 sm:text-sm ${
                    statusFilter === status
                      ? "border-brand-primary bg-brand-primary/10 text-brand-primary ring-2 ring-brand-primary/15"
                      : "border-border bg-bg-primary text-text-secondary hover:bg-bg-secondary"
                  }`}
                >
                  {status}
                </button>
              ))}
              {statusOptions
                .filter((s) => !(BID_STATUS_OPTIONS as readonly string[]).includes(s))
                .map((status) => (
                  <button
                    key={`extra-${status}`}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === status}
                    onClick={() => filters.setString("status", status)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-[background-color,color,border-color] duration-200 sm:text-sm ${
                      statusFilter === status
                        ? "border-brand-primary bg-brand-primary/10 text-brand-primary ring-2 ring-brand-primary/15"
                        : "border-border bg-bg-primary text-text-secondary hover:bg-bg-secondary"
                    }`}
                  >
                    {status}
                  </button>
                ))}
            </div>

            <div className={DASH_FILTER_BAR}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => filters.setString("q", e.target.value)}
                  placeholder="Search client, notes, link..."
                  className={CRM_FILTER_INPUT_CLASS}
                />
                <select
                  value={profileFilter}
                  onChange={(e) => filters.setString("profile", e.target.value)}
                  className={CRM_FILTER_INPUT_CLASS}
                >
                  <option value="">All profiles</option>
                  {profileOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
                <select
                  value={nicheFilter}
                  onChange={(e) => filters.setString("niche", e.target.value)}
                  className={CRM_FILTER_INPUT_CLASS}
                >
                  <option value="">All niches</option>
                  {nicheOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => filters.setString("dateFrom", e.target.value)}
                  className={CRM_FILTER_INPUT_CLASS}
                  aria-label="Date from"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => filters.setString("dateTo", e.target.value)}
                  className={CRM_FILTER_INPUT_CLASS}
                  aria-label="Date to"
                />
              </div>

              <CrmAdvancedFiltersPanel open={filters.advancedOpen}>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {showAddedBy ? (
                    <CrmFilterField label="Added by">
                      <CrmOwnerSelect
                        value={addedByFilter}
                        onChange={(value) => filters.setString("addedBy", value)}
                        users={addedByOptions}
                        includeUnassigned={false}
                        placeholder="All members"
                      />
                    </CrmFilterField>
                  ) : null}
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

            {filteredBids.length === 0 ? (
              <EmptyState title="No bids match current filters" description="Try adjusting or resetting filters." />
            ) : (
              <div className="min-w-0 overflow-x-auto overscroll-x-contain rounded-xl border border-border/80 bg-bg-primary shadow-sm [-webkit-overflow-scrolling:touch] touch-pan-x">
                <table className="min-w-[1280px] w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-secondary/60">
                      <th className={`whitespace-nowrap ${DASH_TABLE_TH}`}>Date</th>
                      <th className={`whitespace-nowrap ${DASH_TABLE_TH}`}>Karachi</th>
                      <th className={`whitespace-nowrap ${DASH_TABLE_TH}`}>EST</th>
                      <th className={`whitespace-nowrap ${DASH_TABLE_TH}`}>Since prev</th>
                      {showAddedBy ? (
                        <th className={`whitespace-nowrap ${DASH_TABLE_TH}`}>By</th>
                      ) : null}
                      <th className={`whitespace-nowrap ${DASH_TABLE_TH}`}>Profile</th>
                      <th className={`min-w-[140px] ${DASH_TABLE_TH}`}>Client</th>
                      <th className={`whitespace-nowrap ${DASH_TABLE_TH}`}>Niche</th>
                      <th className={`whitespace-nowrap ${DASH_TABLE_TH}`}>Status</th>
                      <th className={`whitespace-nowrap text-right ${DASH_TABLE_TH}`}>Value</th>
                      <th className={`whitespace-nowrap text-right ${DASH_TABLE_TH}`}>Connects</th>
                      <th className={`whitespace-nowrap text-right ${DASH_TABLE_TH}`}>Boost</th>
                      <th className={`whitespace-nowrap text-right ${DASH_TABLE_TH}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/80">
                    {filteredBids.map((bid) => (
                      <tr key={bid.id} className={DASH_TABLE_ROW}>
                        <td className="whitespace-nowrap px-4 py-3 text-text-primary tabular-nums">
                          {formatTableDate(bid.date)}
                        </td>
                        <td
                          className="whitespace-nowrap px-4 py-3 text-text-secondary text-xs"
                          title={bid.karachiTime}
                        >
                          {bid.karachiTime}
                        </td>
                        <td
                          className="whitespace-nowrap px-4 py-3 text-text-secondary text-xs"
                          title={bid.estTime}
                        >
                          {bid.estTime}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-text-secondary tabular-nums text-xs">
                          {bid.timeSincePrev ?? "—"}
                        </td>
                        {showAddedBy ? (
                          <td
                            className="max-w-[140px] truncate px-4 py-3 text-text-primary"
                            title={bid.addedBy.name}
                          >
                            {bid.addedBy.name}
                          </td>
                        ) : null}
                        <td className="whitespace-nowrap px-4 py-3 text-text-primary">{bid.profileName}</td>
                        <td className="max-w-[200px] px-4 py-3 font-medium">
                          {(() => {
                            const href = safeUpworkJobHref(bid.bidLink);
                            if (href) {
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block truncate text-info underline decoration-info/35 underline-offset-2 hover:decoration-info"
                                  title={`${bid.client} — open job`}
                                >
                                  {bid.client}
                                </a>
                              );
                            }
                            return (
                              <span className="block truncate text-text-primary" title={bid.client}>
                                {bid.client}
                              </span>
                            );
                          })()}
                        </td>
                        <td
                          className="max-w-[160px] truncate px-4 py-3 text-text-secondary"
                          title={bid.nicheName}
                        >
                          {bid.nicheName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <BidStatusBadge status={bid.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-text-primary">
                          {formatValue(bid.value)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-text-primary">
                          {bid.connects}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-text-primary">
                          {bid.boost > 0 ? bid.boost : "—"}
                        </td>
                        <td className="max-w-40 px-4 py-3 text-right sm:max-w-none">
                          <div className="flex flex-col gap-2 sm:inline-flex sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-end">
                            <button
                              type="button"
                              className={DASH_BTN_TABLE}
                              onClick={() =>
                                setNotesFor({ id: bid.id, title: bid.client })
                              }
                            >
                              Notes
                            </button>
                            {!readOnly ? (
                              <>
                            {bid.memberEditLocked && !isAdmin ? (
                              <button
                                type="button"
                                disabled
                                title="Members can add bids only. Ask an admin or manager to edit this bid."
                                className={DASH_BTN_TABLE}
                              >
                                Admin only
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditing(bid)}
                                className={DASH_BTN_TABLE}
                              >
                                Edit
                              </button>
                            )}
                            {canDelete ? (
                              <button
                                type="button"
                                onClick={() => void handleDelete(bid)}
                                className={DASH_BTN_TABLE_DANGER}
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
          </div>
        )}
      </section>

      {notesFor && currentUserId ? (
        <CrmNotesPanel
          className="mt-6"
          entityType="bid"
          entityId={notesFor.id}
          entityTitle={notesFor.title}
          readOnly={readOnly}
          canDelete={canDeleteNotes}
          currentUserId={currentUserId}
          onClose={() => setNotesFor(null)}
        />
      ) : null}

      <EditBidModal
        bid={editing}
        open={editing !== null}
        isAdmin={isAdmin}
        onClose={() => setEditing(null)}
        onSaved={() => router.refresh()}
      />
    </>
  );
}

export function BidsTableSkeleton() {
  return (
    <section className="mt-10 w-full" aria-busy="true">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className={DASH_SECTION_TITLE}>Bids</h2>
      </div>
      <BidsTableRowsSkeleton rows={6} />
    </section>
  );
}
