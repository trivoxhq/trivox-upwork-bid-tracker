"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useCallback, useEffect, useId, useState } from "react";
import {
  DASH_MODAL_PANEL,
  DASH_SECTION_TITLE,
  DASH_TABLE_ROW,
  DASH_TABLE_TH,
  DASH_TRANSITION,
} from "@/components/dashboard/dashboard-classes";
import type { AdminUserRow } from "@/components/dashboard/users-admin-types";
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

function isAdminUserRow(value: unknown): value is AdminUserRow {
  if (value === null || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.email === "string" &&
    typeof o.name === "string" &&
    (o.role === "admin" || o.role === "member") &&
    typeof o.dailyTarget === "number" &&
    typeof o.monthlyTarget === "number" &&
    typeof o.isActive === "boolean" &&
    typeof o.createdAt === "string"
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15";

const labelClass = `mb-1.5 block ${DASH_SECTION_TITLE}`;

export function UsersAdminTable({ currentUserId }: { currentUserId: string }) {
  const titleId = useId();
  const passwordTitleId = useId();
  const addMemberTitleId = useId();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [dailyStr, setDailyStr] = useState("");
  const [monthlyStr, setMonthlyStr] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [savingTargets, setSavingTargets] = useState(false);

  const [busyActiveId, setBusyActiveId] = useState<string | null>(null);

  const [passwordFor, setPasswordFor] = useState<AdminUserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "member">("member");
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

  function openEdit(user: AdminUserRow) {
    setEditing(user);
    setDailyStr(String(user.dailyTarget));
    setMonthlyStr(String(user.monthlyTarget));
    setModalError(null);
  }

  const closeModal = useCallback(() => {
    if (savingTargets) return;
    setEditing(null);
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
    setAddRole("member");
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
      setAddRole("member");
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

  async function submitTargets(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setModalError(null);

    const daily = Number.parseInt(dailyStr, 10);
    const monthly = Number.parseInt(monthlyStr, 10);
    if (!Number.isFinite(daily) || !Number.isInteger(daily) || daily < 0) {
      setModalError("Daily target must be a whole number ≥ 0.");
      return;
    }
    if (!Number.isFinite(monthly) || !Number.isInteger(monthly) || monthly < 0) {
      setModalError("Monthly target must be a whole number ≥ 0.");
      return;
    }

    setSavingTargets(true);
    try {
      const res = await fetch(`/api/users/${editing.id}/targets`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyTarget: daily, monthlyTarget: monthly }),
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
          "Could not update targets.";
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
      setModalError(null);
    } catch {
      setModalError("Network error.");
    } finally {
      setSavingTargets(false);
    }
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
      <div className="mt-6 space-y-3" aria-busy="true">
        <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-bg-secondary" />
        <div className="h-48 w-full animate-pulse rounded-xl bg-bg-secondary/80" />
      </div>
    );
  }

  if (listError) {
    return (
      <div
        className="mt-6 rounded-xl border border-border bg-bg-primary px-4 py-3 text-sm text-danger shadow-sm"
        role="alert"
      >
        {listError}
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <Button type="button" onClick={openAddMember}>
          + Add Member
        </Button>
      </div>

      <div className="mt-4 min-w-0 overflow-x-auto overscroll-x-contain rounded-xl border border-border/80 bg-bg-primary shadow-sm [-webkit-overflow-scrolling:touch] touch-pan-x">
        <table className="min-w-[800px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-secondary/60">
              <th className={DASH_TABLE_TH}>Name</th>
              <th className={DASH_TABLE_TH}>Email</th>
              <th className={`whitespace-nowrap ${DASH_TABLE_TH}`}>Role</th>
              <th className={`whitespace-nowrap ${DASH_TABLE_TH}`}>Targets</th>
              <th className={`whitespace-nowrap ${DASH_TABLE_TH}`}>Active</th>
              <th className={`whitespace-nowrap text-right ${DASH_TABLE_TH}`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/80">
            {users.map((user) => (
              <tr
                key={user.id}
                className={`${DASH_TABLE_ROW} ${user.isActive ? "" : "opacity-60"}`}
              >
                <td className="whitespace-nowrap px-4 py-3 font-medium text-text-primary">{user.name}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-text-secondary" title={user.email}>
                  {user.email}
                </td>
                <td className="whitespace-nowrap px-4 py-3 capitalize text-text-primary">{user.role}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-text-primary">
                  <span className="text-text-secondary">D</span> {formatMoney(user.dailyTarget)}
                  <span className="mx-1.5 text-border">·</span>
                  <span className="text-text-secondary">M</span> {formatMoney(user.monthlyTarget)}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={user.isActive}
                    aria-busy={busyActiveId === user.id}
                    disabled={
                      busyActiveId === user.id || (!!user.isActive && user.id === currentUserId)
                    }
                    title={
                      user.isActive && user.id === currentUserId
                        ? "You cannot deactivate your own account."
                        : user.isActive
                          ? "Click to deactivate"
                          : "Click to activate"
                    }
                    onClick={() => patchActive(user, !user.isActive)}
                    className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35 disabled:cursor-not-allowed disabled:opacity-50 ${DASH_TRANSITION} ${
                      user.isActive ? "bg-brand-primary/90" : "bg-bg-secondary"
                    }`}
                  >
                    <span
                      className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        user.isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </td>
                <td className="max-w-[200px] px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-x-3 gap-y-2">
                    <button
                      type="button"
                      onClick={() => openEdit(user)}
                      className={`text-sm font-semibold text-info underline decoration-info/35 underline-offset-2 ${DASH_TRANSITION} hover:decoration-info`}
                    >
                      Targets
                    </button>
                    <button
                      type="button"
                      onClick={() => openPasswordModal(user)}
                      className={`text-sm font-semibold text-text-primary underline decoration-border underline-offset-2 ${DASH_TRANSITION} hover:text-text-secondary`}
                    >
                      Password
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {editing ? (
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
              <h2 id={titleId} className="text-lg font-semibold tracking-tight text-text-primary">
                Edit targets
              </h2>
              <p className="mt-1 text-sm text-text-secondary">{editing.name}</p>

              <form className="mt-6 space-y-4" onSubmit={submitTargets}>
                <div>
                  <label className={labelClass} htmlFor="edit-daily-target">
                    Daily target
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
                  <label className={labelClass} htmlFor="edit-monthly-target">
                    Monthly target
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
                    {savingTargets ? "Saving…" : "Save"}
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
              <h2 id={passwordTitleId} className="text-lg font-semibold tracking-tight text-text-primary">
                Set password
              </h2>
              <p className="mt-1 text-sm text-text-secondary">{passwordFor.email}</p>

              <form className="mt-6 space-y-4" onSubmit={submitPassword}>
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
              <h2 id={addMemberTitleId} className="text-lg font-semibold tracking-tight text-text-primary">
                Add team member
              </h2>
              <p className="mt-1 text-sm text-text-secondary">Email must be a @trivoxhq.com address.</p>

              <form className="mt-6 space-y-4" onSubmit={submitAddMember}>
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
                    onChange={(e) => setAddRole(e.target.value === "admin" ? "admin" : "member")}
                    disabled={savingAdd}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
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
