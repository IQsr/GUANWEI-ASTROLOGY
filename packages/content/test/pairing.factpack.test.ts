import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { cast, type Chart } from '@guanwei/ziwei';
import { BRANCH_TOPICS, branchRules, gujiaChapter } from '../src/index';
import { conclusionFor } from '../src/palace-plain';
import zz from '../src/sources/zhongzhou.json';

/**
 * 兩人對照事實包（2026-10-15 試做）。`SIM=1 npx vitest run test/pairing.factpack.test.ts`
 * 寫出 tools/pairing/factpack.json：LLM 連接句淨係准用呢度嘅句，每句要引 id。
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
    if (['偏向', '骨架', '長處'].includes(s.slot)) facts.push({ id: `${key}.命宮.${s.slot}`, kind: '性格', text: s.text, cite: SHENZAO(s.source_id) });
  for (const t of BRANCH_TOPICS.filter((x) => x.topic.palace === '夫妻' && x.topic.xingxi === undefined))
    for (const r of branchRules(chart, t))
      if (TRAIT_OR_RELATE.test(r.id) && !facts.some((f) => f.id === `${key}.${r.id}`))
        facts.push({ id: `${key}.${r.id}`, kind: '伴侶與相處', text: r.text, cite: SHENZAO(r.source.passage) });
  return { key, name, facts };
}

it.runIf(process.env.SIM)('事實包', () => {
  const HK = { lng: 114.17, lat: 22.32, label: '香港' };
  const a = cast({ solar: { y: 1996, m: 7, d: 18 }, time: { h: 3, min: 30 }, tz: 'Asia/Hong_Kong', place: HK, sex: 'female' });
  const b = cast({ solar: { y: 1990, m: 5, d: 15 }, time: { h: 10, min: 0 }, tz: 'Asia/Taipei', place: { lng: 121.56, lat: 25.04, label: '台北' }, sex: 'male' });
  if (!a.ok || !b.ok) throw new Error('排盤失敗');
  const pack = { note: '每條 text 入面嘅「你」指嗰條所屬嘅人', people: [person('A', '阿晴', a.value), person('B', '子朗', b.value)] };
  writeFileSync('tools/pairing/factpack.json', JSON.stringify(pack, null, 1) + '\n');
});
