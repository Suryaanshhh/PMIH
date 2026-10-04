import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../config/db';
import { applyRosterPlan, loadExistingResources } from '../imports/rosterApply';
import { parseCsv } from '../imports/csv';
import { suggestMapping } from '../imports/mapping';
import { ROSTER_REQUIRED, ROSTER_SYNONYMS, planRosterImport, type RosterMapping } from '../imports/rosterPlan';
import { AppError, asyncHandler } from '../lib/errors';

export const importsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

function requireCsv(file: Express.Multer.File | undefined) {
  if (!file) throw new AppError(400, 'FILE_REQUIRED', 'Attach a CSV file as the form field "file"');
  if (!/\.csv$/i.test(file.originalname)) throw new AppError(400, 'NOT_CSV', 'Only .csv files are supported');
  return file;
}

const rosterMappingSchema = z
  .object({
    fullName: z.string().optional(),
    email: z.string().optional(),
    role: z.string().optional(),
    department: z.string().optional(),
    weeklyCapacityHours: z.string().optional(),
  })
  .strict();

/** The "mapping" form field is a JSON string. If omitted we fall back to the suggestion. */
function readMapping(raw: unknown, headers: string[]): RosterMapping {
  let mapping: RosterMapping;
  if (typeof raw === 'string' && raw.trim() !== '') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new AppError(400, 'INVALID_MAPPING', 'The "mapping" field must be valid JSON');
    }
    mapping = rosterMappingSchema.parse(parsed);
  } else {
    mapping = suggestMapping(headers, ROSTER_SYNONYMS);
  }

  const missing = ROSTER_REQUIRED.filter((f) => !mapping[f]);
  if (missing.length) {
    throw new AppError(400, 'MAPPING_INCOMPLETE', `Map a column for: ${missing.join(', ')}`, { headers, mapping });
  }
  const unknown = Object.values(mapping).filter((h) => !headers.includes(h as string));
  if (unknown.length) {
    throw new AppError(400, 'MAPPING_UNKNOWN_COLUMN', `These mapped columns are not in the file: ${unknown.join(', ')}`, { headers });
  }
  return mapping;
}

// 1) Look at the file and get a suggested column mapping. Writes nothing.
importsRouter.post(
  '/roster/headers',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const file = requireCsv(req.file);
    const csv = parseCsv(file.buffer);
    const suggestedMapping = suggestMapping(csv.headers, ROSTER_SYNONYMS);
    res.json({
      headers: csv.headers,
      rowCount: csv.rows.length,
      suggestedMapping,
      missingRequired: ROSTER_REQUIRED.filter((f) => !suggestedMapping[f]),
    });
  })
);

// 2) Dry run by default. Nothing is written unless you pass ?commit=true
importsRouter.post(
  '/roster',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const file = requireCsv(req.file);
    const commit = req.query.commit === 'true';
    const csv = parseCsv(file.buffer);
    const mapping = readMapping(req.body?.mapping, csv.headers);

    const existing = await loadExistingResources(prisma);
    const plan = planRosterImport(csv.rows, mapping, existing);

    if (!commit) {
      res.json({ committed: false, mapping, summary: plan.summary, rows: plan.rows });
      return;
    }

    const sourceName = file.originalname.replace(/\.csv$/i, '');
    const result = await applyRosterPlan(prisma, plan, { sourceName, actor: 'local-dev-user' });
    res.json({ committed: true, mapping, summary: plan.summary, result, rows: plan.rows });
  })
);