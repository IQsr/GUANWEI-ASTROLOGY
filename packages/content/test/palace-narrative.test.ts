import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { cast, type BirthInput, type Chart } from '@guanwei/ziwei';
import { palaceReading } from '../src/palace-reader';
import { freeMingReading } from '../src/free-ming-reader';
import { palaceNarrative } from '../src/palace-narrative';
import { withPalaceAdvice } from '../src/palace-advice';
import type { FreeReadingSegment } from '../src/free-ming-reader';
import data from '../src/cards/palace-narrative.json';
import fixtures from '../../../apps/web/src/lib/free-ming-preview.json';

const charts = fixtures.map((f) => { const r = cast(f.input as BirthInput); if (!r.ok) throw Error(r.message); return r.value; });
const palaces = ['命宮','兄弟','夫妻','子女','財帛','疾厄','遷移','僕役','官祿','田宅','福德','父母'];
const original = (c: Chart, p: string, y = 2026) => p === '命宮' ? freeMingReading(c,y)!.ming : palaceReading(c,p,y)!;
const set = (values: string[]) => [...new Set(values)].sort();
const references = (rows: FreeReadingSegment[]) => set(rows.flatMap((r) => r.statements.flatMap((s) => s.citations)));

it('新敘事綁定既有核讀資料，不以更換指紋改變條件或來源', () => {
  for (const [path, expected] of Object.entries(data.parents)) {
    const text = readFileSync(new URL(`../../../${path}`,import.meta.url),'utf8').replace(/\r\n/g,'\n');
    expect(createHash('sha256').update(text).digest('hex'),path).toBe(expected);
  }
  expect(Object.keys(data.entries).length).toBeGreaterThan(1500);
});

it('72盤十二宮來源、原有條件與盤面事實完整保留，改寫不更動命盤或輸入', () => {
  for (const c of charts) for (const p of palaces) {
    const input = original(c,p); const frozen = JSON.stringify([c,input]);
    const output = palaceNarrative(c,p,2026,input);
    const extra = p === '福德' && c.palaces.find((q) => q.name === p)!.stars.some((s) => s.name === '貪狼' && s.kind === 'major') && c.palaces.find((q) => q.name === p)!.stars.some((s) => s.name === '武曲' && s.kind === 'major' && s.sihua === '忌') ? ['palace.remaining.v1:wellbeing-武曲'] : [];
    expect(references(output),p).toEqual(set([...references(input), ...extra]));
    const conditions = new Set(output.flatMap((r) => r.referenceConditions ?? []));
    for (const row of input) for (const condition of row.referenceConditions ?? []) expect(conditions.has(condition),`${p}/${condition}`).toBe(true);
    const facts = output.flatMap((r) => r.statements.filter((s) => s.kind === 'evidence').map((s) => s.text));
    for (const s of input.flatMap((r) => r.statements).filter((s) => s.kind === 'evidence')) expect(facts).toContain(s.text);
    expect(JSON.stringify([c,input])).toBe(frozen);
    const body = output.map((r) => r.text).join('');
    expect(body,p).not.toMatch(/正文|本章展示|這章先核|引文保留|以上不是本宮已成立/);
    const final = withPalaceAdvice(c,p,2026,output);
    expect(final.filter((r) => r.heading === '給你的建議｜編輯建議')).toHaveLength(1);
    expect(final.at(-1)!.text).not.toMatch(/不表示你曾經|不適用的部分|這個情境對照上文|沒有把對宮配合/);
  }
});

it('疾厄說明傳統取象與分支，保留借星及醫療界線於據，不再拿查書當生活例子', () => {
  for (const c of charts) {
    const rows = palaceNarrative(c,'疾厄',2026,original(c,'疾厄'));
    const text = rows.map((r) => r.text).join('');
    expect(text).toContain('依王亭之的傳統疾厄論');
    expect(text).not.toMatch(/你(?:患有|會患|必患)|原文含調治語句|這章真正能確認/);
    expect(rows.flatMap((r) => r.referenceConditions ?? []).join('')).toContain('不作現代醫學因果');
    expect(withPalaceAdvice(c,'疾厄',2026,rows).at(-1)!.text).not.toContain('讀到引文有某個病名');
    if (c.palaces.find((p) => p.name === '疾厄')!.borrowsFrom) {
      expect(rows[0]!.text).toContain('借對宮');
      expect(rows[0]!.referenceConditions!.join('')).toContain('未把對宮的四化');
    }
  }
});

it('原書實質否定例外仍在正文；來源或原讀稿變動即要求重核', () => {
  const id = Object.keys(data.entries).find((id) => id.startsWith('wealth-廉貞+破軍-') && id.endsWith('-follow'))!;
  expect(data.entries[id as keyof typeof data.entries].prose).toContain('破軍化祿不宜火星');
  expect(data.entries[id as keyof typeof data.entries].prose).toContain('與祿存同度反喜火星');
  const c = charts[0]!; const p = '子女'; const rows = structuredClone(original(c,p));
  const row = rows.find((r) => r.statements.some((s) => s.citations.length))!;
  row.statements.at(-1)!.text += '來源已變';
  // Appending is not an interpretation edit; replacing the actual source-bearing sentence is.
  row.statements.at(-1)!.text = '不同的解讀輸入';
  expect(() => palaceNarrative(c,p,2026,rows)).toThrow('Narrative input changed');
});
