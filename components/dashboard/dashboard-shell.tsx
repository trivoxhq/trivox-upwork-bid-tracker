"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { VscCollapseAll, VscExpandAll } from "react-icons/vsc";
import {
  DASH_BTN_DANGER_GHOST,
  DASH_BTN_TOOLBAR,
  DASH_DRAWER_PANEL,
  DASH_SECTION_TITLE,
  DASH_TRANSITION,
} from "@/components/dashboard/dashboard-classes";
import { DashboardAddBidTrigger } from "@/components/dashboard/dashboard-add-bid-trigger";
import { DashboardExportBidsButton } from "@/components/dashboard/dashboard-export-csv-button";
import { DashboardResetBidsButton } from "@/components/dashboard/dashboard-reset-bids-button";
import { DashboardLogoutButton } from "@/components/dashboard/logout-button";
import { ThemeCycleButton } from "@/components/theme/theme-cycle-button";
import { useIsDarkTheme } from "@/hooks/use-is-dark-theme";

export type DashboardShellUser = {
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
};

type DashboardShellProps = {
  user: DashboardShellUser;
  children: ReactNode;
};

const SIDEBAR_COLLAPSED_KEY = "upwork-bid-tracker-sidebar-collapsed";

const SIDEBAR_SURFACE =
  "relative overflow-hidden bg-[linear-gradient(165deg,#ffffff_0%,#f8faf8_42%,#eef2ee_100%)] dark:bg-[linear-gradient(165deg,#191919_0%,#171717_50%,#141414_100%)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-px before:bg-gradient-to-r before:from-transparent before:via-brand-primary/35 before:to-transparent before:content-[''] dark:before:via-[rgb(16_163_127_/0.35)]";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const second =
    parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : (parts[0]?.[1] ?? "");
  return `${first}${second}`.toUpperCase() || "?";
}

/** True when the visible name would repeat the avatar initials (e.g. name "JS" + initials "JS"). */
function nameMatchesInitialsOnly(name: string, initials: string): boolean {
  const compact = name.trim().replace(/\s+/g, "").toUpperCase();
  if (!compact) return false;
  return compact === initials.toUpperCase();
}

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      const v = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      setCollapsed(v === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { collapsed, toggle };
}

function SidebarRailToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className="shrink-0 rounded-lg border border-border/50 bg-white/70 p-1.5 text-text-secondary shadow-sm hover:border-border/70 hover:bg-white hover:text-text-primary dark:border-border dark:bg-bg-primary dark:hover:border-border dark:hover:bg-bg-hover dark:hover:text-text-primary"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <span className="flex h-[18px] w-[18px] items-center justify-center" aria-hidden>
        {collapsed ? <VscExpandAll size={18} /> : <VscCollapseAll size={18} />}
      </span>
    </motion.button>
  );
}

