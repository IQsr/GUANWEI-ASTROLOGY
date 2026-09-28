import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { bookChapters } from '@/lib/mingshu';
import { chapterDrafts } from '@/lib/chengshu';
import { paragraphs } from '@/lib/suidu';

/**
 * 寫落 DB 嘅每一章都要分段、帶住格名（2026-09 修）
 *
 * 之前宮位章直接用內容庫嘅 `c.text`（`join('')`，冇分段），slots 亦從來冇寫落 DB：
 * 真書入面命宮等十二章每章一大段字牆（量到命宮 526 字一段、26 行），
 * 左頁命盤跟唔到段落。樣板頁冇事，因為佢直接讀內容庫嘅段 —— 所以一直冇人見到。
 *
 * 呢度用真引擎排幾個盤，行 `bookChapters` → `chapterDrafts`（即係寫落 DB 嗰份），
 * 再用讀嗰邊嘅 `paragraphs()` 拆返 —— 量嘅就係讀者見到嘅分段。
 */

const BIRTHS = [
  { solar: { y: 1996, m: 6, d: 16 }, time: { h: 8, min: 30 }, sex: 'male' as const },
  { solar: { y: 1990, m: 6, d: 16 }, time: { h: 7, min: 34 }, sex: 'female' as const },
  { solar: { y: 1985, m: 12, d: 1 }, time: { h: 22, min: 10 }, sex: 'male' as const },
];

describe.each(BIRTHS)('$solar.y-$solar.m-$solar.d', (birth) => {
  const r = cast({ ...birth, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' } });
  if (!r.ok) throw new Error('排唔到盤');
  const chapters = bookChapters(r.value, { seed: 'test', year: 2026, solar: birth.solar, place: '香港' })!;
  const drafts = chapterDrafts(chapters, 'test');

  it('排得出成本書', () => {
    expect(chapters.length).toBeGreaterThan(10);
  });

  it('每一章嘅段數同格名數一樣', () => {
    for (const d of drafts) {
      expect(d.body.split('\n\n').filter((t) => t.trim()).length, d.slug).toBe(d.slots.length);
    }
  });

  /** 讀嗰邊（`paragraphs()`）拆返出嚟，每一段都有格名 —— 左頁命盤先跟得到 */
  it('讀嗰邊拆得返，每段都有格名', () => {
    for (const d of drafts) {
      const ps = paragraphs(d.body, d.slots);
      expect(ps.every((p) => p.slot !== null), d.slug).toBe(true);
    }
  });

  /** 宮位章唔可以一大段：之前就係噉 */
  it('宮位章唔係一大段字牆', () => {
    for (const d of drafts.filter((x) => !['序', '身宮與五行局'].includes(x.slug))) {
      expect(d.slots.length, d.slug).toBeGreaterThan(2);
    }
  });
});
