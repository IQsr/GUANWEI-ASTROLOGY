import type { MingStatement } from '@guanwei/content';
import { paragraphs } from '@/lib/suidu';

/** 成書時保存的閱讀資料；舊書沒有這欄，不從命盤重算正文。 */
export type ChapterReading = {
  format: 'ming-expanded-v1';
  /** 段落快照的格式不變；另記新書所用的寫作層版本，舊書沒有此欄亦可讀。 */
  writer?: 'sentence-backed-v1' | 'reader-backed-v1' | 'palace-reader-v1';
  segments: {
    slot: string;
    text: string;
    heading?: string;
    referenceConditions?: string[];
    statements?: MingStatement[];
  }[];
  /** 舊版英日正文快照，沒有逐句核讀資料的書繼續讀此欄。 */
  international: { text: string; slots: string[] };
  /** 繁簡先接入的新閱讀稿：鎖定成書當刻的完整英日原版，絕不從新中文猜譯。 */
  internationalSnapshot?: { text: string; slots: string[]; reading?: ChapterReading };
  /** 新書逐句譯文快照；來源 ID 與中文同一組。 */
  localized?: { version: 'ming-translations-v1'; en: ChapterReading['segments']; ja: ChapterReading['segments'] };
};

/** 只接受與存檔正文逐段一致的註資料，避免資料錯配後掛錯來源。 */
export function readingOf(value: unknown, text: string): ChapterReading | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Partial<ChapterReading>;
  if (r.format !== 'ming-expanded-v1' || !Array.isArray(r.segments) || !r.international) return null;
  if (r.writer !== undefined && r.writer !== 'sentence-backed-v1' && r.writer !== 'reader-backed-v1' && r.writer !== 'palace-reader-v1') return null;
  if (typeof r.international.text !== 'string' || !Array.isArray(r.international.slots) || !r.international.slots.every((s) => typeof s === 'string')) return null;
  if (!r.segments.every((s) => s && typeof s.slot === 'string' && typeof s.text === 'string'
    && (s.heading === undefined || typeof s.heading === 'string')
    && (s.referenceConditions === undefined || (Array.isArray(s.referenceConditions) && s.referenceConditions.every((c) => typeof c === 'string')))
    && (s.statements === undefined || (Array.isArray(s.statements) && s.statements.every((l) =>
      l && typeof l === 'object' && typeof l.text === 'string' && Array.isArray(l.citations) && l.citations.every((id) => typeof id === 'string')))))) return null;
  if (r.segments.map((s) => s.text).join('\n\n') !== text) return null;
  if (r.writer === 'reader-backed-v1' || r.writer === 'palace-reader-v1') {
    const original = r.internationalSnapshot;
    if (!original || typeof original.text !== 'string' || !Array.isArray(original.slots)
      || !original.slots.every((s) => typeof s === 'string')) return null;
    // 只准一層既有快照；拒絕循環或不明版本，避免遞迴及混稿。
    if (original.reading && (original.reading.writer === 'reader-backed-v1' || original.reading.writer === 'palace-reader-v1' || !readingOf(original.reading, original.text))) return null;
    if (r.international.text !== original.text || JSON.stringify(r.international.slots) !== JSON.stringify(original.slots)) return null;
  }
  if (r.localized) {
    if (r.localized.version !== 'ming-translations-v1') return null;
    for (const lang of ['en', 'ja'] as const) {
      const localized = r.localized[lang];
      if (!Array.isArray(localized) || localized.length !== r.segments.length) return null;
      if (!localized.every((s, i) => s && s.slot === r.segments![i]!.slot && typeof s.text === 'string'
        && (s.heading === undefined || typeof s.heading === 'string') && Array.isArray(s.statements)
        && s.statements.length === r.segments![i]!.statements?.length
        && s.statements.every((l, j) => l && typeof l === 'object' && typeof l.text === 'string' && s.text.includes(l.text)
          && l.kind === r.segments![i]!.statements![j]!.kind
          && JSON.stringify(l.citations) === JSON.stringify(r.segments![i]!.statements![j]!.citations)
          && JSON.stringify(l.source_ids) === JSON.stringify(r.segments![i]!.statements![j]!.source_ids)))) return null;
    }
  }
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
