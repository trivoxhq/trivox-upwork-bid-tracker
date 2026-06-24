export type CalendarUserSummary = {
  id: string;
  name: string;
  email: string;
};

export type CalendarEventRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  startsAt: string;
  endsAt: string | null;
  ownerId: string | null;
  owner: CalendarUserSummary | null;
  createdBy: CalendarUserSummary;
  createdAt: string;
  updatedAt: string;
};
