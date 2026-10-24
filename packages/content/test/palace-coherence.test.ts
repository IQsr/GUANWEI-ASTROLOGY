import { setTestHuas, moveTestStar } from './helpers/chart-mutations';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { cast, type BirthInput, type Chart } from '@guanwei/ziwei';
import { freeMingReading } from '../src/free-ming-reader';
import { palaceReading } from '../src/palace-reader';
import { palaceNarrative } from '../src/palace-narrative';
import { withPalaceAdvice } from '../src/palace-advice';
import { readerReferenceLanguage } from '../src/reader-reference-language';
import focused from '../src/cards/palace-focused.json';
import remaining from '../src/cards/palace-remaining.json';
import links from '../src/cards/palace-advice-links.json';
import advice from '../src/cards/palace-advice.json';
import review from '../src/cards/palace-coherence-review.json';
import narrative from '../src/cards/palace-narrative.json';
import fixtures from '../../../apps/web/src/lib/free-ming-preview.json';

const charts = fixtures.map((f) => { const c = cast(f.input as BirthInput); if (!c.ok) throw Error(c.message); return c.value; });
const names = ['命宮','性格的骨架','兄弟','夫妻','子女','財帛','疾厄','遷移','僕役','官祿','田宅','福德','父母'];
const raw = (c: Chart, p: string, y = 2026) => p === '命宮' ? freeMingReading(c,y)!.ming : p === '性格的骨架' ? freeMingReading(c,y)!.bone : palaceReading(c,p,y)!;
const read = (c: Chart, p: string, y = 2026) => withPalaceAdvice(c,p,y,palaceNarrative(c,p,y,raw(c,p,y)));
const suggestion = (c: Chart, p: string, y = 2026) => read(c,p,y).find((s) => s.heading === '給你的建議｜編輯建議')!;
const selected = (c: Chart, p: string, id: string) => raw(c,p).some((s) => s.statements.some((line) => line.source_ids.includes(id)));

it('660既有組合入口逐項有建議對應，無虛構入口；正文改寫與核對版本綁定', () => {
  const profiles = [...focused.profiles, ...remaining.profiles];
  expect(Object.keys(links.profiles).sort()).toEqual(profiles.map((p) => `${p.id}-base`).sort());
  for (const p of profiles) {
    const theme = (links.profiles as Record<string,string>)[`${p.id}-base`]!;
    expect((advice as Record<string,Record<string,unknown>>)[p.palace]![theme], p.id).toBeDefined();
  }
  for (const [path, hash] of Object.entries(review.parents)) {
    const value = readFileSync(new URL(`../../../${path}`,import.meta.url),'utf8').replace(/\r\n/g,'\n');
    expect(createHash('sha256').update(value).digest('hex'),path).toBe(hash);
  }
  for (const [id, change] of Object.entries(review.prose_changes)) {
    const entry = (narrative.entries as Record<string,{prose:string|null}>)[id]!;
    expect(entry.prose,id).toBe(change.after);
    expect(change.after,id).not.toBe(change.before);
  }
});

it('武貪田宅補清得後能否保留；實際忌煞分支優先轉向協調，不以整理房間代替', () => {
  const ordinary = charts.find((c) => selected(c,'田宅','property-54-base') && !c.palaces.find((p) => p.name === '田宅')!.borrowsFrom && !selected(c,'田宅','rule-19'))!;
  expect(ordinary).toBeDefined();
  const c = structuredClone(ordinary);
  const property = c.palaces.find((p) => p.name === '田宅')!;
  setTestHuas(c, { 武曲: '忌' });
  moveTestStar(c, '火星', property);
  expect(selected(c,'田宅','rule-19')).toBe(true);
  expect(read(c,'田宅').map((s) => s.text).join('')).toContain('若武曲化忌又見煞');
  expect(suggestion(c,'田宅',2100).text).toContain('誰作決定');
  expect(suggestion(ordinary,'田宅',2100).text).toContain('維持它需要多少');
  const year = fixtures[charts.indexOf(ordinary)]!.input.solar.y + 15;
  expect(suggestion(ordinary,'田宅',year).text).toContain('時間、費用與誰負責照料');
  expect(suggestion(ordinary,'田宅',year).text).not.toContain('買樓');
});

it('已選具體修飾接上建議，未選中的規則不可改變建議', () => {
  const cases = [
    ['父母','parents-jiliang-good','把方法學會|問清楚方法|逐步自己完成'],
    ['官祿','career-wu-ji','資源未到位'],
  ];
  for (const [p,id,expected] of cases) {
    const c = charts.find((c) => selected(c,p!,id!))!;
    expect(c,id).toBeDefined();
    expect(suggestion(c,p!,2100).text,id).toMatch(new RegExp(expected!));
  }
  const friends = structuredClone(charts.find((c) => c.palaces.find((p) => p.name === '僕役')!.stars.filter((s) => s.kind === 'major').map((s) => s.name).sort().join('+') === '天同+天梁')!);
  setTestHuas(friends, { 天同: '祿' });
  expect(selected(friends,'僕役','friends-tongliang-lu')).toBe(true);
  expect(suggestion(friends,'僕役',2100).text).toContain('利益分配');
  const finance = structuredClone(charts.find((c) => c.palaces.find((p) => p.name === '財帛')!.stars.filter((s) => s.kind === 'major').map((s) => s.name).sort().join('+') === '天府+武曲')!);
  const wealth = finance.palaces.find((p) => p.name === '財帛')!;
  setTestHuas(finance, { 武曲: '忌', 天府: '科' });
  expect(selected(finance,'財帛','wealth-wufu-ji-ke')).toBe(true);
  expect(suggestion(finance,'財帛',2100).text).toContain('真正能動用多少');
  for (const c of charts) for (const p of names.slice(2)) {
    if (!c.palaces.find((q) => q.name === p)!.borrowsFrom) continue;
    const ids = raw(c,p).flatMap((s) => s.statements.flatMap((line) => line.source_ids));
    expect(ids.filter((id) => id in links.rules),p).toEqual([]);
  }
});

it('72盤十三章條件改語氣仍保留星曜、宮支、時間層與原文疑點，不留內部報告詞', () => {
  const terms = /紫微|天機|太陽|武曲|天同|廉貞|天府|太陰|貪狼|巨門|天相|天梁|七殺|破軍|左輔|右弼|文昌|文曲|天魁|天鉞|祿存|火星|鈴星|擎羊|陀羅|地空|地劫|天刑|天馬|子午|丑未|寅申|卯酉|辰戌|巳亥|本命|大限|流年/g;
  for (const c of charts) for (const p of names) {
    for (const row of read(c,p)) for (const original of row.referenceConditions ?? []) {
      const text = readerReferenceLanguage(original);
      expect(text).not.toMatch(/引擎|冒充|本輪|指紋|產品|已批|觸發|點票|輸出|選段|正文/);
      for (const term of new Set(original.match(terms) ?? [])) expect(text,original).toContain(term);
    }
  }
  expect(readerReferenceLanguage('未符合本輪全部前提，未採此個人分支。')).toContain('不套用於你');
  expect(readerReferenceLanguage('符合本輪已核前提，正文採用。')).toContain('因此保留這項解讀');
  expect(readerReferenceLanguage('不以部分符合冒充全格；羊刑而無單星另有不克不離例外。')).toContain('羊刑而無單星另有不克不離例外');
});
