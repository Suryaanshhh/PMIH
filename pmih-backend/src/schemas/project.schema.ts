import { z } from 'zod';

export const PROJECT_STATUSES = ['PROPOSED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;

const projectStatus = z.enum(PROJECT_STATUSES);
const isoDate = z.iso.date(); // only "YYYY-MM-DD"; rejects "01/04/2026" and "2026-02-30"
const name = z.string().trim().min(1).max(255);

// strictObject rejects unknown keys. That is how healthStatus (read-only) and
// clientId (cannot be changed after creation) are blocked with a clear 400.
export const createProjectSchema = z.strictObject({
  clientId: z.uuid(),
  name,
  description: z.string().trim().max(5000).optional(),
  phase: z.string().trim().max(100).optional(),
  status: projectStatus.default('PROPOSED'), // default lives ONLY here, never in update
  programId: z.uuid().optional(),
  startDate: isoDate.optional(),
  targetEndDate: isoDate.optional(),
  actualEndDate: isoDate.optional(),
});

// Written out on purpose (not .partial()), so nothing gets a default on PATCH.
// null means "clear this field".
export const updateProjectSchema = z.strictObject({
  name: name.optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  phase: z.string().trim().max(100).nullable().optional(),
  status: projectStatus.optional(),
  programId: z.uuid().nullable().optional(),
  startDate: isoDate.nullable().optional(),
  targetEndDate: isoDate.nullable().optional(),
  actualEndDate: isoDate.nullable().optional(),
});

export const listProjectsQuerySchema = z.object({
  search: z.string().trim().optional(),
  clientId: z.uuid().optional(),
  status: projectStatus.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;