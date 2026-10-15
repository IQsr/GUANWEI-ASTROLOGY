import { describe, it } from 'vitest';
import { cast, type Chart } from '@guanwei/ziwei';
import { BRANCH_TOPICS, branchRules, gujiaChapter } from '../src/index';
import type { BranchRule } from '../src/branch';
import { conclusionFor } from '../src/palace-plain';

/**
 * 兩人對照試砌（2026-10-15）。平時唔跑：`SIM=1 npx vitest run test/pairing.sim.test.ts`
 *
 * 甲方欄 = 甲嘅夫妻宮細讀（《深造講義》夫妻宮章，`branch/fuqi/`），只取講「伴侶係點樣嘅人」同「相處」嘅條文；
 * 乙方欄 = 乙嘅命宮「性格的骨架」章。數吓每邊實際出到幾多句，同埋幾多張盤甲方欄係空。
 * 見 docs/pairing-b5-2026-10-15.md。
 */

/** 伴侶係點樣嘅人 */
const TRAIT = new Set([
  '夫妻.紫微子午.朝拱', '夫妻.紫府.祿存', '夫妻.紫殺.輔佐', '夫妻.天機巳亥.吉', '夫妻.太陽子.挑剔', '夫妻.太陽午.賢明',
  '夫妻.太陽午.輔佐', '夫妻.陽巨寅.異族', '夫妻.武貪.財', '夫妻.武貪.祿', '夫妻.武殺.性剛', '夫妻.武曲辰戌.吉', '夫妻.武破.吉',
  '夫妻.同陰.貌', '夫妻.天同卯酉.俊美', '夫妻.天府巳亥.賢能', '夫妻.太陰酉.事業', '夫妻.太陰巳.助人', '夫妻.太陰亥.富裕',
  '夫妻.巨門子午.吉', '夫妻.巨門辰戌.任勞', '夫妻.天相.熟人', '夫妻.機陰.同忌',
]);
/** 兩人點樣相處（可以做相處提醒）；「長久／不和／聚少離多」一類結局句唔算 */
const RELATE = new Set([
  '夫妻.紫貪.合作', '夫妻.紫相.合作', '夫妻.天機子午.同祿', '夫妻.陰陽.火鈴', '夫妻.太陽.火鈴', '夫妻.武貪.火鈴', '夫妻.武相.剛柔',
  '夫妻.武相.左右', '夫妻.廉相.己見', '夫妻.廉貞寅申.昌曲', '夫妻.天府卯酉.吉', '夫妻.巨門巳亥.親眷', '夫妻.巨門.陀羅',
  '夫妻.巨門.爭吵', '夫妻.天相.共事', '夫妻.天梁巳亥.同祿', '夫妻.天梁.羊陀', '夫妻.七殺.獨立', '夫妻.破軍.駕御',
  '夫妻.機陰.情緒', '夫妻.貪狼.火鈴',
]);

function fuqi(chart: Chart): BranchRule[] {
  const out: BranchRule[] = [];
  for (const t of BRANCH_TOPICS.filter((x) => x.topic.palace === '夫妻' && x.topic.xingxi === undefined))
    for (const r of branchRules(chart, t)) if (!out.some((x) => x.id === r.id)) out.push(r);
  return out;
}

/**
 * 《全書》卷二「三妻妾」有講伴侶性質、而唔係淨講刑克嘅主星（人手讀過原文揀）。
 * 貪狼、七殺、破軍、武曲、廉貞嗰幾句全部係「克／生離／三度作新郎」，唔用。
 */
const QUANSHU_TRAIT = new Set(['紫微', '天機', '太陽', '天同', '太陰', '巨門', '天相', '天梁', '天府']);

/** 夫妻宮主星，空宮借對宮（同 assemble.ts 結論句一樣讀法） */
function fuqiLead(chart: Chart): string[] {
  const p = chart.palaces.find((x) => x.name === '夫妻')!;
  const own = p.stars.filter((s) => s.kind === 'major');
  const opp = !own.length && p.borrowsFrom ? chart.palaces.find((x) => x.branch === p.borrowsFrom) : undefined;
  return (own.length ? own : (opp?.stars.filter((s) => s.kind === 'major') ?? [])).map((s) => s.name);
}

function columns(chart: Chart) {
  const all = fuqi(chart);
  const lead = fuqiLead(chart);
  const g = gujiaChapter({ chart });
  return {
    fuqiStars: chart.palaces.find((p) => p.name === '夫妻')!.stars.filter((s) => s.kind === 'major').map((s) => s.name).join('') || '（空宮）',
    trait: all.filter((r) => TRAIT.has(r.id)),
    relate: all.filter((r) => RELATE.has(r.id)),
    other: all.filter((r) => !TRAIT.has(r.id) && !RELATE.has(r.id)),
    /* 退路一：甲自己喺感情裡係點（夫妻宮章結論句，每張盤都有） */
    self: conclusionFor(lead, '夫妻'),
    /* 退路二：《全書》三妻妾有伴侶句 */
    quanshu: lead.some((x) => QUANSHU_TRAIT.has(x)),
    ming: g?.segments.filter((s) => s.slot !== '留白') ?? [],
  };
}

