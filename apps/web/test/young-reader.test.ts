import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { En, Ja, XU_YOUNG } from '@guanwei/content';
import { bookChapters } from '@/lib/mingshu';
import { chapterDrafts } from '@/lib/chengshu';

/**
 * 年少讀者（2026-10-16 第二輪審稿 J 盤：虛歲三，第一個大限虛歲四起）。
 * 序加一句提醒；宮位章唔出大人生活場景；未起運嘅這十年點明由幾歲起。
 */
function book(inp: any, seed: string) {
  const r = cast(inp);
  if (!r.ok) throw new Error('cast');
  return bookChapters(r.value, { seed, year: 2026, solar: inp.solar, place: inp.place.label })!;
}
const J = { solar: { y: 2024, m: 2, d: 10 }, time: { h: 12, min: 45 }, sex: 'female', tz: 'Asia/Taipei', place: { lng: 121.5654, lat: 25.033, label: '台北' } };
const ADULT = { solar: { y: 1990, m: 3, d: 21 }, time: { h: 14, min: 20 }, sex: 'female', tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' } };
const PALACES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];

describe('年少讀者', () => {
  const j = book(J, 'ja-review-2026-10-16-J');

  it('序有提醒，宮位章冇生活格', () => {
    const xu = j.find((c) => c.slug === '序')!;
    expect(xu.slots).toContain('年少');
    expect(xu.text).toContain(XU_YOUNG);
    for (const c of j.filter((x) => PALACES.includes(x.slug))) expect(c.slots, c.slug).not.toContain('生活');
    const jaXu = Ja.renderChapter(chapterDrafts([xu], 'x')[0]!.body);
    expect(jaXu.missing).toEqual([]);
    expect(jaXu.text).toContain('あなたはまだ小さいので');
  });

  it('未起運：這十年點明由虛歲四歲起，日文英文跟住譯', () => {
    const d = j.find((c) => c.slug === '這十年')!;
    expect(d.text).toContain('從虛歲四歲起的這十年，');
    const draft = chapterDrafts([d], 'x')[0]!;
    const ja = Ja.renderChapter(draft.body);
    expect(ja.missing).toEqual([]);
    expect(ja.text).toContain('数え4歳から始まる十年のあいだ、');
    const en = En.renderChapter(draft.body);
    expect(en.missing).toEqual([]);
    expect(en.text).toContain('Over the ten years from around age 3');
  });

  it('大人嘅書唔受影響', () => {
    const a = book(ADULT, 'adult');
    expect(a.find((c) => c.slug === '序')!.slots).not.toContain('年少');
    expect(a.filter((x) => PALACES.includes(x.slug)).some((c) => c.slots.includes('生活'))).toBe(true);
  });
});
