import type { Request } from 'express';

// Placeholder until you build auth. Every route calls this, so adding
// real auth later means changing this one function.
export const getActor = (_req: Request): string => 'local-dev-user';