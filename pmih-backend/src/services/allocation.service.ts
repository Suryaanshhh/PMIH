import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { DEFAULT_WEEKLY_CAPACITY_HOURS, OVER_ALLOCATION_PCT } from '../config/thresholds';
import { estimatePlannedHours, peakAllocation, type Interval } from '../lib/allocation';
import { AppError } from '../lib/errors';
import { toJson } from '../lib/json';
import type { CreateAllocationInput, ListAllocationsQuery, UpdateAllocationInput } from '../schemas/allocation.schema';


const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);
const toDateString = (d: Date) => d.toISOString().slice(0, 10);

const withRelations = {
  resource: { select: { id: true, fullName: true } },
  project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
} as const;

function assertDatesValid(start: string, end: string) {
  if (end < start) throw new AppError(400, 'INVALID_DATES', 'endDate cannot be before startDate');
}

// Same person on the same project twice at the same time makes no sense: edit the existing one instead.
async function assertNoSameProjectOverlap(resourceId: string, projectId: string, start: string, end: string, excludeId?: string) {
  const clash = await prisma.resourceAllocation.findFirst({
    where: {
      resourceId,
      projectId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startDate: { lte: toDate(end) },
      endDate: { gte: toDate(start) },
    },
    select: { id: true, startDate: true, endDate: true },
  });
  if (clash) {
    throw new AppError(
      409,
      'ALLOCATION_OVERLAP',
      'This resource already has an allocation on this project that overlaps these dates. Change that one instead.',
      { allocationId: clash.id, startDate: toDateString(clash.startDate), endDate: toDateString(clash.endDate) }
    );
  }
}

// Over-allocation is a FINDING, not an error: we save the allocation and tell the caller.
async function overAllocationWarnings(resourceId: string, start: string, end: string, pct: number, excludeId?: string): Promise<string[]> {
  const others = await prisma.resourceAllocation.findMany({
    where: {
      resourceId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startDate: { lte: toDate(end) },
      endDate: { gte: toDate(start) },
    },
    select: { startDate: true, endDate: true, allocatedPercentage: true, project: { select: { name: true } } },
  });
  const intervals: Interval[] = others.map((o) => ({
    start: toDateString(o.startDate),
    end: toDateString(o.endDate),
    pct: Number(o.allocatedPercentage),
  }));
  const { peak, on } = peakAllocation({ start, end, pct }, intervals);
  if (peak <= OVER_ALLOCATION_PCT) return [];
  const list = others.map((o) => `${o.project.name} ${Number(o.allocatedPercentage)}%`).join(', ');
  return [`Over-allocated: total reaches ${peak}% on ${on} (limit ${OVER_ALLOCATION_PCT}%). Other allocations in this period: ${list}.`];
}

export async function listAllocations(query: ListAllocationsQuery) {
  if (query.from && query.to && query.to < query.from) {
    throw new AppError(400, 'INVALID_DATES', '"to" cannot be before "from"');
  }
  const and: Prisma.ResourceAllocationWhereInput[] = [];
  if (query.activeOn) and.push({ startDate: { lte: toDate(query.activeOn) }, endDate: { gte: toDate(query.activeOn) } });
  if (query.from) and.push({ endDate: { gte: toDate(query.from) } });
  if (query.to) and.push({ startDate: { lte: toDate(query.to) } });

  const where: Prisma.ResourceAllocationWhereInput = {
    ...(query.resourceId ? { resourceId: query.resourceId } : {}),
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(and.length ? { AND: and } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.resourceAllocation.findMany({
      where,
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: withRelations,
    }),
    prisma.resourceAllocation.count({ where }),
  ]);
  return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
}

export async function getAllocation(id: string) {
  const allocation = await prisma.resourceAllocation.findUnique({ where: { id }, include: withRelations });
  if (!allocation) throw new AppError(404, 'ALLOCATION_NOT_FOUND', 'Allocation not found');
  return allocation;
}

