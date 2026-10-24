import { expect, it } from 'vitest';
import { cast, type BirthInput } from '@guanwei/ziwei';
import { bookChapters, localizeMarked, citesFor } from '@/lib/mingshu';
import { readingOf, readingSegments } from '@/lib/chapter-reading';
import { markBook } from '@/lib/zhu';
import { paragraphCitations } from '@/lib/paragraph-citations';
import { englishChapters } from '@/lib/english';
import { japaneseChapters } from '@/lib/japanese';
import fixtures from './fixtures/palace-before.json';

const names = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];
it('三組完整成書都有十二段編輯建議；存讀、繁簡、每段單據與完整原版英日保留', () => {
  for (const f of fixtures) {
    const input = f.input as BirthInput; const r = cast(input); if (!r.ok) throw Error(r.message);
    const chapters = bookChapters(r.value, { seed: f.seed, year: 2026, solar: input.solar, place: input.place.label })!;
    expect(chapters.filter((c) => names.includes(c.slug))).toHaveLength(12);
    for (const c of chapters.filter((c) => names.includes(c.slug))) {
      const rows = c.reading!.segments;
      expect(rows.filter((s) => s.heading === '給你的建議｜編輯建議'), c.slug).toHaveLength(1);
      expect(readingOf(JSON.parse(JSON.stringify(c.reading)), c.text)).toEqual(c.reading);
      const marked = markBook([{ palace: c.slug, segments: readingSegments(c.text, c.slots, c.reading) }]);
      const example = marked[0]!.segments.find((s) => s.heading === '給你的建議｜編輯建議')!;
      expect(paragraphCitations(example.runs).citations).toEqual([]);
      for (const s of marked[0]!.segments) {
        const refs = paragraphCitations(s.runs).citations;
        if (refs.length) expect(s.referenceConditions?.length).toBeGreaterThan(0);
      }
      const hans = localizeMarked(marked, 'zh-Hans');
      expect(hans[0]!.segments.filter((s) => s.heading === '给你的建议｜编辑建议')).toHaveLength(1);
      const sources = citesFor(marked); const hansSources = citesFor(hans, 'zh-Hans');
      for (const [id, source] of Object.entries(sources)) {
        expect(hansSources[id]!.text).toBe(source.text);
        expect(hansSources[id]!.page).toBe(source.page);
      }
      const old = c.reading!.internationalSnapshot!;
      const frozen = { ...c, text: old.text, slots: old.slots, reading: old.reading };
      expect(englishChapters([c])).toEqual(englishChapters([frozen]));
      expect(japaneseChapters([c])).toEqual(japaneseChapters([frozen]));
    }
    expect(chapters.find((c) => c.slug === '性格的骨架')!.reading!.segments.some((s) => s.heading === '給你的建議｜編輯建議')).toBe(false);
  }
});
