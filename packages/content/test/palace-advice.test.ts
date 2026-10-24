import { expect, it } from 'vitest';
import { cast, type BirthInput, type Chart } from '@guanwei/ziwei';
import { palaceReading } from '../src/palace-reader';
import { freeMingReading } from '../src/free-ming-reader';
import { withPalaceAdvice } from '../src/palace-advice';
import type { FreeReadingSegment } from '../src/free-ming-reader';
import fixtures from '../../../apps/web/src/lib/free-ming-preview.json';

const charts = fixtures.map((f) => { const r = cast(f.input as BirthInput); if (!r.ok) throw Error(r.message); return r.value; });
const names = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];
const original = (c: Chart, p: string, year = 2026) => p === '命宮' ? freeMingReading(c, year)!.ming : palaceReading(c, p, year)!;
const cited = (rows: FreeReadingSegment[]) => rows.filter((r) => r.statements.some((s) => s.citations.length));
const example = (c: Chart, p: string, year = 2100) => withPalaceAdvice(c, p, year, original(c, p, year)).find((r) => r.heading === '給你的建議｜編輯建議')!;
const chartFor = (palace: string, stars: string[]) => {
  const c = charts.find((c) => c.palaces.find((p) => p.name === palace)!.stars.filter((s) => s.kind === 'major').map((s) => s.name).sort().join('+') === stars.sort().join('+'));
  if (!c) throw Error(`No chart ${palace}/${stars}`); return c;
};

it('72張盤十二宮各一個明示編輯建議；全文、出處、原文、條件與例外不變，亦不改輸入', () => {
  let borrowed = 0;
  for (const c of charts) for (const p of names) {
    const before = original(c, p); const frozen = JSON.stringify([c, before]);
    const after = withPalaceAdvice(c, p, 2026, before);
    const scenes = after.filter((s) => s.heading === '給你的建議｜編輯建議');
    expect(scenes, p).toHaveLength(1);
    expect(cited(after)).toEqual(cited(before));
    expect(JSON.stringify([c, before])).toBe(frozen);
    expect(scenes[0]!.text.startsWith('你') || scenes[0]!.text.startsWith('說到將來的婚姻')).toBe(true);
    expect(scenes[0]!.text).not.toMatch(/例如，|阿晴|阿哲|小晴|小哲|可以想像/);
    expect(scenes[0]!.statements[0]!.kind).toBe('editorial-advice');
    expect(scenes[0]!.text).not.toMatch(/不表示你曾經|不適用的部分|可以先回到「據」/);
    expect(scenes[0]!.statements.every((s) => s.citations.length === 0)).toBe(true);
    expect(scenes[0]!.referenceConditions).toBeUndefined();
    if (p !== '命宮' && c.palaces.find((r) => r.name === p)!.borrowsFrom) {
      borrowed++; expect(before[0]!.referenceConditions!.join('')).toContain('未把對宮的四化');
    }
  }
  expect(borrowed).toBeGreaterThan(50);
});

it('完整雙星主題的建議對應不同實務重點', () => {
  expect(example(chartFor('子女', ['太陽','巨門']), '子女').text).toContain('把理由說完');
  expect(example(chartFor('子女', ['天機','天梁']), '子女').text).toContain('讓對方自己排流程');
  expect(example(chartFor('子女', ['天府']), '子女').text).toContain('提供資源和保持交流');
  expect(example(chartFor('官祿', ['天相']), '官祿').text).toContain('責任與權限一起看');
  expect(example(chartFor('官祿', ['廉貞','天府']), '官祿').text).toContain('品牌名氣');
  expect(example(chartFor('田宅', ['太陽','巨門']), '田宅').text).toContain('誰負責維護');
  expect(example(chartFor('田宅', ['天機','天梁']), '田宅').text).toContain('要改善哪個問題');
  expect(example(chartFor('財帛', ['武曲','貪狼']), '財帛').text).toContain('扣除成本後還剩多少');
  expect(example(chartFor('財帛', ['武曲','天府']), '財帛').text).toContain('真正能動用多少');
});

it('年少每宮用成長語境，夫妻與子女不假設已婚育；疾厄不由生活感受補病名條件', () => {
  const c = charts[0]!; const year = fixtures[0]!.input.solar.y + 15;
  for (const p of names.filter((p) => p !== '命宮')) {
    const text = example(c, p, year).text;
    expect(text, p).toMatch(/你|說到將來的婚姻/);
    expect(text, p).not.toMatch(/阿晴|阿哲|小晴|小哲|可以想像/);
    expect(text).not.toMatch(/扣除成本|代管或另有用途|比較兩份工作|你替客戶|自己的角色/);
  }
  expect(example(c, '夫妻', year).text).toContain('說到將來的婚姻');
  expect(example(c, '子女', year).text).toContain('低年級同學');
  const health = example(c, '疾厄').text;
  expect(health).toMatch(/痛楚|疲倦|咳嗽|腫脹|腹脹/);
  expect(health).not.toMatch(/你(?:患有|會患|必患)|星曜.*(?:證明|診斷)/);
});

it('按既有實際選段保留巳亥巨門親眷主題；機梁子女火星移走後不再選距離建議', () => {
  const giant = charts.find((c) => original(c, '夫妻').some((r) => r.statements.some((s) => s.source_ids.includes('spouse-83-base'))))!;
  expect(giant).toBeDefined();
  expect(example(giant, '夫妻').text).toContain('問伴侶本人的想法');
  const c = structuredClone(chartFor('子女', ['天機', '天梁']));
  for (const p of c.palaces) p.stars = p.stars.filter((s) => s.name !== '火星');
  expect(example(c, '子女').text).toContain('讓對方自己排流程');
  const fire = charts.flatMap((c) => c.palaces.flatMap((p) => p.stars)).find((s) => s.name === '火星')!;
  c.palaces.find((p) => p.name === '子女')!.stars.push(structuredClone(fire));
  expect(original(c, '子女').some((r) => r.statements.some((s) => s.source_ids.includes('children-jiliang-fire')))).toBe(true);
  expect(example(c, '子女').text).toContain('分隔兩地');
  const removed = structuredClone(c);
  removed.palaces.find((p) => p.name === '子女')!.stars = removed.palaces.find((p) => p.name === '子女')!.stars.filter((s) => s.name !== '火星');
  // A fire star in another palace must not recreate the same-palace branch.
  removed.palaces.find((p) => p.name === '財帛')!.stars.push(structuredClone(fire));
  expect(example(removed, '子女').text).toContain('讓對方自己排流程');
});

it('骨架不是另一宮，保留整章；既有帶據建議不會被篩走', () => {
  const c = charts[0]!; const bone = freeMingReading(c, 2026)!.bone;
  expect(withPalaceAdvice(c, '性格的骨架', 2026, bone)).toBe(bone);
  const rows = original(c, '田宅');
  const last = structuredClone(rows.at(-1)!); last.statements[0]!.citations = ['sentinel'];
  const protectedRows = [...rows.slice(0,-1), last];
  expect(withPalaceAdvice(c, '田宅', 2026, protectedRows)).toContainEqual(last);
});
