import type { MingStatement } from '@guanwei/content';
import { paragraphs } from '@/lib/suidu';

/** 成書時保存的閱讀資料；舊書沒有這欄，不從命盤重算正文。 */
export type ChapterReading = {
  format: 'ming-expanded-v1';
  segments: {
    slot: string;
    text: string;
    heading?: string;
    statements?: MingStatement[];
  }[];
  /** 英日今輪仍讀原有版本，亦於成書時鎖定。 */
  international: { text: string; slots: string[] };
};

/** 只接受與存檔正文逐段一致的註資料，避免資料錯配後掛錯來源。 */
export function readingOf(value: unknown, text: string): ChapterReading | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Partial<ChapterReading>;
  if (r.format !== 'ming-expanded-v1' || !Array.isArray(r.segments) || !r.international) return null;
  if (typeof r.international.text !== 'string' || !Array.isArray(r.international.slots) || !r.international.slots.every((s) => typeof s === 'string')) return null;
  if (!r.segments.every((s) => s && typeof s.slot === 'string' && typeof s.text === 'string'
    && (s.heading === undefined || typeof s.heading === 'string')
    && (s.statements === undefined || (Array.isArray(s.statements) && s.statements.every((l) =>
      l && typeof l === 'object' && typeof l.text === 'string' && Array.isArray(l.citations) && l.citations.every((id) => typeof id === 'string')))))) return null;
  if (r.segments.map((s) => s.text).join('\n\n') !== text) return null;
  return r as ChapterReading;
}

export function internationalBodies(chs: readonly { text: string; slots: readonly string[]; reading?: unknown }[]) {
  return chs.map((c) => readingOf(c.reading, c.text)?.international ?? c);
}

export function readingSegments(text: string, slots: readonly string[], reading?: unknown) {
  const r = readingOf(reading, text);
  return r?.segments ?? paragraphs(text, slots).map((p) => ({
    slot: p.slot ?? '正文', text: p.text,
    // 有資料卻對不上正文時，不用舊句索引猜新稿的來源。
    ...(reading ? { statements: [] as MingStatement[] } : {}),
  }));
}
