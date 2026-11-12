import { expect, it } from 'vitest';
import { cast, type BirthInput } from '@guanwei/ziwei';
import { Ja } from '@guanwei/content';
import { createBookChapters } from '@/lib/mingshu';
import { japaneseChapters } from '@/lib/japanese';
import previews from '../src/lib/free-ming-preview.json';

/*
 * 2026-11-12 日文第一批：新版命宮、性格的骨架（reader-backed-v1）日文直接由新中文逐條 statement 譯
 * （對照 english-fresh-ming.test.ts）；小標題、出處記號跟住 statement；
 * 有一句譯唔到就成章讀舊快照（唔出半中半日）。十一宮、給你的話未切換。
 */
const books = (previews as unknown as { input: BirthInput; seed?: string }[]).slice(0, 12).map((p) => {
  const r = cast(p.input); if (!r.ok) throw Error(r.message);
  return createBookChapters(r.value, { seed: p.seed ?? 'sample', year: 2026, solar: p.input.solar, place: p.input.place.label, birthSex: p.input.sex, birthInput: p.input, synthesis: true })!;
});

const FRESH = new Set(['reader-backed-v1']);

it('命宮、骨架日文逐條 statement 對應新中文，小標題用日文，真係行新譯', () => {
  let chapters = 0;
  for (const book of books) {
    const ja = japaneseChapters(book);
    book.forEach((ch, i) => {
      if (!FRESH.has(ch.reading?.writer ?? '')) return;
      chapters++;
      const zh = ch.reading!.segments;
      /* 冇缺譯（缺一句就會靜靜退返快照，喺度擋住） */
      const items = zh.flatMap((s) => (s.statements?.length ? s.statements.map((l) => l.text) : [s.text]));
      expect(Ja.renderParagraphs(items).missing, ch.slug).toEqual([]);
      expect(ja[i]!.length).toBe(zh.length);
      ja[i]!.forEach((s, j) => {
        expect(s.slot).toBe(zh[j]!.slot);
        expect(s.heading).toBe(zh[j]!.heading ? Ja.headingJa(zh[j]!.heading!) : undefined);
        expect(s.statements?.length).toBe(zh[j]!.statements?.length);
        if (zh[j]!.statements?.length) {
          expect(s.statements!.map((l) => l.citations)).toEqual(zh[j]!.statements!.map((l) => l.citations));
          expect(s.text).toBe(s.statements!.map((l) => l.text).join(''));
        }
        expect(Ja.scanJapanese(s.text), s.text).toEqual([]);
        expect(s.text).not.toContain('子宮');
      });
    });
  }
  expect(chapters).toBeGreaterThanOrEqual(12);
});

it('有一句譯唔到：成章退返舊快照', () => {
  const book = books[0]!;
  const i = book.findIndex((c) => c.slug === '命宮');
  const ch = structuredClone(book[i]!);
  const seg = ch.reading!.segments[0]!;
  const extra = '一句未有譯文的測試句。';
  seg.statements = [...seg.statements!, { ...seg.statements![0]!, text: extra }];
  seg.text += extra;
  ch.text = ch.reading!.segments.map((s) => s.text).join('\n\n');
  const fresh = japaneseChapters([book[i]!])[0]!;
  const fallback = japaneseChapters([ch])[0]!;
  expect(fallback).not.toEqual(fresh);
  expect(fallback.some((s) => s.text.includes('測試句'))).toBe(false);
});
