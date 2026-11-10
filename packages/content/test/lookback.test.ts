import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import { annual } from '@guanwei/ziwei';
import { LOOKBACK_EVENTS, decadeChapter, lookBack, lookBackEvent, lifeStepsChapter,lookBackSegments } from '../src/daxian';
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

describe('回看過去', { timeout: 60_000 }, () => {
  it('大部分人都有；最多三年', () => {
    const got = CHARTS.map((c) => lookBack(c, 2026));
    expect(got.filter(Boolean).length / CHARTS.length).toBeGreaterThan(0.85);
    for (const s of got) if (s) expect(yearsOf(s.text)).toBeLessThanOrEqual(3);
  });

  it('只講過去（寫書嗰年之前）、虛歲十二之後（2026-10-13 由十八改）', () => {
    for (const c of CHARTS) {
      const s = lookBack(c, 2026);
      if (!s) continue;
      for (const m of s.text.matchAll(/([〇一二三四五六七八九]{4})年（/g)) {
        const y = Number([...m[1]!].map((d) => '〇一二三四五六七八九'.indexOf(d)).join(''));
        expect(y).toBeLessThan(2026);
        expect(y - c.lunar.y + 1).toBeGreaterThanOrEqual(12);
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

  it('每個回看年份有干支、大限上下文與可核四化，沒有把生活例子當往事',()=>{
    for(const c of CHARTS)for(const s of lookBackSegments(c,2026)){
      expect(s.text).toMatch(/^[〇一二三四五六七八九]{4}年（[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]年，/);
      expect(s.text).toContain('大限');expect(s.text).toContain('當年的');
      expect(s.text).not.toContain('像是');
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

    it('新回看不再以事件命中比例作門檻，逐年來源及條件必須完整',()=>{
      for(const c of CHARTS)for(const s of lookBackSegments(c,2026)){
        expect(s.referenceConditions?.join('')).toContain('不是按事件吉凶計分');
        for(const statement of s.statements??[]){
          if(statement.kind==='interpretation')expect(statement.citations.length).toBeGreaterThan(0);
          if(statement.kind==='editorial-advice')expect(statement.citations).toEqual([]);
        }
      }
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

/* 2026-11-10（Issac）：回看要講嗰年大概點 —— 王亭之今年卡做主，《全書》入限訣做後備 */
import { QUANSHU_LOOKBACK, quanshuLookback, LOOKBACK_CLOSE } from '../src/daxian';
import { synthLookback } from '../src/synthesis';
import { CORPUS, normaliseForMatch } from '../src/lexicon';
import { citation } from '../src/citation';
describe('回看：今年卡＋全書後備', { timeout: 60_000 }, () => {
  it('全書後備卡嘅引文逐字喺語料庫原段；出處講明卷同訣名', () => {
    for (const c of QUANSHU_LOOKBACK) {
      const p = CORPUS.quanshu!.passages[`xian.${c.star}`];
      expect(p, c.id).toBeDefined();
      expect(normaliseForMatch(p!.text), c.id).toContain(normaliseForMatch(c.quote));
      expect(citation(`quanshu:xian.${c.star}`)?.section).toContain('入限吉凶訣');
      expect(c.claim).toMatch(/^按《全書》的講法，那一年/);
      expect(c.claim).not.toMatch(/病|意外|手術|受傷|官非|破財|離婚|死/);
    }
  });
  it('成年人大部分回看年份都講到嗰年大概點；講過去唔出建議句，唔講病', () => {
    let years = 0, told = 0;
    for (const c of CHARTS.slice(0, 60)) for (const s of lookBackSegments(c, 2026)) {
      years++;
      const ids = (s.statements ?? []).flatMap((l) => l.source_ids);
      if (ids.some((id) => id.startsWith('syn.') || id.startsWith('qs.'))) told++;
      for (const l of s.statements ?? []) if (l.source_ids.some((id) => id.startsWith('syn.'))) expect(l.text).not.toMatch(/^那一年(要|不宜|宜)|今年/);
    }
    expect(told / years).toBeGreaterThan(0.6);
  });
  it('全書只喺王亭之一句都冇嗰年先出；有判斷嗰本書最尾有收尾句', () => {
    for (const c of CHARTS.slice(0, 60)) {
      const segs = lookBackSegments(c, 2026);
      for (const s of segs) {
        const ids = (s.statements ?? []).flatMap((l) => l.source_ids);
        if (ids.some((id) => id.startsWith('qs.'))) expect(ids.some((id) => id.startsWith('syn.'))).toBe(false);
      }
      const told = segs.some((s) => (s.statements ?? []).some((l) => l.source_ids.some((id) => id.startsWith('syn.') || id.startsWith('qs.'))));
      if (told) expect(segs.at(-1)!.text.endsWith(LOOKBACK_CLOSE)).toBe(true);
    }
  });
  it('全書條件：星要坐流年命宮；陷地句要真係落陷', () => {
    let hit = 0;
    for (const c of CHARTS.slice(0, 40)) for (let y = 1995; y < 2026; y++) {
      const a = annual(c, y); if (!a.ok) continue;
      const p = c.palaces.find((x) => x.branch === a.value.mingGong)!;
      for (const q of quanshuLookback(c, a.value)) {
        hit++;
        const card = QUANSHU_LOOKBACK.find((x) => x.id === q.id)!;
        expect(p.stars.some((s) => s.name === card.star), q.id).toBe(true);
      }
    }
    expect(hit).toBeGreaterThan(50);
  });
  it('今年卡講法改成那一年', () => {
    const c = CHARTS[3]!;
    for (const l of synthLookback(c, 2020)) { expect(l.claim).not.toContain('今年'); expect(l.because).not.toContain('今年'); }
  });
});
