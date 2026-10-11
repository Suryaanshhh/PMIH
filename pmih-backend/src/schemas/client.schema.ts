import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.email().optional(),
  role: z.string().trim().max(100).optional(),
});

// Shared fields. No defaults here, so the update schema can't reset anything by accident.
const clientFields = z.object({
  name: z.string().trim().min(1).max(255),
  industry: z.string().trim().max(100).optional(),
  keyContacts: z.array(contactSchema),
});

export const createClientSchema = clientFields.extend({
  keyContacts: z.array(contactSchema).default([]),
});

export const updateClientSchema = clientFields.partial();

export const listClientsQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;