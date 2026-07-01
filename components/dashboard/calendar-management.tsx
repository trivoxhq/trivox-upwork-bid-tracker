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
} from "@/components/dashboard/dashboard-classes";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CrmAdvancedFiltersPanel,
  CrmFilterCheckbox,
  CrmFilterField,
  CrmFilterToolbar,
  CRM_FILTER_INPUT_CLASS,
  CrmOwnerSelect,
} from "@/components/dashboard/crm-advanced-filters";
import { useCrmFilterParams } from "@/hooks/use-crm-filter-params";
import { matchDateRange, matchOwnerFilter, matchTextSearch } from "@/lib/filters/helpers";
import { CALENDAR_EVENT_TYPES } from "@/lib/calendar/catalog";
import type { CalendarEventRow, CalendarUserSummary } from "@/lib/calendar/types";

type CalendarFormState = {
  title: string;
  description: string;
  type: string;
  startsAt: string;
  endsAt: string;
  ownerId: string;
};

type CalendarManagementProps = {
  initialEvents: CalendarEventRow[];
  users: CalendarUserSummary[];
  isAdmin: boolean;
  readOnly?: boolean;
  currentUserId: string;
};

const emptyForm: CalendarFormState = {
  title: "",
  description: "",
  type: "Meeting",
  startsAt: "",
  endsAt: "",
  ownerId: "",
};

const inputClass =
  "w-full rounded-lg border border-input-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-secondary/55 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:cursor-not-allowed disabled:bg-bg-secondary disabled:opacity-70";

const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function eventToForm(event: CalendarEventRow): CalendarFormState {
  return {
    title: event.title,
    description: event.description ?? "",
    type: event.type,
    startsAt: toDateTimeLocalValue(event.startsAt),
    endsAt: toDateTimeLocalValue(event.endsAt),
    ownerId: event.ownerId ?? "",
  };
}

function compactPayload(form: CalendarFormState, isAdmin: boolean) {
  const payload: Record<string, unknown> = {
    title: form.title.trim(),
    description: form.description.trim() || null,
    type: form.type,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "",
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
  };

  if (isAdmin) {
    payload.ownerId = form.ownerId || null;
  }

  return payload;
}

function buildMonthDays(currentMonth: Date) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function EventTypePill({ type }: { type: string }) {
  const tone =
    type === "Deadline"
      ? "border-danger/35 bg-danger/10 text-danger"
      : type === "Renewal"
        ? "border-success/35 bg-success/10 text-success"
        : type === "Follow-up"
          ? "border-info/35 bg-info/10 text-info"
          : "border-brand-primary/30 bg-brand-primary/10 text-brand-primary";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {type}
    </span>
  );
}

function isUpcomingEvent(startsAt: string): boolean {
  return new Date(startsAt).getTime() >= Date.now();
}

function isPastEvent(startsAt: string): boolean {
  return new Date(startsAt).getTime() < Date.now();
}

export function CalendarManagement(props: CalendarManagementProps) {
  return (
    <Suspense fallback={<p className="mt-8 text-sm text-text-secondary">Loading filters…</p>}>
      <CalendarManagementInner {...props} />
    </Suspense>
  );
}

