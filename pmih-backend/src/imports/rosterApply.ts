import type { Prisma, PrismaClient } from '@prisma/client';
import { canonicalJson, sha256 } from '../lib/hash';
import { logger } from '../lib/logger';
import type { ExistingResource, RosterPlan } from './rosterPlan';

/** Read current resources (plus capacity) so the pure planner can compare against them. */
export async function loadExistingResources(prisma: PrismaClient): Promise<ExistingResource[]> {
  const rows = await prisma.resource.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      primaryDepartment: true,
      availability: { select: { weeklyCapacityHours: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    role: r.role,
    primaryDepartment: r.primaryDepartment,
    weeklyCapacityHours: r.availability ? Number(r.availability.weeklyCapacityHours) : null,
  }));
}

export interface ApplyContext {
  sourceName: string; // e.g. the uploaded file name without extension
  actor: string; // who confirmed the import (placeholder until auth exists)
}

export interface ApplyResult {
  syncJobId: string;
  created: number;
  updated: number;
}

const json = (v: unknown) => v as Prisma.InputJsonValue;

/**
 * Write the plan in ONE transaction: either every change lands or none does.
 * For each created/updated resource we also store a SourceRecord (the uploaded row) and an
 * AuditEvent that points at it, so every resource can be traced back to its source.
 */
export async function applyRosterPlan(prisma: PrismaClient, plan: RosterPlan, ctx: ApplyContext): Promise<ApplyResult> {
  const startedAt = new Date();
  const work = plan.resources.filter((r) => r.action !== 'unchanged');

  try {
    return await prisma.$transaction(
      async (tx) => {
        const job = await tx.syncJob.create({
          data: { connectorName: 'csv-roster-import', status: 'RUNNING', startedAt },
        });

        let created = 0;
        let updated = 0;

        for (const r of work) {
          const sourceRecordId = `${ctx.sourceName}::roster::${r.email}`;
          const contentHash = sha256(`UPLOAD|${sourceRecordId}|${canonicalJson(r.raw)}`);

          // upsert: re-importing identical content must not violate the unique contentHash
          const source = await tx.sourceRecord.upsert({
            where: { contentHash },
            update: {},
            create: {
              sourceSystem: 'UPLOAD',
              sourceRecordId,
              sourceTimestamp: startedAt,
              relevantExcerpt: `${r.fullName} <${r.email}>, ${r.role}, ${r.department}`,
              accessClassification: 'CONFIDENTIAL',
              contentHash,
              originalMetadata: json({ importKind: 'roster', sourceName: ctx.sourceName, rowNumber: r.rowNumber, row: r.raw }),
            },
          });

          if (r.action === 'create') {
            const resource = await tx.resource.create({
              data: {
                fullName: r.fullName,
                email: r.email,
                role: r.role,
                primaryDepartment: r.department,
                ...(r.weeklyCapacityHours !== null
                  ? { availability: { create: { weeklyCapacityHours: r.weeklyCapacityHours } } }
                  : {}),
              },
            });
            await tx.auditEvent.create({
              data: {
                eventType: 'CREATE',
                actorUserId: ctx.actor,
                entityAffected: 'Resource',
                entityId: resource.id,
                sourceRecordId: source.id,
                afterState: json({ fullName: r.fullName, email: r.email, role: r.role, primaryDepartment: r.department, weeklyCapacityHours: r.weeklyCapacityHours }),
                userConfirmed: true,
              },
            });
            created++;
          } else {
            const id = r.existingId!;
            await tx.resource.update({
              where: { id },
              data: { fullName: r.fullName, role: r.role, primaryDepartment: r.department },
            });
            if (r.weeklyCapacityHours !== null) {
              await tx.resourceAvailability.upsert({
                where: { resourceId: id },
                update: { weeklyCapacityHours: r.weeklyCapacityHours },
                create: { resourceId: id, weeklyCapacityHours: r.weeklyCapacityHours },
              });
            }
            await tx.auditEvent.create({
              data: {
                eventType: 'UPDATE',
                actorUserId: ctx.actor,
                entityAffected: 'Resource',
                entityId: id,
                sourceRecordId: source.id,
                beforeState: json(Object.fromEntries(Object.entries(r.changes).map(([k, v]) => [k, v.from]))),
                afterState: json(Object.fromEntries(Object.entries(r.changes).map(([k, v]) => [k, v.to]))),
                userConfirmed: true,
              },
            });
            updated++;
          }
        }

        await tx.syncJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            recordsProcessed: created + updated,
            failedRecords: plan.summary.reject,
          },
        });
        await tx.auditEvent.create({
          data: {
            eventType: 'SYNC_EXECUTION',
            actorUserId: ctx.actor,
            entityAffected: 'SyncJob',
            entityId: job.id,
            afterState: json({ connector: 'csv-roster-import', sourceName: ctx.sourceName, summary: plan.summary }),
            userConfirmed: true,
          },
        });

        return { syncJobId: job.id, created, updated };
      },
      // Supabase is a network hop away; 70 rows x several queries can exceed Prisma's 5s default.
      { timeout: 120_000, maxWait: 10_000 }
    );
  } catch (err: any) {
    logger.error({ err }, 'Roster import failed and was rolled back');
    // Outside the rolled-back transaction, record that the attempt failed.
    await prisma.syncJob
      .create({
        data: {
          connectorName: 'csv-roster-import',
          status: 'FAILED',
          startedAt,
          completedAt: new Date(),
          failedRecords: work.length,
          errorDetails: json({ message: String(err?.message ?? err).slice(0, 2000) }),
        },
      })
      .catch(() => undefined);
    throw err;
  }
}