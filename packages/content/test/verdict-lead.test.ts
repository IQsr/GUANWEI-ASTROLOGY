import { expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { verdictFor, withVerdictLead } from '../src/verdict-lead';
import { KONGKU } from '../src/daxian';
import { citation } from '../src/citation';
import type { MingStatement } from '../src/ming-writer';

const chartOf = (y: number, m: number, d: number, h: number, sex: 'male' | 'female') => {
  const r = cast({ solar: { y, m, d }, time: { h, min: 10 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex });
  if (!r.ok) throw Error(r.message);
  return r.value;
};

it('only uses a sourced verdict, and every cited passage resolves', () => {
  let s = 3, seen = 0;
  for (let i = 0; i < 80; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const c = chartOf(1950 + (s % 55), 1 + (s % 12), 1 + (s % 28), s % 24, s % 2 ? 'male' : 'female');
    for (const p of ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母']) {
      const v = verdictFor(c, p);
      if (!v) continue;
      seen++;
      expect(v.text, v.text).toContain('你');
      expect(v.passages.length).toBeGreaterThan(0);
      for (const id of v.passages) expect(citation(id), id).not.toBeNull();
      expect(p).not.toBe('疾厄');
    }
  }
  expect(seen).toBeGreaterThan(400);
});

it('財帛天府見空劫用空劫版本', () => {
  // 隨機盤搵一張財帛天府同宮見地空或地劫嘅
  let found = false, s = 9;
  for (let i = 0; i < 400 && !found; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const c = chartOf(1950 + (s % 55), 1 + (s % 12), 1 + (s % 28), s % 24, 'male');
    const p = c.palaces.find((x) => x.name === '財帛')!;
    if (!p.stars.some((x) => x.name === '天府') || !p.stars.some((x) => x.name === '地空' || x.name === '地劫')) continue;
    found = true;
    expect(verdictFor(c, '財帛')?.text).toBe(KONGKU.summary);
  }
  expect(found).toBe(true);
});

it('inserts after the chart facts, once', () => {
  const c = chartOf(1972, 11, 23, 19, 'male');
  const v = verdictFor(c, '財帛')!;
  const l = (text: string, kind: MingStatement['kind']): MingStatement => ({ text, en: '', kind, source_ids: ['x'], citations: [] });
  const seg = { slot: '結論', text: '事實。要留意。', statements: [l('事實。', 'evidence'), l('要留意。', 'interpretation')] };
  const [out] = withVerdictLead(c, '財帛', [seg]);
  expect(out!.text).toBe(`事實。${v.text}要留意。`);
  expect(out!.statements!.map((x) => x.text)).toEqual(['事實。', v.text, '要留意。']);
  expect(withVerdictLead(c, '財帛', [out!])[0]).toBe(out);
});

it('命宮 uses the 六十星系 table: base sentence, or the lean pole only when one side is decided', () => {
  // 2004-02-14 01:10 男：命宮寅太陽巨門（58），偏向孤立
  const c = chartOf(2004, 2, 14, 1, 'male');
  expect(verdictFor(c, '命宮')).toEqual({ text: '你多半要靠自己，身邊的助力較少。', id: 'ming.verdict.58', passages: ['deep.星系58.1'] });
});
