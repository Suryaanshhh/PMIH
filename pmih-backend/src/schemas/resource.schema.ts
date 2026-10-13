import { z } from 'zod';

const isValidTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// Trim, lowercase, then validate. Lowercasing here keeps emails consistent with the roster import.
const email = z.string().trim().toLowerCase().pipe(z.email().max(255));

// Capacity bounds match the roster import (greater than 0, at most 80).
const availabilitySchema = z.strictObject({
  weeklyCapacityHours: z.number().gt(0).max(80).optional(),
  timezone: z.string().trim().refine(isValidTimeZone, 'Unknown timezone, e.g. "Asia/Kolkata"').optional(),
  maxSimultaneousProjects: z.number().int().min(1).max(20).optional(),
});

// hourlyCost is deliberately NOT accepted: strictObject returns 400 if it is sent.
export const createResourceSchema = z.strictObject({
  fullName: z.string().trim().min(1).max(255),
  email,
  role: z.string().trim().min(1).max(100),
  primaryDepartment: z.string().trim().min(1).max(100),
  availability: availabilitySchema.optional(),
});

export const updateResourceSchema = z.strictObject({
  fullName: z.string().trim().min(1).max(255).optional(),
  email: email.optional(),
  role: z.string().trim().min(1).max(100).optional(),
  primaryDepartment: z.string().trim().min(1).max(100).optional(),
  availability: availabilitySchema.optional(),
});

export const listResourcesQuerySchema = z.object({
  search: z.string().trim().optional(),
  department: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type ListResourcesQuery = z.infer<typeof listResourcesQuerySchema>;