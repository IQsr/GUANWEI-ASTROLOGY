import raw from '../rules/brightness.json';
import type { Branch, Brightness } from '../types';
import type { MajorStarName } from './major-stars';

type RawDoc = {
  levels: string[];
  school: string;
  sources: string[];
  verification: string;
  verificationNote: string;
  table: Record<string, Record<string, string>>;
};

const DOC = raw as unknown as RawDoc;

/** 廟旺表嘅出處同核實狀態。命書版權頁同 /about 要用得著。 */
export const BRIGHTNESS_META = {
  levels: DOC.levels,
  school: DOC.school,
  sources: DOC.sources,
  verification: DOC.verification,
  verificationNote: DOC.verificationNote,
} as const;

export const BRIGHTNESS_LEVELS = DOC.levels as readonly Brightness[];

/**
 * 查某粒主星喺某宮嘅廟旺。
 *
 * 純查表 —— 呢啲係資料唔係邏輯（引擎 plan §6）。
 * 表喺 src/rules/brightness.json，改表唔使改 code。
 */
export function brightnessOf(star: MajorStarName, branch: Branch): Brightness | null {
  const row = DOC.table[star];
  if (!row) return null;
  const v = row[branch];
  return (v as Brightness) ?? null;
}

/** 表本身完整唔完整：十四主星 × 十二宮，每格都要有一個合法值。 */
export function auditBrightnessTable(): { missing: string[]; invalid: string[] } {
  const missing: string[] = [];
  const invalid: string[] = [];
  const ok = new Set(DOC.levels);
  for (const [star, row] of Object.entries(DOC.table)) {
    for (const b of ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']) {
      const v = row[b];
      if (v === undefined) missing.push(`${star}/${b}`);
      else if (!ok.has(v)) invalid.push(`${star}/${b}=${v}`);
    }
  }
  return { missing, invalid };
}
