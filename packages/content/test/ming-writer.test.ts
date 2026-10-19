import { describe, expect, it } from 'vitest';
import { annual, cast, SCHOOL_PROFILE, type Chart } from '@guanwei/ziwei';
import { assembleAll, inferAll, mingChapterOf, RULE_REGISTRY, SPEC_VERSION } from '../src/index';
import { FORBIDDEN_TERMS } from '../src/frame';
import { scanPlain } from '../src/plain';
import { CARDS, cardsFor, MING_TOPICS, type Card } from '../src/card';
import { mingFlow, writeMing, type MingSection } from '../src/ming-writer';

/*
 * 2026-10-19 新架構試點：命宮寫作層（ming-writer.ts）。
 * 抽盤方法同 test/card.test.ts 一樣（同一個種子、同一個亂數）。
 */
let seed = 20261019;
const rnd = (n: number) => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
};

const CHARTS: Chart[] = [];
for (let i = 0; CHARTS.length < 400 && i < 2000; i++) {
  const r = cast({
    solar: { y: 1950 + rnd(60), m: 1 + rnd(12), d: 1 + rnd(28) },
    time: { h: rnd(24), min: rnd(60) },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: i % 2 ? 'male' : 'female',
  });
  if (r.ok) CHARTS.push(r.value);
}

/* 讀者文字唔准有嘅嘢 */
const SICK = /病|手術|開刀|災|死|夭|血光|僧道|刑傷|官非|牢/;
const MONEY = /\d+\s*(元|萬|蚊|塊|dollars?)|[一二三四五六七八九十百千]+(萬|億)元/;
/* 卡 id、條件語法、binding note 嘅廣東話（喺、嘅、咗）漏咗出嚟 */
const LEAK = /card\.|[{}[\]]|sanfangOf|meets:|"meets"|deLu|geju|decadeOrder|decadeAge|natal|brightnessIn|"layer"|喺|嘅|咗|唔|〔/;

function check(s: MingSection, where: string): string[] {
  const bad: string[] = [];
  const all = [s.text.zh, s.text.en];
  if (!s.conclusion.zh.trim() || !s.conclusion.en.trim()) bad.push(`${where}：結論中英要齊`);
  if (!s.reasons.length) bad.push(`${where}：冇因為`);
  for (const p of s.parts) if (!p.zh.trim() || !p.en.trim()) bad.push(`${where}：${p.part} 中英要齊`);
  for (const l of [...s.caveats, ...s.advice]) if (!l.zh.trim() || !l.en.trim()) bad.push(`${where}：${l.card} 中英要齊`);
  if (s.parts[0]?.part !== '結論' || s.parts[1]?.part !== '因為') bad.push(`${where}：次序要係結論 → 因為`);
  const order = s.parts.map((p) => p.part).join('');
  if (!/^結論因為(留意)?(做法)?$/.test(order)) bad.push(`${where}：次序 ${order}`);
  if (!s.source_ids.length || !s.citations.length) bad.push(`${where}：冇出處`);
  if (s.source_ids[0] !== s.conclusion.card) bad.push(`${where}：source_ids 第一個唔係結論卡`);
  for (const t of all) {
    if (t.includes('{decades}') || t.includes('decades}')) bad.push(`${where}：{decades} 未填`);
    const leak = LEAK.exec(t);
    if (leak) bad.push(`${where}：漏咗「${leak[0]}」：${t}`);
    if (SICK.test(t)) bad.push(`${where}：病災字眼：${t}`);
    if (MONEY.test(t)) bad.push(`${where}：金額：${t}`);
  }
  const terms = FORBIDDEN_TERMS.filter((t) => s.conclusion.zh.includes(t));
  if (terms.length) bad.push(`${where}：結論有術語 ${terms.join('、')}`);
  for (const f of scanPlain(s.conclusion.zh, where)) bad.push(`${where}：${f.message}`);
  return bad;
}

const KIND = new Map(CARDS.map((c) => [c.id, c.kind]));

const sentencesOf = (t: string) => t.split(/(?<=[。！？])|\n/).map((x) => x.replace(/^(因為|留意：|做法：)/, '').trim()).filter((x) => x.length >= 6);

