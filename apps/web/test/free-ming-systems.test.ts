import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { freeMingReading } from '@guanwei/content';
import { bookChapters, citesFor, localizeMarked } from '@/lib/mingshu';
import { readingOf, readingSegments } from '@/lib/chapter-reading';
import { englishChapters } from '@/lib/english';
import { japaneseChapters } from '@/lib/japanese';
import { markBook } from '@/lib/zhu';
import { paragraphCitations, uniqueReferences } from '@/lib/paragraph-citations';
import { readingCases } from './free-ming-system-cases';

const cases = readingCases();
it('60組實坐與實際借星盤均保存命宮、骨架新稿；原版英日與舊書快照保留', () => {
  expect(cases.filter((c) => !c.borrowed)).toHaveLength(60);
  expect(cases.filter((c) => c.borrowed).length).toBeGreaterThanOrEqual(8);
  const exports: unknown[] = [];
  for (const c of cases) {
    const book = bookChapters(c.chart, { seed: c.seed, year: 2026, solar: c.input.solar, place: c.input.place.label })!;
    const chapters = book.filter((p) => p.slug === '命宮' || p.slug === '性格的骨架');
    expect(chapters).toHaveLength(2);
    for (const ch of chapters) {
      expect(ch.reading?.writer, `${c.n}/${c.borrowed}`).toBe('reader-backed-v1');
      expect(readingOf(JSON.parse(JSON.stringify(ch.reading)), ch.text)).toEqual(ch.reading);
      const previous = ch.reading!.internationalSnapshot!;
      expect(englishChapters([ch])).toEqual(englishChapters([previous]));
      expect(japaneseChapters([ch])).toEqual(japaneseChapters([previous]));
      const marked = markBook([{ palace: ch.slug, segments: readingSegments(ch.text, ch.slots, ch.reading) }]);
      const notes = citesFor(marked);
      for (const s of marked[0]!.segments) {
        const paragraph = paragraphCitations(s.runs);
        expect(new Set(paragraph.citations)).toEqual(new Set(s.runs.flatMap((r) => r.cite ?? [])));
        for (const id of paragraph.citations) expect(notes[id], id).toMatchObject({ excerpt: true, pageConvention: 'pdf' });
        if (paragraph.citations.length) expect(s.referenceConditions?.length).toBeGreaterThan(0);
      }
      const hans = localizeMarked(marked, 'zh-Hans');
      expect(citesFor(hans, 'zh-Hans')).toMatchObject(Object.fromEntries(Object.entries(notes).map(([id, note]) => [id, { text: note.text, page: note.page }])));
      expect(ch.text).not.toMatch(/宮宮|你偏向|兩邊相抵|另一邊.*沒有|\{branch\}/);
      if (c.borrowed) {
        expect(ch.text).toContain('借對宮');
        expect(ch.text).toContain('沒有主星');
      }
    }
    exports.push({ n: c.n, name: c.name, borrowed: c.borrowed, input: c.input, seed: c.seed,
      chapters: chapters.map((p) => ({ slug: p.slug, text: p.text, reading: p.reading })) });
  }
  if (process.env.FREE_MING_EXPORT === '1') {
    const root = new URL('../../../tmp/free-ming-all-2026-10-22/', import.meta.url);
    mkdirSync(root, { recursive: true });
    writeFileSync(new URL('generated-books.json', root), JSON.stringify(exports, null, 2));
    writeFileSync(new URL('preview-cases.json', root), JSON.stringify(cases.map(({ n, name, borrowed, input, seed }) => ({ n, name, borrowed, input, seed })), null, 2));
  }
}, 90_000);

it('日月借入不冒充實坐配合，借星章不套原宮四化分支；例子及位置資料不掛來源', () => {
  const borrowedMoon = cases.find((c) => c.borrowed && c.n === 50)!;
  expect(borrowedMoon).toBeDefined();
  for (const c of cases) {
    const reading = freeMingReading(c.chart, 2026)!;
    for (const segment of [...reading.ming, ...reading.bone]) for (const line of segment.statements) {
      if (['evidence', 'editorial-example', 'editorial-advice'].includes(line.kind!)) expect(line.citations).toEqual([]);
    }
    if (c.borrowed) expect(reading.ming.some((s) => s.heading === '本盤可確認的修飾')).toBe(false);
  }
  const text = freeMingReading(borrowedMoon.chart, 2026)!.ming.map((p) => p.text).join('');
  expect(text).toContain('天同而非天梁');
});

it('新條件經存檔、繁簡註層傳到讀者；跨頁合句保留頁範圍且不重複列出', () => {
  const c = cases.find((c) => c.n === 15 && !c.borrowed)!;
  const chapters = bookChapters(c.chart, { seed: c.seed, year: 2026, solar: c.input.solar, place: c.input.place.label })!;
  const ming = chapters.find((c) => c.slug === '命宮')!;
  const marked = markBook([{ palace: ming.slug, segments: readingSegments(ming.text, ming.slots, JSON.parse(JSON.stringify(ming.reading))) }]);
  const notes = citesFor(marked);
  const ids = paragraphCitations(marked[0]!.segments[1]!.runs).citations;
  const references = uniqueReferences(ids.map((id) => notes[id]!));
  expect(references).toHaveLength(1);
  expect(references[0]).toMatchObject({ page: 81, pageEnd: 82 });
  expect(references[0]!.text).toContain('无吉化，但见煞曜则为破格');
  const source = cases.find((c) => c.n === 13 && !c.borrowed)!;
  const bone = freeMingReading(source.chart, 2026)!.bone;
  expect(bone.find((s) => s.heading === '不能省略的條件')!.referenceConditions!.join('')).toContain('原PDF有疑字');
  const boneMarked = markBook([{ palace: '性格的骨架', segments: bone }]);
  const hant = citesFor(boneMarked);
  const hans = citesFor(localizeMarked(boneMarked, 'zh-Hans'), 'zh-Hans');
  const id = 'free.systems.v1:wtz.deep.p076.b011';
  expect(hant[id]!.sourceNote).toContain('第76');
  expect(hans[id]!.sourceNote).toContain('第76');
  expect(hans[id]!.text).toBe(hant[id]!.text);
});
