import { describe, expect, it } from 'vitest';
import { cast, sihuaOfStem, STEMS } from '@guanwei/ziwei';
import { AREAS, DAXIAN_HUA, DAXIAN_PIVOTS, STEPS_UNTIL_AGE, decadeChapter, firstClause, lifeStepsChapter, num, periodArea, pivotSteps } from '../src/daxian';
import { scanForbidden } from '../src/lint';
import { scanPlain } from '../src/plain';
import { withoutCitations } from '../src/lexicon';
import { citeOf } from '../src/citation';
import { renderChapter as renderEn } from '../src/en/render';
import { renderChapter as renderJa } from '../src/ja/render';

/** 大限兩章（2026-09-30）：出處喺 daxian.ts 開頭 */

let seed = 20260930;
const rnd = (n: number) => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
};
const CHARTS = Array.from({ length: 400 }, (_, i) =>
  cast({
    solar: { y: 1935 + rnd(90), m: 1 + rnd(12), d: 1 + rnd(28) },
    time: { h: rnd(24), min: rnd(60) },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: i % 2 ? 'male' : 'female',
  }),
)
  .filter((r) => r.ok)
  .map((r) => (r as { ok: true; value: Parameters<typeof decadeChapter>[0]['chart'] }).value);

describe('大限四化：十干每一化都有講法', () => {
  it('中州派四化表嘅四十個位，逐個有一句', () => {
    const miss: string[] = [];
    for (const s of STEMS) {
      const t = sihuaOfStem(s)!;
      for (const h of ['祿', '權', '科', '忌'] as const) {
        if (!DAXIAN_HUA.some((e) => e.star === t[h] && e.hua === h)) miss.push(`${s}${t[h]}化${h}`);
      }
    }
    expect(miss).toEqual([]);
  });
});

