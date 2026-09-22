import { describe, expect, it } from 'vitest';
import { SCHOOL_PROFILE, cast } from '@guanwei/ziwei';
import { assembleAll } from '../src/assemble';
import { inferAll } from '../src/infer';
import { L3_BLOCKS } from '../src/l3-data';
import { RULE_REGISTRY, SPEC_VERSION } from '../src/registry';
import { FORBIDDEN_TERMS } from '../src/frame';
import {
  XU_FRAMES,
  assertNoReading,
  assertSettingsOnly,
  lunarDay,
  lunarMonth,
  shenChapter,
  shenPalace,
  xuChapter,
  SHEN_FRAMES,
} from '../src/free';
import { cjkCount } from '../src/lexicon';

/**
 * 序 · 你的命盤（工單 C12）
 *
 * ⚠ 呢一章冇來源，靠嘅係「佢冇講命理」。所以測試大部分都係喺度守住呢一點。
 */

function chartOf(opts: Partial<{ trueSolarTime: boolean }> = {}) {
  const r = cast({
    solar: { y: 1996, m: 6, d: 16 },
    time: { h: 8, min: 30 },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: 'male',
    /* ⚠ 流派選項叫 `options`，唔係 `rules` —— `meta.rules` 先至係出嚟嗰個。 */
    options: opts.trueSolarTime === false ? { trueSolarTime: false } : undefined,
  });
  if (!r.ok) throw new Error(r.code);
  return r.value;
}

const DECL = SCHOOL_PROFILE.declaration;

const XU = () =>
  xuChapter({
    chart: chartOf(),
    solar: { y: 1996, m: 6, d: 16 },
    place: '香港',
    declaration: DECL,
    contentVersion: RULE_REGISTRY.ref,
  });

describe('⚠ 序一個象義字都冇', () => {
  /**
   * ⚠ 體系段唔算 —— 佢用另一把尺。
   *
   * 「真太陽時」入面有「太陽」，「四化用中州派一套」入面有「四化」，
   * 而兩個都係真嘅：一個係天文，一個係架構 §8 要求版權頁講明嘅設定。
   * 改唔到句子（兩個都係術語本身），亦都唔開例外名單 ——
   * 體系段改為只准用佢自己嗰幾張設定表嘅字（見下面）。
   */
  it('四段正文入面，十四主星、六吉六煞、廟旺一個都冇', () => {
    const text = XU()
      .segments.filter((s) => s.slot !== '體系')
      .map((s) => s.text)
      .join('');
    const bad = FORBIDDEN_TERMS.filter((t) => text.includes(t));
    expect(bad).toEqual([]);
  });

  it('體系段寫多句讀象就爆', () => {
    expect(() => assertSettingsOnly('四化用中州派一套。命宮坐紫微。')).toThrow(/紫微/);
    expect(() => assertSettingsOnly('四化用中州派一套。出生時間已按出生地經度作真太陽時校正。')).not.toThrow();
  });

  /**
   * ⚠ 流派聲明提到星名（太陽化祿、武曲化權…），但佢唔係讀象。
   * 佢係「我哋用咗邊套四化表」嘅具體內容，而且由引擎出。
   * 所以佢帶住自己嗰份詞彙入嚟，唔係加落一張例外名單。
   */
  it('聲明帶住自己嗰份詞彙，但只限佢自己', () => {
    expect(() => assertSettingsOnly(DECL, DECL)).not.toThrow();
    expect(() => assertSettingsOnly(DECL)).toThrow();
    expect(() => assertSettingsOnly(`${DECL}另外命宮坐紫微。`, DECL)).toThrow(/紫微/);
  });

  it('每一段都冇來源，因為每一段都冇主張', () => {
    for (const s of XU().segments) {
      expect(s.source_id, s.slot).toBeNull();
      expect(s.rule_ids, s.slot).toEqual([]);
    }
  });

  /** 反面：一加象義字就要爆，唔可以靜靜雞開一道冇出處嘅後門。 */
  it('有人加一句讀象，即刻掟', () => {
    expect(() =>
      assertNoReading([{ slot: '盤面', text: '命宮坐紫微。' }]),
    ).toThrow(/紫微/);
  });
});

