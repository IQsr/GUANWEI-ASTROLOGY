import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { annual } from '@guanwei/ziwei';
import { LOOKBACK_EVENTS, decadeChapter, lookBack, lookBackEvent, lifeStepsChapter } from '../src/daxian';
import { yearChapter } from '../src/liunian';
import { scanForbidden } from '../src/lint';
import { scanPlain } from '../src/plain';

/**
 * 回看過去（2026-10-02 · 一生十二步，免費章）
 *
 * 讀者見到對得上嘅過去年份，之後嘅講法先容易接受。
 * ⚠ 只講年份 × 方面，唔講事件、唔講病、唔講意外（冇流羊流陀，推唔到細節；講錯一次信任就冇）。
 */
const CHARTS = Array.from({ length: 200 }, (_, i) => {
  const r = cast({
    solar: { y: 1950 + ((i * 7) % 60), m: 1 + ((i * 5) % 12), d: 1 + ((i * 11) % 28) },
    time: { h: (i * 3) % 24, min: 20 },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: i % 2 ? 'male' : 'female',
  });
  return r.ok ? r.value : null;
}).filter((x) => x !== null);

const yearsOf = (text: string) => [...text.matchAll(/年，你虛歲([〇一二三四五六七八九十百]+)）/g)].length;

describe('回看過去', () => {
  it('大部分人都有；最多三年', () => {
    const got = CHARTS.map((c) => lookBack(c, 2026));
    expect(got.filter(Boolean).length / CHARTS.length).toBeGreaterThan(0.85);
    for (const s of got) if (s) expect(yearsOf(s.text)).toBeLessThanOrEqual(3);
  });

  it('只講過去（寫書嗰年之前）、虛歲十八之後', () => {
    for (const c of CHARTS) {
      const s = lookBack(c, 2026);
      if (!s) continue;
      for (const m of s.text.matchAll(/([〇一二三四五六七八九]{4})年（/g)) {
        const y = Number([...m[1]!].map((d) => '〇一二三四五六七八九'.indexOf(d)).join(''));
        expect(y).toBeLessThan(2026);
        expect(y - c.lunar.y + 1).toBeGreaterThanOrEqual(18);
      }
    }
  });

  it('唔講事件、唔講病、唔講意外；過禁用詞同直白檢查', () => {
    for (const c of CHARTS) {
      const s = lookBack(c, 2026);
      if (!s) continue;
      expect(s.text).not.toMatch(/病|意外|手術|受傷|官非|破財|離婚|死/);
      expect(scanForbidden(s.text, 'body')).toEqual([]);
      expect(scanPlain(s.text, '回看')).toEqual([]);
    }
  });

  it('講得實：年份有干支，每年都有「像是」嘅例子或者換大限（2026-10-04 試讀回饋）', () => {
    for (const c of CHARTS) {
      const s = lookBack(c, 2026);
      if (!s) continue;
      expect(s.text).not.toMatch(/年前後/);
      for (const line of s.text.split(/(?=[〇一二三四五六七八九]{4}年（)/).slice(1)) {
        expect(line, line).toMatch(/^[〇一二三四五六七八九]{4}年（[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]年，/);
        /* 身體、出行、是非、錢嗰幾句本身已經係具體情況，唔使再「像是」 */
        const ev = LOOKBACK_EVENTS.some((e) => line.includes(e.text));
        if (!ev && /[祿忌]|較|轉機/.test(line) && !/關鍵的一年。/.test(line)) expect(line, line).toMatch(/像是/);
      }
    }
  });

  it('同一年唔會心情吃緊又話身心鬆得下來', () => {
    for (const c of CHARTS) {
      const s = lookBack(c, 2026);
      if (!s) continue;
      for (const line of s.text.split('。')) {
        const bad = /(狀態起伏|身心負荷|心事較多)/.test(line) && /同一年，(你自己的狀態比較順|身心比較鬆得下來|心境比較安穩)/.test(line);
        expect(bad, line).toBe(false);
      }
    }
  });

  describe('身體、出行、是非、錢、感情（2026-10-04，跟《深造講義》條件）', () => {
    it('每條都有原文同頁數；句子唔出病名、手術、死傷、官非、破財', () => {
      expect(LOOKBACK_EVENTS.map((e) => e.kind).sort()).toEqual(['出行', '是非', '身體', '錢', '感情'].sort());
      for (const e of LOOKBACK_EVENTS) {
        expect(e.sources.length, e.id).toBeGreaterThan(0);
        expect(e.text).not.toMatch(/病|意外|手術|開刀|受傷|血|官非|官司|訴訟|破財|死|災|離婚|分手|外遇/);
      }
    });

    it('出現嗰年真係中條件；一本書最多兩年', () => {
      for (const c of CHARTS) {
        const s = lookBack(c, 2026);
        if (!s) continue;
        const lines = s.text.split(/(?=[〇一二三四五六七八九]{4}年（)/).slice(1);
        let n = 0;
        for (const line of lines) {
          const e = LOOKBACK_EVENTS.find((x) => line.includes(x.text));
          if (!e) continue;
          n++;
          const y = Number([...line.slice(0, 4)].map((d) => '〇一二三四五六七八九'.indexOf(d)).join(''));
          const a = annual(c, y);
          expect(a.ok && lookBackEvent(c, a.value)?.id, line).toBe(e.id);
        }
        expect(n).toBeLessThanOrEqual(2);
        for (const e of LOOKBACK_EVENTS) expect(s.text.split(e.text).length - 1, e.id).toBeLessThanOrEqual(1);
      }
    });

    it('唔係人人都有（約四成半，2026-10-04 加感情同新條件之後），亦唔係冇人有', () => {
      const hit = CHARTS.filter((c) => LOOKBACK_EVENTS.some((e) => lookBack(c, 2026)?.text.includes(e.text))).length / CHARTS.length;
      expect(hit).toBeGreaterThan(0.25);
      expect(hit).toBeLessThan(0.55);
    });

    it('唔講將來：這十年、這一年都冇呢幾句', () => {
      for (const c of CHARTS.slice(0, 80)) {
        const future = [decadeChapter({ chart: c, year: 2026 }), yearChapter({ chart: c, year: 2026 })]
          .flatMap((ch) => ch?.segments ?? [])
          .map((s) => s.text)
          .join('');
        for (const e of LOOKBACK_EVENTS) expect(future).not.toContain(e.text);
      }
    });
  });

  it('擺喺一生十二步嘅結論之後', () => {
    const c = CHARTS.find((x) => lookBack(x, 2026))!;
    const slots = lifeStepsChapter({ chart: c, year: 2026 })!.segments.map((s) => s.slot);
    expect(slots.slice(0, 2)).toEqual(['結論', '回看']);
  });
});
