/**
 * 工單 C8 —— 推理器
 *
 * 呢個檔案守兩樣嘢：
 *
 *   一、規範 §26 嘅**最低回歸案例**，逐條寫成測試。
 *       規範明文列咗八條「一定要阻擋得到」嘅情況 ——
 *       佢哋唔係邊界個案，佢哋係一個命理生成系統最容易出事嗰八個位。
 *
 *   二、方向係由已登記象義查返出嚟，唔係人手標。
 *       所以「邊條規則投得到方向票」呢件事，冇得靜靜雞改。
 */
import { describe, expect, it } from 'vitest';
import { annual, cast, SCHOOL_PROFILE, type BirthInput } from '@guanwei/ziwei';
import {
  BASE_BLOCKS,
  BaseBlock,
  Interpretation,
  RULE_REGISTRY,
  Rule,
  blockToRule,
  directionalBlocks,
  SPEC_VERSION,
  buildRegistry,
  directionalRules,
  infer,
  inferAll,
  lintInterpretation,
  ruleValence,
  unclassifiedXiang,
  type EvalContext,
} from '../src/index';

const INPUT: BirthInput = {
  solar: { y: 1996, m: 6, d: 16 }, time: { h: 8, min: 30 },
  tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'male',
};
const r = cast(INPUT);
if (!r.ok) throw new Error(r.message);
const CHART = r.value;
const a = annual(CHART, 2026);
if (!a.ok) throw new Error(a.message);
const CTX: EvalContext = { chart: CHART, annual: a.value };
const CTX_NATAL_ONLY: EvalContext = { chart: CHART };
const SCHOOL = SCHOOL_PROFILE.ref;

const NATAL = inferAll(RULE_REGISTRY, CTX, SCHOOL, SPEC_VERSION, { chartId: 'c1', layer: 'natal' });

/** 砌一個細規則庫。`allowed_xiang` 要用真詞，因為方向係由佢查出嚟。 */
function rule(over: Record<string, unknown>) {
  return {
    rule_id: 'test.demo.one',
    version: '1.0',
    schools: ['zhongzhou-v1'],
    requires: ['natal'],
    role: 'core',
    independence_group: 'test.demo',
    trigger: { hua: '忌', in: { name: '遷移' }, layer: 'natal' },
    exclude: null,
    allowed_xiang: ['牽制', '反覆'],
    prohibited_inferences: ['忌必凶'],
    topics: ['self'],
    depends_on: [],
    review_status: 'approved',
    review_reasons: [],
    sources: [{ book: 'docs/voice-spec.md', ref: '§14' }, { book: '紫微斗數全書', ref: '卷二（測試用）' }],
    ...over,
  };
}

/* ══════════════════════════════════════════════
   方向：由象義查，唔係人手標
   ══════════════════════════════════════════════ */

