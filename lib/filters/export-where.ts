import type { Prisma } from "@/generated/prisma-client";
import type { Role } from "@/generated/prisma-client";
import { canViewTeamWide } from "@/lib/auth/roles";
import { CRM_UNASSIGNED } from "@/lib/filters/constants";

function containsAny(fields: string[], q: string): Prisma.LeadWhereInput {
  return {
    OR: fields.map((field) => ({ [field]: { contains: q } })),
  } as Prisma.LeadWhereInput;
}

export function buildLeadExportWhere(
  actor: { id: string; role: Role },
  params: URLSearchParams,
): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [];

  if (!canViewTeamWide(actor.role)) {
    and.push({
      OR: [{ assignedToId: actor.id }, { createdById: actor.id }],
    });
  }

  const status = params.get("status")?.trim();
  if (status) and.push({ status });

  const source = params.get("source")?.trim();
  if (source) and.push({ source });

  const country = params.get("country")?.trim();
  if (country) and.push({ country });

  const owner = params.get("owner")?.trim();
  if (owner === CRM_UNASSIGNED) and.push({ assignedToId: null });
  else if (owner) and.push({ assignedToId: owner });

  const createdBy = params.get("createdBy")?.trim();
  if (createdBy) and.push({ createdById: createdBy });

  if (params.get("openOnly") === "1") {
    and.push({ NOT: { status: { in: ["Won", "Lost"] } } });
  }

  const updatedFrom = params.get("updatedFrom")?.trim();
  const updatedTo = params.get("updatedTo")?.trim();
  if (updatedFrom || updatedTo) {
    const updatedAt: Prisma.DateTimeFilter = {};
    if (updatedFrom) updatedAt.gte = new Date(`${updatedFrom}T00:00:00.000Z`);
    if (updatedTo) updatedAt.lte = new Date(`${updatedTo}T23:59:59.999Z`);
    and.push({ updatedAt });
  }

  const q = params.get("q")?.trim();
  if (q) {
    and.push(
      containsAny(
        ["title", "clientName", "email", "phone", "company", "country", "source", "notes"],
        q,
      ),
    );
  }

  return and.length > 0 ? { AND: and } : {};
}

