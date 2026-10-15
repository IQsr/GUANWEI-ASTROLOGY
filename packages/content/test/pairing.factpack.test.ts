import { it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cast, type Chart } from '@guanwei/ziwei';
import { BRANCH_TOPICS, branchRules, gujiaChapter } from '../src/index';
import { conclusionFor } from '../src/palace-plain';
import zz from '../src/sources/zhongzhou.json';

/**
 * 兩人對照事實包（2026-10-15 試做）。`SIM=1 npx vitest run test/pairing.factpack.test.ts`
 * 寫出 tools/pairing/packs/NN.json（第一對同舊 factpack.json 一樣）：LLM 連接句淨係准用呢度嘅句，每句要引 id。
 */
const PASSAGES = (zz as { passages: Record<string, { lines?: number[] }> }).passages;
const page = (id: string | null | undefined) => (id ? PASSAGES[id.split('+')[0]!]?.lines?.[0] : undefined);
const SHENZAO = (id?: string | null) => (page(id) ? `《深造講義》p.${page(id)}` : '《深造講義》');
const TRAIT_OR_RELATE = /^夫妻\.(紫微子午\.朝拱|紫府\.祿存|紫殺\.輔佐|天機巳亥\.吉|太陽子\.挑剔|太陽午\.賢明|太陽午\.輔佐|陽巨寅\.異族|武貪\.財|武貪\.祿|武殺\.性剛|武曲辰戌\.吉|武破\.吉|同陰\.貌|天同卯酉\.俊美|天府巳亥\.賢能|太陰酉\.事業|太陰巳\.助人|太陰亥\.富裕|巨門子午\.吉|巨門辰戌\.任勞|天相\.熟人|機陰\.同忌|紫貪\.合作|紫相\.合作|天機子午\.同祿|陰陽\.火鈴|太陽\.火鈴|武貪\.火鈴|武相\.剛柔|武相\.左右|廉相\.己見|廉貞寅申\.昌曲|天府卯酉\.吉|巨門巳亥\.親眷|巨門\.陀羅|巨門\.爭吵|天相\.共事|天梁巳亥\.同祿|天梁\.羊陀|七殺\.獨立|破軍\.駕御|機陰\.情緒|貪狼\.火鈴)$/;

function person(key: 'A' | 'B', name: string, chart: Chart) {
  const p = chart.palaces.find((x) => x.name === '夫妻')!;
  const majors = (q: typeof p) => q.stars.filter((s) => s.kind === 'major');
  const opp = !majors(p).length && p.borrowsFrom ? chart.palaces.find((x) => x.branch === p.borrowsFrom) : undefined;
  const lead = (majors(p).length ? majors(p) : majors(opp!)).map((s) => s.name);
  const m = chart.palaces.find((x) => x.name === '命宮')!;
  const facts: { id: string; kind: string; text: string; cite: string }[] = [];
  facts.push({ id: `${key}.盤.夫妻宮`, kind: '盤面', text: `夫妻宮在${p.branch}，${majors(p).map((s) => s.name + (s.sihua ? '化' + s.sihua : '')).join('、') || '沒有主星，借對宮' + lead.join('、')}`, cite: '命盤' });
  facts.push({ id: `${key}.盤.命宮`, kind: '盤面', text: `命宮在${m.branch}，${majors(m).map((s) => s.name + (s.sihua ? '化' + s.sihua : '')).join('、') || '沒有主星'}`, cite: '命盤' });
  const c = conclusionFor(lead, '夫妻');
  if (c) {
    facts.push({ id: `${key}.感情.結論`, kind: '在感情裡', text: c.summary, cite: '《全書》卷二〈三妻妾〉' });
    facts.push({ id: `${key}.感情.留意`, kind: '在感情裡', text: c.watch, cite: '《全書》卷二〈三妻妾〉' });
  }
  for (const s of gujiaChapter({ chart })?.segments ?? [])
    /* 偏向唔放：負面標籤（莽撞、虛浮、三心兩意）會被轉述，validator 捉唔晒（2026-10-15 試跑） */
    if (['骨架', '長處'].includes(s.slot)) facts.push({ id: `${key}.命宮.${s.slot}`, kind: '性格', text: s.text, cite: SHENZAO(s.source_id) });
  for (const t of BRANCH_TOPICS.filter((x) => x.topic.palace === '夫妻' && x.topic.xingxi === undefined))
    for (const r of branchRules(chart, t))
      if (TRAIT_OR_RELATE.test(r.id) && !facts.some((f) => f.id === `${key}.${r.id}`))
        facts.push({ id: `${key}.${r.id}`, kind: '伴侶與相處', text: r.text, cite: SHENZAO(r.source.passage) });
  return { key, name, facts };
}

let seed = 20261016;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

it.runIf(process.env.SIM)('事實包', () => {
  const HK = { lng: 114.17, lat: 22.32, label: '香港' };
  const one = (b: Parameters<typeof cast>[0]) => {
    const c = cast(b);
    if (!c.ok) throw new Error('排盤失敗');
    return c.value;
  };
  const random = () =>
    one({
      solar: { y: 1975 + Math.floor(rnd() * 30), m: 1 + Math.floor(rnd() * 12), d: 1 + Math.floor(rnd() * 28) },
      time: { h: Math.floor(rnd() * 24), min: Math.floor(rnd() * 60) },
      tz: 'Asia/Hong_Kong', place: HK, sex: rnd() < 0.5 ? 'male' : 'female',
    });
  /* 第一對係示範（阿晴 1996 夫妻宮空、子朗 1990）；其餘隨機，名係虛構 */
  const pairs: [string, Chart, string, Chart][] = [
    ['阿晴', one({ solar: { y: 1996, m: 7, d: 18 }, time: { h: 3, min: 30 }, tz: 'Asia/Hong_Kong', place: HK, sex: 'female' }),
     '子朗', one({ solar: { y: 1990, m: 5, d: 15 }, time: { h: 10, min: 0 }, tz: 'Asia/Taipei', place: { lng: 121.56, lat: 25.04, label: '台北' }, sex: 'male' })],
    ['嘉怡', random(), '浩然', random()],
    ['詠詩', random(), '俊傑', random()],
    ['卓琳', random(), '家朗', random()],
    ['曉彤', random(), '志明', random()],
  ];
  mkdirSync('tools/pairing/packs', { recursive: true });
  pairs.forEach(([an, a, bn, b], i) => {
    const pack = { note: '每條 text 入面嘅「你」指嗰條所屬嘅人', people: [person('A', an, a), person('B', bn, b)] };
    writeFileSync(`tools/pairing/packs/${String(i + 1).padStart(2, '0')}.json`, JSON.stringify(pack, null, 1) + '\n');
  });
});
