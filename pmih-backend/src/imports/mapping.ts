const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Suggest which CSV header feeds which field, using exact (normalised) synonym matches only.
 * Each header is used at most once. This is a suggestion; the caller can override it.
 */
export function suggestMapping<F extends string>(
  headers: string[],
  synonyms: Record<F, string[]>
): Partial<Record<F, string>> {
  const result: Partial<Record<F, string>> = {};
  const used = new Set<string>();
  for (const field of Object.keys(synonyms) as F[]) {
    const wanted = new Set(synonyms[field].map(norm));
    const match = headers.find((h) => !used.has(h) && wanted.has(norm(h)));
    if (match) {
      result[field] = match;
      used.add(match);
    }
  }
  return result;
}