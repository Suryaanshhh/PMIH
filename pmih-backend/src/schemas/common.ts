import { z } from 'zod';

// Validates /:id so a bad value gives a clean 400, not a Prisma error.
export const idParamSchema = z.object({ id: z.uuid() });