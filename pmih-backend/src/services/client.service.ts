import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../lib/errors';
import { toJson } from '../lib/json'
import type { CreateClientInput, ListClientsQuery, UpdateClientInput } from '../schemas/client.schema';

const cleanName = (s: string) => s.replace(/\s+/g, ' ').trim();

// Your database does not enforce unique client names, so we enforce it here.
async function assertNameAvailable(name: string, excludeId?: string) {
  const existing = await prisma.client.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) throw new AppError(409, 'CLIENT_NAME_TAKEN', `A client named "${name}" already exists`);
}

export async function listClients(query: ListClientsQuery) {
  const where: Prisma.ClientWhereInput = query.search
    ? { name: { contains: query.search, mode: 'insensitive' } }
    : {};

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { _count: { select: { programs: true, projects: true } } },
    }),
    prisma.client.count({ where }),
  ]);

  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  };
}

export async function getClient(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      _count: { select: { programs: true, projects: true, tasks: true, commitments: true, sourceRecords: true } },
    },
  });
  if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found');
  return client;
}

export async function createClient(input: CreateClientInput, actor: string) {
  const name = cleanName(input.name);
  await assertNameAvailable(name);

  return prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: { name, industry: input.industry, keyContacts: toJson(input.keyContacts) },
    });
    await tx.auditEvent.create({
      data: {
        eventType: 'CREATE',
        actorUserId: actor,
        entityAffected: 'Client',
        entityId: client.id,
        afterState: toJson(client),
        userConfirmed: true,
      },
    });
    return client;
  });
}

export async function updateClient(id: string, input: UpdateClientInput, actor: string) {
  const before = await prisma.client.findUnique({ where: { id } });
  if (!before) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found');

  const data: Prisma.ClientUpdateInput = {};
  if (input.name !== undefined) {
    const name = cleanName(input.name);
    await assertNameAvailable(name, id); // excludes this client itself
    data.name = name;
  }
  if (input.industry !== undefined) data.industry = input.industry;
  if (input.keyContacts !== undefined) data.keyContacts = toJson(input.keyContacts);

  if (Object.keys(data).length === 0) {
    throw new AppError(400, 'NOTHING_TO_UPDATE', 'Send at least one field to change');
  }

  return prisma.$transaction(async (tx) => {
    const after = await tx.client.update({ where: { id }, data });
    await tx.auditEvent.create({
      data: {
        eventType: 'UPDATE',
        actorUserId: actor,
        entityAffected: 'Client',
        entityId: id,
        beforeState: toJson(before),
        afterState: toJson(after),
        userConfirmed: true,
      },
    });
    return after;
  });
}

export async function deleteClient(id: string, actor: string) {
  await prisma.$transaction(async (tx) => {
    const client = await tx.client.findUnique({
      where: { id },
      include: {
        _count: { select: { programs: true, projects: true, tasks: true, commitments: true, sourceRecords: true } },
      },
    });
    if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found');

    // Your schema CASCADES deletes from client to programs and projects (and so to their tasks),
    // so we refuse to delete anything that is still referenced.
    const { _count, ...plain } = client;
    const inUse = Object.entries(_count).filter(([, n]) => n > 0);
    if (inUse.length > 0) {
      throw new AppError(409, 'CLIENT_IN_USE', 'Cannot delete a client that is still referenced', Object.fromEntries(inUse));
    }

    await tx.client.delete({ where: { id } });
    await tx.auditEvent.create({
      data: {
        eventType: 'DELETE',
        actorUserId: actor,
        entityAffected: 'Client',
        entityId: id,
        beforeState: toJson(plain),
        userConfirmed: true,
      },
    });
  });
}