function CalendarManagementInner({
  initialEvents,
  users,
  isAdmin,
  readOnly = false,
  currentUserId,
}: CalendarManagementProps) {
  const router = useRouter();
  const [form, setForm] = useState<CalendarFormState>(() => ({
    ...emptyForm,
    ownerId: currentUserId,
  }));
  const [editing, setEditing] = useState<CalendarEventRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const filters = useCrmFilterParams({
    stringKeys: ["q", "type", "owner", "dateFrom", "dateTo", "createdBy"],
    boolKeys: ["upcomingOnly", "pastOnly"],
  });

  const search = filters.getString("q");
  const typeFilter = filters.getString("type");
  const ownerFilter = filters.getString("owner");
  const dateFrom = filters.getString("dateFrom");
  const dateTo = filters.getString("dateTo");
  const createdByFilter = filters.getString("createdBy");
  const upcomingOnly = filters.getBool("upcomingOnly");
  const pastOnly = filters.getBool("pastOnly");

  const monthDays = useMemo(() => buildMonthDays(currentMonth), [currentMonth]);
  const currentMonthKey = monthKey(currentMonth);

  const filteredEvents = useMemo(() => {
    return initialEvents.filter((event) => {
      if (typeFilter && event.type !== typeFilter) return false;
      if (!matchOwnerFilter(event.ownerId, ownerFilter)) return false;
      if (createdByFilter && event.createdBy.id !== createdByFilter) return false;
      if (!matchDateRange(event.startsAt, dateFrom, dateTo)) return false;
      if (upcomingOnly && !isUpcomingEvent(event.startsAt)) return false;
      if (pastOnly && !isPastEvent(event.startsAt)) return false;
      if (
        !matchTextSearch(search, [
          event.title,
          event.description,
          event.owner?.name,
          event.createdBy.name,
        ])
      ) {
        return false;
      }
      return true;
    });
  }, [
    createdByFilter,
    dateFrom,
    dateTo,
    initialEvents,
    ownerFilter,
    pastOnly,
    search,
    typeFilter,
    upcomingOnly,
  ]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventRow[]>();
    for (const event of filteredEvents) {
      const d = new Date(event.startsAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [filteredEvents]);

  const monthEvents = useMemo(() => {
    return filteredEvents.filter((event) => monthKey(new Date(event.startsAt)) === currentMonthKey);
  }, [currentMonthKey, filteredEvents]);

  function resetForm() {
    setEditing(null);
    setForm({ ...emptyForm, ownerId: currentUserId });
  }

  function setField<K extends keyof CalendarFormState>(key: K, value: CalendarFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function shiftMonth(delta: number) {
    setCurrentMonth((cur) => new Date(cur.getFullYear(), cur.getMonth() + delta, 1));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Event title is required.");
      return;
    }
    if (!form.startsAt) {
      toast.error("Start date/time is required.");
      return;
    }
    if (form.endsAt && new Date(form.endsAt).getTime() < new Date(form.startsAt).getTime()) {
      toast.error("End time must be after start time.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(editing ? `/api/calendar/${editing.id}` : "/api/calendar", {
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
          "Could not save calendar event.";
        toast.error(msg);
        return;
      }

      toast.success(editing ? "Event updated." : "Event created.");
      resetForm();
      router.refresh();
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(event: CalendarEventRow) {
    if (!isAdmin) return;
    const ok = window.confirm(`Delete event "${event.title}"?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/calendar/${event.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        toast.error(data?.message ?? "Could not delete event.");
        return;
      }
      toast.success("Event deleted.");
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
            <h2 className={DASH_SECTION_TITLE}>{editing ? "Edit event" : "Add event"}</h2>
            <p className="mt-1.5 text-sm text-text-secondary">
              Schedule meetings, follow-ups, deadlines, renewals, and reminders.
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
            <label className={labelClass} htmlFor="event-title">
              Event title
            </label>
            <input
              id="event-title"
              className={inputClass}
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Client follow-up"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="event-type">
                Type
              </label>
              <select
                id="event-type"
                className={inputClass}
                value={form.type}
                onChange={(e) => setField("type", e.target.value)}
              >
                {CALENDAR_EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            {isAdmin ? (
              <div>
                <label className={labelClass} htmlFor="event-owner">
                  Owner
                </label>
                <select
                  id="event-owner"
                  className={inputClass}
                  value={form.ownerId}
                  onChange={(e) => setField("ownerId", e.target.value)}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="event-start">
                Starts
              </label>
              <input
                id="event-start"
                type="datetime-local"
                className={inputClass}
                value={form.startsAt}
                onChange={(e) => setField("startsAt", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="event-end">
                Ends
              </label>
              <input
                id="event-end"
                type="datetime-local"
                className={inputClass}
                value={form.endsAt}
                onChange={(e) => setField("endsAt", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="event-description">
              Description
            </label>
            <textarea
              id="event-description"
              className={`${inputClass} min-h-24 resize-y`}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Context, agenda, deadline notes, or renewal details"
            />
          </div>

          <button type="submit" disabled={submitting} className={`${DASH_BTN_TOOLBAR} w-full`}>
            {submitting ? "Saving..." : editing ? "Update event" : "Create event"}
          </button>
        </form>
      </section>
      ) : null}

      <section className="min-w-0 rounded-[22px] border border-border/55 bg-bg-primary/80 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className={DASH_SECTION_TITLE}>Calendar</h2>
            <p className="mt-1.5 text-sm text-text-secondary">
              {monthEvents.length} events in{" "}
              {currentMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className={DASH_BTN_TABLE} onClick={() => shiftMonth(-1)}>
              Previous
            </button>
            <button
              type="button"
              className={DASH_BTN_TABLE}
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </button>
            <button type="button" className={DASH_BTN_TABLE} onClick={() => shiftMonth(1)}>
              Next
            </button>
          </div>
        </div>

        <div className={`${DASH_FILTER_BAR} mt-4`}>
          <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
            <CrmFilterToolbar
              activeCount={filters.activeCount}
              advancedOpen={filters.advancedOpen}
              onToggleAdvanced={() => filters.setAdvancedOpen((open) => !open)}
              onReset={filters.resetAll}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <input
              className={CRM_FILTER_INPUT_CLASS}
              value={search}
              onChange={(e) => filters.setString("q", e.target.value)}
              placeholder="Search events..."
            />
            <select
              className={CRM_FILTER_INPUT_CLASS}
              value={typeFilter}
              onChange={(e) => filters.setString("type", e.target.value)}
            >
              <option value="">All types</option>
              {CALENDAR_EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
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
              label="Upcoming only"
              checked={upcomingOnly}
              onChange={(checked) => {
                filters.setBool("upcomingOnly", checked);
                if (checked) filters.setBool("pastOnly", false);
              }}
            />
          </div>

          <CrmAdvancedFiltersPanel open={filters.advancedOpen}>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <CrmFilterField label="Start date from">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => filters.setString("dateFrom", e.target.value)}
                  className={CRM_FILTER_INPUT_CLASS}
                />
              </CrmFilterField>
              <CrmFilterField label="Start date to">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => filters.setString("dateTo", e.target.value)}
                  className={CRM_FILTER_INPUT_CLASS}
                />
              </CrmFilterField>
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
              <CrmFilterCheckbox
                label="Past events only"
                checked={pastOnly}
                onChange={(checked) => {
                  filters.setBool("pastOnly", checked);
                  if (checked) filters.setBool("upcomingOnly", false);
                }}
              />
            </div>
          </CrmAdvancedFiltersPanel>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 text-xs">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="bg-bg-secondary px-2 py-2 text-center font-semibold text-text-secondary">
              {day}
            </div>
          ))}
          {monthDays.map((day) => {
            const key = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
            const dayEvents = eventsByDate.get(key) ?? [];
            const inMonth = day.getMonth() === currentMonth.getMonth();
            const isToday = key === `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;

            return (
              <div
                key={key}
                className={`min-h-24 bg-bg-primary p-2 ${inMonth ? "" : "opacity-45"} ${
                  isToday ? "ring-2 ring-inset ring-brand-primary/35" : ""
                }`}
              >
                <div className="font-semibold text-text-primary">{day.getDate()}</div>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map((event) =>
                    readOnly ? (
                      <span
                        key={event.id}
                        className="block w-full truncate rounded-md bg-brand-primary/10 px-2 py-1 text-left text-[11px] font-semibold text-brand-primary"
                        title={event.title}
                      >
                        {event.title}
                      </span>
                    ) : (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => {
                          setEditing(event);
                          setForm(eventToForm(event));
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="block w-full truncate rounded-md bg-brand-primary/10 px-2 py-1 text-left text-[11px] font-semibold text-brand-primary hover:bg-brand-primary/15"
                        title={event.title}
                      >
                        {event.title}
                      </button>
                    ),
                  )}
                  {dayEvents.length > 3 ? (
                    <div className="text-[11px] text-text-secondary">+{dayEvents.length - 3} more</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <h3 className={DASH_SECTION_TITLE}>Events this month</h3>
          {monthEvents.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="No events this month"
              description="Create a meeting, follow-up, deadline, renewal, or reminder."
            />
          ) : (
            <div className="mt-4 space-y-3">
              {monthEvents.map((event) => (
                <article
                  key={event.id}
                  className="rounded-xl border border-border/70 bg-bg-primary p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <EventTypePill type={event.type} />
                      <h4 className="mt-2 font-semibold text-text-primary">{event.title}</h4>
                      <p className="mt-1 text-sm text-text-secondary">
                        {toDateLabel(event.startsAt)}
                        {event.endsAt ? ` - ${toDateLabel(event.endsAt)}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        Owner: {event.owner?.name ?? "Unassigned"} · Created by {event.createdBy.name}
                      </p>
                      {event.description ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                          {event.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      {!readOnly ? (
                        <>
                      <button
                        type="button"
                        className={DASH_BTN_TABLE}
                        onClick={() => {
                          setEditing(event);
                          setForm(eventToForm(event));
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Edit
                      </button>
                      {isAdmin ? (
                        <button
                          type="button"
                          className={DASH_BTN_TABLE_DANGER}
                          onClick={() => handleDelete(event)}
                        >
                          Delete
                        </button>
                      ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
