import { describe, expect, it } from 'vitest';
import { cast, type BirthInput } from '@guanwei/ziwei';
import index from '../../../tools/wang-reference/deep-index.json';
import { SYNTHESIS_CARDS, SYNTHESIS_SOURCES, bookBrightness, synthesisCiteId, synthesisLint, synthesisSource, synthWealthChapter, synthYearChapter } from '../src/synthesis';
import { citation } from '../src/citation';
import annualFuqi from '../src/synthesis/annual-fuqi.json';
import annualJie from '../src/synthesis/annual-jie.json';
import annualFumu from '../src/synthesis/annual-fumu.json';
import annualXiongdi from '../src/synthesis/annual-xiongdi.json';
import annualZinv from '../src/synthesis/annual-zinv.json';
import annualTian from '../src/synthesis/annual-tian.json';
import annualFude from '../src/synthesis/annual-fude.json';

const place = { lng: 114.17, lat: 22.32, label: '香港' };
const chartOf = (solar: BirthInput['solar'], time: BirthInput['time'], sex: BirthInput['sex']) => {
  const c = cast({ solar, time, sex, tz: 'Asia/Hong_Kong', place });
  if (!c.ok) throw Error('cast');
  return c.value;
};
/** 兩次 A/B 盲評用嘅盤（tmp/ab-20261027、tmp/ab2-20261027）。 */
const elder = chartOf({ y: 1964, m: 1, d: 21 }, { h: 0, min: 44 }, 'female');
const young = chartOf({ y: 2004, m: 9, d: 25 }, { h: 0, min: 28 }, 'female');
const MAJOR = new Set(['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍']);
const majorsIn = (c: ReturnType<typeof chartOf>, name: string) => c.palaces.find((p) => p.name === name)!.stars.some((s) => MAJOR.has(s.name));
/** 固定種子嘅隨機盤（同 book-lint 一樣嘅線性同餘）。 */
function sample(n: number) {
  let s = 20261028;
  const r = (k: number) => { s = (s * 1103515245 + 12345) % 2147483648; return s % k; };
  const out: ReturnType<typeof chartOf>[] = [];
  while (out.length < n) {
    const c = cast({ solar: { y: 1940 + r(70), m: 1 + r(12), d: 1 + r(28) }, time: { h: r(24), min: r(60) }, sex: r(2) ? 'male' : 'female', tz: 'Asia/Hong_Kong', place });
    if (c.ok) out.push(c.value);
  }
  return out;
}
const ids = (segs: { statements: { source_ids: string[] }[] }[] | null) => segs?.map((s) => s.statements[0]!.source_ids[0]) ?? [];

it('every source paragraph matches the reference index fingerprint, page and section', () => {
  const blocks = new Map((index as { blocks: { id: string; text_sha256: string; pdf_page: number; section_title: string }[] }).blocks.map((b) => [b.id, b]));
  for (const s of SYNTHESIS_SOURCES) expect(blocks.get(s.id), s.id).toMatchObject({ text_sha256: s.sha256, pdf_page: s.page, section_title: s.section });
  for (const c of SYNTHESIS_CARDS) expect(citation(`syn.v1:${c.source}`)?.page, c.id).toBe(Number(c.source.slice(10, 13)));
});

it('uses the book brightness for the cells the 2026-10-27 report settled', () => {
  expect(bookBrightness({ name: '太陽', brightness: '不' }, '丑')).toBe('陷');
  expect(bookBrightness({ name: '太陰', brightness: '陷' }, '辰')).toBe('陷'); // 內文支持引擎，唔跟書表
  expect(bookBrightness({ name: '天梁', brightness: '陷' }, '巳')).toBe('陷');
});

describe('錢', () => {
  it('天同酉 獨坐 火星同度：白手興家（專條壓通則）、祖業守不住（條件多先）、中年辛苦晚年順、享受性質', () => {
    expect(ids(synthWealthChapter(elder))).toEqual(['syn.wealth.tiantong.maoyou', 'syn.wealth.tiantong.huoling', 'syn.wealth.tiantong.alone', 'syn.wealth.tiantong.enjoy']);
  });
  it('天梁巳 對天同：早中年難聚（專條先）、先名後利、落陷財源不廣、任職為宜', () => {
    const segs = synthWealthChapter(young)!;
    expect(ids(segs)).toEqual(['syn.wealth.tianliang.sihai', 'syn.wealth.tianliang.name', 'syn.wealth.tianliang.sihai-luoxian', 'syn.wealth.tianliang.trade']);
    expect(segs[0]!.statements[1]!.text).toBe('你的財帛宮天梁坐巳宮，對宮是天同。');
  });
  it('空宮財帛照用舊章；今年冇星系運限卡亦照用舊章', () => {
    expect(sample(60).some((c) => synthYearChapter(c, 2026) === null)).toBe(true); // 冇星系運限卡（流年、大限都冇）就照用舊章
    const empty = sample(400).find((c) => !majorsIn(c, '財帛'))!;
    expect(synthWealthChapter(empty)).toBeNull();
  });
  it('400 個隨機盤：財帛有主星就有錢章（≥99%），每章 1–4 個判斷，寫作 lint 全清', () => {
    const charts = sample(400).filter((c) => majorsIn(c, '財帛'));
    const books = charts.map((c) => synthWealthChapter(c));
    expect(books.filter(Boolean).length / charts.length).toBeGreaterThanOrEqual(0.99);
    for (const b of books) if (b) { expect(b.length).toBeGreaterThanOrEqual(1); expect(b.length).toBeLessThanOrEqual(4); expect(synthesisLint(b)).toEqual([]); }
  });
});