export async function createAllocation(input: CreateAllocationInput, actor: string) {
  assertDatesValid(input.startDate, input.endDate);

  const [resource, project] = await Promise.all([
    prisma.resource.findUnique({
      where: { id: input.resourceId },
      select: { id: true, availability: { select: { weeklyCapacityHours: true } } },
    }),
    prisma.project.findUnique({ where: { id: input.projectId }, select: { id: true, status: true } }),
  ]);
  if (!resource) throw new AppError(400, 'RESOURCE_NOT_FOUND', 'resourceId does not match any resource');
  if (!project) throw new AppError(400, 'PROJECT_NOT_FOUND', 'projectId does not match any project');

  await assertNoSameProjectOverlap(input.resourceId, input.projectId, input.startDate, input.endDate);

  const warnings: string[] = [];
  if (project.status === 'COMPLETED' || project.status === 'CANCELLED') {
    warnings.push(`This project is ${project.status}.`);
  }
  warnings.push(...(await overAllocationWarnings(input.resourceId, input.startDate, input.endDate, input.allocatedPercentage)));

  // plannedEffortHours is required by your schema. If the caller did not send it we estimate it.
  const calculated = input.plannedEffortHours === undefined;
  const weeklyCapacity = resource.availability
    ? Number(resource.availability.weeklyCapacityHours)
    : DEFAULT_WEEKLY_CAPACITY_HOURS;
  const plannedEffortHours =
    input.plannedEffortHours ??
    estimatePlannedHours(input.allocatedPercentage, weeklyCapacity, input.startDate, input.endDate);
  if (calculated && plannedEffortHours === 0) {
    warnings.push('The date range has no working days (Mon-Fri), so the estimated hours are 0.');
  }

  const allocation = await prisma.$transaction(async (tx) => {
    const created = await tx.resourceAllocation.create({
      data: {
        resourceId: input.resourceId,
        projectId: input.projectId,
        allocatedPercentage: input.allocatedPercentage,
        plannedEffortHours,
        startDate: toDate(input.startDate),
        endDate: toDate(input.endDate),
        
      },
    });
    await tx.auditEvent.create({
      data: {
        eventType: 'CREATE',
        actorUserId: actor,
        entityAffected: 'ResourceAllocation',
        entityId: created.id,
        afterState: toJson({ ...created, plannedEffortHoursCalculated: calculated }),
        userConfirmed: true,
      },
    });
    return created;
  });

  return { allocation, warnings, plannedEffortHoursCalculated: calculated };
}

export async function updateAllocation(id: string, input: UpdateAllocationInput, actor: string) {
  const before = await prisma.resourceAllocation.findUnique({ where: { id } });
  if (!before) throw new AppError(404, 'ALLOCATION_NOT_FOUND', 'Allocation not found');

  // Check the FINAL values: what the request sends, else what is stored.
  const start = input.startDate ?? toDateString(before.startDate);
  const end = input.endDate ?? toDateString(before.endDate);
  const pct = input.allocatedPercentage ?? Number(before.allocatedPercentage);
  assertDatesValid(start, end);

  const data: Prisma.ResourceAllocationUncheckedUpdateInput = {};
  if (input.allocatedPercentage !== undefined) data.allocatedPercentage = input.allocatedPercentage;
  if (input.plannedEffortHours !== undefined) data.plannedEffortHours = input.plannedEffortHours;
  if (input.startDate !== undefined) data.startDate = toDate(input.startDate);
  if (input.endDate !== undefined) data.endDate = toDate(input.endDate);
  
  if (Object.keys(data).length === 0) {
    throw new AppError(400, 'NOTHING_TO_UPDATE', 'Send at least one field to change');
  }

  const datesChanged = input.startDate !== undefined || input.endDate !== undefined;
  const scheduleChanged = datesChanged || input.allocatedPercentage !== undefined;

  if (datesChanged) await assertNoSameProjectOverlap(before.resourceId, before.projectId, start, end, id);

  const warnings: string[] = [];
  if (scheduleChanged) {
    warnings.push(...(await overAllocationWarnings(before.resourceId, start, end, pct, id)));
    if (input.plannedEffortHours === undefined) {
      warnings.push(
        `Planned effort hours were not recalculated (still ${Number(before.plannedEffortHours)}). Send plannedEffortHours to change them.`
      );
    }
  }

  const allocation = await prisma.$transaction(async (tx) => {
    const after = await tx.resourceAllocation.update({ where: { id }, data });
    await tx.auditEvent.create({
      data: {
        eventType: 'UPDATE',
        actorUserId: actor,
        entityAffected: 'ResourceAllocation',
        entityId: id,
        beforeState: toJson(before),
        afterState: toJson(after),
        userConfirmed: true,
      },
    });
    return after;
  });

  return { allocation, warnings };
}

export async function deleteAllocation(id: string, actor: string) {
  await prisma.$transaction(async (tx) => {
    const before = await tx.resourceAllocation.findUnique({ where: { id } });
    if (!before) throw new AppError(404, 'ALLOCATION_NOT_FOUND', 'Allocation not found');
    await tx.resourceAllocation.delete({ where: { id } });
    await tx.auditEvent.create({
      data: {
        eventType: 'DELETE',
        actorUserId: actor,
        entityAffected: 'ResourceAllocation',
        entityId: id,
        beforeState: toJson(before),
        userConfirmed: true,
      },
    });
  });
}