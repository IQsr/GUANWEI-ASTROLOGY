import { describe, expect, it } from 'vitest';
import { keywordMarks, SHEN, SHUN, TI, SHEN_HANS, SHUN_HANS, TI_HANS } from '@/lib/guanjian';
import { hans } from '@/lib/hans';
import { sampleBook } from '@/lib/sample-book';
import { englishChapters } from '@/lib/english';

const show = (t: string) => keywordMarks(t).map((m) => `${m.kind}:${t.slice(m.start, m.end)}`);

describe('關鍵字標記', () => {
  it('判語同主題字：主題字跟判語喺同一分句先標', () => {
    expect(show('這一年，你的心境順中有阻，朋輩要多留神。')).toEqual(['ti:心境', 'shen:順中有阻', 'ti:朋輩', 'shen:要多留神']);
    /* 判語喺另一分句（中間有逗號）就唔標 —— 免得成版記號 */
    expect(show('你的心境很好，朋輩要多留神。')).toEqual(['ti:朋輩', 'shen:要多留神']);
  });

  it('長詞先：「比較順」唔會切成「較順」', () => {
    expect(show('心境上，這一年比較順。')).toEqual(['shun:比較順']);
  });

  it('單獨「留意」唔標；「要留意的是」標', () => {
    expect(show('留意別因安逸而少了進取。')).toEqual([]);
    expect(show('要留意的是，你最怕的不是錢少。')).toEqual(['shen:要留意的是']);
  });

  it('月份只標逐月清單（有冒號）', () => {
    expect(show('二月：作息容易上軌道。七月：整體多些阻滯，凡事穩一點。')).toEqual(['yue:二月', 'yue:七月', 'shen:多些阻滯']);
    expect(show('寫這本書的二〇二六年是丙午年，農曆二月出生。')).toEqual([]);
  });

  it('冇判語嘅分句，主題字唔標', () => {
    expect(show('你在感情裡擅長維持。')).toEqual([]);
  });

  it('⚠ 簡體字表同 hans() 轉出嚟一樣（改繁體表要一齊改）', () => {
    expect(SHEN_HANS).toEqual(SHEN.map(hans));
    expect(SHUN_HANS).toEqual(SHUN.map(hans));
    expect(TI_HANS).toEqual(TI.map(hans));
  });

  it('簡體正文一樣標到', () => {
    const t = hans('這一年，你的心境順中有阻，朋輩要多留神。心境上，這一年比較順。');
    expect(show(t)).toEqual(['ti:心境', 'shen:顺中有阻', 'ti:朋辈', 'shen:要多留神', 'shun:比较顺']);
  });

  it('英文：判語、月份、同一分句嘅主題字', () => {
    expect(show('This year, your inner life goes smoothly, though not without snags, and more care is needed with your peers.')).toEqual([
      'ti:inner life', 'shun:goes smoothly', 'shen:though not without snags', 'shen:more care is needed', 'ti:peers',
    ]);
    expect(show('In the seventh lunar month (around August), there are more hold-ups than usual.')).toEqual(['yue:seventh lunar month', 'shen:more hold-ups than usual']);
    /* 詞界：network 入面嘅 work 唔中；冇判語嘅分句唔標主題 */
    expect(show('Your network matters; your work is steady.')).toEqual([]);
  });

  it('英文示範書：時間章有記號，月份用農曆加大約西曆月（對住 packages/content 嘅譯法）', () => {
    const book = sampleBook()!;
    const en = englishChapters(book.drafts.map((d) => ({ text: d.body, slots: d.slots })));
    const year = en[book.drafts.findIndex((d) => d.slug === '這一年')]!.map((s) => s.text);
    const marks = year.flatMap((p) => keywordMarks(p).map((m) => `${m.kind}:${p.slice(m.start, m.end)}`));
    expect(marks.length).toBeGreaterThan(10);
    for (const k of ['shen', 'shun', 'yue', 'ti']) expect(marks.some((m) => m.startsWith(k + ':')), k).toBe(true);
    const all = year.join(' ');
    expect(all).toMatch(/the Year of the (Wood|Fire|Earth|Metal|Water) [A-Z][a-z]+/);
    expect(all).toMatch(/lunar month \(around [A-Z][a-z]+\)/);
    expect(all).not.toMatch(/\b(things|dealings) with [a-z ]+ brings\b/);
  });
});
