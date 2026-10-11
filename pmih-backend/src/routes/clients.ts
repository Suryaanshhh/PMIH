import { Router } from 'express';
import { getActor } from '../lib/actor';
import { asyncHandler } from '../lib/errors';
import { createClientSchema, listClientsQuerySchema, updateClientSchema } from '../schemas/client.schema';
import { idParamSchema } from '../schemas/common';
import * as clientService from '../services/client.service';

export const clientsRouter = Router();

clientsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listClientsQuerySchema.parse(req.query);
    res.json(await clientService.listClients(query));
  })
);

clientsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    res.json(await clientService.getClient(id));
  })
);

clientsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createClientSchema.parse(req.body);
    res.status(201).json(await clientService.createClient(input, getActor(req)));
  })
);

clientsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const input = updateClientSchema.parse(req.body);
    res.json(await clientService.updateClient(id, input, getActor(req)));
  })
);

clientsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await clientService.deleteClient(id, getActor(req));
    res.status(204).send();
  })
);