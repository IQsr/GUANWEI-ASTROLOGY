import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { cast, type BirthInput, type Chart } from '@guanwei/ziwei';
import { freeMingReading } from '../src/free-ming-reader';
import { citation } from '../src/citation';
import data from '../src/cards/free-ming-reading.json';
import review from '../src/cards/free-ming-reading-review.json';
import index from '../../../tools/wang-reference/deep-index.json';

const cases: BirthInput[] = [
  { solar: { y: 1990, m: 3, d: 21 }, time: { h: 14, min: 20 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'female' },
  { solar: { y: 1992, m: 9, d: 12 }, time: { h: 19, min: 41 }, tz: 'Australia/Sydney', place: { lng: 151.2093, lat: -33.8688, label: '悉尼' }, sex: 'male' },
  { solar: { y: 2012, m: 4, d: 20 }, time: { h: 13, min: 29 }, tz: 'America/New_York', place: { lng: -74.006, lat: 40.7128, label: '紐約' }, sex: 'female' },
];
const charts = cases.map((b) => { const r = cast(b); if (!r.ok) throw Error(r.message); return r.value; });
const text = (c: Chart) => freeMingReading(c, 2026)!.ming.map((s) => s.text).join('');
const hash = (path: string) => createHash('sha256').update(readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n')).digest('hex');

it('核讀稿、選段條件及原段指紋綁定；短註可由正式引用解析器讀出', () => {
  expect(data.pdf_sha256).toBe(index.book.sha256);
  expect(hash('../src/cards/free-ming-reading.json')).toBe(review.data_sha256);
  expect(hash('../src/free-ming-reader.ts')).toBe(review.selector_sha256);
  const blocks = new Map(index.blocks.map((b) => [b.id, b]));
  for (const [id, s] of Object.entries(data.sources)) {
    expect(blocks.get(id), id).toMatchObject({ text_sha256: s.sha256, pdf_page: s.page, section_title: s.section });
    expect(s.excerpt.length).toBeGreaterThan(0); expect(s.excerpt.length).toBeLessThanOrEqual(400);
    expect(citation(`free.reading.v1:${id}`)).toMatchObject({ author: '王亭之', text: s.excerpt, section: s.section, excerpt: true });
  }
  for (const row of Object.values(data.entries)) {
    for (const id of row.sources) expect(id in data.sources).toBe(true);
    if (row.sources.length) expect('referenceConditions' in row && row.referenceConditions.length).toBeGreaterThan(0);
    else expect('referenceConditions' in row).toBe(false);
  }
});

it('同梁：夾忌例外優先；移除必要條件不再套特殊拉扯，火星分支另核祿存', () => {
  expect(text(charts[0]!)).toContain('互相牽制');
  expect(text(charts[0]!)).toContain('工作與發展方向較容易反覆');
  const changed = structuredClone(charts[0]!);
  changed.palaces.find((p) => p.name === '命宮')!.stars.find((s) => s.name === '天同')!.sihua = undefined;
  expect(text(changed)).not.toContain('兩邊難以兼顧');
  expect(text(changed)).not.toContain('工作與發展方向較容易反覆');
  const noLu = structuredClone(charts[0]!);
  noLu.palaces.find((p) => p.name === '命宮')!.stars = noLu.palaces.find((p) => p.name === '命宮')!.stars.filter((s) => s.name !== '祿存');
  expect(text(noLu)).toContain('互相牽制');
  expect(text(noLu)).not.toContain('工作與發展方向較容易反覆');
  const lu = charts[0]!.palaces.find((p) => p.name === '命宮')!.stars.find((s) => s.name === '祿存')!;
  noLu.palaces.find((p) => p.name === '遷移')!.stars.push(structuredClone(lu));
  expect(text(noLu)).not.toContain('祿存同宮');
  expect(freeMingReading(noLu, 2026)!.bone.map((s) => s.text).join('')).not.toContain('祿存、火星都在你的命宮');
});

it('壬年亥府：兩對輔佐、祿存、借入武忌合讀；缺一前提即退回一般稿', () => {
  expect(text(charts[1]!)).toContain('支持踏實累積');
  expect(text(charts[1]!)).not.toContain('事業會做大');
  for (const name of ['左輔', '右弼', '天魁', '天鉞', '祿存']) {
    const changed = structuredClone(charts[1]!);
    for (const p of changed.palaces) p.stars = p.stars.filter((s) => s.name !== name);
    expect(text(changed), name).not.toContain('你這張盤有支持踏實累積');
  }
  const changed = structuredClone(charts[1]!);
  changed.palaces.find((p) => p.name === '福德')!.stars.find((s) => s.name === '武曲')!.sihua = undefined;
  expect(text(changed)).not.toContain('你這張盤有支持踏實累積');
});

it('機梁：混合不等於已調和；年少例子不使用成人職務或必然人格', () => {
  const r = freeMingReading(charts[2]!, 2026)!;
  const whole = [...r.ming, ...r.bone].map((s) => s.text).join('');
  expect(whole).toContain('先保留兩者');
  expect(whole).toContain('同學');
  expect(whole).not.toMatch(/多數時候判斷公道|又快又公道|你偏向尖銳|你偏向明斷/);
  expect(r.bone.some((s) => s.text.includes('你現在仍在成長'))).toBe(true);
});

it('編輯例子沒有引用；不同實盤仍用同一選段路徑，不靠示範生日', () => {
  let selected = 0;
  for (let month = 1; month <= 12; month++) for (let hour = 0; hour < 24; hour += 2) {
    const r = cast({ ...cases[0]!, solar: { y: 1981, m: month, d: 15 }, time: { h: hour, min: 20 } });
    if (!r.ok) continue;
    const reading = freeMingReading(r.value, 2026); if (!reading) continue;
    selected++;
    for (const s of [...reading.ming, ...reading.bone]) {
      expect(s.text).not.toContain('{branch}');
      for (const line of s.statements) {
        if (line.kind === 'editorial-example' || line.kind === 'editorial-advice' || line.kind === 'evidence') expect(line.citations).toEqual([]);
        else { expect(line.citations.length).toBeGreaterThan(0); for (const id of line.citations) expect(citation(id), id).not.toBeNull(); }
      }
    }
  }
  expect(selected).toBeGreaterThan(3);
});
