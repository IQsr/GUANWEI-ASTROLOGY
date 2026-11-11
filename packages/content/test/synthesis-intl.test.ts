import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { synthWealthChapter, synthYearChapter } from '../src/synthesis';
import { En, Ja } from '../src';
import { scanEnglish } from '../src/en/lint';
import { scanJapanese } from '../src/ja/lint';

/* 2026-11-11（Issac：英日版跟返新版本）：財帛章（綜合判讀層「錢」）英日譯 */
const CHARTS = Array.from({ length: 150 }, (_, i) => {
  const r = cast({ solar: { y: 1950 + ((i * 7) % 60), m: 1 + ((i * 5) % 12), d: 1 + ((i * 11) % 28) }, time: { h: (i * 3) % 24, min: 20 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: i % 2 ? 'male' : 'female' });
  return r.ok ? r.value : null;
}).filter((x) => x !== null);

describe('財帛章英日譯', { timeout: 300_000 }, () => {
  it('判斷、建議、說明句句句譯得到（九成五以上嘅盤全本新版）；證據句九成五以上；過英日 lint、冇中文漏出', () => {
    let charts = 0, full = 0, ev = 0, evOk = 0;
    for (const c of CHARTS) {
      const segs = synthWealthChapter(c); if (!segs) continue; charts++;
      let ok = true;
      for (const s of segs) for (const l of s.statements) {
        const en = En.renderParagraphs([l.text]), ja = Ja.renderParagraphs([l.text]);
        const fine = !en.missing.length && !ja.missing.length;
        if (l.kind === 'evidence') { ev++; evOk += +fine; } else if (!fine) ok = false;
        if (!fine) continue;
        expect(scanEnglish(en.paras[0]!), l.text).toEqual([]);
        expect(scanJapanese(ja.paras[0]!), l.text).toEqual([]);
        expect(en.paras[0], l.text).not.toMatch(/[一-鿿]/);
      }
      full += +ok;
    }
    expect(full / charts).toBeGreaterThan(0.95);
    expect(evOk / ev).toBeGreaterThan(0.95);
  });
});

/* 2026-11-11：這一年章（綜合判讀層「今年」，連明年段、運限段）英日譯 */
describe('這一年章英日譯', { timeout: 300_000 }, () => {
  it('判斷、建議、說明句句句譯得到（九成五以上嘅盤全本新版）；證據句九成以上；過英日 lint、冇中文漏出', () => {
    let charts = 0, full = 0, ev = 0, evOk = 0;
    for (const c of CHARTS) {
      const segs = synthYearChapter(c, 2026, { general: true }); if (!segs) continue; charts++;
      let ok = true;
      for (const s of segs) for (const l of s.statements) {
        const en = En.renderParagraphs([l.text]), ja = Ja.renderParagraphs([l.text]);
        const fine = !en.missing.length && !ja.missing.length;
        if (l.kind === 'evidence') { ev++; evOk += +fine; } else if (!fine) ok = false;
        if (!fine) continue;
        expect(scanEnglish(en.paras[0]!), l.text).toEqual([]);
        expect(scanJapanese(ja.paras[0]!), l.text).toEqual([]);
        expect(en.paras[0], l.text).not.toMatch(/[一-鿿]/);
      }
      full += +ok;
    }
    expect(full / charts).toBeGreaterThan(0.95);
    expect(evOk / ev).toBeGreaterThan(0.9);
  });
});
