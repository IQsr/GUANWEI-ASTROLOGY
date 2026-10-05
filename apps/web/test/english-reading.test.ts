import { describe, expect, it } from 'vitest';
import { englishChapters, englishTitle, isEnglish } from '@/lib/english';
import { sampleBook } from '@/lib/sample-book';
import { paragraphs } from '@/lib/suidu';
import { markBook } from '@/lib/zhu';
import { notesFor } from '@/lib/mingshu';

/**
 * 英文閱讀模式（2026-10-05）：網站讀嗰陣由中文逐段譯。
 * 段數同格名要同中文一一對應 —— 左頁命盤靠格名跟住讀緊邊段亮（lib/suidu.ts）。
 */
describe('英文閱讀模式', () => {
  const book = sampleBook()!;
  const chs = book.drafts.map((d) => ({ text: d.body, slots: d.slots }));
  const en = englishChapters(chs);

  it('示範書每章段數、格名同中文一樣', () => {
    book.drafts.forEach((d, i) => {
      const zh = paragraphs(d.body, d.slots);
      expect(en[i]!.length, d.slug).toBe(zh.length);
      expect(en[i]!.map((s) => s.slot), d.slug).toEqual(zh.map((p) => p.slot ?? '正文'));
    });
  });

  it('冇中文、冇〔〕漏譯', () => {
    for (const segs of en) for (const s of segs) expect(s.text).not.toMatch(/[\u3400-\u9fff〔〕]/);
  });

  it('跳去某一章讀，同由頭讀落嚟一樣（轉接語成本書輪流用）', () => {
    const k = 10;
    const fromStart = englishChapters(chs.slice(0, k + 1)).at(-1);
    expect(fromStart).toEqual(en[k]);
  });

  it('章名同 locale', () => {
    expect(englishTitle('一 · 命宮')).toBe('I · The Life Palace');
    expect(englishTitle('這一年')).toBe('This Year');
    expect(isEnglish('en')).toBe(true);
    expect(isEnglish('zh-Hant')).toBe(false);
  });

  it('英文註層：標英文術語，一本書每個只標一次，註用英文', () => {
    const marked = markBook(en.map((segments, i) => ({ palace: book.drafts[i]!.title, segments })), 'en');
    const ids = marked.flatMap((c) => c.segments.flatMap((s) => s.runs.flatMap((r) => (r.term ? [r.term.id] : []))));
    expect(ids.length).toBeGreaterThan(10);
    expect(new Set(ids).size).toBe(ids.length);
    /* 每段砌返等於原文：標點唔可以食咗字 */
    marked.forEach((c, i) => c.segments.forEach((s, k) => expect(s.runs.map((r) => r.text).join('')).toBe(en[i]![k]!.text)));
    const notes = notesFor(marked, 'en');
    for (const n of Object.values(notes)) expect(`${n.term} ${n.summary}`).not.toMatch(/[㐀-鿿]/);
    expect(notes['palace.命宮']?.term).toBe('Life Palace');
    /* 四化只認「turns to X」 */
    for (const c of marked) for (const s of c.segments) s.runs.forEach((r, k) => {
      if (r.term?.kind === 'sihua') expect(s.runs[k - 1]?.text ?? '').toMatch(/(turns|turning) to $/);
    });
  });
});
