import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
});

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    const [row] = await prisma.$queryRaw<{ db: string }[]>`select current_database() as db`;
    console.log(`Postgres connected via Prisma: ${row.db}`);
  } catch (error: any) {
    console.error(`Error connecting to Postgres: ${error.message}`);
    process.exit(1);
  }
};

export const closeDB = async (): Promise<void> => {
  await prisma.$disconnect();
};