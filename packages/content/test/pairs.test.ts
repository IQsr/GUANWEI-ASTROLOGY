/**
 * 雙星矛盾（2026-10-11 內容審查第 2 層）
 *
 * 同宮兩粒主星喺嗰宮主軸上一 A 一 B（plain/stance.json），結論淨跟領銜星就會同同座星嘅句打架。
 * 呢度保證：每個會打架嘅組合都有整合版，而且成本書真係用咗佢。
 */
import { describe, expect, it } from 'vitest';
import { annual, cast, SCHOOL_PROFILE } from '@guanwei/ziwei';
import { BASE_BLOCKS, PAIR_PLAIN, RULE_REGISTRY, SPEC_VERSION, STANCE, assembleAll, clashes, inferAll, pairPlain, variantFor } from '../src/index';
import { renderParagraph } from '../src/en/render';

const STARS = [...new Set(BASE_BLOCKS.map((b) => b.star))];
/* 紫微斗數十四主星同宮只有呢廿四對 */
const PAIRS = '天同天梁 天同太陰 天同巨門 天機天梁 天機太陰 天機巨門 太陽天梁 太陽太陰 太陽巨門 廉貞七殺 廉貞天府 廉貞天相 廉貞破軍 廉貞貪狼 武曲七殺 武曲天府 武曲天相 武曲破軍 武曲貪狼 紫微七殺 紫微天府 紫微天相 紫微破軍 紫微貪狼'
  .split(' ')
  .map((x) => [x.slice(0, 2), x.slice(2)] as const);

describe('雙星整合版', () => {
  it('立場表只用十四主星，一粒星唔會兩邊都有', () => {
    for (const [palace, s] of Object.entries(STANCE)) {
      for (const x of [...s.A, ...s.B]) expect(STARS, `${palace} ${x}`).toContain(x);
      expect(s.A.filter((x) => s.B.includes(x)), palace).toEqual([]);
    }
  });

  it('每個會打架嘅組合都有整合版；冇打架嘅唔使寫', () => {
    const missing: string[] = [];
    for (const palace of Object.keys(STANCE))
      for (const [a, b] of PAIRS) if (clashes(a, b, palace) && !pairPlain([a, b], palace)) missing.push(`${a}${b}.${palace}`);
    expect(missing).toEqual([]);
    for (const x of PAIR_PLAIN) expect(clashes(x.stars[0], x.stars[1], x.palace), x.id).toBe(true);
  });

  it('真書用到：結論同生活兩格都係整合版，英文譯得到', () => {
    let seen = 0;
    for (let i = 0; i < 200 && seen < 30; i++) {
      const r = cast({ solar: { y: 1950 + (i * 7) % 60, m: 1 + (i * 5) % 12, d: 1 + (i * 11) % 28 }, time: { h: (i * 3) % 24, min: 0 }, tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: i % 2 ? 'male' : 'female' });
      if (!r.ok) continue;
      const a = annual(r.value, 2026);
      if (!a.ok) continue;
      const by = inferAll(RULE_REGISTRY, { chart: r.value, annual: a.value }, SCHOOL_PROFILE.ref, SPEC_VERSION, { chartId: `p${i}`, layer: 'natal' });
      for (const ch of assembleAll(r.value, by, { seed: `p${i}` })) {
        const p = r.value.palaces.find((x) => x.name === ch.palace)!;
        const majors = p.stars.filter((s) => STARS.includes(s.name)).map((s) => s.name);
        const pair = pairPlain(majors, ch.palace);
        if (!pair) continue;
        seen++;
        const con = ch.segments.find((s) => s.slot === '結論')!;
        const life = ch.segments.find((s) => s.slot === '生活')!;
        expect(con.source_id, pair.id).toBe(pair.id);
        /* 2026-10-18：整合版冇出處、而呢張盤有帶條件嘅原文成立，結論句換做變體（plain-variant.ts） */
        const v = variantFor(r.value, { id: pair.id, palace: ch.palace, source: pair.source });
        expect(con.text.startsWith(v ? v.summary : pair.summary), pair.id).toBe(true);
        expect(life.text, pair.id).toBe(pair.life);
        for (const seg of [con, life]) expect(renderParagraph(seg.text).missing, `${pair.id} ${seg.text}`).toEqual([]);
      }
    }
    expect(seen).toBeGreaterThan(10);
  }, 120_000);
});
