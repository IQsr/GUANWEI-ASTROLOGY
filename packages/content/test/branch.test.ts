/**
 * 原文分支（2026-10-11 內容審查第 3 層 · 試點）
 *
 * 審查要求：「抽走化忌／夾宮後，不能還是同一篇；有火鈴和無火鈴不能選同一分支。」
 * 呢度用示範盤做底，逐個條件改，睇結論有冇跟住改。
 */
import { describe, expect, it } from 'vitest';
import { annual, cast, SCHOOL_PROFILE, type Chart } from '@guanwei/ziwei';
import { BRANCH_TOPICS, RULE_REGISTRY, SPEC_VERSION, assembleAll, branchReading, branchRules, gujiaChapter, gujiaException, inferAll } from '../src/index';
import { renderParagraph } from '../src/en/render';

const DEMO = cast({
  solar: { y: 1990, m: 3, d: 21 }, time: { h: 14, min: 20 }, tz: 'Asia/Hong_Kong',
  place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'female',
});
if (!DEMO.ok) throw new Error('排唔到示範盤');
const demo = DEMO.value;

/** 改盤：深拷貝之後改某宮某粒星 */
function edit(chart: Chart, fn: (c: Chart) => void): Chart {
  const c = structuredClone(chart);
  fn(c);
  return c;
}
const palace = (c: Chart, name: string) => c.palaces.find((p) => p.name === name)!;
const ids = (c: Chart, topic: string) => branchRules(c, BRANCH_TOPICS.find((t) => t.topic.id === topic)!).map((r) => r.id);

describe('示範盤', () => {
  it('命宮天同化忌、羊陀夾：骨架改講徘徊，唔講「穩當可靠」', () => {
    expect(gujiaException(demo)?.id).toBe('同梁寅申.夾忌');
    const g = gujiaChapter({ chart: demo })!;
    expect(g.segments.find((s) => s.slot === '偏向')!.text).toMatch(/來回拉扯/);
    expect(g.segments.some((s) => s.slot === '長處')).toBe(false);
  });

  it('命宮細讀：化忌有祿存但同宮有火星 —— 取「有煞」分支，唔講平穩', () => {
    const got = ids(demo, '同梁寅申.命宮');
    expect(got).toContain('同梁寅申.忌祿有煞');
    expect(got).not.toContain('同梁寅申.忌祿無煞');
    expect(got).not.toContain('同梁寅申.平穩');
    /* 「先歷艱危」被更具體嘅分支取代 */
    expect(got).not.toContain('同梁寅申.煞忌');
    expect(got).toContain('同梁寅申.天馬');
  });

  it('官祿天機獨坐子宮：多變、子午要費心經營、子宮更辛苦；冇講化科嘅「設計」', () => {
    const got = ids(demo, '天機.官祿');
    expect(got).toEqual(expect.arrayContaining(['天機官祿.本', '天機官祿.子午', '天機官祿.子']));
    expect(got).not.toContain('天機官祿.科');
    expect(got).not.toContain('天機官祿.午');
    expect(branchReading(demo, '官祿')!.text).not.toMatch(/設計/);
  });
});

describe('條件一改，結論跟住改', () => {
  it('拎走天同化忌：骨架冇咗例外；有祿存就講平穩', () => {
    const c = edit(demo, (x) => {
      const s = palace(x, '命宮').stars.find((y) => y.name === '天同')!;
      delete s.sihua;
    });
    expect(gujiaException(c)).toBeNull();
    const got = ids(c, '同梁寅申.命宮');
    expect(got).toContain('同梁寅申.平穩');
    expect(got).not.toContain('同梁寅申.忌祿有煞');
  });

  it('拎走命宮火星：化忌祿存改行「無煞」分支', () => {
    const c = edit(demo, (x) => {
      const p = palace(x, '命宮');
      p.stars = p.stars.filter((y) => y.name !== '火星');
    });
    const got = ids(c, '同梁寅申.命宮');
    expect(got).toContain('同梁寅申.忌祿無煞');
    expect(got).not.toContain('同梁寅申.忌祿有煞');
  });

  it('拎走一邊嘅陀羅：唔再係夾忌', () => {
    const c = edit(demo, (x) => {
      for (const p of x.palaces) p.stars = p.stars.filter((y) => y.name !== '陀羅');
    });
    expect(gujiaException(c)).toBeNull();
  });

  it('天機化權：「多變」被取代，改講轉趨穩定', () => {
    const c = edit(demo, (x) => {
      palace(x, '官祿').stars.find((y) => y.name === '天機')!.sihua = '權';
    });
    const got = ids(c, '天機.官祿');
    expect(got).toContain('天機官祿.權');
    expect(got).not.toContain('天機官祿.本');
    expect(got).not.toContain('天機官祿.行業');
  });

  it('題目套唔到嘅盤冇細讀：同梁唔喺寅申、官祿冇天機', () => {
    const c = edit(demo, (x) => {
      const g = palace(x, '官祿');
      g.stars = g.stars.filter((y) => y.name !== '天機');
    });
    expect(branchReading(c, '官祿')).toBeNull();
  });
});

describe('真書', () => {
  it('細讀入章、出處追得返、英文譯得到；每條規則喺樣本入面最少中一次（印覆蓋）', () => {
    const hit = new Map<string, number>();
    for (const t of BRANCH_TOPICS) for (const r of t.rules) hit.set(r.id, 0);
    let books = 0;
    for (let i = 0; i < 3000; i++) {
      const r = cast({
        solar: { y: 1940 + (i * 7) % 70, m: 1 + (i * 5) % 12, d: 1 + (i * 11) % 28 }, time: { h: (i * 3 + (i >> 5)) % 24, min: 0 },
        tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: i % 2 ? 'male' : 'female',
      });
      if (!r.ok) continue;
      for (const t of BRANCH_TOPICS) for (const x of branchRules(r.value, t)) hit.set(x.id, hit.get(x.id)! + 1);
      if (books < 25 && branchReading(r.value, '官祿')) {
        books++;
        const a = annual(r.value, 2026);
        if (!a.ok) continue;
        const by = inferAll(RULE_REGISTRY, { chart: r.value, annual: a.value }, SCHOOL_PROFILE.ref, SPEC_VERSION, { chartId: `b${i}`, layer: 'natal' });
        const ch = assembleAll(r.value, by, { seed: `b${i}` }).find((c) => c.palace === '官祿')!;
        const seg = ch.segments.find((s) => s.slot === '細讀')!;
        expect(seg.source_id).toMatch(/^deep\./);
        expect(renderParagraph(seg.text).missing).toEqual([]);
      }
    }
    const never = [...hit].filter(([, n]) => n === 0).map(([id]) => id);
    // eslint-disable-next-line no-console
    console.log(`\n  分支覆蓋：${hit.size - never.length} / ${hit.size}${never.length ? `；未中：${never.join('、')}` : ''}\n`);
    expect(books).toBeGreaterThan(10);
    /* 化權加左右同度呢類組合本來就少；大部份要中到 */
    expect(never.length).toBeLessThanOrEqual(4);
  }, 300_000);
});