describe('今年', () => {
  it('400 個隨機盤（2026）：有星系運限卡嘅今年章 ≥10%，每章以結論開頭，寫作 lint 全清', () => {
    const books = sample(400).map((c) => synthYearChapter(c, 2026)).filter((b): b is NonNullable<typeof b> => !!b);
    expect(books.length / 400).toBeGreaterThanOrEqual(0.1);
    for (const b of books) { expect(b[0]!.slot).toBe('結論'); expect(synthesisLint(b)).toEqual([]); }
  }, 30000);
  it('64 歲天機丑：廉相廉忌求變破敗、祿逢沖破、弱地；十年背景天梁；冇考試句', () => {
    const segs = synthYearChapter(elder, 2026)!;
    expect(ids(segs).slice(0, 3)).toEqual(['syn.sys32.lianxiang-ji', 'syn.year.lu-chongpo', 'syn.year.lu-weak']);
    expect(segs.find((s) => s.slot === '背景')?.statements[0]!.source_ids[0]).toMatch(/^syn\.sys32\.tianliang/);
    expect(segs.map((s) => s.text).join('')).not.toContain('考試');
  });
  it('通則版：冇星系運限卡嘅年份用流年四化通則卡（≥2 個判斷），覆蓋多過星系版，lint 全清', () => {
    const charts = sample(400);
    const sys = charts.filter((c) => synthYearChapter(c, 2026)).length;
    const gen = charts.map((c) => synthYearChapter(c, 2026, { general: true })).filter((b): b is NonNullable<typeof b> => !!b);
    expect(gen.length).toBeGreaterThan(sys);
    for (const b of gen) { expect(b[0]!.slot).toBe('結論'); expect(synthesisLint(b)).toEqual([]); }
    console.log(`今年覆蓋：星系 ${sys}/400，通則 ${gen.length}/400`);
  }, 30000);
  it('交會卡（ab6 盲評補漏）：天機本命忌轉流年權（p.263）、大限祿轉流年忌、疊祿力量甚輕', () => {
    const c5 = chartOf({ y: 1998, m: 5, d: 21 }, { h: 0, min: 24 }, 'female');
    const c3 = chartOf({ y: 1994, m: 1, d: 25 }, { h: 8, min: 36 }, 'female');
    expect(ids(synthYearChapter(c5, 2026, { general: true }))).toContain('syn.year.ji-to-quan-tianji');
    expect(ids(synthYearChapter(c3, 2026, { general: true }))).toEqual(expect.arrayContaining(['syn.year.dec-lu-to-ji', 'syn.year.die-lu-natal']));
  });
  it('權衡（ab7）：同一粒流年化祿嘅好壞併成一段，開頭講淨結果；羊陀夾忌（p.228）壓一般化忌落點', () => {
    const c4 = chartOf({ y: 1974, m: 1, d: 13 }, { h: 8, min: 0 }, 'female');
    const lead = synthYearChapter(c4, 2026, { general: true })![0]!;
    expect(lead.statements[0]!.source_ids).toEqual(['syn.year.die-lu-natal', 'syn.year.lu-weak']);
    expect(lead.statements[0]!.text).toContain('實際得益要打折扣');
    expect(lead.statements[0]!.citations.length).toBeGreaterThan(0);
    const c2 = chartOf({ y: 1970, m: 9, d: 1 }, { h: 0, min: 32 }, 'female');
    const ids2 = ids(synthYearChapter(c2, 2026, { general: true }));
    expect(ids2).toContain('syn.year.yangtuo-jiaji');
    expect(ids2).not.toContain('syn.year.ji-lands');
  });
  it('今年的錢（初階第7、23篇＋深造 p.433）：流年財帛寅宮火貪見祿存，段首先講本命財帛底子', () => {
    const cai = synthYearChapter(young, 2026, { general: true })!.find((s) => s.slot === '今年的錢')!;
    expect(cai.statements[0]!.text).toMatch(/^今年你的財帛宮在寅宮，坐貪狼。你本命財帛宮坐天梁/);
    expect(cai.statements.map((l) => l.source_ids[0])).toContain('syn.cai-year.tanlang.huoling-lu');
    expect(cai.referenceConditions[0]).toBe('判斷強度：提示');
  });
  it('今年的工作（深造事業章卡，流年官祿重新配對）：本命化曜講明係本命；四化段講過就唔重講；底子掛自己出處（盲評 ab8）', () => {
    const c5 = chartOf({ y: 1998, m: 5, d: 21 }, { h: 0, min: 24 }, 'female');
    const y5 = synthYearChapter(c5, 2026, { general: true })!;
    expect(y5.map((s) => s.text).join('')).toContain('你本命天機化忌，今年天機化權');
    expect(y5.find((s) => s.slot === '今年的工作')).toBeUndefined();
    const c = chartOf({ y: 1993, m: 1, d: 1 }, { h: 8, min: 0 }, 'female');
    const w = synthYearChapter(c, 2026, { general: true })!.find((s) => s.slot === '今年的工作')!;
    expect(w.statements.map((l) => l.source_ids[0])).toContain('syn.guan-year.wuqu.huaji-capital');
    expect(w.text).toContain('武曲本命化忌');
    expect(w.statements[0]!.citations.length).toBe(2);
    expect(w.statements[0]!.citations.at(-1)).toBe(synthesisCiteId('wtz.deep.p334.b002'));
    const c2 = chartOf({ y: 1970, m: 9, d: 1 }, { h: 0, min: 32 }, 'female');
    const w2 = synthYearChapter(c2, 2026, { general: true })!.find((s) => s.slot === '今年的工作');
    expect(w2?.text ?? '').not.toContain('挫折');
  });
  it('家人宮（父母、兄弟、子女、田宅）：一章最多三個宮段；人數、性別、祖業、離婚、手術類唔轉一年', () => {
    for (const c of sample(60)) for (const y of [2024, 2026, 2028]) {
      const ps = (synthYearChapter(c, y, { general: true }) ?? []).filter((s) => /^今年(的|與)/.test(s.slot));
      expect(ps.length).toBeLessThanOrEqual(3);
      // 盲評 ab9：冇底子唔寫過橋句；「或」入面嘅化唔改成本命化；唔假設有物業、下屬
      for (const s of ps) {
        expect(s.text).not.toMatch(/或本命化/);
        if (s.text.includes('底子上的變化')) expect(s.text).toContain('底子是');
        expect(s.text).not.toMatch(/今年你的(產業|下屬)/);
        // 2026-10-28 掃描：底子句唔出破相、手術、生離；理由句講盤上實況（化曜唔重複「本命」）
        expect(s.statements[0]!.text.split('；')[0]).not.toMatch(/破相|手術|生離|意外(?!之財)|死別/);
        expect(s.text).not.toMatch(/本命本命|化祿、化權或化科。|同宮或相對/);
      }
    }
    for (const a of [annualFumu, annualXiongdi, annualZinv, annualTian, annualFude]) for (const t of Object.values(a.cards))
      expect(t).not.toMatch(/兒子|女兒|人數|祖業|離婚|手術|開刀|血光|死亡|早逝|流產|畸戀/);
  }, 30000);
  it('讀者見到嘅節名冇索引編輯註（〔編輯導航…〕）', () => {
    for (const s of SYNTHESIS_SOURCES) expect(synthesisSource(synthesisCiteId(s.id))!.section).not.toMatch(/〔|編輯/);
  });
  it('今年的感情／身體（深造夫妻、疾厄章卡，流年宮重新配對）：段首講本命底子；離婚、手術類唔轉一年', () => {
    // 盲評 ab9：辰宮貪狼本命化忌，「辰戌貪狼見吉」嘅吉卡冇考慮忌，唔出
    const f = synthYearChapter(elder, 2026, { general: true })!.find((s) => s.slot === '今年的感情');
    expect(f?.statements.map((l) => l.source_ids[0]) ?? []).not.toContain('syn.fuqi-year.tanlang.chenxu-benefics');
    const c2 = chartOf({ y: 1970, m: 9, d: 1 }, { h: 0, min: 32 }, 'female');
    const j = synthYearChapter(c2, 2026, { general: true })!.find((s) => s.slot === '今年的身體')!;
    expect(j.text).toContain('今年要多留意頭痛及偏頭痛');
    expect(j.referenceConditions[1]).toMatch(/深造 p\.477/);
    for (const a of [annualFuqi, annualJie]) for (const t of Object.values(a.cards)) expect(t).not.toMatch(/離婚|再婚|手術|開刀|血光|意外|死亡|癌/);
  });
  it('23 歲空宮借機巨：機巨卡只限實坐（G1），冇星系運限卡就沿用舊章', () => {
    expect(synthYearChapter(young, 2026)).toBeNull();
  });
  it('這十年背景吉凶並見就兩邊都出：天梁化科會吉，同時會到煞曜', () => {
    const bg = synthYearChapter(elder, 2026)!.filter((s) => s.slot === '背景').map((s) => s.statements[0]!.source_ids[0]);
    expect(bg).toEqual(['syn.sys32.tianliang', 'syn.sys32.tianliang-sha']);
  });
});

it('G1–G10 writing lint is clean on both A/B charts', () => {
  for (const c of [elder, young]) {
    expect(synthesisLint(synthWealthChapter(c) ?? [])).toEqual([]);
    expect(synthesisLint(synthYearChapter(c, 2026) ?? [])).toEqual([]);
  }
});
