"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import type { BidTableRow } from "@/components/dashboard/bids-types";
import { BID_STATUS_OPTIONS } from "@/components/dashboard/bid-status-badge";
import { modalAnimation } from "@/components/ui/motion";

type EditBidModalProps = {
  bid: BidTableRow | null;
  open: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const inputClass =
  "w-full rounded-lg border border-input-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-secondary/55 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:cursor-not-allowed disabled:bg-bg-secondary disabled:opacity-70";

const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary";

const readOnlyFieldClass =
  "w-full cursor-default rounded-lg border border-input-border bg-bg-secondary/90 px-3 py-2.5 text-sm text-text-primary shadow-inner outline-none";

function formatBidDateDisplay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type CatalogRow = { id: string; name: string; isActive: boolean };

function mergeCatalogRows(rows: CatalogRow[], fallback: { id: string; name: string } | null): CatalogRow[] {
  if (!fallback?.id) return rows;
  if (rows.some((r) => r.id === fallback.id)) return rows;
  return [...rows, { id: fallback.id, name: fallback.name, isActive: false }];
}

function statusSelectOptions(current: string): string[] {
  const base: string[] = [...BID_STATUS_OPTIONS];
  const t = current.trim();
  if (t && !base.includes(t)) base.unshift(t);
  return base;
}

export function EditBidModal({ bid, open, isAdmin, onClose, onSaved }: EditBidModalProps) {
  const titleId = useId();
  const memberNoteId = useId();
  const [mounted, setMounted] = useState(false);

  const [date, setDate] = useState("");
  const [profileId, setProfileId] = useState("");
  const [client, setClient] = useState("");
  const [bidLink, setBidLink] = useState("");
  const [nicheId, setNicheId] = useState("");
  const [status, setStatus] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  const [profiles, setProfiles] = useState<CatalogRow[]>([]);
  const [niches, setNiches] = useState<CatalogRow[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileOpts = useMemo(
    () =>
      bid
        ? mergeCatalogRows(profiles, { id: bid.profileId, name: bid.profileName })
        : profiles,
    [bid, profiles],
  );
  const nicheOpts = useMemo(
    () => (bid ? mergeCatalogRows(niches, { id: bid.nicheId, name: bid.nicheName }) : niches),
    [bid, niches],
  );
  const statusOpts = useMemo(() => (bid ? statusSelectOptions(bid.status) : [...BID_STATUS_OPTIONS]), [bid]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!bid || !open) return;
    setDate(toDateInputValue(bid.date));
    setProfileId(bid.profileId);
    setClient(bid.client);
    setBidLink(bid.bidLink ?? "");
    setNicheId(bid.nicheId);
    setStatus(bid.status);
    setValue(String(bid.value));
    setNotes(bid.notes ?? "");
    setError(null);
  }, [bid, open]);

  useEffect(() => {
    if (!open || !isAdmin) return;
    let cancelled = false;
    setCatalogsLoading(true);
    (async () => {
      try {
        const [pr, nr] = await Promise.all([
          fetch("/api/profiles?includeInactive=1", { credentials: "include" }),
          fetch("/api/niches?includeInactive=1", { credentials: "include" }),
        ]);
        const pj = (await pr.json().catch(() => null)) as { success?: boolean; profiles?: CatalogRow[] } | null;
        const nj = (await nr.json().catch(() => null)) as { success?: boolean; niches?: CatalogRow[] } | null;
        if (cancelled) return;
        if (pr.ok && pj?.success && Array.isArray(pj.profiles)) setProfiles(pj.profiles);
        else setProfiles([]);
        if (nr.ok && nj?.success && Array.isArray(nj.niches)) setNiches(nj.niches);
        else setNiches([]);
      } finally {
        if (!cancelled) setCatalogsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isAdmin]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!bid) return;
    setError(null);

    if (isAdmin) {
      if (!date.trim()) {
        setError("Please choose a date.");
        return;
      }
      if (!client.trim()) {
        setError("Client is required.");
        return;
      }
      const parsedValue =
        value.trim() === "" ? 0 : Number.parseInt(value, 10);
      if (!Number.isFinite(parsedValue) || !Number.isInteger(parsedValue)) {
        setError("Value must be a whole number.");
        return;
      }
      const isoDate = new Date(`${date.trim()}T12:00:00`);
      if (Number.isNaN(isoDate.getTime())) {
        setError("Invalid date.");
        return;
      }

      const payload: Record<string, unknown> = {
        date: isoDate.toISOString(),
        profileId,
        nicheId,
        client: client.trim(),
        status: status.trim(),
        value: parsedValue,
      };
      const link = bidLink.trim();
      payload.bidLink = link.length > 0 ? link : null;
      payload.notes = notes.trim().length > 0 ? notes.trim() : null;

      await sendPut(bid.id, payload);
      return;
    }

    const payload: Record<string, unknown> = {
      status: status.trim(),
      notes: notes.trim().length > 0 ? notes.trim() : null,
    };

    if (!status.trim()) {
      setError("Status is required.");
      return;
    }

    await sendPut(bid.id, payload);
  }

  async function sendPut(id: string, body: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bids/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        errors?: Record<string, string>;
      } | null;

      if (!res.ok) {
        const msg =
          data?.message ??
          (data?.errors ? Object.values(data.errors).join(" ") : null) ??
          "Could not update bid.";
        setError(msg);
        toast.error(msg);
        return;
      }

      toast.success("Bid updated successfully.");
      onSaved?.();
      onClose();
    } catch {
      const msg = "Network error. Try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const selectChevronStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  };

  const modalTree = (
    <AnimatePresence>
      {open && bid ? (
        <motion.div
          role="presentation"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-text-primary/40 p-4 backdrop-blur-[2px] supports-backdrop-filter:bg-text-primary/35"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onPointerDown={(ev) => {
            if (ev.target === ev.currentTarget && !submitting) handleClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={isAdmin ? undefined : memberNoteId}
            className="flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border/90 bg-bg-primary shadow-[0_24px_64px_rgb(0_0_0_/0.14)]"
            initial={modalAnimation.initial}
            animate={modalAnimation.animate}
            exit={modalAnimation.initial}
            transition={modalAnimation.transition}
            onPointerDown={(ev) => ev.stopPropagation()}
          >
            <div className="border-b border-border/80 bg-linear-to-b from-bg-secondary/80 to-bg-primary px-6 py-5 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id={titleId} className="text-lg font-bold tracking-tight text-text-primary">
                    Edit bid
                  </h2>
                  {isAdmin ? (
                    <p className="mt-1 text-sm text-text-secondary">All fields are editable.</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="shrink-0 rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:opacity-50"
                  aria-label="Close"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-7">
                <div className="grid gap-5 sm:grid-cols-2">
                  {!isAdmin ? (
                    <>
                      <p
                        id={memberNoteId}
                        className="sm:col-span-2 rounded-lg border border-info/25 bg-info/8 px-4 py-3 text-sm leading-relaxed text-text-secondary"
                      >
                        <span className="font-semibold text-text-primary">Note:</span> Only status and
                        notes can be updated after a bid is logged.
                      </p>
                      <div className="sm:col-span-1">
                        <span className={labelClass}>Date</span>
                        <div className={readOnlyFieldClass} tabIndex={-1}>
                          {formatBidDateDisplay(bid.date)}
                        </div>
                      </div>
                      <div className="sm:col-span-1">
                        <span className={labelClass}>Profile</span>
                        <div className={readOnlyFieldClass} tabIndex={-1}>
                          {bid.profileName || "—"}
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <span className={labelClass}>Client</span>
                        <div className={readOnlyFieldClass} tabIndex={-1}>
                          {client || "—"}
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <span className={labelClass}>Bid link</span>
                        <div className={`${readOnlyFieldClass} break-all`} tabIndex={-1}>
                          {bidLink.trim() ? (
                            <a
                              href={bidLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-info underline decoration-info/40 underline-offset-2 hover:decoration-info"
                            >
                              {bidLink}
                            </a>
                          ) : (
                            <span className="text-text-secondary">—</span>
                          )}
                        </div>
                      </div>
                      <div className="sm:col-span-1">
                        <span className={labelClass}>Niche</span>
                        <div className={readOnlyFieldClass} tabIndex={-1}>
                          {bid.nicheName || "—"}
                        </div>
                      </div>
                      <div className="sm:col-span-1">
                        <span className={labelClass}>Value</span>
                        <div className={readOnlyFieldClass} tabIndex={-1}>
                          {new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
                            bid.value,
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {catalogsLoading ? (
                        <p className="sm:col-span-2 text-sm text-text-secondary">Loading profiles and niches…</p>
                      ) : null}
                      <div className="sm:col-span-1">
                        <label htmlFor="edit-bid-date" className={labelClass}>
                          Date
                        </label>
                        <input
                          id="edit-bid-date"
                          type="date"
                          required
                          value={date}
                          onChange={(ev) => setDate(ev.target.value)}
                          disabled={submitting}
                          className={inputClass}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label htmlFor="edit-bid-profile" className={labelClass}>
                          Profile
                        </label>
                        <select
                          id="edit-bid-profile"
                          value={profileOpts.some((p) => p.id === profileId) ? profileId : profileOpts[0]?.id ?? ""}
                          onChange={(ev) => setProfileId(ev.target.value)}
                          disabled={submitting || catalogsLoading}
                          className={`${inputClass} cursor-pointer appearance-none bg-size-[1rem] bg-position-[right_0.65rem_center] bg-no-repeat pr-10`}
                          style={selectChevronStyle}
                        >
                          {profileOpts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {!p.isActive ? " (inactive)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="edit-bid-client" className={labelClass}>
                          Client
                        </label>
                        <input
                          id="edit-bid-client"
                          type="text"
                          required
                          value={client}
                          onChange={(ev) => setClient(ev.target.value)}
                          disabled={submitting}
                          className={inputClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="edit-bid-link" className={labelClass}>
                          Bid link
                        </label>
                        <input
                          id="edit-bid-link"
                          type="url"
                          value={bidLink}
                          onChange={(ev) => setBidLink(ev.target.value)}
                          disabled={submitting}
                          className={inputClass}
                          placeholder="https://…"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label htmlFor="edit-bid-niche" className={labelClass}>
                          Niche
                        </label>
                        <select
                          id="edit-bid-niche"
                          value={nicheOpts.some((n) => n.id === nicheId) ? nicheId : nicheOpts[0]?.id ?? ""}
                          onChange={(ev) => setNicheId(ev.target.value)}
                          disabled={submitting || catalogsLoading}
                          className={`${inputClass} cursor-pointer appearance-none bg-size-[1rem] bg-position-[right_0.65rem_center] bg-no-repeat pr-10`}
                          style={selectChevronStyle}
                        >
                          {nicheOpts.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.name}
                              {!n.isActive ? " (inactive)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-1">
                        <label htmlFor="edit-bid-value" className={labelClass}>
                          Value
                        </label>
                        <input
                          id="edit-bid-value"
                          type="number"
                          min={0}
                          step={1}
                          value={value}
                          onChange={(ev) => setValue(ev.target.value)}
                          disabled={submitting}
                          className={inputClass}
                        />
                      </div>
                    </>
                  )}

                  <div className={isAdmin ? "sm:col-span-1" : "sm:col-span-2"}>
                    <label htmlFor="edit-bid-status" className={labelClass}>
                      Status
                    </label>
                    <select
                      id="edit-bid-status"
                      value={statusOpts.includes(status) ? status : statusOpts[0]}
                      onChange={(ev) => setStatus(ev.target.value)}
                      disabled={submitting}
                      className={`${inputClass} cursor-pointer appearance-none bg-size-[1rem] bg-position-[right_0.65rem_center] bg-no-repeat pr-10`}
                      style={selectChevronStyle}
                    >
                      {statusOpts.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="edit-bid-notes" className={labelClass}>
                      Notes
                    </label>
                    <textarea
                      id="edit-bid-notes"
                      rows={3}
                      value={notes}
                      onChange={(ev) => setNotes(ev.target.value)}
                      disabled={submitting}
                      className={`${inputClass} min-h-[88px] resize-y`}
                      placeholder="Optional…"
                    />
                  </div>
                </div>

                {error ? (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger"
                  >
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-border/80 bg-bg-secondary/40 px-6 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-7">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-brand-primary bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:border-brand-hover hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {submitting ? (
                    <>
                      <span
                        className="h-4 w-4 shrink-0 rounded-full border-2 border-white/35 border-t-white motion-safe:animate-spin"
                        aria-hidden
                      />
                      Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(modalTree, document.body);
}
