import { mingHeading, mingTranslation, mingEvidenceJa, MING_EVIDENCE_TOPICS as topics, MING_TRANSLATION_VERSION, type MingLocale } from '@guanwei/content/ming-translations';
import { readingOf, type ChapterReading } from '@/lib/chapter-reading';

type Segment = ChapterReading['segments'][number];

/** 僅翻譯已核逐句稿；有任一句不匹配便整章留白，避免缺條件的半章稿。 */
export function translateMing(reading: ChapterReading, locale: MingLocale): Segment[] | null {
  if (reading.writer !== 'sentence-backed-v1') return null;
  const out: Segment[] = [];
  for (const seg of reading.segments) {
    if (!seg.statements?.length) return [];
    if (seg.slot !== '因為' && seg.text !== seg.statements.map((s) => s.text).join('')) return [];
    const statements = [];
    for (const line of seg.statements) {
      const evidence = line.kind === 'evidence';
      if (evidence && (seg.slot !== '因為' || line.citations.length)) return [];
      const text = evidence ? (locale === 'en' ? line.en : mingEvidenceJa(line.text))
        : line.kind === 'interpretation' && line.citations.length === 1
          ? mingTranslation(line.citations[0]!, line.text, locale) : null;
      if (!text) return [];
      statements.push({ ...line, text, en: locale === 'en' ? text : line.en, citations: evidence ? [] : [...line.citations] });
    }
    const evidence = seg.slot === '因為';
    const topic = evidence ? seg.text.split('：')[0]! : null;
    if (topic && !topics[topic]) return [];
    const text = evidence
      ? `${topics[topic!]![locale]}${locale === 'en' ? ': ' : '：'}${statements.map((s) => s.text).join(locale === 'en' ? '; ' : '、').replace(/[.。]$/, '')}${locale === 'en' ? '.' : '。'}`
      : statements.map((s) => s.text).join(locale === 'en' ? ' ' : '');
    const heading = seg.heading ? mingHeading(seg.heading, locale) : undefined;
    if (seg.heading && !heading) return [];
    out.push({ slot: seg.slot, text, ...(heading ? { heading } : {}), statements });
  }
  return out;
}

/** 新書鎖定英日譯文；既有逐句書只按其存檔原句配譯，不重新起盤。 */
export function localizedMing(reading: ChapterReading): ChapterReading['localized'] {
  const en = translateMing(reading, 'en');
  const ja = translateMing(reading, 'ja');
  return en?.length === reading.segments.length && ja?.length === reading.segments.length
    ? { version: MING_TRANSLATION_VERSION, en, ja } : undefined;
}

export function internationalMing(chapter: { text: string; reading?: unknown }, locale: MingLocale): Segment[] | null {
  const reading = readingOf(chapter.reading, chapter.text);
  if (!reading) {
    const saved = chapter.reading as { writer?: unknown } | undefined;
    return saved?.writer === 'sentence-backed-v1' || saved?.writer === 'reader-backed-v1' ? [] : null;
  }
  if (reading.writer === 'reader-backed-v1') {
    const original = reading.internationalSnapshot!;
    return original.reading ? internationalMing(original, locale) : null;
  }
  if (reading.writer !== 'sentence-backed-v1') return null;
  return reading.localized?.[locale] ?? translateMing(reading, locale);
}