describe('方向詞庫', () => {
  /**
   * ⚠ 呢條係整個機制嘅鎖。
   *
   * 加一條新規則、寫一個新象義詞，就一定要即場喺 `valence.json` 決定
   * 「呢個詞算唔算講緊方向」。分類唔落就 build fail ——
   * 所以冇人可以靜靜雞加一個有方向嘅詞入去，令一個主題突然夠票。
   */
  it('規則庫入面冇一個未分類嘅象義詞', () => {
    expect(unclassifiedXiang(RULE_REGISTRY)).toEqual([]);
  });

  /**
   * C4 寫基塊嗰陣決定咗「基塊只寫交集張力，唔寫吉凶」。
   * 呢條測試就係嗰個決定嘅後果：**一百六十八條基塊規則，一條都投唔到方向票。**
   *
   * 呢個唔係 bug。想基塊有方向，就要改基塊嘅象義，而改象義要引得出書。
   */
  it('基塊派生嘅規則全部冇方向 —— 佢哋講張力，唔講吉凶', () => {
    const base = RULE_REGISTRY.rules.filter((x) => x.rule_id.startsWith('base.'));
    expect(base).toHaveLength(168);
    for (const b of base) expect(ruleValence(b), b.rule_id).toBe('neutral');
  });

  /**
   * 四化嘅方向由規範自己登記嘅象義決定，唔係由「祿吉忌凶」呢個直覺決定：
   *
   *   祿 = 資源／順流／得以展開      → 順向
   *   忌 = 牽制／反覆／需要承擔      → 阻力向
   *   權 = 推動／**承擔**／決定權     → 冇方向（規範自己把兩個相反方向寫喺同一格）
   *   科 = 呈現／秩序／名目          → 冇方向（根本唔係一個方向）
   */
  it('四化：祿順、忌阻，權同科冇方向', () => {
    const v = (id: string) => ruleValence(RULE_REGISTRY.rules.find((x) => x.rule_id === id)!);
    expect(v('sihua.natal-祿.財帛')).toBe('support');
    expect(v('sihua.natal-忌.財帛')).toBe('pressure');
    expect(v('sihua.natal-權.財帛')).toBe('neutral');
    expect(v('sihua.natal-科.財帛')).toBe('neutral');
  });

  it('六煞冇方向 —— 佢哋登記嘅象義係「條件、強弱、表現方式」', () => {
    for (const s of RULE_REGISTRY.rules.filter((x) => x.rule_id.startsWith('sha.'))) {
      expect(ruleValence(s), s.rule_id).toBe('neutral');
    }
  });

  it('三方四正兩邊各有方向，但共用一群 —— 所以互相抵銷，唔會互相加票', () => {
    const p = RULE_REGISTRY.rules.find((x) => x.rule_id === 'sanfang.官祿-pressure.structural')!;
    const s = RULE_REGISTRY.rules.find((x) => x.rule_id === 'sanfang.官祿-support.structural')!;
    expect(ruleValence(p)).toBe('pressure');
    expect(ruleValence(s)).toBe('support');
    expect(p.independence_group).toBe(s.independence_group);
  });

  it('講得出方向嘅規則係少數', () => {
    const d = directionalRules(RULE_REGISTRY);
    const total = RULE_REGISTRY.approved.length;
    // eslint-disable-next-line no-console
    console.log(`\n  ${total} 條已審核規則，講得出方向嘅得 ${d.support.length + d.pressure.length} 條` +
      `（順 ${d.support.length}／阻 ${d.pressure.length}）\n`);
    expect(d.support.length + d.pressure.length).toBeLessThan(total / 3);
    expect(d.mixed).toEqual([]);
  });
});

/* ══════════════════════════════════════════════
   §26 最低回歸案例
   ══════════════════════════════════════════════ */

