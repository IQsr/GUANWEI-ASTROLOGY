import { describe, expect, it } from 'vitest';
import { annual, cast, SCHOOL_PROFILE } from '@guanwei/ziwei';
import { BASE_BLOCKS, RULE_REGISTRY, SPEC_VERSION, assembleAll, inferAll } from '../src/index';
import { fitWatchLead } from '../src/watch-lead';
import { poleOf } from '../src/axes';

const sentences = (s: string): string[] => s.match(/[^。！？]*[。！？]|[^。！？]+$/g) ?? [];

let seed = 20260930;
const rnd = (n: number) => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
};

const BOOKS = Array.from({ length: 400 }, (_, i) => {
  const r = cast({
    solar: { y: 1950 + rnd(60), m: 1 + rnd(12), d: 1 + rnd(28) },
    time: { h: rnd(24), min: rnd(60) },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: i % 2 ? 'male' : 'female',
  });
  if (!r.ok) return null;
  const a = annual(r.value, 2026);
  if (!a.ok) return null;
  const by = inferAll(RULE_REGISTRY, { chart: r.value, annual: a.value }, SCHOOL_PROFILE.ref, SPEC_VERSION, { chartId: `a${i}`, layer: 'natal' });
  return assembleAll(r.value, by, { seed: `a${i}` });
}).filter((x) => x !== null);

const STARS = new Set(BASE_BLOCKS.map((b) => b.star));

/*
 * 2026-10-18 · 後生讀者抽樣 B6：砌句漏底。
 * 「天機：選項太多⋯」似筆記（400 本書 326 本有）；「這個人傾向於⋯」對住讀者講第三人稱。
 */
describe('宮位章：砌句唔漏底', () => {
  it('冇「星名：」標籤句、冇「這個人」', { timeout: 120_000 }, () => {
    const bad = new Set<string>();
    for (const book of BOOKS)
      for (const c of book)
        for (const s of c.segments)
          for (const t of sentences(s.text)) {
            const m = /^(\S{2})：/.exec(t);
            if ((m && STARS.has(m[1]!)) || t.includes('這個人')) bad.add(`${s.slot}：${t}`);
          }
    expect([...bad]).toEqual([]);
  });
});

/*
 * B10：結論已經講限制，「只是／但」就接錯方向。
 */
describe('結論段轉接語跟方向（fitWatchLead）', () => {
  it('結論講長處：照輪換', () => {
    expect(fitWatchLead('你和後輩感情融洽，相處和美。', '要留意的是：該嚴格的時候，你往往開不了口。', '只是')).toBe('只是');
  });
  it('結論講限制、留意句再講代價：而且', () => {
    expect(fitWatchLead('你和後輩之間容易不和。', '要留意的是：你給的選項太多，對方反而難以定下來。', '只是')).toBe('而且');
    expect(fitWatchLead('你結識的朋友來自四方八面，但大多來來去去，常在更換。', '要留意的是：你的人脈廣而輕，沉澱下來的關係未必多。', '但')).toBe('而且');
  });
  it('結論講限制、留意句係做法：不過', () => {
    expect(fitWatchLead('你的疲累來自硬撐，不太承認自己需要停下來。', '要留意的是：你提早承認累了，比學會休息更有用。', '只是')).toBe('不過，');
  });
  it('中性嘅「要留意的是，」照用', () => {
    expect(fitWatchLead('你和後輩之間容易不和。', '要留意的是：x。', '要留意的是，')).toBe('要留意的是，');
  });
});

/*
 * B7：一章入面同一句意思講兩次；B8：同一粒煞細讀講完擾動再講（2026-10-18）。
 * 框架字（兩粒星共用嘅開頭）唔算重複，同 assemble.ts `ECHO_FRAME` 一樣。
 */
const FRAME = /培養人的時候|對居所的態度是|或自己在做的事|離開熟悉的地方/g;
const cjk = (t: string) => t.replace(FRAME, '').replace(/[^㐀-鿿]/g, '');
const shareRun = (a: string, b: string, n: number) => {
  for (let i = 0; i + n <= a.length; i++) if (b.includes(a.slice(i, i + n))) return true;
  return false;
};
describe('宮位章：唔講兩次', () => {
  it('冇兩句有七個字以上逐字一樣', { timeout: 120_000 }, () => {
    const bad = new Set<string>();
    for (const book of BOOKS)
      for (const c of book) {
        const ss = c.segments.filter((s) => s.slot !== '過場' && s.slot !== '留白').flatMap((s) => sentences(s.text).map((t) => ({ slot: s.slot, t })));
        for (let i = 0; i < ss.length; i++)
          for (let j = i + 1; j < ss.length; j++)
            if (shareRun(cjk(ss[i]!.t), cjk(ss[j]!.t), 7)) bad.add(`${c.palace}｜${ss[i]!.slot}：${ss[i]!.t} ⟂ ${ss[j]!.slot}：${ss[j]!.t}`);
      }
    expect([...bad]).toEqual([]);
  });
  it('細讀講咗嘅煞，擾動唔再講', { timeout: 120_000 }, () => {
    const SHA = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'];
    for (const book of BOOKS)
      for (const c of book) {
        const deep = c.segments.find((s) => s.slot === '細讀')?.text ?? '';
        const sha = c.segments.find((s) => s.slot === '擾動')?.text ?? '';
        for (const x of SHA) if (deep.includes(x)) expect(sha, `${c.palace}：${x}`).not.toMatch(new RegExp(`(加上|再加上|還有)${x}`));
      }
  });
});

/*
 * B9：細讀、牽動句同前文方向相反（「出門在外大多是有福的」⟂「同宮有鈴星，在外多挫折」），要講明係例外（2026-10-18）。
 */
describe('宮位章：相反嘅講法講明係例外', () => {
  it('細讀、牽動同前文相反嘅句，有「不過／但」或者自己有轉折', { timeout: 120_000 }, () => {
    const bad: string[] = [];
    let bridged = 0;
    for (const book of BOOKS)
      for (const c of book) {
        const seen = new Set<number>();
        for (const seg of c.segments) {
          for (const t of sentences(seg.text)) {
            const q = poleOf(c.palace!, t);
            if (!q) continue;
            if ((seg.slot === '細讀' || seg.slot === '牽動') && seen.has(-q)) {
              if (/^(不過|但)/.test(t)) bridged++;
              else if (!/但|只是|卻/.test(t)) bad.push(`${c.palace}｜${t}`);
            }
            if (['結論', '開場', '結構', '細讀', '牽動'].includes(seg.slot)) seen.add(q);
          }
        }
      }
    expect(bad).toEqual([]);
    expect(bridged).toBeGreaterThan(20);
  });
});

/*
 * B11：空泛嘅狀態句（「沒有另外一套」「這是結構，不是好壞」「這是條件不是評價」），讀者唔知講緊乜（2026-10-18）。
 */
describe('宮位章：唔講空泛嘅狀態句', () => {
  it('冇「沒有另外一套／沒有自己的定調／這是結構／這是條件／回收率」', { timeout: 120_000 }, () => {
    const VAGUE = /沒有另外一套|沒有自己的定調|這是結構|這是條件|不是評價|回收率|結構不固定|形狀不固定/;
    const bad = new Set<string>();
    for (const book of BOOKS) for (const c of book) for (const s of c.segments) for (const t of sentences(s.text)) if (VAGUE.test(t)) bad.add(`${c.palace}｜${s.slot}：${t}`);
    expect([...bad]).toEqual([]);
  });
});