function NavIconLayout({ children, active }: { children: ReactNode; active: boolean }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${DASH_TRANSITION} [&>svg]:h-[17px] [&>svg]:w-[17px] ${
        active
          ? "bg-white text-brand-primary shadow-sm ring-1 ring-brand-primary/25 dark:bg-bg-primary dark:shadow-md dark:ring-brand-primary/40"
          : "bg-white/70 text-text-secondary shadow-sm ring-1 ring-border/50 group-hover:bg-white group-hover:text-text-primary group-hover:ring-border/70 dark:bg-bg-primary/50 dark:text-text-secondary dark:ring-border/55 dark:group-hover:bg-bg-hover dark:group-hover:text-text-primary dark:group-hover:ring-border/70"
      }`}
    >
      {children}
    </span>
  );
}

function SidebarNavLink({
  href,
  active,
  icon,
  label,
  collapsed,
  onNavigate,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <motion.div whileHover={{ scale: collapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? label : undefined}
        title={collapsed ? label : undefined}
        className={`group relative flex items-center rounded-xl text-[13px] font-semibold leading-snug tracking-tight ${DASH_TRANSITION} focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:focus-visible:ring-brand-primary/40 ${
          collapsed ? "justify-center px-0 py-2" : "gap-3 px-2.5 py-2.5"
        } ${
          active
            ? collapsed
              ? "text-brand-primary"
              : "bg-gradient-to-r from-brand-primary/14 to-brand-primary/6 text-brand-primary shadow-[0_1px_2px_rgb(17_17_17_/0.04)] dark:from-brand-primary/20 dark:to-brand-primary/8 dark:text-brand-primary dark:shadow-[0_1px_2px_rgb(0_0_0_/0.35)]"
            : "text-text-secondary hover:bg-white/90 hover:text-text-primary hover:shadow-sm dark:hover:bg-bg-hover dark:hover:text-text-primary"
        }`}
      >
        <span className={`${DASH_TRANSITION} ${collapsed ? "" : "group-hover:translate-x-0.5"}`}>
          <NavIconLayout active={active}>{icon}</NavIconLayout>
        </span>
        <AnimatePresence initial={false}>
          {!collapsed ? (
            <motion.span
              key="label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="min-w-0 truncate"
            >
              {label}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </Link>
    </motion.div>
  );
}

function SidebarQuickActions({
  isAdmin,
  collapsed,
  onDone,
  embedInAccordion,
}: {
  isAdmin: boolean;
  collapsed: boolean;
  onDone?: () => void;
  /** Strip outer card — used inside sidebar Actions accordion panel. */
  embedInAccordion?: boolean;
}) {
  const router = useRouter();
  const btn = `${DASH_BTN_TOOLBAR} w-full justify-center text-[13px] shadow-md`;

  if (collapsed) {
    return (
      <motion.div className="flex flex-col items-center gap-2" initial={false} animate={{ opacity: 1 }}>
        <motion.button
          type="button"
          title="Refresh data"
          aria-label="Refresh data"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            onDone?.();
            router.refresh();
          }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/80 bg-bg-primary text-text-secondary shadow-sm hover:bg-white hover:text-text-primary dark:border-border dark:bg-bg-primary dark:hover:border-border dark:hover:bg-bg-hover dark:hover:text-text-primary"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
            <path d="M21 3v7h-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
        <DashboardExportBidsButton format="xlsx" iconOnly />
        <DashboardExportBidsButton format="csv" iconOnly />
        <DashboardAddBidTrigger iconOnly label="Add bid" />
        {isAdmin ? (
          <DashboardResetBidsButton iconOnly triggerClassName={`${DASH_BTN_DANGER_GHOST} border-danger/40 p-0`} />
        ) : null}
      </motion.div>
    );
  }

  const expandedBody = (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => {
          onDone?.();
          router.refresh();
        }}
        className={btn}
      >
        Refresh data
      </button>
      <DashboardExportBidsButton format="xlsx" buttonClassName={btn} />
      <DashboardExportBidsButton format="csv" buttonClassName={btn} />
      <DashboardAddBidTrigger label="Add bid" className="min-h-[44px] w-full text-[13px] shadow-md shadow-brand-primary/15" />
      {isAdmin ? (
        <DashboardResetBidsButton triggerClassName={`${DASH_BTN_DANGER_GHOST} w-full justify-center text-[13px]`} />
      ) : null}
    </div>
  );

  if (embedInAccordion) {
    return expandedBody;
  }

  return (
    <div className="rounded-2xl border border-border/45 bg-white/55 p-3 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.9)] backdrop-blur-[2px] dark:border-border/48 dark:bg-bg-primary/42 dark:shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.06)]">
      {expandedBody}
    </div>
  );
}

/** Signed-in user at top of sidebar (initials + name + email from session). Shown only when the rail is expanded. */
function SidebarProfileHeader({
  user,
  onNavigate,
}: {
  user: DashboardShellUser;
  onNavigate?: () => void;
}) {
  const initials = initialsFromName(user.name);
  const roleLabel = user.role === "admin" ? "Administrator" : "Member";
  const hideNameLine = nameMatchesInitialsOnly(user.name, initials);
  const avatarClass =
    "flex items-center justify-center rounded-md border border-border/60 bg-bg-secondary text-[11px] font-medium tabular-nums tracking-tight text-text-primary shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.65)] dark:shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.08)]";

  return (
    <div className="min-w-0 flex-1 rounded-xl bg-white/45 px-2 py-1 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.85)] dark:bg-bg-primary/38 dark:shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.06)]">
      <div className="flex min-w-0 items-start gap-2">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={`shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 ${DASH_TRANSITION} hover:opacity-[0.92]`}
          aria-label="Go to dashboard overview"
        >
          <span className={`${avatarClass} h-9 w-9`} aria-hidden>
            {initials}
          </span>
        </Link>
        <div className="min-w-0 flex-1 pt-0.5">
          {hideNameLine ? null : (
            <p className="truncate text-[13px] font-semibold leading-tight text-text-primary">{user.name}</p>
          )}
          <p className={`truncate text-[11px] leading-snug text-text-secondary ${hideNameLine ? "" : "mt-0.5"}`}>
            {user.email}
          </p>
          <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.1em] text-text-secondary/75">
            {roleLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

function SidebarUserFooter({ collapsed }: { collapsed: boolean }) {
  const footerBg =
    "border-t border-border/50 bg-gradient-to-t from-white/90 via-[#f4f6f4]/95 to-transparent dark:from-[#171717]/98 dark:via-[#171717]/98 dark:to-transparent";

  if (collapsed) {
    return (
      <div className={`relative flex shrink-0 flex-col items-center gap-2 px-2 py-3 ${footerBg}`}>
        <ThemeCycleButton iconOnly className="mt-0 border-border/75" />
        <DashboardLogoutButton iconOnly className="mt-0" />
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 px-4 py-4 ${footerBg}`}>
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" aria-hidden />
      <div className="flex flex-col gap-2.5">
        <ThemeCycleButton className="border-border/70" />
        <DashboardLogoutButton className="mt-0 w-full rounded-xl border-border/80 shadow-sm" />
      </div>
    </div>
  );
}

function SidebarRailChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-text-secondary/65 ${DASH_TRANSITION} ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SIDEBAR_ACCORDION_SHELL =
  "rounded-2xl border border-border/40 bg-white/45 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.85)] backdrop-blur-[2px] overflow-hidden dark:border-border dark:bg-bg-primary/35 dark:shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.05)]";

const SIDEBAR_ACCORDION_TRIGGER = `flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left ${DASH_TRANSITION} hover:bg-white/55 dark:hover:bg-bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/25`;

function SidebarScrollable({
  user,
  pathname,
  collapsed,
  onNavigate,
}: {
  user: DashboardShellUser;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const overviewActive = pathname === "/dashboard";
  const bidsActive = pathname.startsWith("/dashboard/bids");
  const insightsActive = pathname.startsWith("/dashboard/insights");
  const usersActive = pathname.startsWith("/dashboard/users");
  const settingsActive = pathname.startsWith("/dashboard/settings");
  const [openSection, setOpenSection] = useState<"navigate" | "actions">("navigate");

  const navLinks = (
    <>
      <SidebarNavLink
        href="/dashboard"
        active={overviewActive && !bidsActive && !insightsActive && !usersActive && !settingsActive}
        collapsed={collapsed}
        onNavigate={onNavigate}
        label="Overview"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
          </svg>
        }
      />
      <SidebarNavLink
        href="/dashboard/bids"
        active={bidsActive}
        collapsed={collapsed}
        onNavigate={onNavigate}
        label="Bid log"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" strokeLinecap="round" />
          </svg>
        }
      />
      <SidebarNavLink
        href="/dashboard/insights"
        active={insightsActive}
        collapsed={collapsed}
        onNavigate={onNavigate}
        label="Insights"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 3v18h18" strokeLinecap="round" />
            <path d="M7 16V9M12 16v-5M17 16V6" strokeLinecap="round" />
          </svg>
        }
      />
      {user.isAdmin ? (
        <>
          <SidebarNavLink
            href="/dashboard/users"
            active={usersActive}
            collapsed={collapsed}
            onNavigate={onNavigate}
            label="Team management"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
              </svg>
            }
          />
          <SidebarNavLink
            href="/dashboard/settings"
            active={settingsActive}
            collapsed={collapsed}
            onNavigate={onNavigate}
            label="Settings"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path
                  d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
        </>
      ) : null}
    </>
  );

  const navClass = `flex flex-col gap-1 ${collapsed ? "w-full items-stretch" : ""}`;

  if (collapsed) {
    return (
      <div className="sidebar-scroll flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 py-4">
        <div className="flex flex-col items-center">
          <span className="mb-2 h-1 w-1 rounded-full bg-brand-primary/50" aria-hidden />
          <nav className={`${navClass} ${SIDEBAR_ACCORDION_SHELL} p-1.5`} aria-label="Dashboard sections">
            {navLinks}
          </nav>
        </div>
        <div className="mt-4 flex min-h-0 flex-col items-center">
          <span className="mb-2 h-1 w-1 rounded-full bg-info/40" aria-hidden />
          <div className="mt-1 w-full">
            <SidebarQuickActions isAdmin={user.isAdmin} collapsed onDone={onNavigate} />
          </div>
        </div>
      </div>
    );
  }

  const navigateOpen = openSection === "navigate";
  const actionsOpen = openSection === "actions";

  return (
    <div className="sidebar-scroll flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 py-4">
      <div className={SIDEBAR_ACCORDION_SHELL}>
        <button
          type="button"
          id="sidebar-trigger-navigate"
          className={SIDEBAR_ACCORDION_TRIGGER}
          aria-expanded={navigateOpen}
          aria-controls="sidebar-panel-navigate"
          onClick={() => setOpenSection("navigate")}
        >
          <span className={`flex min-w-0 items-center gap-2 ${DASH_SECTION_TITLE} tracking-[0.14em]`}>
            <span className="h-1 w-1 shrink-0 rounded-full bg-brand-primary/70" aria-hidden />
            Navigate
          </span>
          <SidebarRailChevron open={navigateOpen} />
        </button>
        {navigateOpen ? (
          <nav
            id="sidebar-panel-navigate"
            role="region"
            aria-labelledby="sidebar-trigger-navigate"
            className={`${navClass} border-t border-border/35 px-1.5 pb-1.5 pt-1`}
            aria-label="Dashboard sections"
          >
            {navLinks}
          </nav>
        ) : null}
      </div>

      <div className={`mt-3 ${SIDEBAR_ACCORDION_SHELL}`}>
        <button
          type="button"
          id="sidebar-trigger-actions"
          className={SIDEBAR_ACCORDION_TRIGGER}
          aria-expanded={actionsOpen}
          aria-controls="sidebar-panel-actions"
          onClick={() => setOpenSection("actions")}
        >
          <span className={`flex min-w-0 items-center gap-2 ${DASH_SECTION_TITLE} tracking-[0.14em]`}>
            <span className="h-1 w-1 shrink-0 rounded-full bg-info/60" aria-hidden />
            Actions
          </span>
          <SidebarRailChevron open={actionsOpen} />
        </button>
        {actionsOpen ? (
          <div
            id="sidebar-panel-actions"
            role="region"
            aria-labelledby="sidebar-trigger-actions"
            className="border-t border-border/35 px-2 pb-2.5 pt-2"
          >
            <SidebarQuickActions isAdmin={user.isAdmin} collapsed={false} embedInAccordion onDone={onNavigate} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebarCollapsed();
  const mobileHeaderInitials = initialsFromName(user.name);
  const mobileHideName = nameMatchesInitialsOnly(user.name, mobileHeaderInitials);
  const isDarkDashboard = useIsDarkTheme();

  const dotPatternUrl = useMemo(() => {
    const fill = isDarkDashboard ? "%23999999" : "%23111111";
    const op = isDarkDashboard ? "0.12" : "0.04";
    return `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='0.65' fill='${fill}' fill-opacity='${op}'/%3E%3C/svg%3E")`;
  }, [isDarkDashboard]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const mainSurface =
    "bg-[radial-gradient(100%_60%_at_100%_0%,rgb(16_138_0_/0.07),transparent_52%),linear-gradient(180deg,rgb(250_251_250)_0%,rgb(255_255_255)_38%,rgb(252_253_252)_100%)] dark:bg-[radial-gradient(100%_60%_at_100%_0%,rgb(16_163_127_/0.06),transparent_52%),linear-gradient(180deg,#212121,#1f1f1f,#1c1c1c)]";

  return (
    <div className="flex min-h-dvh min-w-0 flex-col bg-bg-secondary/40 md:h-dvh md:max-h-dvh md:flex-row md:overflow-hidden">
      <aside
        className={`z-20 hidden h-full min-h-0 shrink-0 flex-col border-border/60 transition-[width] duration-200 ease-out motion-reduce:transition-none md:flex ${SIDEBAR_SURFACE} ${DASH_DRAWER_PANEL} border-r shadow-[4px_0_32px_rgb(17_17_17_/0.05)] dark:border-border dark:shadow-[4px_0_36px_rgb(0_0_0_/0.55)] will-change-[width] ${
          sidebarCollapsed ? "w-[4.75rem] overflow-hidden" : "w-64 overflow-hidden lg:w-72"
        }`}
        aria-label="Dashboard navigation"
      >
        <div
          className="relative flex h-full min-h-0 flex-col pt-[max(0.75rem,env(safe-area-inset-top))]"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div
            className={`relative z-20 shrink-0 border-b border-border/45 px-2 pb-3 ${
              sidebarCollapsed ? "flex justify-center" : "flex items-center gap-2 px-1"
            }`}
          >
            {!sidebarCollapsed ? (
              <div className="min-w-0 flex-1">
                <SidebarProfileHeader user={user} />
              </div>
            ) : null}
            <SidebarRailToggle collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
          </div>
          <SidebarScrollable user={user} pathname={pathname} collapsed={sidebarCollapsed} />
          <SidebarUserFooter collapsed={sidebarCollapsed} />
        </div>
      </aside>

      <div className={`relative flex min-h-0 min-w-0 flex-1 flex-col md:min-h-0 ${mainSurface}`}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] md:opacity-50 motion-safe:transition-opacity motion-safe:duration-500 motion-safe:ease-out dark:opacity-[0.5] md:dark:opacity-[0.6]"
          style={{
            backgroundImage: dotPatternUrl,
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />

        <header
          className={`relative z-30 flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-bg-primary/88 px-4 py-3 shadow-md shadow-black/[0.04] backdrop-blur-lg md:hidden dark:border-border dark:bg-bg-secondary/98 dark:shadow-[0_8px_24px_rgb(0_0_0_/0.5)] ${DASH_TRANSITION}`}
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <button
            type="button"
            className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border/60 bg-bg-primary text-text-primary shadow-sm ${DASH_TRANSITION} focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 active:scale-[0.98]`}
            aria-expanded={mobileOpen}
            aria-controls="dashboard-mobile-nav"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <div className="min-w-0 flex-1 text-right">
            {mobileHideName ? null : (
              <p className="truncate text-sm font-semibold tracking-tight text-text-primary">{user.name}</p>
            )}
            <p className={`truncate text-[11px] text-text-secondary ${mobileHideName ? "" : "mt-0.5"}`}>
              {user.email}
            </p>
            <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.1em] text-text-secondary/75">
              {user.role === "admin" ? "Administrator" : "Member"}
            </p>
          </div>
        </header>

        <div
          id="dashboard-main-scroll"
          role="main"
          className="relative z-10 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain pb-[max(1rem,env(safe-area-inset-bottom))] md:pt-1"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:px-8 md:py-2 lg:px-2">{children}</div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              role="presentation"
              className="absolute inset-0 bg-text-primary/40 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              id="dashboard-mobile-nav"
              className={`absolute left-0 top-0 flex h-full w-[min(100vw,20.5rem)] flex-col border-r border-border/60 ${SIDEBAR_SURFACE} ${DASH_DRAWER_PANEL} shadow-2xl shadow-black/15`}
              style={{
                paddingTop: "max(0.75rem, env(safe-area-inset-top))",
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              }}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 360 }}
            >
              <div className="relative z-20 shrink-0 border-b border-border/45 px-4 pb-4">
                <SidebarProfileHeader user={user} onNavigate={() => setMobileOpen(false)} />
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <SidebarScrollable
                  user={user}
                  pathname={pathname}
                  collapsed={false}
                  onNavigate={() => setMobileOpen(false)}
                />
                <SidebarUserFooter collapsed={false} />
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
