import { describe, expect, it } from 'vitest';
import { cast, type BirthInput } from '@guanwei/ziwei';
import { En, Ja, XU_YOUNG, YOUTH_LEAN, YOUTH_LEAN_NOTE } from '@guanwei/content';
import { bookChapters } from '@/lib/mingshu';
import { chapterDrafts } from '@/lib/chengshu';

/**
 * 年少讀者（2026-10-16 第二輪審稿 J 盤：虛歲三，第一個大限虛歲四起）。
 * 序加一句提醒；宮位章唔出大人生活場景；未起運嘅這十年點明由幾歲起。
 */
function book(inp: BirthInput, seed: string) {
  const r = cast(inp);
  if (!r.ok) throw new Error('cast');
  return bookChapters(r.value, { seed, year: 2026, solar: inp.solar, place: inp.place.label })!;
}
const J: BirthInput = { solar: { y: 2024, m: 2, d: 10 }, time: { h: 12, min: 45 }, sex: 'female', tz: 'Asia/Taipei', place: { lng: 121.5654, lat: 25.033, label: '台北' } };
const ADULT: BirthInput = { solar: { y: 1990, m: 3, d: 21 }, time: { h: 14, min: 20 }, sex: 'female', tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' } };
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
    const revised = a.filter((c) => c.reading?.writer === 'palace-reader-v1');
    expect(revised).toHaveLength(11);
    for (const c of revised) {
      expect(c.reading!.segments.at(-1)!.statements?.[0]?.kind).toBe('editorial-advice');
      expect(c.reading!.segments.at(-1)!.text).not.toContain('你仍在成長');
    }
    expect(revised.find((c) => c.slug === '官祿')!.text).toContain('比較兩份工作');
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
  const births = Array.from({ length: 30 }, (_, i): BirthInput => ({
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
      const bone = chapters.find((c) => c.slug === '性格的骨架')!;
      expect(bone.text).toContain(bone.reading?.writer === 'reader-backed-v1' ? '你現在仍在成長' : YOUTH_LEAN_NOTE);
    }
  });

  it('回看：逐段核實歲與過去年份，十八歲前不用成人事件或責任', () => {
    let seen=0, minors=0;
    for (const { b, chapters } of books) {
      const chapter=chapters.find(c=>c.slug==='一生十二步')!;
      expect(chapter.reading?.writer).toBe('life-steps-reader-v2');
      for(const segment of chapter.reading!.segments.filter(s=>s.slot==='回看')){
        const date=/^([〇一二三四五六七八九]{4})年（[^）]+）/.exec(segment.text);
        expect(date,segment.text).not.toBeNull();
        const year=yearOf(date![1]!),real=year-b.solar.y;
        expect(year).toBeLessThan(2026);expect(real).toBeGreaterThanOrEqual(12);
        if(segment.text.includes('升中'))expect(real,segment.text).toBeLessThanOrEqual(12);
        if(real<18){
          minors++;
          expect(segment.text).not.toMatch(/一起計劃將來|第一份工|兼職|借貸|擔保|簽約|上司/);
          expect(segment.statements?.some(s=>s.kind==='editorial-advice')).toBe(true);
        }
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(20);expect(minors).toBeGreaterThan(0);
  });

  it('英文、日文照譯得到，而且用後生講法（唔係換返大人原句）', () => {
    let study = 0;
    for (const { chapters } of books) {
      for (const d of chapterDrafts(chapters, 'x')) {
        const previous = d.reading?.internationalSnapshot;
        const original = previous?.reading?.international.text ?? previous?.text ?? d.reading?.international.text ?? d.body;
        const en = En.renderChapter(original);
        const ja = Ja.renderChapter(original);
        expect(en.missing, d.slug).toEqual([]);
        expect(ja.missing, d.slug).toEqual([]);
        expect(en.text, d.slug).not.toMatch(/You lean towards (?:the shadow|passivity|daydreams|aimless movement|recklessness|hollowness|obstinacy|short-sightedness|dominance|self-interest|suspicion|isolation|sharpness|rushing|heaviness):|You tend to stall|sign or commit|and borrowing|with loans/);
        expect(ja.text, d.slug).not.toMatch(/暗さに傾|消極に傾|署名や約束|借り入れ/);
        if (/studies and part-time work/.test(en.text) && /勉強やアルバイト/.test(ja.text)) study++;
      }
    }
    expect(study).toBeGreaterThan(5);
  });

  it('大人嘅書唔加前綴', () => {
    const a = book(ADULT, 'adult');
    for (const p of paras(a)) expect(p).not.toMatch(/說到將來的|如果你有伴侶|讀書和打工上|你還年輕/);
  });
});

