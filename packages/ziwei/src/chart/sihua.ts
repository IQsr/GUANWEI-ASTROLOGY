import raw from '../rules/sihua.json';
import type { Sihua, Stem } from '../types';

type RawDoc = {
  school: string;
  sources: string[];
  verification: string;
  map: Record<string, Record<string, string>>;
  disputed: Record<string, { note: string; adopted: string; variants: Record<string, Record<string, string>> }>;
};

const DOC = raw as unknown as RawDoc;

export const SIHUA_ORDER: readonly Sihua[] = ['祿', '權', '科', '忌'];

export const SIHUA_META = {
  school: DOC.school,
  sources: DOC.sources,
  verification: DOC.verification,
  disputed: DOC.disputed,
} as const;

/** 生年天干 → 四粒星分別化乜。 */
export function sihuaOfStem(yearStem: Stem): Record<Sihua, string> | null {
  const row = DOC.map[yearStem];
  if (!row) return null;
  return { 祿: row['祿']!, 權: row['權']!, 科: row['科']!, 忌: row['忌']! };
}

/** 查某粒星喺呢個年干之下化乜（冇就 null）。 */
export function sihuaOfStar(yearStem: Stem, starName: string): Sihua | null {
  const row = sihuaOfStem(yearStem);
  if (!row) return null;
  for (const s of SIHUA_ORDER) {
    if (row[s] === starName) return s;
  }
  return null;
}

/** 有分歧嘅天干（而家只有庚）。命書四化章要講。 */
export function disputedStems(): string[] {
  return Object.keys(DOC.disputed);
}
