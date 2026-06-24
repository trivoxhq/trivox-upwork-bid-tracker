export const CALENDAR_EVENT_TYPES = [
  "Meeting",
  "Follow-up",
  "Deadline",
  "Renewal",
  "Reminder",
] as const;

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export function isValidCalendarEventType(value: string): value is CalendarEventType {
  return (CALENDAR_EVENT_TYPES as readonly string[]).includes(value);
}
