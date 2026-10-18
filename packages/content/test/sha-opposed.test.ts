import { describe, expect, it } from 'vitest';
import { annual, cast, SCHOOL_PROFILE } from '@guanwei/ziwei';
import { RULE_REGISTRY, SPEC_VERSION, assembleAll, inferAll } from '../src/index';

/**
 * 方向相反嘅兩粒煞同宮（2026-10-16 審稿：B/田宅/5）
 *
 * 陀羅＋火星、擎羊＋鈴星喺某幾宮兩截講相反嘅嘢（「決定了也要很久才執行」接「說搬就搬」）。
 * 第二截用「不過同宮還有X，拉向另一邊：」帶出；講得埋嘅宮（例如子女）照用「再加上」。
 */
const books = Array.from({ length: 1500 }, (_, i) => {
  const r = cast({
    solar: { y: 1930 + ((i * 13) % 80), m: 1 + ((i * 7) % 12), d: 1 + ((i * 17) % 28) },
    time: { h: i % 24, min: (i * 37) % 60 },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: i % 2 ? 'male' : 'female',
  });
  if (!r.ok) return null;
  const a = annual(r.value, 2026);
  if (!a.ok) return null;
  const by = inferAll(RULE_REGISTRY, { chart: r.value, annual: a.value }, SCHOOL_PROFILE.ref, SPEC_VERSION, { chartId: `s${i}`, layer: 'natal' });
  return { chart: r.value, book: assembleAll(r.value, by, { seed: `s${i}` }) };
}).filter((x) => x !== null);

function shaTexts(palace: string, pair: [string, string]): string[] {
  const out: string[] = [];
  for (const { chart, book } of books) {
    const p = chart.palaces.find((x) => x.name === palace)!;
    const names = p.stars.map((s) => s.name);
    if (!pair.every((x) => names.includes(x))) continue;
    const segs = book.find((c) => c.palace === palace)?.segments ?? [];
    const seg = segs.find((s) => s.slot === '擾動');
    /* 2026-10-18 B8：細讀已經講咗嗰粒煞，擾動唔再講；兩粒都講咗就冇擾動格 */
    const deep = segs.find((s) => s.slot === '細讀')?.text ?? '';
    if (seg) out.push(seg.text);
    else expect(pair.every((x) => deep.includes(x)), `${palace}：冇擾動格，細讀要講齊${pair.join('、')}`).toBe(true);
  }
  return out;
}

describe('方向相反嘅煞同宮', () => {
  it('田宅陀羅＋火星：第二截講明拉向另一邊', () => {
    const ts = shaTexts('田宅', ['陀羅', '火星']);
    expect(ts.length).toBeGreaterThan(0);
    for (const t of ts) expect(t).toMatch(/不過同宮還有(火星|陀羅)，拉向另一邊：/);
  });

  it('父母擎羊＋鈴星：一樣', () => {
    /* 父母宮細讀多數兩粒都講齊（「父母宮見擎羊、鈴星⋯」），擾動格可能一個都唔出 */
    const ts = shaTexts('父母', ['擎羊', '鈴星']);
    for (const t of ts) expect(t).toMatch(/不過同宮還有(擎羊|鈴星)，拉向另一邊：/);
  });

  it('講得埋嘅宮（子女陀羅＋火星）照用「再加上」', () => {
    const ts = shaTexts('子女', ['陀羅', '火星']);
    expect(ts.length).toBeGreaterThan(0);
    for (const t of ts) expect(t).not.toContain('拉向另一邊');
  });
});