describe('命宮寫作層：400 張盤', () => {
  it('抽到 400 張盤', () => expect(CHARTS.length).toBe(400));

  it('本命章：一個話題一段、一個結論，次序固定，冇空段，中英齊，冇漏 id／條件，唔重複句', () => {
    const bad: string[] = [];
    let wrote = 0;
    for (const [i, chart] of CHARTS.entries()) {
      const m = writeMing(chart, { style: 'compact' });
      if (!m.system) continue;
      wrote++;
      const topics = m.sections.map((s) => s.topic);
      if (new Set(topics).size !== topics.length) bad.push(`盤${i}：話題重複 ${topics.join('、')}`);
      const want = MING_TOPICS.filter((t) => topics.includes(t));
      if (want.join() !== topics.join()) bad.push(`盤${i}：話題次序 ${topics.join('、')}`);
      if (!m.sections.length) bad.push(`盤${i}：成章冇段`);
      for (const s of m.sections) {
        const claims = s.source_ids.filter((id) => KIND.get(id) === 'claim');
        if (claims.length > 1) bad.push(`盤${i}「${s.topic}」：結論卡 ${claims.length} 張`);
        if (claims.length === 1 && claims[0] !== s.conclusion.card) bad.push(`盤${i}「${s.topic}」：結論卡唔係擺第一`);
        if (s.layer !== 'natal') bad.push(`盤${i}「${s.topic}」：本命章出咗 ${s.layer} 卡`);
        bad.push(...check(s, `盤${i}「${s.topic}」`));
      }
      const seen = new Set<string>();
      for (const t of sentencesOf(m.text.zh)) {
        if (seen.has(t)) bad.push(`盤${i}：句子重複「${t}」`);
        seen.add(t);
      }
    }
    expect(wrote).toBeGreaterThan(350);
    expect(bad).toEqual([]);
  });

  it('運限段：大限講「這十年」、流年講「這一年」，同一套規矩', () => {
    const bad: string[] = [];
    let n = 0;
    for (const [i, chart] of CHARTS.entries()) {
      const year = 2000 + (i % 40);
      const f = mingFlow(chart, year, { style: 'compact' });
      for (const [layer, s] of [['decade', f.decade], ['annual', f.annual]] as const) {
        if (!s) continue;
        n++;
        if (s.topic !== '運程' || s.layer !== layer) bad.push(`盤${i} ${year} ${layer}：話題／層唔啱`);
        if (!s.text.zh.includes(layer === 'decade' ? '這十年' : '這一年')) bad.push(`盤${i} ${year} ${layer}：冇講明層次`);
        bad.push(...check(s, `盤${i} ${year} ${layer}`));
      }
    }
    expect(n).toBeGreaterThan(100);
    expect(bad).toEqual([]);
  });

  it('同一張盤寫兩次，一字不差', () => {
    for (const chart of CHARTS.slice(0, 20)) expect(writeMing(chart, { style: 'compact' })).toEqual(writeMing(chart, { style: 'compact' }));
  });
});

describe('開關：mingWriter', () => {
  const sample = CHARTS.slice(0, 6);
  it("預設同 'legacy' 一樣；'cards' 只換命宮，其餘十一章唔郁", { timeout: 120_000 }, () => {
    for (const [i, chart] of sample.entries()) {
      const a = annual(chart, 2026);
      if (!a.ok) continue;
      const by = inferAll(RULE_REGISTRY, { chart, annual: a.value }, SCHOOL_PROFILE.ref, SPEC_VERSION, { chartId: `m${i}`, layer: 'natal' });
      const def = assembleAll(chart, by, { seed: `m${i}` });
      const legacy = assembleAll(chart, by, { seed: `m${i}`, mingWriter: 'legacy' });
      const cards = assembleAll(chart, by, { seed: `m${i}`, mingWriter: 'cards', mingStyle: 'compact' });
      expect(legacy).toEqual(def);
      expect(cards.filter((c) => c.palace !== '命宮')).toEqual(def.filter((c) => c.palace !== '命宮'));
      const ming = cards.find((c) => c.palace === '命宮')!;
      if (!writeMing(chart, { style: 'compact' }).sections.length) continue;
      expect(ming.segments[0]!.slot).toBe('結論');
      expect(ming.segments.every((s) => s.en && s.topic && s.source_id)).toBe(true);
      expect(ming.text).toBe(writeMing(chart, { style: 'compact' }).sections.flatMap((s) => s.parts.map((p) => p.zh)).join(''));
    }
  });
});