const HK = { lng: 114.17, lat: 22.32, label: '香港' };
const SAMPLES = [
  { name: '1990-03-21 14:20 香港', solar: { y: 1990, m: 3, d: 21 }, time: { h: 14, min: 20 }, place: HK, tz: 'Asia/Hong_Kong' },
  { name: '1990-05-15 10:00 台北', solar: { y: 1990, m: 5, d: 15 }, time: { h: 10, min: 0 }, place: { lng: 121.56, lat: 25.04, label: '台北' }, tz: 'Asia/Taipei' },
  { name: '1996-07-18 03:30 香港', solar: { y: 1996, m: 7, d: 18 }, time: { h: 3, min: 30 }, place: HK, tz: 'Asia/Hong_Kong' },
];

let seed = 20261015;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe.runIf(process.env.SIM)('兩人對照試砌', () => {
  it('三張示範盤兩兩對照', () => {
    const cs = SAMPLES.map((s) => {
      const c = cast({ ...s, sex: 'female' });
      if (!c.ok) throw new Error(s.name);
      return { name: s.name, col: columns(c.value) };
    });
    for (const a of cs) {
      const b = cs.find((x) => x !== a)!;
      console.log(`\n### 甲 ${a.name}（夫妻宮 ${a.col.fuqiStars}）→ 乙 ${b.name}`);
      console.log('甲欄 伴侶：', a.col.trait.map((r) => `${r.text}〔${r.id}〕`));
      console.log('甲欄 相處：', a.col.relate.map((r) => `${r.text}〔${r.id}〕`));
      console.log('甲欄 唔用：', a.col.other.map((r) => `${r.text}〔${r.id}〕`));
      console.log('甲 感情裡的你：', a.col.self ? `${a.col.self.summary}〔${a.col.self.id}〕` : null, '全書伴侶句：', a.col.quanshu);
      console.log('乙欄 命宮：', b.col.ming.map((s) => `[${s.slot}] ${s.text}`));
    }
  });

  it('隨機三千張盤', () => {
    const N = 3000;
    const tally = { trait: [0, 0, 0, 0], relate: [0, 0, 0, 0], both0: 0, ming: [] as number[], noSelf: 0, rescued: 0, traitOrQs: 0 };
    const emptyBy = new Map<string, number>();
    const totalBy = new Map<string, number>();
    const cols: ReturnType<typeof columns>[] = [];
    for (let i = 0; i < N; i++) {
      const c = cast({
        solar: { y: 1960 + Math.floor(rnd() * 45), m: 1 + Math.floor(rnd() * 12), d: 1 + Math.floor(rnd() * 28) },
        time: { h: Math.floor(rnd() * 24), min: Math.floor(rnd() * 60) },
        tz: 'Asia/Hong_Kong', place: HK, sex: rnd() < 0.5 ? 'male' : 'female',
      });
      if (!c.ok) continue;
      const col = columns(c.value);
      cols.push(col);
      tally.trait[Math.min(col.trait.length, 3)]!++;
      tally.relate[Math.min(col.relate.length, 3)]!++;
      if (!col.self) tally.noSelf++;
      if (col.trait.length || col.quanshu) tally.traitOrQs++;
      if (!col.trait.length && !col.relate.length) {
        tally.both0++;
        if (col.quanshu) tally.rescued++;
        emptyBy.set(col.fuqiStars, (emptyBy.get(col.fuqiStars) ?? 0) + 1);
      }
      totalBy.set(col.fuqiStars, (totalBy.get(col.fuqiStars) ?? 0) + 1);
      tally.ming.push(col.ming.length);
    }
    const n = cols.length;
    const pct = (k: number) => `${((100 * k) / n).toFixed(1)}%`;
    console.log(`\n盤數 ${n}`);
    console.log('甲欄伴侶句 0/1/2/3+：', tally.trait.map(pct).join(' / '));
    console.log('甲欄相處句 0/1/2/3+：', tally.relate.map(pct).join(' / '));
    console.log('甲欄兩樣都冇：', pct(tally.both0), '；當中《全書》有伴侶句：', pct(tally.rescued));
    console.log('有伴侶句（深造或全書）：', pct(tally.traitOrQs));
    console.log('冇「感情裡的你」結論句：', pct(tally.noSelf));
    const m = tally.ming;
    console.log('乙欄命宮段數 最少/平均/最多：', Math.min(...m), (m.reduce((a, b) => a + b, 0) / m.length).toFixed(1), Math.max(...m));
    /* 隨機配對：兩個方向都係空 */
    let pairs = 0, bothDir = 0, oneDir = 0;
    for (let i = 0; i + 1 < n; i += 2) {
      const e = (x: (typeof cols)[number]) => !x.trait.length && !x.relate.length;
      pairs++;
      if (e(cols[i]!) && e(cols[i + 1]!)) bothDir++;
      else if (e(cols[i]!) || e(cols[i + 1]!)) oneDir++;
    }
    console.log(`隨機配對 ${pairs}：兩個方向都空 ${((100 * bothDir) / pairs).toFixed(1)}%，一個方向空 ${((100 * oneDir) / pairs).toFixed(1)}%`);
    console.log('甲欄全空嘅夫妻宮（空盤數／該組總數）：');
    for (const [k, v] of [...emptyBy].sort((a, b) => b[1] - a[1])) console.log(`  ${k}：${v}/${totalBy.get(k)}`);
  });
});
