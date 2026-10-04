import { parse } from 'csv-parse/sync';
import { AppError } from '../lib/errors';

export interface CsvRow {
  /** Line number in the file (header is line 1), so users can find the row. */
  rowNumber: number;
  cells: Record<string, string>;
}

export interface ParsedCsv {
  headers: string[];
  rows: CsvRow[];
}

export function parseCsv(buffer: Buffer): ParsedCsv {
  let records: Array<{ record: string[]; info: { lines: number } }>;
  try {
    // csv-parse's typings don't model the `info` option, hence the cast.
    records = parse(buffer, {
      bom: true, // Excel/Windows exports often start with a BOM
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
      info: true,
    }) as unknown as Array<{ record: string[]; info: { lines: number } }>;
  } catch (err: any) {
    throw new AppError(400, 'INVALID_CSV', `Could not read the CSV: ${err.message}`);
  }

  if (records.length < 2) {
    throw new AppError(400, 'EMPTY_CSV', 'The CSV needs a header row and at least one data row');
  }

  const headers = records[0].record.map((h) => h.trim());
  if (headers.some((h) => h === '')) throw new AppError(400, 'INVALID_CSV', 'The header row contains an empty column name');
  const dup = headers.find((h, i) => headers.indexOf(h) !== i);
  if (dup) throw new AppError(400, 'INVALID_CSV', `Duplicate column name in header: "${dup}"`);

  const rows: CsvRow[] = records
    .slice(1)
    .map(({ record, info }) => ({
      rowNumber: info.lines,
      cells: Object.fromEntries(headers.map((h, i) => [h, (record[i] ?? '').trim()])),
    }))
    .filter((r) => Object.values(r.cells).some((v) => v !== ''));

  if (rows.length === 0) throw new AppError(400, 'EMPTY_CSV', 'The CSV has no data rows');
  return { headers, rows };
}