describe('review 回歸：大限依據與逐句來源', () => {
  it('共同的順行條件不會吃掉兩段樞紐大限各自的星曜', () => {
    const chart = CHARTS[25]!;
    const chapter = writeMing(chart, { style: 'compact' });
    expect(chapter.system?.n).toBe(21);
    const section = chapter.sections.find((s) => s.topic === '運程')!;
    expect(section.text.zh).toContain('二十三至三十二歲那個十年的命宮有貪狼');
    expect(section.text.zh).toContain('三十三至四十二歲那個十年的命宮有巨門');
    expect(section.reasons.filter((r) => r.zh === '你的大限是順行的')).toHaveLength(1);
    expect(section.text.en).toContain('Tan Lang');
    expect(section.text.en).toContain('Ju Men');
    expect(section.text.en).toContain('22–31');
    expect(section.text.en).toContain('32–41');
  });

  it('超過四項原因時仍保留每段大限的依據', () => {
    const chart = CHARTS[25]!;
    const pivot = CARDS.find((c) => c.id === 'card.ming.zifu-yinshen.pivot')!;
    const stars = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'];
    // 人工擴大測試條件，專門驗證長證據列不被四項上限截斷。
    const card: Card = { ...pivot, decades: { all: [
      { decadeOrder: 'forward' },
      { any: stars.map((star) => ({ star, in: { name: '命宮', layer: 'decade' } })) },
    ] } };
    const hit = cardsFor(chart, undefined, 'natal', [card])[0]!;
    expect(hit.decades!.length).toBeGreaterThan(4);
    const section = writeMing(chart, { pool: [card], style: 'compact' }).sections[0]!;
    for (const d of hit.decades!) {
      const palace = chart.palaces.find((p) => p.branch === d.branch)!;
      const star = stars.find((s) => palace.stars.some((x) => x.name === s))!;
      expect(section.reasons.some((r) => r.zh.includes(star) && r.en.includes(`${d.fromAge - 1}–${d.toAge - 1}`))).toBe(true);
    }
  });

  it('合併多張提醒／建議後仍保存每張卡及各句原文出處', () => {
    const chart = CHARTS[0]!;
    const a = annual(chart, 2026);
    if (!a.ok) throw new Error('測試盤流年資料不足');
    const by = inferAll(RULE_REGISTRY, { chart, annual: a.value }, SCHOOL_PROFILE.ref, SPEC_VERSION, { chartId: 'provenance', layer: 'natal' });
    const old = assembleAll(chart, by, { seed: 'provenance' }).find((c) => c.palace === '命宮')!;
    const natal = cardsFor(chart).map((h) => h.card);
    const core = natal.find((c) => c.topic === '本質' && c.kind === 'claim')!;
    const caveats = natal.filter((c) => c.topic === '本質' && c.kind === 'caveat');
    expect(caveats.length).toBeGreaterThan(1);
    const advice: Card[] = caveats.slice(0, 2).map((c, i) => ({
      ...c, id: `card.ming.review.advice-${i}`, kind: 'advice',
      claim: `你可以先核對第${i + 1}項計畫。`, en: `Check plan ${i + 1} first.`,
    }));
    const m = writeMing(chart, { pool: [core, ...caveats, ...advice], style: 'compact' });
    const chapter = mingChapterOf(old, m);
    for (const part of ['留意', '做法'] as const) {
      const lines = part === '留意' ? m.sections[0]!.caveats : m.sections[0]!.advice;
      const segment = chapter.segments.find((s) => s.slot === part)!;
      expect(segment.source_id?.split('+')).toEqual(lines.map((l) => l.card));
      expect(segment.source_ids).toEqual(lines.map((l) => l.card));
      expect(segment.citations).toEqual([...new Set(lines.flatMap((l) => l.sources))]);
      expect(segment.statements).toEqual(lines.map((l) => ({ text: l.zh, en: l.en, source_ids: [l.card], citations: l.sources })));
    }
    const used = new Set(chapter.segments.flatMap((s) => s.source_ids ?? []));
    expect(m.sections.flatMap((s) => s.source_ids).filter((id) => !used.has(id))).toEqual([]);
    const reasons = chapter.segments.find((s) => s.slot === '因為')!;
    expect(reasons.source_ids).toContain('card.ming.qisha-chenxu.tanlu-kongjie');
    expect(reasons.citations).toContain('wtz.deep.p064.b005');
    const shared = reasons.statements!.find((s) => s.text === '貪狼化祿')!;
    expect(shared.source_ids).toEqual(['card.ming.qisha-chenxu.tanlu-kongjie', advice[1]!.id]);
    expect(shared.citations).toEqual(['wtz.deep.p064.b005']);
    // 章首是排盤事實，不為了有出處而虛構原書掛源。
    const chartFact = reasons.statements!.find((s) => s.text.startsWith('你的命宮是'))!;
    expect(chartFact.source_ids).toEqual([]);
    expect(chartFact.citations).toEqual([]);
  });
});