describe('§26 最低回歸案例', () => {
  it('① 單忌須阻擋', () => {
    const reg = buildRegistry('t', [rule({})]);
    const { interpretation: o } = infer(reg, CTX, SCHOOL, SPEC_VERSION, { chartId: 'c1', topic: 'self', layer: 'natal' });
    expect(o.rating.final_grade).toBeNull();
    expect(o.rating.change_reason).toContain('觀察清單');
  });

  /**
   * ② 四次重述同一忌不得升級。
   *
   * 四條規則、四個唔同 rule_id、全部命中同一個化忌 —— 但同一個去重群。
   * §15：「同一化忌以『落財帛』『照某宮』『疊流年』描述，若由同一機制衍生，不得算三票。」
   */
  it('② 四次重述同一忌不得升級', () => {
    const reg = buildRegistry('t', [
      rule({ rule_id: 'test.ji.a' }),
      rule({ rule_id: 'test.ji.b' }),
      rule({ rule_id: 'test.ji.c' }),
      rule({ rule_id: 'test.ji.d' }),
    ]);
    const { interpretation: o, trace } = infer(reg, CTX, SCHOOL, SPEC_VERSION, { chartId: 'c1', topic: 'self', layer: 'natal' });
    expect(trace.pressure.outcomes).toHaveLength(4);
    expect(trace.pressure.ceiling.groups).toBe(1);
    expect(o.rating.final_grade).toBeNull();
  });

  /**
   * ③ 核心衝突須降級或交錯。
   *
   * 真盤：self 有兩個順向核心群（生年化祿、鈴貪），一個阻力核心群（生年化忌）。
   * 順向過到門檻一（±1），但有有效核心反向群 → 收窄一級 → 零。
   * §16：「降到零不自動表示『平』；若只是衝突造成，仍為『交錯』。」
   */
  it('③ 核心衝突：收窄到零之後係交錯，唔係平', () => {
    const o = NATAL.self.interpretation;
    expect(o.rating.final_grade).toBeNull();
    expect(o.rating.status).toBe('conflicted');
    expect(o.rating.change_reason).toContain('核心反向群');
    expect(o.rating.change_reason).toContain('降到零唔自動等於「平」');
  });

  /**
   * ④ 缺流年不得寫年度。
   *
   * 兩種缺法都要擋到：完全冇流年資料，同埋有流年但未起運（冇大限層）。
   */
  it('④ 缺流年不得寫年度', () => {
    const { interpretation: o } = infer(RULE_REGISTRY, CTX_NATAL_ONLY, SCHOOL, SPEC_VERSION, {
      chartId: 'c1', topic: 'career', layer: 'annual',
    });
    expect(o.rating.final_grade).toBeNull();
    expect(o.input_quality).toBe('incomplete');
    expect(o.missing_inputs).toContain('流年層');
    expect(o.interpretation_confidence).toBe('undetermined');
  });

  /**
   * ⑤ 高一致度疾厄訊號仍不得推病。
   *
   * 呢條特登砌到**過晒門檻**：四個阻力群、三層都有核心、外加一個結構驗證群 ——
   * 結構上係「險」。然後 §19 硬閘照樣將佢剷成 null。
   *
   * 呢個先係硬閘嘅意思：**唔係「證據唔夠所以唔寫」，係「證據幾夠都唔寫」。**
   */
  it('⑤ 疾厄：結構上夠到「險」，照樣出 null', () => {
    const ji = (over: Record<string, unknown>) =>
      rule({ trigger: { empty: { name: '疾厄' } }, topics: ['load'], ...over });
    const reg = buildRegistry('t', [
      ji({ rule_id: 'test.ji.natal', independence_group: 'g1', requires: ['natal'] }),
      ji({ rule_id: 'test.ji.decade', independence_group: 'g2', requires: ['natal', 'decade'] }),
      ji({ rule_id: 'test.ji.annual', independence_group: 'g3', requires: ['natal', 'annual'] }),
      ji({ rule_id: 'test.ji.struct', independence_group: 'g4', role: 'structural' }),
    ]);
    const { interpretation: o, trace } = infer(reg, CTX, SCHOOL, SPEC_VERSION, { chartId: 'c1', topic: 'load', layer: 'annual' });
    // 先確認個結構上限真係去到三 —— 否則呢條測試證明唔到嘢
    expect(trace.pressure.ceiling.ceiling).toBe(3);
    // 然後硬閘照樣剷走
    expect(o.risk_flags).toContain('health');
    expect(o.rating.final_grade).toBeNull();
    expect(o.rating.change_reason).toContain('§19');
    expect(o.review_status).toBe('needs_review');
    expect(lintInterpretation(o)).toEqual([]);
  });

  it('⑥ 單祿不得保證收入', () => {
    const reg = buildRegistry('t', [
      rule({ rule_id: 'test.lu.one', topics: ['finance'], allowed_xiang: ['資源', '順流'],
        trigger: { hua: '祿', in: { name: '子女' }, layer: 'natal' } }),
    ]);
    const { interpretation: o } = infer(reg, CTX, SCHOOL, SPEC_VERSION, { chartId: 'c1', topic: 'finance', layer: 'natal' });
    expect(o.rating.final_grade).toBeNull();
    expect(o.title).toBeNull();
    expect(o.body).toBeNull();
  });

  /**
   * ⑦ 未知唔准填成平。
   *
   * 「平」係一個結論（資料完整、盤點完成、無突出方向），唔係一個預設值。
   * 缺資料要出 null；有方向證據但唔夠票亦都要出 null（觀察清單）。
   */
  it('⑦ 「平」只出得喺：輸入完整 ＋ 零方向證據', () => {
    // 缺資料
    const miss = infer(RULE_REGISTRY, CTX_NATAL_ONLY, SCHOOL, SPEC_VERSION, {
      chartId: 'c1', topic: 'social', layer: 'annual',
    }).interpretation;
    expect(miss.rating.final_grade).toBeNull();

    // 有方向證據但唔夠票
    const one = buildRegistry('t', [rule({})]);
    const obs = infer(one, CTX, SCHOOL, SPEC_VERSION, { chartId: 'c1', topic: 'self', layer: 'natal' }).interpretation;
    expect(obs.rating.final_grade).toBeNull();
    expect(obs.input_quality).toBe('complete');

    // 零方向證據 → 呢個先係平
    const flat = NATAL.social.interpretation;
    expect(flat.rating.final_grade).toBe(0);
    expect(flat.input_quality).toBe('complete');
    expect(flat.rating.change_reason).toContain('一個講得出方向嘅群都冇');
  });

  /**
   * ⑧ 未審核規則連行都唔行。
   *
   * §10 最尾一句：「缺少已審核規則時，不得即席創作星曜含義。」
   * 所以未審核嘅規則唔止唔出 evidence —— 佢哋根本唔應該出現喺任何一個結論物件入面。
   */
  it('⑧ 未審核規則一行 evidence 都唔會出現', () => {
    const pending = new Set(RULE_REGISTRY.rules.filter((x) => x.review_status !== 'approved').map((x) => x.rule_id));
    expect(pending.size).toBeGreaterThan(0);
    for (const res of Object.values(NATAL)) {
      for (const e of res.interpretation.evidence) expect(pending.has(e.rule_id), e.rule_id).toBe(false);
    }
  });
});

