import { canonicalJson } from '../lib/hash';
import type { CsvRow } from './csv';

/**
 * PURE LOGIC: no database, no Express. Given parsed CSV rows, a column mapping and a snapshot
 * of existing resources, decide what would happen to every row. This makes it unit-testable
 * and lets the API offer a safe dry run before anything is written.
 */

export const ROSTER_FIELDS = ['fullName', 'email', 'role', 'department', 'weeklyCapacityHours'] as const;
export type RosterField = (typeof ROSTER_FIELDS)[number];
export const ROSTER_REQUIRED: readonly RosterField[] = ['fullName', 'email', 'role', 'department'];
export type RosterMapping = Partial<Record<RosterField, string>>;

export const ROSTER_SYNONYMS: Record<RosterField, string[]> = {
  fullName: ['name', 'full name', 'resource', 'resource name', 'employee', 'employee name'],
  email: ['email', 'email address', 'e-mail', 'mail', 'work email'],
  role: ['role', 'designation', 'title', 'job title', 'position'],
  department: ['department', 'dept', 'team', 'practice', 'primary department'],
  weeklyCapacityHours: ['capacity', 'weekly capacity', 'weekly hours', 'hours per week', 'capacity hours', 'weekly capacity hours'],
};

export interface ExistingResource {
  id: string;
  fullName: string;
  email: string;
  role: string;
  primaryDepartment: string;
  weeklyCapacityHours: number | null; // null = no ResourceAvailability row yet
}

export type RosterAction = 'create' | 'update' | 'unchanged' | 'duplicate' | 'reject';

export interface RosterRowResult {
  rowNumber: number;
  action: RosterAction;
  email?: string;
  reasons: string[]; // why rejected / duplicate
  warnings: string[]; // worth a human look, but not blocking
  changes?: Record<string, { from: unknown; to: unknown }>;
}

export interface PlannedResource {
  rowNumber: number;
  action: 'create' | 'update' | 'unchanged';
  existingId?: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
  weeklyCapacityHours: number | null;
  changes: Record<string, { from: unknown; to: unknown }>;
  raw: Record<string, string>;
}

export interface RosterPlan {
  rows: RosterRowResult[];
  resources: PlannedResource[];
  summary: Record<RosterAction | 'total', number>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const nameKey = (s: string) => clean(s).toLowerCase();

export function planRosterImport(rows: CsvRow[], mapping: RosterMapping, existing: ExistingResource[]): RosterPlan {
  const byEmail = new Map(existing.map((e) => [e.email.toLowerCase(), e]));
  const seen = new Map<string, { rowNumber: number; raw: Record<string, string> }>();
  const results: RosterRowResult[] = [];
  const planned: PlannedResource[] = [];

  for (const row of rows) {
    const get = (f: RosterField) => (mapping[f] ? clean(row.cells[mapping[f]!] ?? '') : '');
    const fullName = get('fullName');
    const email = get('email').toLowerCase();
    const role = get('role');
    const department = get('department');
    const capacityRaw = get('weeklyCapacityHours');

    const reasons: string[] = [];
    if (!fullName) reasons.push('name is empty');
    else if (fullName.length > 255) reasons.push('name is longer than 255 characters');
    if (!email) reasons.push('email is empty');
    else if (!EMAIL_RE.test(email)) reasons.push(`"${email}" is not a valid email`);
    if (!role) reasons.push('role is empty');
    else if (role.length > 100) reasons.push('role is longer than 100 characters');
    if (!department) reasons.push('department is empty');
    else if (department.length > 100) reasons.push('department is longer than 100 characters');

    let capacity: number | null = null;
    if (mapping.weeklyCapacityHours && capacityRaw !== '') {
      const n = Number(capacityRaw);
      if (!Number.isFinite(n) || n <= 0 || n > 80) {
        reasons.push(`capacity "${capacityRaw}" must be a number greater than 0 and at most 80`);
      } else {
        capacity = n;
      }
    }

    if (reasons.length > 0) {
      results.push({ rowNumber: row.rowNumber, action: 'reject', email: email || undefined, reasons, warnings: [] });
      continue;
    }

    const prior = seen.get(email);
    if (prior) {
      const differs = canonicalJson(prior.raw) !== canonicalJson(row.cells);
      results.push({
        rowNumber: row.rowNumber,
        action: 'duplicate',
        email,
        reasons: [
          `same email as row ${prior.rowNumber}` + (differs ? `, but with different values; row ${prior.rowNumber} was kept` : ''),
        ],
        warnings: [],
      });
      continue;
    }
    seen.set(email, { rowNumber: row.rowNumber, raw: row.cells });

    const warnings: string[] = [];
    const sameName = existing.find((e) => e.email.toLowerCase() !== email && nameKey(e.fullName) === nameKey(fullName));
    if (sameName) {
      warnings.push(`a resource named "${sameName.fullName}" already exists with a different email (${sameName.email}); they were NOT merged`);
    }

    const ex = byEmail.get(email);
    if (!ex) {
      results.push({ rowNumber: row.rowNumber, action: 'create', email, reasons: [], warnings });
      planned.push({ rowNumber: row.rowNumber, action: 'create', fullName, email, role, department, weeklyCapacityHours: capacity, changes: {}, raw: row.cells });
      continue;
    }

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (ex.fullName !== fullName) changes.fullName = { from: ex.fullName, to: fullName };
    if (ex.role !== role) changes.role = { from: ex.role, to: role };
    if (ex.primaryDepartment !== department) changes.primaryDepartment = { from: ex.primaryDepartment, to: department };
    if (capacity !== null && ex.weeklyCapacityHours !== capacity) {
      changes.weeklyCapacityHours = { from: ex.weeklyCapacityHours, to: capacity };
    }

    const action = Object.keys(changes).length > 0 ? 'update' : 'unchanged';
    results.push({ rowNumber: row.rowNumber, action, email, reasons: [], warnings, changes });
    planned.push({ rowNumber: row.rowNumber, action, existingId: ex.id, fullName, email, role, department, weeklyCapacityHours: capacity, changes, raw: row.cells });
  }

  const summary = { total: results.length, create: 0, update: 0, unchanged: 0, duplicate: 0, reject: 0 };
  for (const r of results) summary[r.action]++;
  return { rows: results, resources: planned, summary };
}