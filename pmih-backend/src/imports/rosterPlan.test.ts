import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCsv } from './csv';
import { suggestMapping } from './mapping';
import { ROSTER_SYNONYMS, planRosterImport, type ExistingResource } from './rosterPlan';

const csv = (text: string) => parseCsv(Buffer.from(text, 'utf8'));
const mapping = { fullName: 'Name', email: 'Email', role: 'Role', department: 'Department', weeklyCapacityHours: 'Capacity' };
const header = 'Name,Email,Role,Department,Capacity\n';

const existing: ExistingResource[] = [
  { id: 'r1', fullName: 'Asha Verma', email: 'asha.verma@example.com', role: 'Developer', primaryDepartment: 'Engineering', weeklyCapacityHours: 40 },
];

test('suggestMapping matches common header variants', () => {
  const m = suggestMapping(['Employee Name', 'Work Email', 'Designation', 'Dept', 'Hours per week'], ROSTER_SYNONYMS);
  assert.deepEqual(m, {
    fullName: 'Employee Name', email: 'Work Email', role: 'Designation', department: 'Dept', weeklyCapacityHours: 'Hours per week',
  });
});

test('parseCsv strips BOM, reports real line numbers, skips blank lines', () => {
  const parsed = parseCsv(Buffer.from('\uFEFFName,Email\nA,a@x.com\n\nB,b@x.com\n'));
  assert.deepEqual(parsed.headers, ['Name', 'Email']);
  assert.deepEqual(parsed.rows.map((r) => r.rowNumber), [2, 4]);
});

test('parseCsv rejects duplicate headers and empty files', () => {
  assert.throws(() => parseCsv(Buffer.from('A,A\n1,2\n')), /Duplicate column/);
  assert.throws(() => parseCsv(Buffer.from('A,B\n')), /header row and at least one data row/);
});

test('creates a new resource', () => {
  const plan = planRosterImport(csv(header + 'Ben Rao,ben.rao@example.com,Tester,QA,32\n').rows, mapping, existing);
  assert.equal(plan.summary.create, 1);
  assert.equal(plan.resources[0].weeklyCapacityHours, 32);
});

test('emails are lower-cased so matching is case-insensitive', () => {
  const plan = planRosterImport(csv(header + 'Asha Verma,ASHA.VERMA@Example.com,Developer,Engineering,40\n').rows, mapping, existing);
  assert.equal(plan.rows[0].action, 'unchanged');
});

test('detects updates with before/after values', () => {
  const plan = planRosterImport(csv(header + 'Asha Verma,asha.verma@example.com,Lead Developer,Engineering,32\n').rows, mapping, existing);
  assert.equal(plan.rows[0].action, 'update');
  assert.deepEqual(plan.rows[0].changes, {
    role: { from: 'Developer', to: 'Lead Developer' },
    weeklyCapacityHours: { from: 40, to: 32 },
  });
});

test('rejects invalid email, empty fields, bad capacity, with reasons', () => {
  const plan = planRosterImport(
    csv(header + 'No Email,not-an-email,Dev,Eng,40\n,x@y.com,Dev,Eng,40\nBad Cap,bc@x.com,Dev,Eng,200\n').rows,
    mapping, []
  );
  assert.equal(plan.summary.reject, 3);
  assert.match(plan.rows[0].reasons[0], /not a valid email/);
  assert.match(plan.rows[1].reasons[0], /name is empty/);
  assert.match(plan.rows[2].reasons[0], /capacity/);
});

test('flags duplicate emails inside the file and keeps the first', () => {
  const plan = planRosterImport(
    csv(header + 'Cy,cy@x.com,Dev,Eng,40\nCy Different,cy@x.com,Lead,Eng,40\n').rows, mapping, []
  );
  assert.equal(plan.summary.create, 1);
  assert.equal(plan.summary.duplicate, 1);
  assert.match(plan.rows[1].reasons[0], /different values/);
});

test('same name with a different email warns but never merges', () => {
  const plan = planRosterImport(csv(header + 'Asha Verma,asha.v@other.com,Dev,Eng,40\n').rows, mapping, existing);
  assert.equal(plan.rows[0].action, 'create');
  assert.match(plan.rows[0].warnings[0], /NOT merged/);
});

test('capacity column is optional', () => {
  const m = { fullName: 'Name', email: 'Email', role: 'Role', department: 'Department' };
  const plan = planRosterImport(csv('Name,Email,Role,Department\nDee,dee@x.com,PM,Delivery\n').rows, m, []);
  assert.equal(plan.resources[0].weeklyCapacityHours, null);
});