/* ══════════════════════════════════════════════
   時間層
   ══════════════════════════════════════════════ */

describe('時間層唔可以借證據', () => {
  /**
   * §13：「本命閱讀以本命為核心；大限閱讀需要本命＋大限；年度閱讀需要本命＋大限＋流年。」
   *
   * 一個本命結論用咗流年證據，讀者就會喺本命章見到一個唔屬於嗰一章嘅理由。
   * 所以呢個篩喺最前面做，唔係評級嗰陣先扣返。
   */
  it('本命章嘅 evidence 一行流年都冇', () => {
    for (const res of Object.values(NATAL)) {
      for (const e of res.interpretation.evidence) expect(e.layer).toBe('natal');
    }
  });

  /**
   * §16.1：「年度結論必須有流年群。」
   *
   * 規則庫而家得一條流年規則，所以七個主題喺流年層全部出 null ——
   * 而且原因寫得出：**唔係「呢年冇事」，係「我哋冇嘢查得到」。**
   */
  it('年度層七個主題全部出 null —— 因為規則庫得一條流年規則', () => {
    const annualRules = RULE_REGISTRY.approved.filter((x) => x.requires.includes('annual'));
    expect(annualRules.length).toBeLessThanOrEqual(2);
    const res = inferAll(RULE_REGISTRY, CTX, SCHOOL, SPEC_VERSION, { chartId: 'c1', layer: 'annual' });
    for (const [t, v] of Object.entries(res)) {
      expect(v.interpretation.rating.final_grade, t).toBeNull();
    }
  });

  it('年度層嘅限流疊宮 cross_check 係 failed，唔係 not_applicable', () => {
    const o = inferAll(RULE_REGISTRY, CTX, SCHOOL, SPEC_VERSION, { chartId: 'c1', layer: 'annual' }).career.interpretation;
    expect(o.cross_checks.overlap.status).toBe('failed');
    expect(o.cross_checks.overlap.reason).toContain('缺口');
    expect(o.unknowns.join('｜')).toContain('限流疊宮');
  });
});

