import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { En, Ja, XU_YOUNG, YOUTH_LEAN, YOUTH_LEAN_NOTE } from '@guanwei/content';
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

/**
 * 後生讀者（2026-10-18 · 十八歲左右五本抽樣，docs/young-books-2026-10-18.md）：
 * 婚姻、子女講明係將來；這十年、這一年唔講簽字借貸；骨架冇重嘅偏向名；回看用實歲；英日照譯得到。
 */
describe('後生讀者（虛歲十四至二十四）', () => {
  let seed = 20261018;
  const rnd = (n: number) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % n;
  };
  const births = Array.from({ length: 30 }, (_, i) => ({
    solar: { y: 2004 + rnd(6), m: 1 + rnd(12), d: 1 + rnd(28) },
    time: { h: rnd(24), min: rnd(60) },
    sex: i % 2 ? 'male' : 'female',
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
  }));
  const books = births.map((b, i) => ({ b, chapters: book(b, `youth${i}`) }));
  const paras = (chs: { text: string }[]) => chs.flatMap((c) => c.text.split('\n\n'));
  const CN = '〇一二三四五六七八九';
  const yearOf = (cn: string) => Number([...cn].map((c) => CN.indexOf(c)).join(''));

  it('講婚姻嘅段落一定講明係將來；建議段唔講簽字借貸；冇重嘅偏向名', () => {
    for (const { chapters } of books) {
      for (const p of paras(chapters)) {
        if (/你們夫妻|婚期|夫妻和美|夫妻只宜/.test(p)) expect(p, p).toContain('說到將來的婚姻');
        for (const harsh of Object.keys(YOUTH_LEAN)) expect(p, p).not.toContain(`偏向${harsh}`);
      }
      for (const c of chapters.filter((x) => x.slug === '這十年' || x.slug === '這一年')) expect(c.text).not.toMatch(/簽字、承諾|大額支出和借貸|借貸、合作/);
      expect(chapters.find((c) => c.slug === '性格的骨架')!.text).toContain(YOUTH_LEAN_NOTE);
    }
  });

  it('回看：升中只講實歲十二嗰年，十八歲前唔用大人例子', () => {
    let seen = 0;
    for (const { b, chapters } of books) {
      const back = paras(chapters).find((p) => p.startsWith('回看你走過的路'));
      if (!back) continue;
      for (const m of back.matchAll(/([〇一二三四五六七八九]{4})年（[^）]+）([^。]+)/g)) {
        const real = yearOf(m[1]!) - b.solar.y;
        if (m[2]!.includes('升中')) expect(real, m[0]).toBeLessThanOrEqual(12);
        if (real < 18) expect(m[2], m[0]).not.toMatch(/一起計劃將來|第一份工|兼職/);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('英文、日文照譯得到', () => {
    for (const { chapters } of books.slice(0, 10)) {
      for (const d of chapterDrafts(chapters, 'x')) {
        expect(En.renderChapter(d.body).missing, d.slug).toEqual([]);
        expect(Ja.renderChapter(d.body).missing, d.slug).toEqual([]);
      }
    }
  });

  it('大人嘅書唔加前綴', () => {
    const a = book(ADULT, 'adult');
    for (const p of paras(a)) expect(p).not.toMatch(/說到將來的|如果你有伴侶|讀書和打工上|你還年輕/);
  });
});

