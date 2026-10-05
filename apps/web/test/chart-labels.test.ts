import { describe, expect, it } from 'vitest';
import { En } from '@guanwei/content';
import { BRANCH_PY, PALACE_SHORT, STAR_PY, ganzhiPy, slugEn } from '@/lib/chart-labels';
import { dialFor } from '@/lib/dial';
import { sampleBook } from '@/lib/sample-book';

/**
 * 命盤英文標籤（2026-10-05）：client 嗰份細表要同 content 嘅英文詞彙一致。
 * content 改咗星名、宮名，呢度唔跟就紅。
 */
describe('命盤英文標籤', () => {
  it('星名拼音同 content 一樣', () => {
    for (const [zh, { pinyin }] of Object.entries(En.STAR_EN)) expect(STAR_PY[zh], zh).toBe(pinyin);
    expect(Object.keys(STAR_PY).sort()).toEqual(Object.keys(En.STAR_EN).sort());
  });

  it('宮名同 content 一樣（短名 ＋ Palace）', () => {
    /* 身宮唔係一格嘅名，命盤用「Body」細字標喺格度 */
    for (const [zh, en] of Object.entries(En.PALACE_EN)) if (zh !== '身宮') expect(`${PALACE_SHORT[zh]} Palace`, zh).toBe(en);
  });

  it('中宮嗰行同章名一樣', () => {
    for (const t of ['序 · 你的命盤', '性格的骨架', '三方四正', '身宮與五行局', '一生十二步', '這十年', '這一年', '給你的話']) {
      const slug = t.split(' · ')[0]!;
      expect(En.chapterTitleEn(t)!.startsWith(slugEn(slug)), t).toBe(true);
    }
    expect(slugEn('命宮')).toBe('Life Palace');
    expect(slugEn('夫妻')).toBe('Partnership Palace');
  });

  it('干支、地支', () => {
    expect(ganzhiPy('丙午')).toBe('Bing Wu');
    expect(Object.keys(BRANCH_PY)).toHaveLength(12);
  });

  it('章尾星盤嘅說明：英文冇中文', () => {
    const book = sampleBook()!;
    for (const d of book.drafts) {
      const dial = dialFor(book.chart, d.slug, book.layers, true);
      if (dial) expect(dial.caption, d.slug).not.toMatch(/[\u3400-\u9fff]/);
    }
    expect(dialFor(book.chart, '命宮', book.layers, true)!.caption).toMatch(/^Life Palace in \w+ · /);
  });
});
