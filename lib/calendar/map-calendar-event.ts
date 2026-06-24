import type { CalendarEventRow } from "@/lib/calendar/types";

type UserSummary = { id: string; name: string; email: string };

type CalendarEventWithUsers = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  startsAt: Date;
  endsAt: Date | null;
  ownerId: string | null;
  owner: UserSummary | null;
  createdBy: UserSummary;
  createdAt: Date;
  updatedAt: Date;
};

export const CALENDAR_EVENT_INCLUDE_USERS = {
  owner: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

export function mapCalendarEventToRow(event: CalendarEventWithUsers): CalendarEventRow {
  return {
    ...event,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}
