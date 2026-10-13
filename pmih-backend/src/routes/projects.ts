import { Router } from 'express';
import { getActor } from '../lib/actor';
import { asyncHandler } from '../lib/errors';
import { idParamSchema } from '../schemas/common';
import { createProjectSchema, listProjectsQuerySchema, updateProjectSchema } from '../schemas/project.schema';
import * as projectService from '../services/project.service';

export const projectsRouter = Router();

projectsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listProjectsQuerySchema.parse(req.query);
    res.json(await projectService.listProjects(query));
  })
);

projectsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    res.json(await projectService.getProject(id));
  })
);

projectsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createProjectSchema.parse(req.body);
    res.status(201).json(await projectService.createProject(input, getActor(req)));
  })
);

projectsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const input = updateProjectSchema.parse(req.body);
    res.json(await projectService.updateProject(id, input, getActor(req)));
  })
);

projectsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await projectService.deleteProject(id, getActor(req));
    res.status(204).send();
  })
);