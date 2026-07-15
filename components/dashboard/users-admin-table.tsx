"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useCallback, useEffect, useId, useState } from "react";
import {
  DASH_BTN_TABLE,
  DASH_FILTER_BAR,
  DASH_MODAL_PANEL,
  DASH_SECTION_TITLE,
  DASH_TABLE_ROW,
  DASH_TABLE_TH,
  DASH_TRANSITION,
} from "@/components/dashboard/dashboard-classes";
import type { AdminUserRow } from "@/components/dashboard/users-admin-types";
import { ASSIGNABLE_ROLES, isValidRole, roleLabel } from "@/lib/auth/roles";
import Button from "@/components/ui/button";
import { modalAnimation } from "@/components/ui/motion";
import toast from "react-hot-toast";

function formatMoney(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const second =
    parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : (parts[0]?.[1] ?? "");
  return `${first}${second}`.toUpperCase() || "?";
}

function isAdminUserRow(value: unknown): value is AdminUserRow {
  if (value === null || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.email === "string" &&
    typeof o.name === "string" &&
    typeof o.role === "string" &&
    isValidRole(o.role) &&
    typeof o.dailyTarget === "number" &&
    typeof o.weeklyTarget === "number" &&
    typeof o.monthlyTarget === "number" &&
    typeof o.hourlyRate === "number" &&
    typeof o.monthlySalary === "number" &&
    typeof o.isActive === "boolean" &&
    typeof o.createdAt === "string"
  );
}

const inputClass =
  "w-full rounded-lg border border-input-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15";

const labelClass = `mb-1.5 block ${DASH_SECTION_TITLE}`;

