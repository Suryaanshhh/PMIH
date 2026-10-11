import type { Prisma } from '@prisma/client';

// Turns any object (including Dates) into something safe to store in a Json column.
export const toJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;