describe('⚠ 版權頁：規矩由盤講', () => {
  /**
   * 架構 §8：「真太陽時 —— 命書版權頁寫明用咗乜。」
   * 寫死一句就係喺一張冇校正嘅盤上面講大話，而且印喺讀者最信嗰個位置。
   */
  it('校正咗就話校正咗', () => {
    const text = XU().segments.find((s) => s.slot === '體系')!.text;
    expect(text).toContain('已按出生地經度作真太陽時校正');
  });

  it('冇校正就唔准話校正', () => {
    const chart = chartOf({ trueSolarTime: false });
    const text = xuChapter({
      chart,
      solar: { y: 1996, m: 6, d: 16 },
      place: '香港',
      declaration: DECL,
      contentVersion: RULE_REGISTRY.ref,
    }).segments.find((s) => s.slot === '體系')!.text;
    expect(text).toContain('未作真太陽時校正');
    expect(text).not.toContain('已按出生地經度');
  });

  /**
   * ⚠ 工單 H2 第一條 AC：流派聲明直接讀 `SCHOOL_PROFILE.declaration`，
   * 唔准人手抄一份。同一句要出現喺 /about、版權頁、四化章 —— 三處同源。
   *
   * 第一版喺 `free.ts` 入面自己寫咗一句「本書以三合派為骨…」，
   * 即係 H2 明文禁止嗰樣。呢條測試守住唔會再犯。
   */
  it('聲明逐字由引擎出，唔係喺呢度抄一份', () => {
    const text = XU().segments.find((s) => s.slot === '體系')!.text;
    expect(text).toContain(SCHOOL_PROFILE.declaration);
    expect(text).not.toContain('本書以三合派為骨');
  });

  /**
   * ⚠ 工單 B16 第二條 AC：版權頁要列**三個**版本號 ——
   * engine_version、school_profile_id、content_version。
   *
   * 呢條之前得兩個。少嗰個係規則庫版本，而佢正正係最容易靜靜雞變嗰個：
   * 改一句基塊尾句，盤一粒星都冇郁，但本書入面啲字唔同咗。
   */
  it('三個版本號都印得出：引擎、流派設定、規則庫', () => {
    const chart = chartOf();
    const text = xuChapter({
      chart,
      solar: { y: 1996, m: 6, d: 16 },
      place: '香港',
      declaration: DECL,
      contentVersion: RULE_REGISTRY.ref,
    }).segments.find((s) => s.slot === '體系')!.text;
    expect(text).toContain(chart.meta.schoolProfile);
    expect(text).toContain(chart.meta.engineVersion);
    expect(text).toContain(RULE_REGISTRY.ref);
    /* 規範 §17：版本欄唔准 latest。印出街嗰個一樣。 */
    expect(text).not.toContain('latest');
  });

  /** 三個號要真係唔同嘅嘢 —— 唔可以印咗同一個號三次就當交足貨。 */
  it('三個號係三樣嘢', () => {
    const chart = chartOf();
    const three = [chart.meta.engineVersion, chart.meta.schoolProfile, RULE_REGISTRY.ref];
    expect(new Set(three).size).toBe(3);
  });

  /**
   * ⚠ R-008：舊書唔自動重算。
   *
   * 三個號淨係記低咗設定；「日後改版唔會跟住郁」呢句先至係承諾本身。
   * 冇咗佢，讀者會當自己讀緊最新版 —— 而佢讀緊嘅係成書嗰日嗰版。
   */
  it('版權頁講明呢本書唔會自動跟住改（R-008）', () => {
    const text = XU().segments.find((s) => s.slot === '體系')!.text;
    expect(text).toContain('成書當時');
    expect(text).toContain('不會自動');
  });

  it('三個分歧點逐個寫明，唔靜靜咁揀一邊', () => {
    const text = XU().segments.find((s) => s.slot === '體系')!.text;
    expect(text).toContain('換年');
    expect(text).toContain('子時');
    expect(text).toContain('四化用');
  });
});

describe('生辰：國曆同農曆分得清', () => {
  it('兩套曆都寫出嚟，而且標明邊套', () => {
    const text = XU().segments.find((s) => s.slot === '生辰')!.text;
    expect(text).toContain('國曆一九九六年六月十六日');
    expect(text).toContain('農曆丙子年五月初一');
    expect(text).toContain('生於香港');
  });

  /** 廿唔係「二十」嘅簡寫，係農曆寫日子嘅慣例 —— 寫錯就讀落似國曆。 */
  it('農曆日子用初一／十五／廿三／三十', () => {
    expect([1, 10, 11, 15, 20, 23, 29, 30].map(lunarDay)).toEqual([
      '初一', '初十', '十一', '十五', '二十', '廿三', '廿九', '三十',
    ]);
  });

  it('正月唔寫做一月，閏月寫得出', () => {
    expect(lunarMonth(1, false)).toBe('正月');
    expect(lunarMonth(5, false)).toBe('五月');
    expect(lunarMonth(12, false)).toBe('十二月');
    expect(lunarMonth(5, true)).toBe('閏五月');
  });

  it('時辰由時支嚟，唔另開一張表', () => {
    const chart = chartOf();
    const text = XU().segments.find((s) => s.slot === '生辰')!.text;
    expect(text).toContain(`${chart.ganzhi.hour[1]}時`);
  });
});

