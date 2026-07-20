"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useId, useState } from "react";
import toast from "react-hot-toast";
import {
  DASH_BTN_TABLE,
  DASH_FILTER_BAR,
  DASH_MODAL_PANEL,
  DASH_SECTION_TITLE,
  DASH_TABLE_ROW,
  DASH_TABLE_TH,
  DASH_TRANSITION,
} from "@/components/dashboard/dashboard-classes";
import { modalAnimation } from "@/components/ui/motion";
import Button from "@/components/ui/button";
import {
  currentMonthKey,
  formatMinutesLabel,
  type MonthlyUserSummary,
} from "@/lib/attendance/monthly-summary";
import {
  downloadTeamSalaryPdf,
  downloadUserSalaryPdf,
} from "@/lib/attendance/salary-pdf";

type SummaryResponse = {
  success?: boolean;
  month?: string;
  monthLabel?: string;
  users?: MonthlyUserSummary[];
  totals?: {
    members: number;
    daysAttended: number;
    totalSalary: number;
    totalWorkingMinutes: number;
  };
  message?: string;
};

function money(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function dayTypeLabel(dayType: string | null, status: string): string {
  if (status === "open") return "Open";
  if (dayType === "half_day") return "Half-Day Check-Out";
  if (dayType === "full_day") return "Check Out";
  return dayType?.replace("_", " ") ?? status;
}

export function AttendanceMonthlySummary() {
  const titleId = useId();
  const [month, setMonth] = useState(currentMonthKey);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<MonthlyUserSummary[]>([]);
  const [monthLabel, setMonthLabel] = useState("");
  const [totals, setTotals] = useState<SummaryResponse["totals"]>(undefined);
  const [selected, setSelected] = useState<MonthlyUserSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/summary?month=${encodeURIComponent(month)}`, {
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as SummaryResponse | null;
      if (!res.ok || !json?.success) {
        toast.error(json?.message ?? "Could not load monthly summary.");
        setUsers([]);
        setTotals(undefined);
        return;
      }
      setUsers(json.users ?? []);
      setMonthLabel(json.monthLabel ?? month);
      setTotals(json.totals);
    } catch {
      toast.error("Network error.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  function downloadTeamPdf() {
    if (users.length === 0) {
      toast.error("No data to export.");
      return;
    }
    try {
      downloadTeamSalaryPdf({
        monthLabel: monthLabel || month,
        users,
        totalSalary: totals?.totalSalary ?? 0,
      });
      toast.success("PDF downloaded.");
    } catch {
      toast.error("Could not generate PDF.");
    }
  }

  function downloadSelectedPdf() {
    if (!selected) return;
    try {
      downloadUserSalaryPdf({
        monthLabel: monthLabel || month,
        user: selected,
      });
      toast.success("PDF downloaded.");
    } catch {
      toast.error("Could not generate PDF.");
    }
  }

  return (
    <>
      <section className="mt-8">
        <div className={`${DASH_FILTER_BAR} flex flex-wrap items-end justify-between gap-3`}>
          <div className="min-w-0">
            <h2 className={DASH_SECTION_TITLE}>Monthly attendance & salary</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Days attended per member. Open the table to review each day; export a salary PDF.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
              Month
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="mt-1 block rounded-lg border border-input-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
              />
            </label>
            <Button type="button" onClick={downloadTeamPdf}>
              Download salary PDF
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-text-secondary">Loading summary…</p>
        ) : users.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">No members or records for this month.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/80 bg-bg-primary shadow-sm">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-secondary/60">
                  <th className={DASH_TABLE_TH}>Member</th>
                  <th className={`text-right ${DASH_TABLE_TH}`}>Days</th>
                  <th className={`text-right ${DASH_TABLE_TH}`}>Full</th>
                  <th className={`text-right ${DASH_TABLE_TH}`}>Half</th>
                  <th className={`text-right ${DASH_TABLE_TH}`}>Worked</th>
                  <th className={`text-right ${DASH_TABLE_TH}`}>Pay</th>
                  <th className={`text-right ${DASH_TABLE_TH}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {users.map((u) => (
                  <tr key={u.userId} className={DASH_TABLE_ROW}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{u.name}</p>
                      <p className="text-xs text-text-secondary">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-text-primary">
                      {u.daysAttended}
                      {u.openDays > 0 ? (
                        <span className="ml-1 text-xs font-normal text-text-secondary">
                          (+{u.openDays} open)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.fullDays}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.halfDays}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMinutesLabel(u.totalWorkingMinutes)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {money(u.totalSalary)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          className={DASH_BTN_TABLE}
                          onClick={() => setSelected(u)}
                        >
                          Days
                        </button>
                        <button
                          type="button"
                          className={DASH_BTN_TABLE}
                          onClick={() => {
                            try {
                              downloadUserSalaryPdf({
                                monthLabel: monthLabel || month,
                                user: u,
                              });
                              toast.success("PDF downloaded.");
                            } catch {
                              toast.error("Could not generate PDF.");
                            }
                          }}
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {totals ? (
                <tfoot>
                  <tr className="border-t border-border bg-bg-secondary/40">
                    <td className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
                      Team total
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {totals.daysAttended}
                    </td>
                    <td className="px-4 py-3" colSpan={2} />
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMinutesLabel(totals.totalWorkingMinutes)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {money(totals.totalSalary)}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        )}
      </section>

      <AnimatePresence>
        {selected ? (
          <motion.div
            role="presentation"
            className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4 backdrop-blur-[2px] supports-backdrop-filter:bg-text-primary/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onPointerDown={(ev) => {
              if (ev.target === ev.currentTarget) setSelected(null);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={`max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border/90 bg-bg-primary p-5 sm:p-6 ${DASH_MODAL_PANEL}`}
              initial={modalAnimation.initial}
              animate={modalAnimation.animate}
              exit={modalAnimation.initial}
              transition={modalAnimation.transition}
              onPointerDown={(ev) => ev.stopPropagation()}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
                <div className="min-w-0">
                  <p className={DASH_SECTION_TITLE}>Days attended</p>
                  <h2
                    id={titleId}
                    className="mt-1.5 text-lg font-semibold tracking-tight text-text-primary"
                  >
                    {selected.name}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {monthLabel} · {selected.daysAttended} day
                    {selected.daysAttended === 1 ? "" : "s"} · Pay {money(selected.totalSalary)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={downloadSelectedPdf}>
                    Download PDF
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className={`inline-flex min-h-[40px] items-center justify-center rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm font-semibold text-text-primary hover:bg-bg-secondary ${DASH_TRANSITION}`}
                  >
                    Close
                  </button>
                </div>
              </div>

              {selected.days.length === 0 ? (
                <p className="mt-5 text-sm text-text-secondary">No attendance days this month.</p>
              ) : (
                <div className="mt-5 overflow-x-auto rounded-xl border border-border/80">
                  <table className="min-w-[640px] w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-bg-secondary/60">
                        <th className={DASH_TABLE_TH}>Date</th>
                        <th className={DASH_TABLE_TH}>In</th>
                        <th className={DASH_TABLE_TH}>Out</th>
                        <th className={DASH_TABLE_TH}>Work</th>
                        <th className={DASH_TABLE_TH}>Break</th>
                        <th className={DASH_TABLE_TH}>Type</th>
                        <th className={`text-right ${DASH_TABLE_TH}`}>Pay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {selected.days.map((d) => (
                        <tr key={d.id} className={DASH_TABLE_ROW}>
                          <td className="px-4 py-2.5 tabular-nums">{d.workDate}</td>
                          <td className="px-4 py-2.5 text-xs">
                            {new Date(d.checkInAt).toLocaleTimeString(undefined, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-2.5 text-xs">
                            {d.checkOutAt
                              ? new Date(d.checkOutAt).toLocaleTimeString(undefined, {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums">
                            {formatMinutesLabel(d.workingMinutes)}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums">
                            {formatMinutesLabel(d.breakMinutes)}
                          </td>
                          <td className="px-4 py-2.5 capitalize">
                            {dayTypeLabel(d.dayType, d.status)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {d.salaryAmount != null ? money(d.salaryAmount) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
