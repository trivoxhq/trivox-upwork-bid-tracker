"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { modalAnimation } from "@/components/ui/motion";

type CatalogRow = { id: string; name: string; isActive: boolean };

type AddBidModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

const inputClass =
  "w-full rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-secondary/55 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:cursor-not-allowed disabled:bg-bg-secondary disabled:opacity-70";

const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary";

export function AddBidModal({ open, onClose, onCreated }: AddBidModalProps) {
  const titleId = useId();
  const descId = useId();
  const [mounted, setMounted] = useState(false);

  const [date, setDate] = useState("");
  const [profileId, setProfileId] = useState("");
  const [nicheId, setNicheId] = useState("");
  const [client, setClient] = useState("");
  const [bidLink, setBidLink] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  const [profiles, setProfiles] = useState<CatalogRow[]>([]);
  const [niches, setNiches] = useState<CatalogRow[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [catalogsError, setCatalogsError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCatalogsLoading(true);
    setCatalogsError(null);
    (async () => {
      try {
        const [pr, nr] = await Promise.all([
          fetch("/api/profiles", { credentials: "include" }),
          fetch("/api/niches", { credentials: "include" }),
        ]);
        const pj = (await pr.json().catch(() => null)) as {
          success?: boolean;
          profiles?: CatalogRow[];
          message?: string;
        } | null;
        const nj = (await nr.json().catch(() => null)) as {
          success?: boolean;
          niches?: CatalogRow[];
          message?: string;
        } | null;
        if (cancelled) return;
        if (!pr.ok || !pj?.success || !Array.isArray(pj.profiles)) {
          setCatalogsError(pj?.message ?? "Could not load profiles.");
          setProfiles([]);
          setNiches([]);
          return;
        }
        if (!nr.ok || !nj?.success || !Array.isArray(nj.niches)) {
          setCatalogsError(nj?.message ?? "Could not load niches.");
          setProfiles([]);
          setNiches([]);
          return;
        }
        setProfiles(pj.profiles);
        setNiches(nj.niches);
        setProfileId((cur) => {
          if (cur && pj.profiles!.some((p) => p.id === cur)) return cur;
          return pj.profiles![0]?.id ?? "";
        });
        setNicheId((cur) => {
          if (cur && nj.niches!.some((n) => n.id === cur)) return cur;
          return nj.niches![0]?.id ?? "";
        });
      } catch {
        if (!cancelled) {
          setCatalogsError("Network error loading profiles or niches.");
          setProfiles([]);
          setNiches([]);
        }
      } finally {
        if (!cancelled) setCatalogsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function resetForm() {
    setDate("");
    setClient("");
    setBidLink("");
    setValue("");
    setNotes("");
    setError(null);
    setProfileId(profiles[0]?.id ?? "");
    setNicheId(niches[0]?.id ?? "");
  }

  function handleClose() {
    if (submitting) return;
    resetForm();
    onClose();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!date.trim()) {
      setError("Please choose a date.");
      return;
    }
    if (!client.trim()) {
      setError("Client is required.");
      return;
    }
    if (!profileId || !nicheId) {
      setError("Choose an active profile and niche (or reload after an admin adds catalog entries).");
      return;
    }

    const parsedValue = value.trim() === "" ? 0 : Number.parseInt(value, 10);
    if (!Number.isFinite(parsedValue) || !Number.isInteger(parsedValue)) {
      setError("Value must be a whole number.");
      return;
    }

    const isoDate = new Date(`${date.trim()}T12:00:00`);
    if (Number.isNaN(isoDate.getTime())) {
      setError("Invalid date.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        date: isoDate.toISOString(),
        profileId,
        nicheId,
        client: client.trim(),
        value: parsedValue,
      };

      const link = bidLink.trim();
      if (link) payload.bidLink = link;

      const n = notes.trim();
      if (n) payload.notes = n;

      const res = await fetch("/api/bids", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          "Could not create bid.";
        setError(msg);
        toast.error(msg);
        return;
      }

      resetForm();
      toast.success("Bid added successfully.");
      onCreated?.();
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
      {open ? (
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
            aria-describedby={descId}
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
                    Add bid
                  </h2>
                  <p id={descId} className="mt-1 text-sm leading-relaxed text-text-secondary">
                    Log a proposal. Status defaults to{" "}
                    <span className="font-medium text-text-primary">New</span>.
                  </p>
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
                {catalogsLoading ? (
                  <p className="text-sm text-text-secondary" aria-live="polite">
                    Loading profiles and niches…
                  </p>
                ) : catalogsError ? (
                  <p className="text-sm text-danger" role="alert">
                    {catalogsError}
                  </p>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                      <label htmlFor="add-bid-date" className={labelClass}>
                        Date
                      </label>
                      <input
                        id="add-bid-date"
                        type="date"
                        required
                        value={date}
                        onChange={(ev) => setDate(ev.target.value)}
                        disabled={submitting}
                        className={inputClass}
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label htmlFor="add-bid-profile" className={labelClass}>
                        Profile
                      </label>
                      <select
                        id="add-bid-profile"
                        value={profileId}
                        onChange={(ev) => setProfileId(ev.target.value)}
                        disabled={submitting || profiles.length === 0}
                        className={`${inputClass} cursor-pointer appearance-none bg-size-[1rem] bg-position-[right_0.65rem_center] bg-no-repeat pr-10`}
                        style={selectChevronStyle}
                      >
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="add-bid-client" className={labelClass}>
                        Client
                      </label>
                      <input
                        id="add-bid-client"
                        type="text"
                        autoComplete="organization"
                        placeholder="Company or client name"
                        required
                        value={client}
                        onChange={(ev) => setClient(ev.target.value)}
                        disabled={submitting}
                        className={inputClass}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="add-bid-link" className={labelClass}>
                        Bid link
                      </label>
                      <input
                        id="add-bid-link"
                        type="url"
                        inputMode="url"
                        placeholder="https://…"
                        value={bidLink}
                        onChange={(ev) => setBidLink(ev.target.value)}
                        disabled={submitting}
                        className={inputClass}
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label htmlFor="add-bid-niche" className={labelClass}>
                        Niche
                      </label>
                      <select
                        id="add-bid-niche"
                        value={nicheId}
                        onChange={(ev) => setNicheId(ev.target.value)}
                        disabled={submitting || niches.length === 0}
                        className={`${inputClass} cursor-pointer appearance-none bg-size-[1rem] bg-position-[right_0.65rem_center] bg-no-repeat pr-10`}
                        style={selectChevronStyle}
                      >
                        {niches.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-1">
                      <label htmlFor="add-bid-value" className={labelClass}>
                        Value
                      </label>
                      <input
                        id="add-bid-value"
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        min={0}
                        step={1}
                        value={value}
                        onChange={(ev) => setValue(ev.target.value)}
                        disabled={submitting}
                        className={inputClass}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="add-bid-notes" className={labelClass}>
                        Notes
                      </label>
                      <textarea
                        id="add-bid-notes"
                        rows={3}
                        placeholder="Optional context for your team…"
                        value={notes}
                        onChange={(ev) => setNotes(ev.target.value)}
                        disabled={submitting}
                        className={`${inputClass} min-h-[88px] resize-y`}
                      />
                    </div>
                  </div>
                )}

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
                  disabled={submitting || catalogsLoading || Boolean(catalogsError) || !profiles.length || !niches.length}
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
                    "Save bid"
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
