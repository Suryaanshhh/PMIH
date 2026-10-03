import 'dotenv/config'; // must stay the first import so env vars are loaded
import express, { Application } from 'express';
import cors from 'cors';
import { connectDB, closeDB, prisma } from './config/db';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check (also verifies database connectivity)
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`select 1`;
    res.status(200).json({ status: 'API is running', database: 'ok' });
  } catch {
    res.status(503).json({ status: 'API is running', database: 'unreachable' });
  }
});
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB(); // wait for the DB before accepting traffic
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await closeDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start();    