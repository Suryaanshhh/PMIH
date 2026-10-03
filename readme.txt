================================================================================
          COMPLETE STEP-BY-STEP GUIDE: PRISMA ORM WITH NODE.JS & POSTGRESQL
================================================================================

--------------------------------------------------------------------------------
1. INSTALLATION & SETUP
--------------------------------------------------------------------------------

# In your project root:
npm install @prisma/client
npm install -D prisma dotenv tsx typescript @types/node

# Optional: Initialize standard tsconfig if needed
npx tsc --init

--------------------------------------------------------------------------------
2. ENVIRONMENT CONFIGURATION (.env)
--------------------------------------------------------------------------------

Add your connection string to `.env`:

# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
# For Supabase Session Pooler (port 5432):
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"

--------------------------------------------------------------------------------
3. INITIALIZE PRISMA DIRECTORY & SCHEMA
--------------------------------------------------------------------------------

Create the folder and schema file:
- Linux / macOS:
  mkdir -p prisma && touch prisma/schema.prisma
- Windows PowerShell:
  New-Item -ItemType Directory -Force -Path "prisma"
  New-Item -ItemType File -Force -Path "prisma\schema.prisma"

Place standard configuration in `prisma/schema.prisma`:

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgcrypto, pgvector(map: "vector")] // include if using vector embeddings
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

// Example Model
model User {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email     String   @unique @db.VarChar(255)
  name      String?  @db.VarChar(100)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  posts     Post[]

  @@map("users")
}

model Post {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title     String   @db.VarChar(255)
  content   String?  @db.Text
  authorId  String   @map("author_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([authorId])
  @@map("posts")
}

--------------------------------------------------------------------------------
4. VALIDATE & FORMAT SCHEMA
--------------------------------------------------------------------------------

# Automatically align and format your schema:
npx prisma format

# Validate schema syntax:
npx prisma validate

--------------------------------------------------------------------------------
5. GENERATE CLIENT & APPLY MIGRATIONS
--------------------------------------------------------------------------------

A. Standard Dev Flow (Brand new / clean local database):
   npx prisma migrate dev --name init_schema

B. Cloud / Managed Database Flow (Supabase, RDS, Neon):
   *Managed databases often have pre-installed extensions like 'uuid-ossp' or
   'pg_stat_statements' that cause drift warnings. Use this baseline flow:

   1. Create migration folder:
      Windows PowerShell:
      New-Item -ItemType Directory -Force -Path "prisma\migrations\20260101000000_init"

   2. Generate pure DDL SQL via schema diff:
      npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma\migrations\20260101000000_init\migration.sql

   3. CRITICAL WINDOWS STEP (Fix UTF-16 PowerShell BOM / Null bytes):
      If running on Windows PowerShell, avoid "string contains embedded null" by saving as UTF-8:
      $path = "prisma\migrations\20260101000000_init\migration.sql"
      $text = Get-Content$path -Raw
      [System.IO.File]::WriteAllText((Resolve-Path $path), $text, [System.Text.UTF8Encoding]::new($false))

   4. Apply migrations to DB directly:
      npx prisma migrate deploy

C. Generate Prisma Client Types:
   npx prisma generate

--------------------------------------------------------------------------------
6. CREATE SINGLETON CLIENT INSTANCE (src/config/prisma.ts)
--------------------------------------------------------------------------------

Prevents multiple client instances in development during hot-reloads:

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export const connectPrisma = async (): Promise<void> => {
  await prisma.$connect();
};

export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
};

--------------------------------------------------------------------------------
7. RUNTIME USAGE IN YOUR APPLICATION
--------------------------------------------------------------------------------

// 1. Create a Record:
const user = await prisma.user.create({
  data: {
    email: 'alex@example.com',
    name: 'Alex Mercer',
  },
});

// 2. Query with Relations and Filters:
const usersWithPosts = await prisma.user.findMany({
  where: {
    email: { endsWith: '@example.com' },
  },
  include: {
    posts: true,
  },
  orderBy: {
    createdAt: 'desc',
  },
  take: 10,
});

// 3. Transactions:
await prisma.$transaction(async (tx) => {
  const newUser = await tx.user.create({
    data: { email: 'jordan@example.com', name: 'Jordan' },
  });

  await tx.post.create({
    data: {
      title: 'First Post',
      authorId: newUser.id,
    },
  });
});

--------------------------------------------------------------------------------
8. DATABASE GUI / INSPECTION
--------------------------------------------------------------------------------

To view and edit data locally in a browser-based UI:
npx prisma studio

--------------------------------------------------------------------------------
9. COMMON TROUBLESHOOTING
--------------------------------------------------------------------------------

Problem: "string contains embedded null (P3018)"
Cause: PowerShell `>` redirect encodes text as UTF-16 LE.
Fix:
  1. Open migration.sql in VS Code, look at status bar, click UTF-16, select "Save with Encoding" -> "UTF-8".
  2. Mark as rolled back:
     npx prisma migrate resolve --rolled-back <migration_name>
  3. Re-run:
     npx prisma migrate deploy

Problem: "The defined default value is not a valid value of the enum"
Fix: Check enum definitions in `schema.prisma`. Enums are strictly typed and case-sensitive.

Problem: Schema updated, but TypeScript types aren't showing new fields
Fix:
  npx prisma generate
================================================================================







