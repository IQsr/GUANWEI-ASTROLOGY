import { describe, expect, it } from 'vitest';
import { annual, cast, SCHOOL_PROFILE } from '@guanwei/ziwei';
import { BASE_BLOCKS, RULE_REGISTRY, SPEC_VERSION, assembleAll, inferAll, withSubject } from '../src/index';

/**
 * 懸空指代（2026-09-30）
 *
 * 宮位章嘅結論句由基塊第一句撮出嚟，組裝嗰陣同結論重複嘅句會剷走（開場、結構兩度都剷）。
 * 剷咗之後，下一句如果用「這種方式」「這使」「於是」開頭，就指住一句讀者冇讀到嘅句 ——
 * 例如子女宮：「這種方式讓對方放鬆」，讀者唔知「這種方式」係乜。
 *
 * 量過：400 本書出現二百幾次（平均兩本一次）。改法係喺基塊入面將嗰句寫成自己站得住
 * （點名講邊粒星），完整讀同剷咗前句讀都通。
 *
 * ⚠ 呢度驗**砌好嘅書**，唔係模擬組裝規則：剷句有兩重（開場對結論、結構對前文），
 * 自己模擬一定漏。
 */

const ANAPHOR = /^(這|那|至於|它的課題|相對地|所以|於是|因此|而|但|也|同樣|卷二那句|不是)/;
const sentences = (s: string): string[] => s.match(/[^。！？]*[。！？]|[^。！？]+$/g) ?? [];

let seed = 20260930;
const rnd = (n: number) => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
};

const BOOKS = Array.from({ length: 400 }, (_, i) => {
  const r = cast({
    solar: { y: 1950 + rnd(60), m: 1 + rnd(12), d: 1 + rnd(28) },
    time: { h: rnd(24), min: rnd(60) },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: i % 2 ? 'male' : 'female',
  });
  if (!r.ok) return null;
  const a = annual(r.value, 2026);
  if (!a.ok) return null;
  const by = inferAll(RULE_REGISTRY, { chart: r.value, annual: a.value }, SCHOOL_PROFILE.ref, SPEC_VERSION, {
    chartId: `a${i}`,
    layer: 'natal',
  });
  return assembleAll(r.value, by, { seed: `a${i}` });
}).filter((x) => x !== null);

/** 一句喺書入面，佢喺原塊嘅上一句唔喺佢前面 —— 即係上一句被剷咗。 */
function dangling(): string[] {
  const out = new Set<string>();
  for (const book of BOOKS) {
    for (const c of book) {
      for (const s of c.segments) {
        if (s.slot !== '開場' && s.slot !== '結構') continue;
        const ss = sentences(s.text);
        ss.forEach((raw, i) => {
          /* withSubject 加咗「天梁：」嘅頭一句：拎走先驗（「天梁：不是被讚，是⋯」本身都係懸空，2026-10-16） */
          const t = raw.replace(/^\S{2}：/, '');
          if (!ANAPHOR.test(t)) return;
          const block = BASE_BLOCKS.find((b) => b.body.includes(t));
          if (!block || t.slice(0, 8).includes(block.star)) return;
          const orig = sentences(block.body);
          const prev = orig[orig.indexOf(t) - 1];
          if (prev === undefined) return;
          /* 結構格頭一句可能被加咗「星名：」或者「它」換咗星名（withSubject）—— 比對前還原 */
          /* clash.ts 可能喺上一句前面加咗「不過，／但」（2026-10-18）：比對前拎走 */
          const before = ss[i - 1]?.replace(/^(不過，|但)/, '');
          const same = before === prev || before === `${block.star}：${prev}` || before === prev.replace(/^它/, block.star);
          if (!same) out.add(`${block.id}：${t}`);
        });
      }
    }
  }
  return [...out].sort();
}

describe('宮位章：剷咗重複句之後', () => {
  it('冇一句用指代詞開頭而指住被剷走嗰句', { timeout: 120_000 }, () => {
    expect(dangling()).toEqual([]);
  });
});

describe('結構格頭一句講得出係邊粒星（withSubject）', () => {
  it('唔加「星名：」標籤；「它」換做星名，句中嗰個都換（2026-10-18）', () => {
    expect(withSubject('不搶、不計較。', '天同')).toBe('不搶、不計較。');
    expect(withSubject('它不追高。', '天府')).toBe('天府不追高。');
    expect(withSubject('改造的成本高，但對它而言那筆錢花得值。', '廉貞')).toBe('改造的成本高，但對廉貞而言那筆錢花得值。');
    expect(withSubject('脾氣好讓它進得了任何圈子，卻不保它在圈子裡有位置。', '天同')).toBe('脾氣好讓天同進得了任何圈子，卻不保它在圈子裡有位置。');
  });
  it('講緊四化輔星或者用別稱就唔郁', () => {
    expect(withSubject('文昌化科，條理與文字被肯定。', '天相')).toBe('文昌化科，條理與文字被肯定。');
    expect(withSubject('帝座落在自己的基調上。', '紫微')).toBe('帝座落在自己的基調上。');
  });
  it('頭一句講緊同座嗰粒星就唔加（以前錯加成「廉貞：貪狼⋯」）', () => {
    expect(withSubject('貪狼對居所的態度偏向可換。', '廉貞', ['廉貞', '貪狼'])).toBe('貪狼對居所的態度偏向可換。');
  });
  it('「你」或者引文開頭唔加', () => {
    expect(withSubject('你對數字有感覺。', '武曲')).toBe('你對數字有感覺。');
    expect(withSubject('《全書》寫「終身保守」。', '天府')).toBe('《全書》寫「終身保守」。');
  });
});
