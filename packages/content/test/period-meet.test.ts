/**
 * 時間章（2026-10-26 盲評）：冲起本命化曜唔只核同一粒星；大限財帛天府見空劫唔講「守得住」。
 */
import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { KONGKU, MEET_TAIL, decadeChapter } from '../src/daxian';
import { yearChapter } from '../src/liunian';
import { citeOf } from '../src/citation';
import { renderParagraphs as en } from '../src/en/render';
import { renderParagraphs as ja } from '../src/ja/render';
import { scanEnglish } from '../src/en/lint';
import { scanJapanese } from '../src/ja/lint';

// 2004-02-14 01:05 香港男：本命太陽化忌坐命宮寅；2026 年行父母卯（丁），大限巨門化忌同落命宮，大限財帛亥天府、地空、地劫。
const r = cast({ solar: { y: 2004, m: 2, d: 14 }, time: { h: 1, min: 5 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'male' });
if (!r.ok) throw Error(r.message);
const chart = r.value;
const ch = decadeChapter({ chart, year: 2026, periodChecks: true })!;
const text = (slot: string) => ch.segments.find((s) => s.slot === slot)?.text ?? '';

describe('冲起本命化曜', () => {
  it('大限忌同本命忌同宮：講明位置，唔再講「沒有碰到」', () => {
    expect(text('互動')).toContain('這十年的巨門化忌落在兄弟宮（你本命的命宮），和你本命的太陽化忌同宮。');
    expect(text('互動')).toContain(MEET_TAIL.jiji.text);
    expect(text('互動')).not.toContain('沒有碰到');
  });

  it('隨機盤：「沒有碰到」只喺真係冇同宮、對宮化曜時先出', () => {
    let s = 11;
    for (let i = 0; i < 80; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const c = cast({ solar: { y: 1950 + (s % 55), m: 1 + (s % 12), d: 1 + (s % 28) }, time: { h: s % 24, min: 0 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: s % 2 ? 'male' : 'female' });
      if (!c.ok) continue;
      for (const seg of [...(decadeChapter({ chart: c.value, year: 2026, periodChecks: true })?.segments ?? []), ...(yearChapter({ chart: c.value, year: 2026, periodChecks: true })?.segments ?? [])]) {
        if (seg.slot !== '互動' || !seg.text.includes('沒有碰到')) continue;
        expect(seg.text).not.toMatch(/落在\S+?宮（你本命的\S+?宮），(和|正對著)/);
      }
    }
  });
});

it('基準入口唔開：舊句照出', () => {
  const old = decadeChapter({ chart, year: 2026 })!;
  expect(old.segments.find((s) => s.slot === '互動')?.text).toContain('沒有碰到');
  expect(old.segments.find((s) => s.slot === '錢')?.text).toContain('長處在守得住');
});

describe('大限財帛天府見空劫', () => {
  it('換做空劫版本，有出處', () => {
    expect(text('錢')).toContain(KONGKU.summary);
    expect(text('錢')).not.toContain('長處在守得住');
    expect(citeOf(KONGKU.summary)).toEqual([KONGKU.passage]);
  });
});

it('這十年財帛見空劫：結論講錢順嘅半句跟住講錢進了也容易出', () => {
  expect(text('結論')).toContain('財源比較順遂，只是錢進了也容易出');
});

it('新句英文、日文都譯得到', () => {
  const paras = ch.segments.filter((s) => ['結論', '魁鉞', '互動', '錢'].includes(s.slot)).map((s) => s.text);
  const e = en(paras), j = ja(paras);
  expect(e.missing).toEqual([]);
  expect(j.missing).toEqual([]);
  for (const p of e.paras) expect(scanEnglish(p), p).toEqual([]);
  for (const p of j.paras) expect(scanJapanese(p), p).toEqual([]);
});