describe('兩章', () => {
  it('四百張盤都砌得出，段段過 lint、冇講方法冇列條件', () => {
    for (const c of CHARTS) {
      for (const ch of [lifeStepsChapter({ chart: c, year: 2026 }), decadeChapter({ chart: c, year: 2026 })]) {
        expect(ch, c.mingGong).not.toBeNull();
        for (const s of ch!.segments) {
          expect(scanForbidden(withoutCitations(s.text), 'body'), `${ch!.slug}/${s.slot}：${s.text}`).toEqual([]);
          expect(scanPlain(s.text, s.slot), s.text).toEqual([]);
        }
        expect(scanPlain(ch!.segments[0]!.text, '結論', { leadsWithConclusion: true }), ch!.segments[0]!.text).toEqual([]);
      }
    }
  });

  it('列到九十歲左右起步嗰幾步，之後一句帶過；標住寫書嗰陣行到邊步', () => {
    const c = CHARTS[0]!;
    const ch = lifeStepsChapter({ chart: c, year: 2026 })!;
    const shown = c.decadals.filter((d) => d.fromAge < STEPS_UNTIL_AGE).length;
    const rows = ch.segments.filter((s) => s.slot === '步');
    expect(rows).toHaveLength(shown + (shown < 12 ? 1 : 0));
    expect(ch.segments.map((s) => s.text).join('')).not.toMatch(/一百/);
    expect(ch.segments.filter((s) => s.text.includes('寫這本書時，你在這一步')).length).toBeLessThanOrEqual(1);
  });

  it('這十年的四化四粒都講到；星嘅句只喺講緊嗰方面嘅段出現，唔啱方面就留喺四化段（2026-10-04）', () => {
    const AREA_SLOTS = ['工作', '錢', '感情', '心境'];
    for (const c of CHARTS.slice(0, 100)) {
      const segs = decadeChapter({ chart: c, year: 2026 })!.segments;
      const rest = segs.find((x) => x.slot === '四化')?.text.match(/化[祿權科忌]落在[^、。，]+?宮/g)?.length ?? 0;
      const inAreas = new Set(
        segs
          .filter((x) => AREA_SLOTS.includes(x.slot))
          .flatMap((x) => /^這十年的\S+?宮[^。]*?，((?:\S{2}化\S、?)+)。/.exec(x.text)?.[1]?.split('、') ?? []),
      );
      const all = segs.map((x) => x.text).join(' ');
      /* 四粒都有講到：喺四方面嘅依據入面，或者喺四化段 */
      const fourth = segs.find((x) => x.slot === '四化')?.text ?? '';
      const listed = [...inAreas].filter((h) => !fourth.includes(`${h}落在`)).length;
      expect(rest + listed, all).toBe(4);
      for (const e of DAXIAN_HUA) {
        const where = segs.filter((x) => x.text.includes(e.text));
        expect(where.length, `${e.id}：${all}`).toBeLessThanOrEqual(1);
        const s = where[0];
        if (s && AREA_SLOTS.includes(s.slot)) expect(e.areas, `${e.id} 唔講${s.slot}，唔應該出喺嗰段`).toContain(s.slot);
      }
    }
  });

  it('第一段「X這一方面，」後面嘅星句真係講緊X（2026-10-18 · 後生讀者抽樣 B5）', () => {
    const SLOT = new Map<string, string>(AREAS.map((a) => [periodArea(a.palace), a.slot]));
    let checked = 0;
    for (const c of CHARTS) {
      const lead = decadeChapter({ chart: c, year: 2026 })!.segments[0]!.text;
      for (const m of lead.matchAll(/(?:^|[，；])([^，；。]+?)這一方面，([^，；。]+)/g)) {
        const e = DAXIAN_HUA.find((x) => firstClause(x.text) === m[2]);
        if (!e) continue;
        checked++;
        /* 第一分句講嘅係 areas 頭一樣 */
        expect(e.areas[0], `${m[1]}：${m[2]}`).toBe(SLOT.get(m[1]!));
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('回看：每年都有內容，同一句方面講法唔出兩次（2026-10-18 · 後生讀者抽樣 C13、C14）', () => {
    let n = 0;
    for (const c of CHARTS) {
      for (const year of [2026, c.lunar.y + 20]) {
        const back = lifeStepsChapter({ chart: c, year })?.segments.find((s) => s.slot === '回看');
        if (!back) continue;
        n++;
        const lines = back.text.match(/[〇一二三四五六七八九]{4}年（[^）]+）[^。]*。/g) ?? [];
        for (const l of lines) expect(l, back.text).not.toMatch(/關鍵的一年。$/);
        const gists = lines.flatMap((l) => l.split(/[，；]/).filter((x) => /^(和|跟|在|你的|家裡|工作|錢)/.test(x)));
        expect(new Set(gists).size, back.text).toBe(gists.length);
      }
    }
    expect(n).toBeGreaterThan(200);
  });

  it('這十年：已起運就分工作、錢、感情、心境四方面講，仲有一段建議', () => {
    for (const c of CHARTS.slice(0, 100)) {
      const ch = decadeChapter({ chart: c, year: 2026 })!;
      const slots = ch.segments.map((x) => x.slot);
      if (!ch.segments[0]!.text.includes('正行第')) continue;
      expect(slots).toEqual(expect.arrayContaining(['工作', '錢', '感情', '心境', '建議']));
    }
  });

  it('未起運（剛出世）都有章，講第一個大限幾時開始', () => {
    const r = cast({ solar: { y: 2025, m: 12, d: 1 }, time: { h: 10, min: 0 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'female' });
    if (!r.ok) throw new Error('排唔到');
    const ch = decadeChapter({ chart: r.value, year: 2026 })!;
    expect(ch.segments[0]!.text).toMatch(/第一個大限從虛歲.+歲開始/);
  });

  it('同一張盤、同一年，兩次一樣；唔同年份講唔同嘅十年', () => {
    const c = CHARTS[1]!;
    expect(decadeChapter({ chart: c, year: 2026 })).toEqual(decadeChapter({ chart: c, year: 2026 }));
    expect(decadeChapter({ chart: c, year: 2026 })!.segments[0]!.text).not.toBe(decadeChapter({ chart: c, year: 2046 })!.segments[0]!.text);
  });

  it('冇阿拉伯數字（書入面一律中文數字）', () => {
    for (const c of CHARTS.slice(0, 50)) {
      for (const ch of [lifeStepsChapter({ chart: c, year: 2026 })!, decadeChapter({ chart: c, year: 2026 })!]) {
        for (const s of ch.segments) expect(s.text).not.toMatch(/\d/);
      }
    }
  });
});

describe('樞紐大限（下篇宮垣論・命宮，p.336–366）', () => {
  it('大限樞紐四十八條（流年另計），引文喺原文、星名認得（載入嗰陣已經驗）', () => {
    expect(DAXIAN_PIVOTS.filter((r) => r.scope !== 'year').length).toBe(48);
  });

  it('大部分盤有樞紐；書冇講嗰組命宮星就唔標', () => {
    const hit = CHARTS.filter((c) => pivotSteps(c).steps.length > 0).length;
    expect(hit / CHARTS.length).toBeGreaterThan(0.6);
    expect(hit).toBeLessThan(CHARTS.length);
  });

  it('紫府、紫相：順行逆行只用其中一套', () => {
    for (const c of CHARTS) {
      const { source } = pivotSteps(c);
      if (!source?.includes('紫府') && !source?.includes('紫相')) continue;
      const b0 = c.palaces.findIndex((p) => p.branch === c.decadals[0]!.branch);
      const b1 = c.palaces.findIndex((p) => p.branch === c.decadals[1]!.branch);
      const forward = (b1 - b0 + 12) % 12 === 1;
      expect(source.endsWith(forward ? '.順' : '.逆'), source).toBe(true);
    }
  });

  it('一生十二步：結論講齊關鍵大限，逐步標記數目對得上', () => {
    for (const c of CHARTS.slice(0, 100)) {
      const ch = lifeStepsChapter({ chart: c, year: 2026 })!;
      /* 只計列出嚟嗰幾步（九十歲左右之後唔細列） */
      const steps = pivotSteps(c).steps.filter((n) => c.decadals.find((d) => d.index === n)!.fromAge < STEPS_UNTIL_AGE);
      expect(ch.segments.filter((s) => s.text.includes('關鍵大限。')).length).toBe(steps.length);
      if (steps.length) expect(ch.segments[0]!.text).toContain('關鍵大限');
    }
  });

  /* 2026-10-18 · Issac：「關鍵大限加一句王亭之出處講點解；回看走進關鍵步嗰年要講明」 */
  it('一生十二步：正文直讀關鍵步，核對原因與原文保留於內部，英日譯得到', () => {
    let seen = 0;
    for (const c of CHARTS) {
      const ch = lifeStepsChapter({ chart: c, year: 2026 })!;
      const pv = pivotSteps(c);
      const shown = pv.steps.filter((n) => c.decadals.find((d) => d.index === n)!.fromAge < STEPS_UNTIL_AGE);
      const why = ch.segments[0]!.referenceApplicability?.find((x) => x.startsWith('你的命宮在'))?.replace(/。$/, '');
      expect(ch.segments[0]!.text).not.toContain('原書列出');
      if (!shown.length) {
        expect(why, ch.segments[0]!.text).toBeUndefined();
        continue;
      }
      seen++;
      expect(why, ch.segments[0]!.text).toBeDefined();
      expect(why).not.toMatch(/行到的大限/);
      expect(citeOf(`${why}。`), why).toEqual([pv.source]);
      /* C12（2026-10-18）：唔講「三方四正見煞」；舊書嘅寫法照配得到出處、照譯得到 */
      expect(why).not.toMatch(/三方四正/);
      const old = why!.replace('，命宮和相關的幾個宮位見到煞星', '，三方四正見煞').replace('，命宮和相關的幾個宮位都沒有煞星，並見吉曜或吉化', '，三方四正不見煞');
      if (old !== why) {
        expect(citeOf(`${old}。`), old).toEqual([pv.source]);
        for (const r of [renderEn(`${old}。`), renderJa(`${old}。`)]) expect(r.missing, old).toEqual([]);
      }
      expect(ch.segments[0]!.text).toContain(shown.length === 1 ? '這一步前後的選擇與安排' : '這幾步前後的選擇與安排');
      for (const r of [renderEn(ch.segments[0]!.text), renderJa(ch.segments[0]!.text)]) expect(r.missing, why).toEqual([]);
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('回看：走進關鍵大限嗰年講明係關鍵嗰步，其餘換大限年唔講', () => {
    let seen = 0;
    for (const c of CHARTS) {
      const ch = lifeStepsChapter({ chart: c, year: 2026 })!;
      const back = ch.segments.find((s) => s.slot === '回看');
      if (!back) continue;
      const key = pivotSteps(c).steps;
      for (const m of back.text.matchAll(/你走進第(\S+?)個大限，((?:正是開頭說的關鍵大限|也是你人生較重要的一步)，)?/g)) {
        const idx = c.decadals.find((d) => `第${num(d.index)}個大限` === `第${m[1]}個大限`)!.index;
        expect(Boolean(m[2]), back.text).toBe(key.includes(idx));
        if (m[2]) seen++;
      }
      for (const r of [renderEn(back.text), renderJa(back.text)]) expect(r.missing, back.text).toEqual([]);
    }
    expect(seen).toBeGreaterThan(10);
  });
});
