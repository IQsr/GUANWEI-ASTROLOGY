/**
 * 原文分支（2026-10-11 內容審查第 3 層 · 試點）
 *
 * 審查要求：「抽走化忌／夾宮後，不能還是同一篇；有火鈴和無火鈴不能選同一分支。」
 * 呢度用示範盤做底，逐個條件改，睇結論有冇跟住改。
 */
import { describe, expect, it } from 'vitest';
import { annual, cast, SCHOOL_PROFILE, type Chart } from '@guanwei/ziwei';
import { BRANCH_TOPICS, RULE_REGISTRY, SPEC_VERSION, assembleAll, branchReading, branchRules, gujiaChapter, gujiaException, inferAll, leanState } from '../src/index';
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
    const got = ids(demo, '天同天梁坐寅申.命宮');
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
    const got = ids(c, '天同天梁坐寅申.命宮');
    expect(got).toContain('同梁寅申.平穩');
    expect(got).not.toContain('同梁寅申.忌祿有煞');
  });

  it('拎走命宮火星：化忌祿存改行「無煞」分支', () => {
    const c = edit(demo, (x) => {
      const p = palace(x, '命宮');
      p.stars = p.stars.filter((y) => y.name !== '火星');
    });
    const got = ids(c, '天同天梁坐寅申.命宮');
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
    /* 有系統咁鋪：六十年（十天干 × 十二地支）× 十二個月 × 六個時辰，日子輪住變 —— 六十星系同年干四化都輪到 */
    for (let i = 0; i < 4320; i++) {
      const y = 1950 + (i % 60);
      const m = 1 + (Math.floor(i / 60) % 12);
      const h = (Math.floor(i / 720) * 4 + 1) % 24;
      const r = cast({
        solar: { y, m, d: 1 + ((i * 7) % 28) }, time: { h, min: 30 },
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
    /*
     * 化權加左右同度、火鈴夾忌呢類組合本來就少：3000 張盤中唔到唔等於寫錯。
     * 2026-10-12 用逐年逐月逐時辰搜過，未中嗰幾條（同梁空劫、武相最壞、陽梁極孤⋯）都搵到實際生辰。
     * 呢度守住比例：未中超過一成二就要查係咪條件寫咗不可能（例如祿存入辰戌）。
     */
    expect(never.length / hit.size).toBeLessThanOrEqual(0.12);
  }, 300_000);
});

describe('骨架章細讀（六十星系）', () => {
  it('細讀唔同偏向打架、唔重複骨架段', () => {
    const clash: string[] = [];
    const dup: string[] = [];
    for (let i = 0; i < 2000; i++) {
      const r = cast({
        solar: { y: 1950 + (i % 60), m: 1 + (Math.floor(i / 60) % 12), d: 1 + ((i * 7) % 28) }, time: { h: (Math.floor(i / 240) * 3 + 1) % 24, min: 30 },
        tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: i % 2 ? 'male' : 'female',
      });
      if (!r.ok) continue;
      const g = gujiaChapter({ chart: r.value });
      const deep = g?.segments.find((s) => s.slot === '細讀');
      if (!g || !deep) continue;
      const state = leanState(r.value);
      for (const t of BRANCH_TOPICS) {
        if (t.topic.xingxi === undefined) continue;
        for (const x of branchRules(r.value, t)) {
          if (x.pole && state && !['平衡', '未定', x.pole].includes(state) && deep.text.includes(x.text)) clash.push(`${x.id}／${state}`);
        }
      }
      const skel = g.segments.find((s) => s.slot === '骨架')!.text.replace(/[^\p{Script=Han}]/gu, '');
      /* 逐句比：兩條規則接埋嗰度唔算 */
      for (const sen of deep.text.match(/[^。]+。/g) ?? []) {
        const d = sen.replace(/[^\p{Script=Han}]/gu, '');
        for (let k = 0; k + 8 <= d.length; k++) if (skel.includes(d.slice(k, k + 8))) { dup.push(sen); break; }
      }
    }
    expect(clash).toEqual([]);
    expect(dup).toEqual([]);
  }, 300_000);
});

describe('宮位細讀：夫妻、財帛、官祿、遷移、福德、田宅、父母、兄弟、僕役（2026-10-12）', () => {
  const sample = (i: number) => cast({
    solar: { y: 1950 + (i % 60), m: 1 + (Math.floor(i / 60) % 12), d: 1 + ((i * 7) % 28) }, time: { h: (Math.floor(i / 720) * 4 + 1) % 24, min: 30 },
    tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: i % 2 ? 'male' : 'female',
  });

  it.each([['夫妻', 0.7], ['財帛', 0.9], ['官祿', 0.85], ['遷移', 0.7], ['福德', 0.8], ['田宅', 0.8], ['父母', 0.6], ['兄弟', 0.6], ['僕役', 0.6]] as const)('%s宮：大部份盤都有；最多四條、唔重複講同一句；英文譯得到；每句追到原文', (pal, min) => {
    let n = 0;
    let hit = 0;
    for (let i = 0; i < 4320; i += 3) {
      const r = sample(i);
      if (!r.ok) continue;
      n++;
      const d = branchReading(r.value, pal);
      if (!d) continue;
      hit++;
      expect(d.ids.length).toBeLessThanOrEqual(4);
      /* 官祿天機係試點檔，出處叫 deep.事業.* */
      expect(d.sources.every((s) => s.startsWith(`deep.${pal}.`) || (pal === '官祿' && s.startsWith('deep.事業.')))).toBe(true);
      expect(renderParagraph(d.text).missing).toEqual([]);
      const sens = d.text.match(/[^。]+。/g) ?? [];
      expect(new Set(sens).size).toBe(sens.length);
    }
    expect(hit / n).toBeGreaterThan(min);
  }, 300_000);

  it('條件一改，結論跟住改：夫妻宮拎走陀羅，就唔講「婚期較遲、錯過好緣份」', () => {
    for (let i = 0; i < 4320; i++) {
      const r = sample(i);
      if (!r.ok) continue;
      const p = palace(r.value, '夫妻');
      if (!p.stars.some((s) => s.name === '天機') || !['丑', '未'].includes(p.branch) || !p.stars.some((s) => s.name === '陀羅')) continue;
      expect(branchReading(r.value, '夫妻')!.ids).toContain('夫妻.天機丑未.陀羅');
      const c = edit(r.value, (x) => { const q = palace(x, '夫妻'); q.stars = q.stars.filter((s) => s.name !== '陀羅'); });
      expect(branchReading(c, '夫妻')?.ids ?? []).not.toContain('夫妻.天機丑未.陀羅');
      return;
    }
    throw new Error('樣本入面搵唔到天機丑未見陀羅嘅夫妻宮');
  });
});