export function UsersAdminTable({ currentUserId }: { currentUserId: string }) {
  const titleId = useId();
  const passwordTitleId = useId();
  const addMemberTitleId = useId();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [editKind, setEditKind] = useState<"targets" | "salary" | null>(null);
  const [dailyStr, setDailyStr] = useState("");
  const [weeklyStr, setWeeklyStr] = useState("");
  const [monthlyStr, setMonthlyStr] = useState("");
  const [monthlySalaryStr, setMonthlySalaryStr] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [savingTargets, setSavingTargets] = useState(false);

  const [busyActiveId, setBusyActiveId] = useState<string | null>(null);
  const [busyRoleId, setBusyRoleId] = useState<string | null>(null);

  const [passwordFor, setPasswordFor] = useState<AdminUserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<AdminUserRow["role"]>("sales_member");
  const [addFieldErrors, setAddFieldErrors] = useState<Record<string, string>>({});
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [savingAdd, setSavingAdd] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        users?: unknown;
        message?: string;
      } | null;

      if (!res.ok) {
        setListError(data?.message ?? "Could not load users.");
        setUsers([]);
        return;
      }

      const raw = data?.users;
      if (!Array.isArray(raw) || !raw.every(isAdminUserRow)) {
        setListError("Invalid users response.");
        setUsers([]);
        return;
      }

      setUsers(raw);
    } catch {
      setListError("Network error.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function openEditTargets(user: AdminUserRow) {
    setEditing(user);
    setEditKind("targets");
    setDailyStr(String(user.dailyTarget));
    setWeeklyStr(String(user.weeklyTarget));
    setMonthlyStr(String(user.monthlyTarget));
    setModalError(null);
  }

  function openEditSalary(user: AdminUserRow) {
    setEditing(user);
    setEditKind("salary");
    setMonthlySalaryStr(String(user.monthlySalary));
    setModalError(null);
  }

  const closeModal = useCallback(() => {
    if (savingTargets) return;
    setEditing(null);
    setEditKind(null);
    setModalError(null);
  }, [savingTargets]);

  function openPasswordModal(user: AdminUserRow) {
    setPasswordFor(user);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
  }

  const closePasswordModal = useCallback(() => {
    if (savingPassword) return;
    setPasswordFor(null);
    setPasswordError(null);
  }, [savingPassword]);

  const openAddMember = useCallback(() => {
    setAddName("");
    setAddEmail("");
    setAddPassword("");
    setAddRole("sales_member");
    setAddFieldErrors({});
    setAddFormError(null);
    setAddOpen(true);
  }, []);

  const closeAddMember = useCallback(() => {
    if (savingAdd) return;
    setAddOpen(false);
    setAddFieldErrors({});
    setAddFormError(null);
  }, [savingAdd]);

  async function submitAddMember(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddFieldErrors({});
    setAddFormError(null);

    setSavingAdd(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          email: addEmail.trim().toLowerCase(),
          password: addPassword,
          role: addRole,
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        user?: unknown;
        message?: string;
        errors?: Record<string, string>;
      } | null;

      if (!res.ok) {
        if (data?.errors && typeof data.errors === "object") {
          setAddFieldErrors(data.errors);
        }
        setAddFormError(data?.message ?? "Could not create user.");
        return;
      }

      if (!data?.user || !isAdminUserRow(data.user)) {
        setAddFormError("Invalid response.");
        return;
      }

      toast.success(`${data.user.name} has been added.`);
      setAddOpen(false);
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      setAddRole("sales_member");
      await loadUsers();
    } catch {
      setAddFormError("Network error.");
    } finally {
      setSavingAdd(false);
    }
  }

  async function submitPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!passwordFor) return;

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);

    try {
      const res = await fetch(`/api/users/${passwordFor.id}/password`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!res.ok) {
        setPasswordError(data?.message ?? "Could not update password.");
        return;
      }

      toast.success(`Password updated for ${passwordFor.name}.`);
      setPasswordFor(null);
      setPasswordError(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Network error.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function saveUserTargetsPayload(payload: {
    dailyTarget: number;
    weeklyTarget: number;
    monthlyTarget: number;
    monthlySalary: number;
  }) {
    if (!editing) return;
    setSavingTargets(true);
    try {
      const res = await fetch(`/api/users/${editing.id}/targets`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        user?: unknown;
        message?: string;
        errors?: Record<string, string>;
      } | null;

      if (!res.ok) {
        const msg =
          data?.message ??
          (data?.errors ? Object.values(data.errors).join(" ") : null) ??
          "Could not save.";
        setModalError(msg);
        return;
      }

      if (!data?.user || !isAdminUserRow(data.user)) {
        setModalError("Invalid response.");
        return;
      }

      const updated = data.user;
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditing(null);
      setEditKind(null);
      setModalError(null);
      toast.success(editKind === "salary" ? "Monthly salary updated." : "Targets updated.");
    } catch {
      setModalError("Network error.");
    } finally {
      setSavingTargets(false);
    }
  }

  async function submitTargets(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setModalError(null);

    const daily = Number.parseInt(dailyStr, 10);
    const weekly = Number.parseInt(weeklyStr, 10);
    const monthly = Number.parseInt(monthlyStr, 10);
    if (!Number.isFinite(daily) || !Number.isInteger(daily) || daily < 0) {
      setModalError("Daily target must be a whole number ≥ 0.");
      return;
    }
    if (!Number.isFinite(weekly) || !Number.isInteger(weekly) || weekly < 0) {
      setModalError("Weekly target must be a whole number ≥ 0.");
      return;
    }
    if (!Number.isFinite(monthly) || !Number.isInteger(monthly) || monthly < 0) {
      setModalError("Monthly target must be a whole number ≥ 0.");
      return;
    }

    await saveUserTargetsPayload({
      dailyTarget: daily,
      weeklyTarget: weekly,
      monthlyTarget: monthly,
      monthlySalary: editing.monthlySalary,
    });
  }

  async function submitSalary(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setModalError(null);

    const monthlySalary = Number.parseInt(monthlySalaryStr, 10);
    if (!Number.isFinite(monthlySalary) || !Number.isInteger(monthlySalary) || monthlySalary < 0) {
      setModalError("Monthly salary must be a whole number ≥ 0.");
      return;
    }

    await saveUserTargetsPayload({
      dailyTarget: editing.dailyTarget,
      weeklyTarget: editing.weeklyTarget,
      monthlyTarget: editing.monthlyTarget,
      monthlySalary,
    });
  }

  async function patchActive(user: AdminUserRow, nextActive: boolean) {
    if (!nextActive && user.id === currentUserId) {
      return;
    }
    if (
      !nextActive &&
      user.id !== currentUserId &&
      !window.confirm(`Deactivate ${user.name}? They will not be able to sign in.`)
    ) {
      return;
    }

    setBusyActiveId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}/active`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        user?: unknown;
        message?: string;
      } | null;

      if (!res.ok) {
        window.alert(data?.message ?? "Could not update account status.");
        return;
      }

      if (!data?.user || !isAdminUserRow(data.user)) {
        window.alert("Invalid response.");
        return;
      }

      const updated = data.user;
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch {
      window.alert("Network error.");
    } finally {
      setBusyActiveId(null);
    }
  }

  async function patchRole(user: AdminUserRow, nextRole: AdminUserRow["role"]) {
    if (user.role === nextRole) return;
    if (user.id === currentUserId) return;

    setBusyRoleId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}/role`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        user?: unknown;
        message?: string;
      } | null;

      if (!res.ok) {
        window.alert(data?.message ?? "Could not update role.");
        return;
      }

      if (!data?.user || !isAdminUserRow(data.user)) {
        window.alert("Invalid response.");
        return;
      }

      const updated = data.user;
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(`${updated.name} is now ${roleLabel(updated.role)}.`);
    } catch {
      window.alert("Network error.");
    } finally {
      setBusyRoleId(null);
    }
  }

  useEffect(() => {
    if (!editing) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !savingTargets) closeModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, savingTargets, closeModal]);

  useEffect(() => {
    if (!passwordFor) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !savingPassword) closePasswordModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [passwordFor, savingPassword, closePasswordModal]);

  useEffect(() => {
    if (!addOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !savingAdd) closeAddMember();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen, savingAdd, closeAddMember]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className={`${DASH_FILTER_BAR} flex items-center justify-between gap-3`}>
          <div className="h-4 w-36 animate-pulse rounded bg-bg-secondary" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-bg-secondary" />
        </div>
        <div className="overflow-hidden rounded-xl border border-border/80 bg-bg-primary shadow-sm">
          <div className="h-12 border-b border-border bg-bg-secondary/50" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-border/60 px-4 py-4 last:border-0"
            >
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-md bg-bg-secondary" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-40 max-w-full animate-pulse rounded bg-bg-secondary" />
                <div className="h-3 w-56 max-w-full animate-pulse rounded bg-bg-secondary/80" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (listError) {
    return (
      <div
        className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger shadow-sm"
        role="alert"
      >
        {listError}
      </div>
    );
  }

  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <>
      <div className={`${DASH_FILTER_BAR} flex flex-wrap items-center justify-between gap-3`}>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">
            {users.length} {users.length === 1 ? "member" : "members"}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {activeCount} active · {users.length - activeCount} inactive
          </p>
        </div>
        <Button type="button" onClick={openAddMember}>
          Add member
        </Button>
      </div>

      <div className="mt-4 min-w-0 overflow-x-auto overscroll-x-contain rounded-xl border border-border/80 bg-bg-primary shadow-sm [-webkit-overflow-scrolling:touch] touch-pan-x">
        {users.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-text-primary">No team members yet</p>
            <p className="mt-1 text-sm text-text-secondary">
              Add a @trivoxhq.com teammate to get started.
            </p>
            <div className="mt-5">
              <Button type="button" onClick={openAddMember}>
                Add member
              </Button>
            </div>
          </div>
        ) : (
          <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary/70">
                <th rowSpan={2} className={`align-bottom ${DASH_TABLE_TH}`}>
                  Member
                </th>
                <th rowSpan={2} className={`whitespace-nowrap align-bottom ${DASH_TABLE_TH}`}>
                  Role
                </th>
                <th
                  colSpan={3}
                  className="border-b border-border/70 px-4 pt-3 pb-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary/90"
                >
                  Bid targets
                </th>
                <th
                  rowSpan={2}
                  className={`whitespace-nowrap text-right align-bottom ${DASH_TABLE_TH}`}
                >
                  Monthly salary
                </th>
                <th rowSpan={2} className={`whitespace-nowrap align-bottom ${DASH_TABLE_TH}`}>
                  Status
                </th>
                <th
                  rowSpan={2}
                  className={`whitespace-nowrap text-right align-bottom ${DASH_TABLE_TH}`}
                >
                  Actions
                </th>
              </tr>
              <tr className="border-b border-border bg-bg-secondary/45">
                <th className={`whitespace-nowrap text-right ${DASH_TABLE_TH}`}>Daily</th>
                <th className={`whitespace-nowrap text-right ${DASH_TABLE_TH}`}>Weekly</th>
                <th className={`whitespace-nowrap text-right ${DASH_TABLE_TH}`}>Monthly</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {users.map((user) => {
                const isYou = user.id === currentUserId;
                const initials = initialsFromName(user.name);
                return (
                  <tr
                    key={user.id}
                    className={`${DASH_TABLE_ROW} ${user.isActive ? "" : "bg-bg-secondary/25"}`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-bg-secondary text-[11px] font-semibold tabular-nums tracking-tight text-text-primary shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.65)] dark:shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.08)]"
                          aria-hidden
                        >
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="truncate font-semibold text-text-primary">
                              {user.name}
                            </span>
                            {isYou ? (
                              <span className="rounded border border-brand-primary/25 bg-brand-primary/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-primary">
                                You
                              </span>
                            ) : null}
                            {!user.isActive ? (
                              <span className="rounded border border-border bg-bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                                Inactive
                              </span>
                            ) : null}
                          </div>
                          <p
                            className="mt-0.5 truncate text-xs text-text-secondary"
                            title={user.email}
                          >
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-text-primary">
                      {isYou ? (
                        <span className="inline-flex rounded-md border border-border/80 bg-bg-secondary/60 px-2.5 py-1 text-xs font-medium text-text-primary">
                          {roleLabel(user.role)}
                        </span>
                      ) : (
                        <select
                          className="min-w-38 rounded-lg border border-input-border bg-bg-primary px-2.5 py-1.5 text-sm text-text-primary outline-none transition-[border-color,box-shadow] duration-200 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                          value={user.role}
                          disabled={busyRoleId === user.id}
                          aria-busy={busyRoleId === user.id}
                          aria-label={`Role for ${user.name}`}
                          onChange={(e) => {
                            const next = e.target.value;
                            if (isValidRole(next)) {
                              void patchRole(user, next);
                            }
                          }}
                        >
                          {ASSIGNABLE_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {roleLabel(role)}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-text-primary">
                      {formatMoney(user.dailyTarget)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-text-primary">
                      {formatMoney(user.weeklyTarget)}
                    </td>
                    <td className="whitespace-nowrap border-r border-border/50 px-4 py-3.5 text-right tabular-nums text-text-primary">
                      {formatMoney(user.monthlyTarget)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium tabular-nums text-text-primary">
                      {formatMoney(user.monthlySalary)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={user.isActive}
                          aria-busy={busyActiveId === user.id}
                          aria-label={`${user.isActive ? "Deactivate" : "Activate"} ${user.name}`}
                          disabled={
                            busyActiveId === user.id ||
                            (!!user.isActive && user.id === currentUserId)
                          }
                          title={
                            user.isActive && user.id === currentUserId
                              ? "You cannot deactivate your own account."
                              : user.isActive
                                ? "Click to deactivate"
                                : "Click to activate"
                          }
                          onClick={() => patchActive(user, !user.isActive)}
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35 disabled:cursor-not-allowed disabled:opacity-50 ${DASH_TRANSITION} ${
                            user.isActive
                              ? "border-brand-primary/40 bg-brand-primary"
                              : "border-border bg-bg-secondary"
                          }`}
                        >
                          <span
                            className={`pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                              user.isActive ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span
                          className={`text-xs font-medium ${
                            user.isActive ? "text-brand-primary" : "text-text-secondary"
                          }`}
                        >
                          {user.isActive ? "Active" : "Off"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditTargets(user)}
                          className={DASH_BTN_TABLE}
                        >
                          Targets
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditSalary(user)}
                          className={DASH_BTN_TABLE}
                        >
                          Salary
                        </button>
                        <button
                          type="button"
                          onClick={() => openPasswordModal(user)}
                          className={DASH_BTN_TABLE}
                        >
                          Password
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {editing && editKind === "targets" ? (
          <motion.div
            role="presentation"
            className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4 backdrop-blur-[2px] supports-backdrop-filter:bg-text-primary/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onPointerDown={(ev) => {
              if (ev.target === ev.currentTarget && !savingTargets) closeModal();
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={`w-full max-w-md rounded-2xl border border-border/90 bg-bg-primary p-6 sm:p-7 ${DASH_MODAL_PANEL}`}
              initial={modalAnimation.initial}
              animate={modalAnimation.animate}
              exit={modalAnimation.initial}
              transition={modalAnimation.transition}
              onPointerDown={(ev) => ev.stopPropagation()}
            >
              <div className="border-b border-border/70 pb-4">
                <p className={DASH_SECTION_TITLE}>Bid targets</p>
                <h2 id={titleId} className="mt-1.5 text-lg font-semibold tracking-tight text-text-primary">
                  Edit targets
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Daily, weekly, and monthly targets for {editing.name}
                </p>
              </div>

              <form className="mt-5 space-y-4" onSubmit={submitTargets}>
                <div>
                  <label className={labelClass} htmlFor="edit-daily-target">
                    Daily
                  </label>
                  <input
                    id="edit-daily-target"
                    type="number"
                    min={0}
                    step={1}
                    required
                    className={inputClass}
                    value={dailyStr}
                    onChange={(e) => setDailyStr(e.target.value)}
                    disabled={savingTargets}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="edit-weekly-target">
                    Weekly
                  </label>
                  <input
                    id="edit-weekly-target"
                    type="number"
                    min={0}
                    step={1}
                    required
                    className={inputClass}
                    value={weeklyStr}
                    onChange={(e) => setWeeklyStr(e.target.value)}
                    disabled={savingTargets}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="edit-monthly-target">
                    Monthly
                  </label>
                  <input
                    id="edit-monthly-target"
                    type="number"
                    min={0}
                    step={1}
                    required
                    className={inputClass}
                    value={monthlyStr}
                    onChange={(e) => setMonthlyStr(e.target.value)}
                    disabled={savingTargets}
                  />
                </div>

                {modalError ? (
                  <p className="text-sm text-danger" role="alert">
                    {modalError}
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button variant="secondary" type="button" onClick={closeModal}>
                    Cancel
                  </Button>
                  <button
                    type="submit"
                    disabled={savingTargets}
                    className={`inline-flex min-h-[44px] items-center justify-center rounded-lg border border-brand-primary bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:border-brand-hover hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 ${DASH_TRANSITION} focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35`}
                  >
                    {savingTargets ? "Saving…" : "Save targets"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {editing && editKind === "salary" ? (
          <motion.div
            role="presentation"
            className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4 backdrop-blur-[2px] supports-backdrop-filter:bg-text-primary/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onPointerDown={(ev) => {
              if (ev.target === ev.currentTarget && !savingTargets) closeModal();
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${titleId}-salary`}
              className={`w-full max-w-md rounded-2xl border border-border/90 bg-bg-primary p-6 sm:p-7 ${DASH_MODAL_PANEL}`}
              initial={modalAnimation.initial}
              animate={modalAnimation.animate}
              exit={modalAnimation.initial}
              transition={modalAnimation.transition}
              onPointerDown={(ev) => ev.stopPropagation()}
            >
              <div className="border-b border-border/70 pb-4">
                <p className={DASH_SECTION_TITLE}>Attendance pay</p>
                <h2
                  id={`${titleId}-salary`}
                  className="mt-1.5 text-lg font-semibold tracking-tight text-text-primary"
                >
                  Edit monthly salary
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Separate from bid targets · {editing.name}
                </p>
              </div>

              <form className="mt-5 space-y-4" onSubmit={submitSalary}>
                <div>
                  <label className={labelClass} htmlFor="edit-monthly-salary">
                    Monthly salary
                  </label>
                  <input
                    id="edit-monthly-salary"
                    type="number"
                    min={0}
                    step={1}
                    required
                    className={inputClass}
                    value={monthlySalaryStr}
                    onChange={(e) => setMonthlySalaryStr(e.target.value)}
                    disabled={savingTargets}
                  />
                  <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                    Day pay ≈ monthly ÷ working days/month. Check-out pro-rates by worked
                    minutes.
                  </p>
                </div>

                {modalError ? (
                  <p className="text-sm text-danger" role="alert">
                    {modalError}
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button variant="secondary" type="button" onClick={closeModal}>
                    Cancel
                  </Button>
                  <button
                    type="submit"
                    disabled={savingTargets}
                    className={`inline-flex min-h-[44px] items-center justify-center rounded-lg border border-brand-primary bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:border-brand-hover hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 ${DASH_TRANSITION} focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35`}
                  >
                    {savingTargets ? "Saving…" : "Save salary"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {passwordFor ? (
          <motion.div
            role="presentation"
            className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4 backdrop-blur-[2px] supports-backdrop-filter:bg-text-primary/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onPointerDown={(ev) => {
              if (ev.target === ev.currentTarget && !savingPassword) closePasswordModal();
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={passwordTitleId}
              className={`w-full max-w-md rounded-2xl border border-border/90 bg-bg-primary p-6 sm:p-7 ${DASH_MODAL_PANEL}`}
              initial={modalAnimation.initial}
              animate={modalAnimation.animate}
              exit={modalAnimation.initial}
              transition={modalAnimation.transition}
              onPointerDown={(ev) => ev.stopPropagation()}
            >
              <div className="border-b border-border/70 pb-4">
                <p className={DASH_SECTION_TITLE}>Security</p>
                <h2
                  id={passwordTitleId}
                  className="mt-1.5 text-lg font-semibold tracking-tight text-text-primary"
                >
                  Set password
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {passwordFor.name} · {passwordFor.email}
                </p>
              </div>

              <form className="mt-5 space-y-4" onSubmit={submitPassword}>
                <div>
                  <label className={labelClass} htmlFor="admin-new-password">
                    New password
                  </label>
                  <input
                    id="admin-new-password"
                    type="password"
                    autoComplete="new-password"
                    className={inputClass}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={savingPassword}
                    minLength={8}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="admin-confirm-password">
                    Confirm password
                  </label>
                  <input
                    id="admin-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    className={inputClass}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={savingPassword}
                    minLength={8}
                  />
                </div>

                {passwordError ? (
                  <p className="text-sm text-danger" role="alert">
                    {passwordError}
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button variant="secondary" type="button" onClick={closePasswordModal}>
                    Cancel
                  </Button>
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className={`inline-flex min-h-[44px] items-center justify-center rounded-lg border border-brand-primary bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:border-brand-hover hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 ${DASH_TRANSITION} focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35`}
                  >
                    {savingPassword ? "Saving…" : "Save password"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {addOpen ? (
          <motion.div
            role="presentation"
            className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4 backdrop-blur-[2px] supports-backdrop-filter:bg-text-primary/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onPointerDown={(ev) => {
              if (ev.target === ev.currentTarget && !savingAdd) closeAddMember();
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={addMemberTitleId}
              className={`max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border/90 bg-bg-primary p-6 sm:p-7 ${DASH_MODAL_PANEL}`}
              initial={modalAnimation.initial}
              animate={modalAnimation.animate}
              exit={modalAnimation.initial}
              transition={modalAnimation.transition}
              onPointerDown={(ev) => ev.stopPropagation()}
            >
              <div className="border-b border-border/70 pb-4">
                <p className={DASH_SECTION_TITLE}>Invitation</p>
                <h2
                  id={addMemberTitleId}
                  className="mt-1.5 text-lg font-semibold tracking-tight text-text-primary"
                >
                  Add team member
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Email must use a @trivoxhq.com address.
                </p>
              </div>

              <form className="mt-5 space-y-4" onSubmit={submitAddMember}>
                <div>
                  <label className={labelClass} htmlFor="add-member-name">
                    Name
                  </label>
                  <input
                    id="add-member-name"
                    type="text"
                    autoComplete="name"
                    required
                    className={inputClass}
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    disabled={savingAdd}
                  />
                  {addFieldErrors.name ? (
                    <p className="mt-1 text-sm text-danger" role="alert">
                      {addFieldErrors.name}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className={labelClass} htmlFor="add-member-email">
                    Email
                  </label>
                  <input
                    id="add-member-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="name@trivoxhq.com"
                    className={inputClass}
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    disabled={savingAdd}
                  />
                  {addFieldErrors.email ? (
                    <p className="mt-1 text-sm text-danger" role="alert">
                      {addFieldErrors.email}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className={labelClass} htmlFor="add-member-password">
                    Initial password
                  </label>
                  <input
                    id="add-member-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className={inputClass}
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    disabled={savingAdd}
                  />
                  {addFieldErrors.password ? (
                    <p className="mt-1 text-sm text-danger" role="alert">
                      {addFieldErrors.password}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className={labelClass} htmlFor="add-member-role">
                    Role
                  </label>
                  <select
                    id="add-member-role"
                    className={inputClass}
                    value={addRole}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isValidRole(value)) setAddRole(value);
                    }}
                    disabled={savingAdd}
                  >
                    {ASSIGNABLE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                  {addFieldErrors.role ? (
                    <p className="mt-1 text-sm text-danger" role="alert">
                      {addFieldErrors.role}
                    </p>
                  ) : null}
                </div>

                {addFormError ? (
                  <p className="text-sm text-danger" role="alert">
                    {addFormError}
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button variant="secondary" type="button" onClick={closeAddMember}>
                    Cancel
                  </Button>
                  <button
                    type="submit"
                    disabled={savingAdd}
                    className={`inline-flex min-h-[44px] items-center justify-center rounded-lg border border-brand-primary bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:border-brand-hover hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 ${DASH_TRANSITION} focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35`}
                  >
                    {savingAdd ? "Creating…" : "Create member"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
