import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { logger } from './logger';

/** An error that is safe to show to the API caller. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

/** Express 4 does not catch rejected promises, so wrap every async handler. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.flatten() } });
    return;
  }
  if (err instanceof MulterError) {
    res.status(400).json({ error: { code: 'UPLOAD_ERROR', message: err.message } });
    return;
  }
  if (err?.code === 'P2002') {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with these unique values already exists' } });
    return;
  }
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
};