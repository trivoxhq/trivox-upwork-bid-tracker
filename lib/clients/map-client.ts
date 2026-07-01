import type { ClientHistoryRow, ClientRow } from "@/lib/clients/types";

type UserSummary = { id: string; name: string; email: string };

type ClientHistoryWithUser = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  occurredAt: Date;
  createdAt: Date;
  createdBy: UserSummary;
};

type ClientWithHistory = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  source: string | null;
  isRecurring: boolean;
  notes: string | null;
  createdBy: UserSummary;
  history: ClientHistoryWithUser[];
  createdAt: Date;
  updatedAt: Date;
};

export const CLIENT_INCLUDE_HISTORY = {
  createdBy: { select: { id: true, name: true, email: true } },
  history: {
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { occurredAt: "desc" },
    take: 8,
  },
} as const;

export function mapClientHistoryToRow(history: ClientHistoryWithUser): ClientHistoryRow {
  return {
    ...history,
    occurredAt: history.occurredAt.toISOString(),
    createdAt: history.createdAt.toISOString(),
  };
}

export function mapClientToRow(client: ClientWithHistory): ClientRow {
  return {
    ...client,
    history: client.history.map(mapClientHistoryToRow),
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}