export function buildClientExportWhere(
  actor: { id: string; role: Role },
  params: URLSearchParams,
): Prisma.ClientWhereInput {
  const and: Prisma.ClientWhereInput[] = [];

  if (!canViewTeamWide(actor.role)) {
    and.push({ createdById: actor.id });
  }

  const source = params.get("source")?.trim();
  if (source) and.push({ source });

  const country = params.get("country")?.trim();
  if (country) and.push({ country });

  const company = params.get("company")?.trim();
  if (company) and.push({ company });

  const createdBy = params.get("createdBy")?.trim();
  if (createdBy) and.push({ createdById: createdBy });

  if (params.get("hasHistory") === "1") {
    and.push({ history: { some: {} } });
  }

  const q = params.get("q")?.trim();
  if (q) {
    and.push({
      OR: ["name", "email", "phone", "company", "country", "source", "notes"].map((field) => ({
        [field]: { contains: q },
      })),
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

export function buildDealExportWhere(
  actor: { id: string; role: Role },
  params: URLSearchParams,
): Prisma.DealWhereInput {
  const and: Prisma.DealWhereInput[] = [];

  if (!canViewTeamWide(actor.role)) {
    and.push({
      OR: [{ ownerId: actor.id }, { createdById: actor.id }],
    });
  }

  const stage = params.get("stage")?.trim();
  if (stage) and.push({ stage });

  const owner = params.get("owner")?.trim();
  if (owner === CRM_UNASSIGNED) and.push({ ownerId: null });
  else if (owner) and.push({ ownerId: owner });

  if (params.get("openOnly") === "1") {
    and.push({ NOT: { stage: { in: ["Closed Won", "Closed Lost"] } } });
  }

  const closeFrom = params.get("closeFrom")?.trim();
  const closeTo = params.get("closeTo")?.trim();
  if (closeFrom || closeTo) {
    const expectedCloseAt: Prisma.DateTimeNullableFilter = {};
    if (closeFrom) expectedCloseAt.gte = new Date(`${closeFrom}T00:00:00.000Z`);
    if (closeTo) expectedCloseAt.lte = new Date(`${closeTo}T23:59:59.999Z`);
    and.push({ expectedCloseAt });
  }

  const valueMin = params.get("valueMin")?.trim();
  const valueMax = params.get("valueMax")?.trim();
  if (valueMin || valueMax) {
    const value: Prisma.IntFilter = {};
    if (valueMin) {
      const min = Number.parseInt(valueMin, 10);
      if (Number.isFinite(min)) value.gte = min;
    }
    if (valueMax) {
      const max = Number.parseInt(valueMax, 10);
      if (Number.isFinite(max)) value.lte = max;
    }
    if (Object.keys(value).length > 0) and.push({ value });
  }

  const q = params.get("q")?.trim();
  if (q) {
    and.push({
      OR: ["title", "clientName", "notes"].map((field) => ({ [field]: { contains: q } })),
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

export function buildTaskExportWhere(
  actor: { id: string; role: Role },
  params: URLSearchParams,
): Prisma.CrmTaskWhereInput {
  const and: Prisma.CrmTaskWhereInput[] = [];

  if (!canViewTeamWide(actor.role)) {
    and.push({
      OR: [{ assignedToId: actor.id }, { createdById: actor.id }],
    });
  }

  const status = params.get("status")?.trim();
  if (status) and.push({ status });

  const priority = params.get("priority")?.trim();
  if (priority) and.push({ priority });

  const owner = params.get("owner")?.trim();
  if (owner === CRM_UNASSIGNED) and.push({ assignedToId: null });
  else if (owner) and.push({ assignedToId: owner });

  const createdBy = params.get("createdBy")?.trim();
  if (createdBy) and.push({ createdById: createdBy });

  if (params.get("noDueDate") === "1") {
    and.push({ dueAt: null });
  }

  const dueFrom = params.get("dueFrom")?.trim();
  const dueTo = params.get("dueTo")?.trim();
  if (dueFrom || dueTo) {
    const dueAt: Prisma.DateTimeNullableFilter = {};
    if (dueFrom) dueAt.gte = new Date(`${dueFrom}T00:00:00.000Z`);
    if (dueTo) dueAt.lte = new Date(`${dueTo}T23:59:59.999Z`);
    and.push({ dueAt });
  }

  if (params.get("overdueOnly") === "1") {
    and.push({
      dueAt: { lt: new Date() },
      NOT: { status: { in: ["Done", "Completed", "Cancelled"] } },
    });
  }

  const q = params.get("q")?.trim();
  if (q) {
    and.push({
      OR: ["title", "description"].map((field) => ({ [field]: { contains: q } })),
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

export function buildBidExportWhere(
  actor: { id: string; role: Role },
  params: URLSearchParams,
): Prisma.BidWhereInput {
  const and: Prisma.BidWhereInput[] = [];

  if (!canViewTeamWide(actor.role)) {
    and.push({ addedById: actor.id });
  }

  const status = params.get("status")?.trim();
  if (status) and.push({ status });

  const profile = params.get("profile")?.trim();
  if (profile) and.push({ profileId: profile });

  const niche = params.get("niche")?.trim();
  if (niche) and.push({ nicheId: niche });

  const addedBy = params.get("addedBy")?.trim();
  if (addedBy) and.push({ addedById: addedBy });

  const dateFrom = params.get("dateFrom")?.trim();
  const dateTo = params.get("dateTo")?.trim();
  if (dateFrom || dateTo) {
    const date: Prisma.DateTimeFilter = {};
    if (dateFrom) date.gte = new Date(`${dateFrom}T00:00:00.000Z`);
    if (dateTo) date.lte = new Date(`${dateTo}T23:59:59.999Z`);
    and.push({ date });
  }

  const valueMin = params.get("valueMin")?.trim();
  const valueMax = params.get("valueMax")?.trim();
  if (valueMin || valueMax) {
    const value: Prisma.IntFilter = {};
    if (valueMin) {
      const min = Number.parseInt(valueMin, 10);
      if (Number.isFinite(min)) value.gte = min;
    }
    if (valueMax) {
      const max = Number.parseInt(valueMax, 10);
      if (Number.isFinite(max)) value.lte = max;
    }
    if (Object.keys(value).length > 0) and.push({ value });
  }

  const q = params.get("q")?.trim();
  if (q) {
    and.push({
      OR: ["client", "bidLink", "notes", "status"].map((field) => ({ [field]: { contains: q } })),
    });
  }

  return and.length > 0 ? { AND: and } : {};
}
