import { z } from 'zod';

const isoDate = z.iso.date(); // "YYYY-MM-DD" only
const percentage = z.number().gt(0).max(100);
const hours = z.number().gt(0).max(100000);


// resourceId and projectId can only be set when creating. To move someone, end one allocation and create another.
export const createAllocationSchema = z.strictObject({
  resourceId: z.uuid(),
  projectId: z.uuid(),
  allocatedPercentage: percentage,
  plannedEffortHours: hours.optional(), // if omitted, the API calculates an estimate
  startDate: isoDate,
  endDate: isoDate,

});

export const updateAllocationSchema = z.strictObject({
  allocatedPercentage: percentage.optional(),
  plannedEffortHours: hours.optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  
});

export const listAllocationsQuerySchema = z.object({
  resourceId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  activeOn: isoDate.optional(), // allocations covering this date
  from: isoDate.optional(), // allocations overlapping the window from..to
  to: isoDate.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateAllocationInput = z.infer<typeof createAllocationSchema>;
export type UpdateAllocationInput = z.infer<typeof updateAllocationSchema>;
export type ListAllocationsQuery = z.infer<typeof listAllocationsQuerySchema>;