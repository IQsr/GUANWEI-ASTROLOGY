import { expect, it } from 'vitest';
import { cast, type BirthInput } from '@guanwei/ziwei';
import { En } from '@guanwei/content';
import { createBookChapters } from '@/lib/mingshu';
import { englishChapters } from '@/lib/english';
import previews from '../src/lib/free-ming-preview.json';

/*
 * 2026-11-12 英文第一批：新版命宮、性格的骨架（reader-backed-v1）英文直接由新中文逐條 statement 譯，
 * 小標題、出處記號跟住 statement；有一句譯唔到就成章讀舊快照（唔出半中半英）。
 */
const books = (previews as unknown as { input: BirthInput; seed?: string }[]).slice(0, 12).map((p) => {
  const r = cast(p.input); if (!r.ok) throw Error(r.message);
  return createBookChapters(r.value, { seed: p.seed ?? 'sample', year: 2026, solar: p.input.solar, place: p.input.place.label, birthSex: p.input.sex, birthInput: p.input, synthesis: true })!;
});

it('命宮、骨架英文逐條 statement 對應新中文，小標題用英文', () => {
  for (const book of books) {
    const en = englishChapters(book);
    book.forEach((ch, i) => {
      if (ch.slug !== '命宮' && ch.slug !== '性格的骨架') return;
      const zh = ch.reading!.segments;
      expect(ch.reading!.writer).toBe('reader-backed-v1');
      expect(en[i]!.length).toBe(zh.length);
      en[i]!.forEach((s, j) => {
        expect(s.slot).toBe(zh[j]!.slot);
        expect(s.heading).toBe(zh[j]!.heading ? En.headingEn(zh[j]!.heading!) : undefined);
        expect(s.statements?.length).toBe(zh[j]!.statements?.length);
        expect(s.statements!.map((l) => l.citations)).toEqual(zh[j]!.statements!.map((l) => l.citations));
        expect(s.text).toBe(s.statements!.map((l) => l.text).join(' '));
        expect(/[一-鿿]/.test(s.text)).toBe(false);
      });
    });
  }
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
  const fresh = englishChapters([book[i]!])[0]!;
  const fallback = englishChapters([ch])[0]!;
  expect(fallback).not.toEqual(fresh);
  expect(fallback.some((s) => s.text.includes('測試句'))).toBe(false);
});