/* ══════════════════════════════════════════════
   §17 物件本身
   ══════════════════════════════════════════════ */

describe('§17 結論物件', () => {
  it('七個主題全部過到 schema 同 lint', () => {
    for (const [t, res] of Object.entries(NATAL)) {
      expect(Interpretation.safeParse(res.interpretation).success, t).toBe(true);
      expect(lintInterpretation(res.interpretation), t).toEqual([]);
    }
  });

  /** 工單 C8 驗收：同一命盤跑兩次，evidence 同評級完全相同。 */
  it('純函數：同一輸入跑兩次，逐個欄位一樣', () => {
    const one = inferAll(RULE_REGISTRY, CTX, SCHOOL, SPEC_VERSION, { chartId: 'c1', layer: 'natal' });
    const two = inferAll(RULE_REGISTRY, CTX, SCHOOL, SPEC_VERSION, { chartId: 'c1', layer: 'natal' });
    for (const t of Object.keys(one) as (keyof typeof one)[]) {
      expect(two[t].interpretation).toEqual(one[t].interpretation);
    }
  });

  it('兩個版本號都 pin 得住，唔係 latest', () => {
    const o = NATAL.finance.interpretation;
    expect(o.school_profile_id).toMatch(/@[0-9a-f]{16}$/);
    expect(o.rule_registry_version).toMatch(/@[0-9a-f]{16}$/);
  });

  /**
   * 「事」「解」「文案」係 C8b 嘅工作。
   * 推理器唔識寫字，寫字嗰個唔准改評級 —— 呢個分工要睇得見。
   */
  it('推理器唔出文案 —— 事、解、標題、正文全部空', () => {
    for (const res of Object.values(NATAL)) {
      const o = res.interpretation;
      expect(o.shi_scenarios).toEqual([]);
      expect(o.jie).toEqual([]);
      expect(o.title).toBeNull();
      expect(o.body).toBeNull();
    }
  });

  /** §18.2：象只准擷取已確認盤面，唔准喺呢步加入現實事件。 */
  it('象只講盤上有乜 —— 冇一個形容詞', () => {
    const x = NATAL.finance.interpretation.xiang;
    expect(x).toContain('破軍');
    expect(x).toContain('財帛');
    for (const w of ['傾向', '容易', '應該', '會', '順', '逆']) expect(x.includes(w), w).toBe(false);
  });

  /** §14：空 list 一定要有檢查說明 ——「未見反證」唔等於「已檢查過冇反證」。 */
  it('反證清單空都要寫檢查說明', () => {
    for (const res of Object.values(NATAL)) {
      const o = res.interpretation;
      expect(o.evidence_check_note).toContain('查唔到');
      expect(o.evidence_check_note.length).toBeGreaterThan(20);
    }
  });

  /** §17：每個結論帶住呢次禁止延伸嘅嘢 —— 由命中規則自己嘅 prohibited_inferences 收埋。 */
  it('禁止延伸由命中規則收埋，唔係人手寫一句', () => {
    const o = NATAL.finance.interpretation;
    expect(o.prohibited_inferences).toContain('收入、資產、現金流不可混同');
    expect(o.prohibited_inferences).toContain('不得作為買賣借貸依據');
  });

  it('高風險主題強制人工覆核', () => {
    expect(NATAL.load.interpretation.risk_flags).toContain('health');
    expect(NATAL.load.interpretation.review_status).toBe('needs_review');
    expect(NATAL.social.interpretation.risk_flags).toEqual([]);
    expect(NATAL.social.interpretation.review_status).toBe('draft');
  });
});

