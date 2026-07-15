"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  DASH_SECTION_TITLE,
  DASH_TABLE_ROW,
  DASH_TABLE_TH,
} from "@/components/dashboard/dashboard-classes";

type Row = {
  id: string;
  workDate: string;
  checkInAt: string;
  checkOutAt: string | null;
  workingLabel: string;
  breakLabel: string;
  salaryAmount: number | null;
  dayType: string | null;
  status: string;
  checkInIp: string;
  user?: { name: string };
};

export function AttendanceHistory({ team = false }: { team?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?limit=60`, { credentials: "include" });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        records?: Row[];
        message?: string;
      } | null;
      if (!res.ok || !json?.success) {
        toast.error(json?.message ?? "Could not load history.");
        setRows([]);
        return;
      }
      setRows(json.records ?? []);
    } catch {
      toast.error("Network error.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mt-8">
      <h2 className={DASH_SECTION_TITLE}>{team ? "Team attendance" : "History"}</h2>
      {loading ? (
        <p className="mt-3 text-sm text-text-secondary">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">No attendance records yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border/80">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary/60">
                <th className={DASH_TABLE_TH}>Date</th>
                {team ? <th className={DASH_TABLE_TH}>Member</th> : null}
                <th className={DASH_TABLE_TH}>In</th>
                <th className={DASH_TABLE_TH}>Out</th>
                <th className={DASH_TABLE_TH}>Work</th>
                <th className={DASH_TABLE_TH}>Break</th>
                <th className={DASH_TABLE_TH}>Type</th>
                <th className={DASH_TABLE_TH}>Salary</th>
                <th className={DASH_TABLE_TH}>IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {rows.map((r) => (
                <tr key={r.id} className={DASH_TABLE_ROW}>
                  <td className="px-4 py-3 tabular-nums">{r.workDate}</td>
                  {team ? <td className="px-4 py-3">{r.user?.name ?? "—"}</td> : null}
                  <td className="px-4 py-3 text-xs">{new Date(r.checkInAt).toLocaleTimeString()}</td>
                  <td className="px-4 py-3 text-xs">
                    {r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString() : "—"}
                  </td>
                  <td className="px-4 py-3">{r.workingLabel}</td>
                  <td className="px-4 py-3">{r.breakLabel}</td>
                  <td className="px-4 py-3 capitalize">
                    {r.dayType?.replace("_", " ") ?? r.status}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {r.salaryAmount != null ? `$${r.salaryAmount}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{r.checkInIp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
