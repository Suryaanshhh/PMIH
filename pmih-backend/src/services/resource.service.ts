import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../lib/errors';
import { toJson } from '../lib/json';
import type { CreateResourceInput, ListResourcesQuery, UpdateResourceInput } from '../schemas/resource.schema';

const cleanText = (s: string) => s.replace(/\s+/g, ' ').trim();

// Everything that points at a resource. Your schema RESTRICTS or CASCADES or SETS NULL on these,
// so we check up front and give a clean 409 instead of a database error or silent data loss.
const REFERENCE_COUNTS = {
  tasksOwned: true,
  subtasksAssigned: true,
  statusUpdatesAuthored: true,
  decisionsMade: true,
  commitmentsMade: true,
  actionItemsAssigned: true,
  risksOwned: true,
  issuesOwned: true,
  changeRequestsApproved: true,
  allocations: true,
} as const;

// Emails are stored lowercase, but the database column is case-sensitive, so compare case-insensitively.
async function assertEmailAvailable(email: string, excludeId?: string) {
  const existing = await prisma.resource.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) throw new AppError(409, 'RESOURCE_EMAIL_TAKEN', `A resource with email "${email}" already exists`);
}

const hasKeys = (o: object | undefined): o is object => !!o && Object.keys(o).length > 0;

export async function listResources(query: ListResourcesQuery) {
  const where: Prisma.ResourceWhereInput = {
    ...(query.department ? { primaryDepartment: { equals: query.department, mode: 'insensitive' } } : {}),
    ...(query.search
      ? {
          OR: [
            { fullName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      orderBy: { fullName: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        availability: true,
        _count: { select: { allocations: true, tasksOwned: true } },
      },
    }),
    prisma.resource.count({ where }),
  ]);

  return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
}

export async function getResource(id: string) {
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      availability: true,
      skills: { select: { skillName: true, proficiencyLevel: true } },
      _count: { select: { ...REFERENCE_COUNTS, skills: true, leaves: true } },
    },
  });
  if (!resource) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found');
  return resource;
}

export async function createResource(input: CreateResourceInput, actor: string) {
  const email = input.email; // already trimmed and lowercased by the schema
  await assertEmailAvailable(email);

  return prisma.$transaction(async (tx) => {
    const resource = await tx.resource.create({
      data: {
        fullName: cleanText(input.fullName),
        email,
        role: cleanText(input.role),
        primaryDepartment: cleanText(input.primaryDepartment),
        // Only create an availability row if the caller sent something (same as the roster import).
        ...(hasKeys(input.availability) ? { availability: { create: { ...input.availability } } } : {}),
      },
      include: { availability: true },
    });
    await tx.auditEvent.create({
      data: {
        eventType: 'CREATE',
        actorUserId: actor,
        entityAffected: 'Resource',
        entityId: resource.id,
        afterState: toJson(resource),
        userConfirmed: true,
      },
    });
    return resource;
  });
}

export async function updateResource(id: string, input: UpdateResourceInput, actor: string) {
  const before = await prisma.resource.findUnique({ where: { id }, include: { availability: true } });
  if (!before) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found');

  const data: Prisma.ResourceUpdateInput = {};
  if (input.fullName !== undefined) data.fullName = cleanText(input.fullName);
  if (input.role !== undefined) data.role = cleanText(input.role);
  if (input.primaryDepartment !== undefined) data.primaryDepartment = cleanText(input.primaryDepartment);
  if (input.email !== undefined) {
    await assertEmailAvailable(input.email, id); // excludes this resource itself
    data.email = input.email;
  }
  if (hasKeys(input.availability)) {
    // Update the row if it exists, create it (with defaults for unsent fields) if not.
    data.availability = { upsert: { create: { ...input.availability }, update: { ...input.availability } } };
  }

  if (Object.keys(data).length === 0) {
    throw new AppError(400, 'NOTHING_TO_UPDATE', 'Send at least one field to change');
  }

  return prisma.$transaction(async (tx) => {
    const after = await tx.resource.update({ where: { id }, data, include: { availability: true } });
    await tx.auditEvent.create({
      data: {
        eventType: 'UPDATE',
        actorUserId: actor,
        entityAffected: 'Resource',
        entityId: id,
        beforeState: toJson(before),
        afterState: toJson(after),
        userConfirmed: true,
      },
    });
    return after;
  });
}

export async function deleteResource(id: string, actor: string) {
  await prisma.$transaction(async (tx) => {
    const resource = await tx.resource.findUnique({
      where: { id },
      include: {
        availability: true,
        skills: true,
        leaves: true,
        _count: { select: REFERENCE_COUNTS },
      },
    });
    if (!resource) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found');

    const { _count, ...plain } = resource;
    const inUse = Object.entries(_count).filter(([, n]) => n > 0);
    if (inUse.length > 0) {
      throw new AppError(409, 'RESOURCE_IN_USE', 'Cannot delete a resource that is still referenced', Object.fromEntries(inUse));
    }

    // Availability, skills and leaves are deleted with the resource (cascade); they are saved in beforeState.
    await tx.resource.delete({ where: { id } });
    await tx.auditEvent.create({
      data: {
        eventType: 'DELETE',
        actorUserId: actor,
        entityAffected: 'Resource',
        entityId: id,
        beforeState: toJson(plain),
        userConfirmed: true,
      },
    });
  });
}