/* ══════════════════════════════════════════════
   而家真係寫到幾多
   ══════════════════════════════════════════════ */

describe('⚠ 呢副盤真係寫到幾多', () => {
  /**
   * C7 交嗰陣，`gradeCeiling()` 喺六個主題出「進／逆」。
   * 嗰個係**結構上限** —— 佢數群、數角色、數層，但唔問「呢啲群指緊邊個方向」。
   *
   * C8 補返嗰條問題之後，同一副盤得一個主題出到方向。
   * 差別全部喺一個地方：**基塊唔講方向**，而基塊係核心票嘅大部分來源。
   *
   * 呢條測試特登將個數字釘死，因為佢係成個 C 線最容易被人靜靜雞谷高嗰個數。
   */
  it('七個主題入面，得一個出到方向', () => {
    const rows = Object.entries(NATAL).map(
      ([t, v]) => `${t}=${v.interpretation.rating.final_grade}`,
    );
    // eslint-disable-next-line no-console
    console.log(`\n  ${rows.join('  ')}\n`);
    const graded = Object.values(NATAL).filter((v) => v.interpretation.rating.final_grade !== null);
    expect(graded).toHaveLength(2); // finance = +1，social = 0（平都係一個結論）
    expect(NATAL.finance.interpretation.rating.final_grade).toBe(1);
    expect(NATAL.social.interpretation.rating.final_grade).toBe(0);
  });

  it('finance 嗰一票由兩個格局嚟，唔係由基塊嚟', () => {
    const groups = new Set(
      NATAL.finance.interpretation.evidence.filter((e) => e.direction === 'support').map((e) => e.independence_group),
    );
    expect([...groups].sort()).toEqual(['geju.duijin-jiyu', 'geju.ling-tan']);
  });
});

/* ══════════════════════════════════════════════
   決定：甲 ＋ 局部乙（Issac，2026-09-14）
   ══════════════════════════════════════════════ */

describe('甲：觀察章係常態，所以佢要分得清係邊一種', () => {
  /**
   * 「照收大部分章冇方向」呢個決定，令 `grade: null` 由例外變成常態。
   * 而 schema 寫住 null 唔准有 title / body —— 只可以出 reader_note。
   *
   * 所以 C8b 第一個要解決嘅係「觀察章點寫」，而觀察章唔止一種。
   * 五種要寫成五個唔同嘅樣，所以要分得出，唔可以留喺散文度畀人自己認。
   */
  it('五種結論分得出，唔使讀 change_reason', () => {
    const kinds = Object.fromEntries(Object.entries(NATAL).map(([t, v]) => [t, v.trace.kind]));
    // eslint-disable-next-line no-console
    console.log(`\n  ${Object.entries(kinds).map(([t, k]) => `${t}=${k}`).join('  ')}\n`);
    expect(kinds).toEqual({
      self: 'conflicted',
      career: 'observation',
      finance: 'graded',
      relationship: 'observation',
      home: 'observation',
      social: 'flat',
      load: 'hard_gate',
    });
  });

  /**
   * ⚠ 一個讀者見到疾厄章冇方向，好自然會讀成「即係冇事」。
   * 但佢嘅意思係「呢個位我哋唔講」—— 兩句喺紙上面一樣，喺讀者心入面差好遠。
   *
   * `preGateGrade` 就係畀 C8b 分呢一刀：
   * 「本來都係 0」同「本來係 −2，我哋特登唔講」，寫出嚟唔可以一樣輕。
   */
  it('硬閘之前個評級留得住 —— 唔好將「唔講」寫到似「冇事」', () => {
    expect(NATAL.load.trace.kind).toBe('hard_gate');
    expect(NATAL.load.trace.preGateGrade).toBe(0); // 呢副盤本來都係平
    expect(NATAL.load.interpretation.rating.final_grade).toBeNull();
  });

  it('缺資料同「有訊號但唔夠票」係兩種，唔係同一種', () => {
    const miss = infer(RULE_REGISTRY, CTX_NATAL_ONLY, SCHOOL, SPEC_VERSION, {
      chartId: 'c1', topic: 'career', layer: 'annual',
    });
    expect(miss.trace.kind).toBe('missing');
    expect(NATAL.career.trace.kind).toBe('observation');
  });
});

