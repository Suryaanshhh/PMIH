import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../lib/errors';
import { toJson } from '../lib/json';
import type { CreateProjectInput, ListProjectsQuery, UpdateProjectInput } from '../schemas/project.schema';

const cleanName = (s: string) => s.replace(/\s+/g, ' ').trim();
const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);
const toDateString = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

// Everything that hangs off a project. Your schema CASCADES deletes to most of these.
const CHILD_COUNTS = {
  tasks: true,
  milestones: true,
  deliverables: true,
  risks: true,
  issues: true,
  changeRequests: true,
  resourceAllocations: true,
  statusUpdates: true,
  sourceRecords: true,
} as const;

// Project names are unique per client (enforced here; the database does not enforce it).
async function assertNameAvailable(clientId: string, name: string, excludeId?: string) {
  const existing = await prisma.project.findFirst({
    where: {
      clientId,
      name: { equals: name, mode: 'insensitive' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) throw new AppError(409, 'PROJECT_NAME_TAKEN', `This client already has a project named "${name}"`);
}

async function assertProgramMatchesClient(programId: string, clientId: string) {
  const program = await prisma.program.findUnique({ where: { id: programId }, select: { clientId: true } });
  if (!program) throw new AppError(400, 'PROGRAM_NOT_FOUND', 'programId does not match any program');
  if (program.clientId !== clientId) {
    throw new AppError(400, 'PROGRAM_CLIENT_MISMATCH', 'That program belongs to a different client');
  }
}

// ISO date strings (YYYY-MM-DD) compare correctly as plain strings.
function assertDatesValid(start: string | null, target: string | null, actual: string | null) {
  if (start && target && target < start) {
    throw new AppError(400, 'INVALID_DATES', 'targetEndDate cannot be before startDate');
  }
  if (start && actual && actual < start) {
    throw new AppError(400, 'INVALID_DATES', 'actualEndDate cannot be before startDate');
  }
}

export async function listProjects(query: ListProjectsQuery) {
  const where: Prisma.ProjectWhereInput = {
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { tasks: true, milestones: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
}

export async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      program: { select: { id: true, name: true } },
      _count: { select: CHILD_COUNTS },
    },
  });
  if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  return project;
}

export async function createProject(input: CreateProjectInput, actor: string) {
  const client = await prisma.client.findUnique({ where: { id: input.clientId }, select: { id: true } });
  if (!client) throw new AppError(400, 'CLIENT_NOT_FOUND', 'clientId does not match any client');

  const name = cleanName(input.name);
  await assertNameAvailable(input.clientId, name);
  if (input.programId) await assertProgramMatchesClient(input.programId, input.clientId);
  assertDatesValid(input.startDate ?? null, input.targetEndDate ?? null, input.actualEndDate ?? null);

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        clientId: input.clientId,
        programId: input.programId,
        name,
        description: input.description,
        phase: input.phase,
        status: input.status,
        // healthStatus is intentionally not set: the database default (GREEN) applies.
        startDate: input.startDate ? toDate(input.startDate) : undefined,
        targetEndDate: input.targetEndDate ? toDate(input.targetEndDate) : undefined,
        actualEndDate: input.actualEndDate ? toDate(input.actualEndDate) : undefined,
      },
    });
    await tx.auditEvent.create({
      data: {
        eventType: 'CREATE',
        actorUserId: actor,
        entityAffected: 'Project',
        entityId: project.id,
        afterState: toJson(project),
        userConfirmed: true,
      },
    });
    return project;
  });
}

export async function updateProject(id: string, input: UpdateProjectInput, actor: string) {
  const before = await prisma.project.findUnique({ where: { id } });
  if (!before) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');

  const data: Prisma.ProjectUncheckedUpdateInput = {};

  if (input.name !== undefined) {
    const name = cleanName(input.name);
    await assertNameAvailable(before.clientId, name, id); // excludes this project itself
    data.name = name;
  }
  if (input.description !== undefined) data.description = input.description;
  if (input.phase !== undefined) data.phase = input.phase;
  if (input.status !== undefined) data.status = input.status;

  if (input.programId !== undefined) {
    if (input.programId !== null) await assertProgramMatchesClient(input.programId, before.clientId);
    data.programId = input.programId;
  }

  // Validate dates using the FINAL values: what the request sends, else what is stored.
  const pick = (sent: string | null | undefined, stored: Date | null) =>
    sent !== undefined ? sent : toDateString(stored);
  const startDate = pick(input.startDate, before.startDate);
  const targetEndDate = pick(input.targetEndDate, before.targetEndDate);
  const actualEndDate = pick(input.actualEndDate, before.actualEndDate);
  assertDatesValid(startDate, targetEndDate, actualEndDate);

  if (input.startDate !== undefined) data.startDate = input.startDate === null ? null : toDate(input.startDate);
  if (input.targetEndDate !== undefined) data.targetEndDate = input.targetEndDate === null ? null : toDate(input.targetEndDate);
  if (input.actualEndDate !== undefined) data.actualEndDate = input.actualEndDate === null ? null : toDate(input.actualEndDate);

  if (Object.keys(data).length === 0) {
    throw new AppError(400, 'NOTHING_TO_UPDATE', 'Send at least one field to change');
  }

  return prisma.$transaction(async (tx) => {
    const after = await tx.project.update({ where: { id }, data });
    await tx.auditEvent.create({
      data: {
        eventType: 'UPDATE',
        actorUserId: actor,
        entityAffected: 'Project',
        entityId: id,
        beforeState: toJson(before),
        afterState: toJson(after),
        userConfirmed: true,
      },
    });
    return after;
  });
}

export async function deleteProject(id: string, actor: string) {
  await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id },
      include: { _count: { select: CHILD_COUNTS } },
    });
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');

    // Deleting a project would cascade to its tasks, milestones, risks, etc., so refuse instead.
    const { _count, ...plain } = project;
    const inUse = Object.entries(_count).filter(([, n]) => n > 0);
    if (inUse.length > 0) {
      throw new AppError(409, 'PROJECT_IN_USE', 'Cannot delete a project that still has related records', Object.fromEntries(inUse));
    }

    await tx.project.delete({ where: { id } });
    await tx.auditEvent.create({
      data: {
        eventType: 'DELETE',
        actorUserId: actor,
        entityAffected: 'Project',
        entityId: id,
        beforeState: toJson(plain),
        userConfirmed: true,
      },
    });
  });
}