describe('盤面', () => {
  it('五行局、命宮、身宮三樣都講咗', () => {
    const chart = chartOf();
    const text = XU().segments.find((s) => s.slot === '盤面')!.text;
    expect(text).toContain(chart.wuxingJu.name);
    expect(text).toContain(`命宮在${chart.mingGong}`);
    expect(text).toContain(`身宮在${chart.shenGong}`);
  });
});

describe('章框', () => {
  it('章首同留白各一句，字數喺規範入面', () => {
    expect(XU_FRAMES).toHaveLength(2);
    expect(cjkCount(XU_FRAMES[0]!.text)).toBeGreaterThanOrEqual(30);
    expect(cjkCount(XU_FRAMES[1]!.text)).toBeLessThanOrEqual(45);
  });

  it('留白句對住讀者講', () => {
    expect(XU_FRAMES[1]!.text).toMatch(/你|自己/);
  });

  it('五格齊，次序固定', () => {
    expect(XU().segments.map((s) => s.slot)).toEqual(['章首', '生辰', '盤面', '體系', '留白']);
  });
});

describe('免費章之二：身宮與五行局（甲案）', () => {
  const CH = () => shenChapter({ chart: chartOf() })!;

  it('四格齊，次序固定', () => {
    expect(CH().segments.map((s) => s.slot)).toEqual(['章首', '五行局', '身宮', '留白']);
  });

  /**
   * ⚠ 身宮嗰段係**原封不動**嘅 L3 塊。
   *
   * 組裝器嗰條規矩（「冇一句文字係喺呢個檔案入面生出嚟」）呢度一樣守 ——
   * 一段喺組裝嗰陣寫出嚟嘅命理文字，就係冇來源嘅即席創作。
   */
  it('身宮嗰段逐字對得返一塊，而且帶住規則', () => {
    const chart = chartOf();
    const where = shenPalace(chart)!;
    const block = L3_BLOCKS.find((b) => b.kind === 'shen' && b.key === where)!;
    const seg = shenChapter({ chart })!.segments.find((s) => s.slot === '身宮')!;
    expect(seg.text).toBe(block.body);
    expect(seg.source_id).toBe(block.id);
    expect(seg.rule_ids).toEqual(block.rule_ids);
  });

  /** 五行局嗰段只講盤面數值 —— 條目原文係藏經閣資產，由註層出（內容 §4）。 */
  it('五行局嗰段唔抄詞條，只講局名同起運', () => {
    const chart = chartOf();
    const seg = shenChapter({ chart })!.segments.find((s) => s.slot === '五行局')!;
    expect(seg.text).toContain(chart.wuxingJu.name);
    expect(seg.text).toContain('虛歲');
    expect(seg.text).not.toMatch(/納音|《全書》/);
    expect(seg.source_id).toBeNull();
  });

  it('起運歲數用中文數字，同序一致', () => {
    const seg = CH().segments.find((s) => s.slot === '五行局')!;
    expect(seg.text).not.toMatch(/\d/);
  });

  it('身宮只會落六個宮之一', () => {
    const where = shenPalace(chartOf());
    expect(['命宮', '夫妻', '財帛', '遷移', '官祿', '福德']).toContain(where);
  });

  it('章框兩句，留白對住讀者講', () => {
    expect(SHEN_FRAMES).toHaveLength(2);
    expect(SHEN_FRAMES[1]!.text).toMatch(/你|自己/);
  });
});

describe('⚠ 甲案：身宮塊唔可以兩邊都用', () => {
  /**
   * Issac 2026-09-20 揀咗甲：新章攞走，逐宮章讓路。
   * 一件事喺同一本書講兩次係個 bug —— 所以 `l3For()` 個 order 剷咗 `shen`。
   */
  it('逐宮章一條 shen 塊都唔會揀到', () => {
    const chart = chartOf();
    const byTopic = inferAll(RULE_REGISTRY, { chart }, SCHOOL_PROFILE.ref, SPEC_VERSION, {
      chartId: 'x',
      layer: 'natal',
    });
    const ids = assembleAll(chart, byTopic, { seed: 'x' })
      .flatMap((c) => c.segments.map((s) => s.source_id ?? ''))
      .join('|');
    expect(ids).not.toMatch(/l3\.shen\./);
  });

  /**
   * ⚠ 老實講一句：呢個改動嘅實際影響細過佢個名。
   *
   * `sanfang` 本身就排喺 `shen` 前面，所以只要嗰一宮嘅三方四正規則有命中，
   * 佢本來就揀唔到 shen。剷走佢影響嘅係**三方四正冇命中**嗰啲盤。
   */
  it('六條 shen 塊仲喺度，只係改咗邊個用', () => {
    expect(L3_BLOCKS.filter((b) => b.kind === 'shen')).toHaveLength(6);
  });
});
