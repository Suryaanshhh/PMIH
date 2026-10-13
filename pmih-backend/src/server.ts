import 'dotenv/config'; // must stay the first import so env vars are loaded
import cors from 'cors';
import express, { Application } from 'express';
import { closeDB, connectDB, prisma } from './config/db';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './lib/errors';
import { logger } from './lib/logger';
import { importsRouter } from './routes/imports';
import { clientsRouter } from './routes/clients';
import { projectsRouter } from './routes/projects';   
import { resourcesRouter } from './routes/resources';
import { allocationsRouter } from './routes/allocations'; 

const app: Application = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`select 1`;
    res.status(200).json({ status: 'API is running', database: 'ok' });
  } catch {
    res.status(503).json({ status: 'API is running', database: 'unreachable' });
  }
});

app.use('/api/imports', importsRouter);
app.use('/api/clients', clientsRouter); 
app.use('/api/projects', projectsRouter); 
app.use('/api/resources', resourcesRouter); 
app.use('/api/allocations', allocationsRouter);

// These two must come last
app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
  await connectDB();
  const server = app.listen(env.PORT, () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down...`);
    server.close(async () => {
      await closeDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start();