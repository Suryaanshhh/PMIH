import { Router } from 'express';
import { getActor } from '../lib/actor';
import { asyncHandler } from '../lib/errors';
import { idParamSchema } from '../schemas/common';
import { createResourceSchema, listResourcesQuerySchema, updateResourceSchema } from '../schemas/resource.schema';
import * as resourceService from '../services/resource.service';

export const resourcesRouter = Router();

resourcesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listResourcesQuerySchema.parse(req.query);
    res.json(await resourceService.listResources(query));
  })
);

resourcesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    res.json(await resourceService.getResource(id));
  })
);

resourcesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createResourceSchema.parse(req.body);
    res.status(201).json(await resourceService.createResource(input, getActor(req)));
  })
);

resourcesRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const input = updateResourceSchema.parse(req.body);
    res.json(await resourceService.updateResource(id, input, getActor(req)));
  })
);

resourcesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await resourceService.deleteResource(id, getActor(req));
    res.status(204).send();
  })
);