describe('局部乙：基塊嘅方向要逐格掙返嚟', () => {
  /**
   * ⚠ 呢個數字而家係 0，而且應該一直睇得見。
   *
   * 佢同 `singleBookEntries()` 係同一種東西：一個唔會自己郁嘅計數器。
   * 佢會升，但只會喺 B5 攞到第二本書、而且某一格真係引得出一句
   * 講緊方向嘅 cell 級原文嗰陣先升。
   */
  it('而家零格基塊有方向', () => {
    expect(directionalBlocks(BASE_BLOCKS)).toHaveLength(0);
  });

  it('要有方向，cell 級來源同逐字引文缺一不可', () => {
    const good = BASE_BLOCKS.find((b) => b.id === 'base.紫微.命宮')!;
    const cell = good.sources.find((s) => s.scope === 'cell')!;
    const star = good.sources.find((s) => s.scope === 'star')!;

    // cell 級 + 詞庫有 + 方向夾 → 過
    expect(BaseBlock.safeParse({
      ...good, direction: { valence: 'support', xiang: '資源', source: cell },
    }).success).toBe(true);

    // star 級來源撐唔起呢一格嘅方向
    const byStar = BaseBlock.safeParse({
      ...good, direction: { valence: 'support', xiang: '資源', source: star },
    });
    expect(byStar.success).toBe(false);
    if (!byStar.success) expect(JSON.stringify(byStar.error.issues)).toContain('cell 級');

    // 順手開一個新方向詞 → 打返轉頭
    const newWord = BaseBlock.safeParse({
      ...good, direction: { valence: 'support', xiang: '大吉', source: cell },
    });
    expect(newWord.success).toBe(false);
    if (!newWord.success) expect(JSON.stringify(newWord.error.issues)).toContain('未喺 valence.json 分類過');

    // 詞庫話係順，但寫住阻 → 打返轉頭
    const mismatch = BaseBlock.safeParse({
      ...good, direction: { valence: 'pressure', xiang: '資源', source: cell },
    });
    expect(mismatch.success).toBe(false);

    // 引文作出嚟 → 打返轉頭（同其他來源同一道閘）
    const fake = BaseBlock.safeParse({
      ...good,
      direction: { valence: 'support', xiang: '資源', source: { ...cell, quote: '紫微坐命主大富大貴' } },
    });
    expect(fake.success).toBe(false);
  });

  /**
   * 方向落到規則度**冇特事特辦嘅路徑** —— 佢只係多一個象義詞。
   * 推理器唔識「基塊有方向」呢回事，佢只識查 `allowed_xiang`。
   */
  it('有方向嘅基塊派生出嚟嘅規則，方向由 ruleValence 查得返', () => {
    const b = BaseBlock.parse({
      ...BASE_BLOCKS.find((x) => x.id === 'base.七殺.官祿')!,
      direction: {
        valence: 'pressure',
        xiang: '牽制',
        source: BASE_BLOCKS.find((x) => x.id === 'base.七殺.官祿')!.sources.find((s) => s.scope === 'cell')!,
      },
    });
    const withDir = Rule.parse(blockToRule(b));
    expect(withDir.allowed_xiang).toContain('牽制');
    expect(ruleValence(withDir)).toBe('pressure');

    const without = Rule.parse(blockToRule(BASE_BLOCKS.find((x) => x.id === 'base.七殺.官祿')!));
    expect(ruleValence(without)).toBe('neutral');
  });
});
