import { Router } from 'express';
import { getActor } from '../lib/actor';
import { asyncHandler } from '../lib/errors';
import { createAllocationSchema, listAllocationsQuerySchema, updateAllocationSchema } from '../schemas/allocation.schema';
import { idParamSchema } from '../schemas/common';
import * as allocationService from '../services/allocation.service';

export const allocationsRouter = Router();

allocationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listAllocationsQuerySchema.parse(req.query);
    res.json(await allocationService.listAllocations(query));
  })
);

allocationsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    res.json(await allocationService.getAllocation(id));
  })
);

allocationsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createAllocationSchema.parse(req.body);
    res.status(201).json(await allocationService.createAllocation(input, getActor(req)));
  })
);

allocationsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const input = updateAllocationSchema.parse(req.body);
    res.json(await allocationService.updateAllocation(id, input, getActor(req)));
  })
);

allocationsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await allocationService.deleteAllocation(id, getActor(req));
    res.status(204).send();
  })
);