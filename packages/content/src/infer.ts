/**
 * 推理器（工單 C8）
 *
 * 出處：docs/voice-spec.md §14、§15、§16、§17、§18、§19、§26
 *
 * ── 呢個檔案唔寫文案 ──
 *
 * §18 嘅十步入面，C8 只做一至五同九嘅一半：
 *
 *   1 驗證輸入 → 2 象 → 3 候選主題 → 4 去重同交叉驗證 → 5 勢（評級同置信度）
 *
 * 「事」「解」「文案」係 C8b 組裝器嘅工作，所以呢度出嚟嘅物件
 * `shi_scenarios` / `jie` / `title` / `body` 一律係空 ——
 * 唔係漏咗，係**分工**：推理器唔應該識寫字，寫字嗰個唔應該識改評級。
 *
 * ── 核心機制：候選係方向，證據相對候選分類 ──
 *
 * §17 要每行 evidence 有 `direction`，但 `toEvidence()` 特登唔判方向，
 * 因為「化忌落官祿」對「職涯有阻力」係支持，對「職涯順遂」係反證 ——
 * 同一個盤象喺唔同候選度角色唔同。
 *
 * 所以推理器對每個主題起**兩個候選**（順向、阻力向），
 * 逐條命中規則按 `ruleValence()` 分做支持／反證／緩和／未定，
 * 然後兩邊各自過一次 §16 門檻階梯。結果只有四種：
 *
 *   一邊過、一邊唔過       → 出嗰邊嘅方向
 *   兩邊都過               → 交錯，`grade: null`（§16 衝突降級第三條）
 *   兩邊都唔過、亦冇方向證據 → 平（§16.5，而且要輸入完整）
 *   兩邊都唔過、但有方向證據 → 保留觀察，`grade: null`（§16.6）
 *
 * ⚠ 最後嗰兩行嘅分別好易做錯。§16.5 寫「平」係
 * 「輸入完整，**完成支持及阻力盤點**，無突出方向」；
 * §14 寫「一個化忌可列入**觀察清單**，不足以判慎或逆」。
 * 所以有方向證據但唔夠票 ≠ 平 —— 嗰個係觀察，要出 null。
 * 用「平」去食咗一個未夠票嘅訊號，就係規範明文禁止嘅「用平填未知」。
 */
import type { AnnualChart, Chart } from '@guanwei/ziwei';
import { Interpretation } from './schema';
import type { EvalContext, Layer } from './condition';
import {
  gradeCeiling,
  layerOf,
  runRegistry,
  type Rule,
  type RuleOutcome,
  type RuleRegistry,
  type Topic,
} from './rule';
import { ruleValence, type Direction } from './valence';

export type Matched = Extract<RuleOutcome, { status: 'matched' }>;

export type InferOptions = {
  chartId: string;
  topic: Topic;
  /** 呢個結論講緊邊一層。natal = 本命篇章。 */
  layer: Layer;
  /** 讀者自述（§11）。可以限制適用場景，唔可以倒改命盤。 */
  userContextRefs?: string[];
  claimId?: string;
};

/**
 * 高風險宮 → risk flag。
 *
 * §19 硬閘：健康／死亡唔准出盤面風險分。`lintInterpretation()` 亦都守住呢條
 * （`GATE-HEALTH`），所以呢度同 lint 用同一個判準 —— 兩邊對唔上就等於有一邊冇用。
 */
const PALACE_RISK: Record<string, string> = {
  疾厄: 'health',
  子女: 'fertility',
  夫妻: 'third_party',
  父母: 'third_party',
  財帛: 'financial',
};

/* ──────────────────────────────────────────────
   候選
   ────────────────────────────────────────────── */

export type Candidate = {
  direction: Direction;
  /** 純同向嘅去重群。內部有反向成員嗰啲唔計（見下面 `conflictedGroups`）。 */
  outcomes: Matched[];
  ceiling: ReturnType<typeof gradeCeiling>;
};

/**
 * 將命中嘅規則按方向分堆。
 *
 * ⚠ **一個去重群入面同時有兩個方向，就兩邊都唔計。**
 *
 * 例：`sanfang.夫妻` 呢一群包住 `-pressure` 同 `-support` 兩條規則。
 * 兩條都中，即係夫妻宮嘅三方四正又見三煞又見三吉 —— 呢個結構係真係兩邊都有，
 * 唔係「其中一邊贏」。§15 講每群「只以最高有效角色參與門檻」，
 * 而一個講唔出方向嘅群，對任何一個候選都唔係同向票。
 *
 * 呢個係 C7 三方四正共用一群嗰個決定嘅直接後果：
 * 共用一群令佢哋唔可以互相加票，亦都令佢哋唔可以互相抵銷成一個假方向。
 */
function splitByDirection(matched: Matched[]): {
  support: Matched[];
  pressure: Matched[];
  neutral: Matched[];
  conflictedGroups: string[];
} {
  const dirOfGroup = new Map<string, Set<Direction>>();
  for (const o of matched) {
    const v = ruleValence(o.rule);
    if (v === 'support' || v === 'pressure') {
      const s = dirOfGroup.get(o.rule.independence_group) ?? new Set<Direction>();
      s.add(v);
      dirOfGroup.set(o.rule.independence_group, s);
    }
  }
  const conflicted = new Set(
    [...dirOfGroup.entries()].filter(([, s]) => s.size > 1).map(([g]) => g),
  );

  const support: Matched[] = [];
  const pressure: Matched[] = [];
  const neutral: Matched[] = [];
  for (const o of matched) {
    const v = ruleValence(o.rule);
    if (v === 'neutral' || v === 'mixed' || conflicted.has(o.rule.independence_group)) neutral.push(o);
    else if (v === 'support') support.push(o);
    else pressure.push(o);
  }
  return { support, pressure, neutral, conflictedGroups: [...conflicted].sort() };
}

/* ──────────────────────────────────────────────
   象：只講盤上有乜
   ────────────────────────────────────────────── */

/**
 * §18 第二步。**只擷取已確認盤面**，唔准喺呢步加入現實事件。
 *
 * 所以呢句完全由 binding 砌出嚟 —— 星、宮、化、層，冇一個形容詞。
 */
export function xiangOf(matched: Matched[]): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const o of matched) {
    for (const b of o.bindings) {
      if (seen.has(b.note)) continue;
      seen.add(b.note);
      parts.push(b.note);
    }
  }
  return parts.length ? parts.join('；') + '。' : '呢個主題喺盤上冇任何已審核規則命中。';
}

/* ──────────────────────────────────────────────
   推理
   ────────────────────────────────────────────── */

type Ev = Interpretation['evidence'][number];

function evidenceOf(o: Matched, direction: Ev['direction'], chartId: string): Ev[] {
  return o.bindings.map((b, i) => ({
    id: `${o.rule.rule_id}#${i}`,
    source_ref: `chart://${chartId}/${b.layer}/${b.branch ?? 'unknown'}`,
    layer: b.layer,
    palace: b.palace,
    star: b.star,
    transformation: b.hua,
    rule_id: o.rule.rule_id,
    direction,
    role: o.rule.role,
    independence_group: o.rule.independence_group,
  }));
}

function coreGroupsOf(outcomes: Matched[]): Set<string> {
  return new Set(outcomes.filter((o) => o.rule.role === 'core').map((o) => o.rule.independence_group));
}

/**
 * 一個結論係邊一種。
 *
 * ── 點解要有呢個 ──
 *
 * 決定（Issac，2026-09-14）：**甲 ＋ 局部乙** —— 照收「大部分章冇方向」。
 * 咁樣即係話 `grade: null` 由例外變成**常態**，而 schema 寫住
 * null 唔准有 title / body，只可以出 reader_note。
 *
 * 所以 C8b 第一個要解決嘅唔係「有方向嗰章點寫」，係「**觀察章點寫**」。
 * 而觀察章唔止一種 —— 下面五種要寫成五個唔同嘅樣：
 *
 *   flat         盤點完成，真係冇方向          →「呢一格靜」
 *   conflicted   兩邊都有，講唔埋一個方向      →「呢一格兩頭都有，唔埋到一個講法」
 *   observation  有訊號但唔夠票                →「見到一樣嘢，未夠講」
 *   missing      嗰一層根本冇資料              →「呢一層冇嘢查得到」
 *   hard_gate    §19 —— 有幾多證據都唔講        →「呢一章唔出方向，唔係因為證據」
 *
 * ⚠ 最後嗰種最緊要分得清楚。一個讀者見到疾厄章冇方向，
 * 好自然會讀成「即係冇事」。但佢嘅意思係「呢個位我哋唔講」——
 * 兩句喺紙上面一樣，喺讀者心入面差好遠。
 * 所以呢個唔可以留喺 `change_reason` 嗰段散文度畀 C8b 自己認。
 */
export type ClaimKind = 'graded' | 'flat' | 'conflicted' | 'observation' | 'missing' | 'hard_gate';

export type InferResult = {
  interpretation: Interpretation;
  /** 診斷用 —— 唔係 §17 欄位，唔會入命書。 */
  trace: {
    support: Candidate;
    pressure: Candidate;
    neutralRules: string[];
    conflictedGroups: string[];
    decision: string;
    /** C8b 靠呢個揀章嘅樣，唔係靠讀 `change_reason`。 */
    kind: ClaimKind;
    /**
     * §19 硬閘之前個評級。
     *
     * 疾厄章嘅 `kind` 係 `hard_gate`，但 `preGateGrade` 話你知
     * 「就算冇硬閘，嗰度本來都係 0」定係「本來係 −2，我哋特登唔講」。
     * 兩句寫出嚟嘅觀察章唔同 —— 後者唔可以寫到好似前者咁輕。
     */
    preGateGrade: Interpretation['rating']['final_grade'];
  };
};

/**
 * 由命盤推出一個主題、一個時間層嘅結論物件。
 *
 * **純函數。** 同一個 (registry, ctx, opts) 跑兩次，出嚟嘅物件逐個欄位一樣 ——
 * 工單 C8 嘅驗收標準之一，亦都係命書可以重印嘅前提。
 */
export function infer(
  reg: RuleRegistry,
  ctx: EvalContext,
  schoolProfileId: string,
  specVersion: string,
  opts: InferOptions,
): InferResult {
  const { chartId, topic, layer } = opts;
  const all = runRegistry(reg, ctx, schoolProfileId);

  /* ── 一、驗證輸入（§18.1）────────────────────────────── */
  const missing: string[] = [];
  if (layer === 'annual' && !ctx.annual) missing.push('流年層');
  if ((layer === 'annual' || layer === 'decade') && !ctx.annual?.decadal) missing.push('大限層（未起運或者冇流年資料）');
  const inputComplete = missing.length === 0;

  /* ── 二、象（§18.2）─────────────────────────────────── */
  /*
   * §13：「本命閱讀以本命為核心；大限閱讀需要本命＋大限；年度閱讀需要本命＋大限＋流年。」
   *
   * 所以一個**本命**結論唔可以攞流年證據嚟湊票 —— 唔係「用少啲」，係一條都唔准用。
   * 呢個篩要喺最前面做，唔可以留到評級先扣返 ——
   * 一條流年規則入咗 evidence[]，讀者就會喺本命章見到一個唔屬於嗰一章嘅理由。
   */
  const ALLOWED_LAYERS: Record<Layer, Layer[]> = {
    natal: ['natal'],
    decade: ['natal', 'decade'],
    annual: ['natal', 'decade', 'annual'],
  };
  const allowed = ALLOWED_LAYERS[layer];
  const forTopic = all.filter(
    (o): o is Matched =>
      o.status === 'matched' &&
      o.rule.role !== 'none' &&
      o.rule.topics.includes(topic) &&
      allowed.includes(layerOf(o.rule)),
  );
  const xiang = xiangOf(forTopic);

  /* ── 三、候選（§18.3）───────────────────────────────── */
  const split = splitByDirection(forTopic);
  const natalChapter = layer === 'natal';
  const support: Candidate = {
    direction: 'support',
    outcomes: split.support,
    ceiling: gradeCeiling(split.support, topic, { natalChapter }),
  };
  const pressure: Candidate = {
    direction: 'pressure',
    outcomes: split.pressure,
    ceiling: gradeCeiling(split.pressure, topic, { natalChapter }),
  };

  /* ── 四、去重同交叉驗證（§18.4）──────────────────────── */
  const ran = (prefix: string) =>
    all.filter((o) => o.rule.rule_id.startsWith(prefix) && (o.status === 'matched' || o.status === 'unmatched'));
  const sanfangRan = ran('sanfang.').filter((o) => o.rule.topics.includes(topic));
  const sihuaRan = ran('sihua.').filter((o) => o.rule.topics.includes(topic));

  const cross: Interpretation['cross_checks'] = {
    natal: { status: 'passed', reason: `本命層規則全部行過（${all.filter((o) => layerOf(o.rule) === 'natal').length} 條）` },
    decade:
      layer === 'natal'
        ? { status: 'not_applicable', reason: '本命篇章 —— §16 門檻四明寫本命唔使假借其他層湊證據' }
        : ctx.annual?.decadal
          ? { status: 'passed', reason: '大限層有資料，規則行過' }
          : { status: 'failed', reason: '未起運，冇大限層 —— 唔准就近拉一個大限' },
    annual:
      layer === 'annual'
        ? ctx.annual
          ? { status: 'passed', reason: '流年層有資料，規則行過' }
          : { status: 'failed', reason: '冇流年資料' }
        : { status: 'not_applicable', reason: `呢個結論係 ${layer} 層` },
    san_fang_si_zheng:
      sanfangRan.length > 0
        ? { status: 'passed', reason: `本主題嘅三方四正規則行過 ${sanfangRan.length} 條` }
        : { status: 'failed', reason: '本主題冇三方四正規則行得到 —— 結構驗證未完成' },
    transformations:
      sihuaRan.length > 0
        ? { status: 'passed', reason: `本主題嘅四化規則行過 ${sihuaRan.length} 條` }
        : { status: 'failed', reason: '本主題冇四化規則行得到' },
    /*
     * ⚠ 限流疊宮：引擎做得到（B15 三層宮名並排），但**規則庫仲未有一條疊宮規則**。
     * 所以呢度唔可以寫 not_applicable —— 「唔適用」同「我哋未寫」係兩件事，
     * 而寫成前者就會令一個真缺口喺報告入面消失。
     */
    overlap:
      layer === 'natal'
        ? { status: 'not_applicable', reason: '本命篇章唔涉及限流疊宮' }
        : { status: 'failed', reason: '規則庫未有限流疊宮規則 —— 呢個係缺口，唔係唔適用' },
  };

  /* ── 五、勢：評級（§16）──────────────────────────────── */
  const supCore = coreGroupsOf(split.support);
  const preCore = coreGroupsOf(split.pressure);
  const reasons: string[] = [];
  const gates: string[] = [];
  let grade: Interpretation['rating']['final_grade'] = null;
  let status: Interpretation['rating']['status'] = 'undetermined';
  let decision = '';

  const supOk = support.ceiling.ceiling >= 1;
  const preOk = pressure.ceiling.ceiling >= 1;

  if (!inputComplete) {
    decision = `缺輸入：${missing.join('、')}`;
    reasons.push(`${decision} —— 缺資料出 null，唔准出「平」（§16.5）`);
  } else if (supOk && preOk) {
    // §16 衝突降級第三條：兩邊都足以主導 → 交錯
    status = 'conflicted';
    decision = '兩個方向都過到門檻 —— 交錯';
    reasons.push('核心支持同阻力都足以主導，冇既定規則解決得到 → 交錯（§16 衝突降級）');
  } else if (!supOk && !preOk) {
    const anyDirectional = split.support.length + split.pressure.length > 0;
    if (anyDirectional || split.conflictedGroups.length > 0) {
      decision = '有方向證據但唔夠票 —— 保留觀察';
      reasons.push(
        `順向 ${support.ceiling.groups} 群、阻力向 ${pressure.ceiling.groups} 群，兩邊都過唔到門檻一 —— ` +
          '呢個係觀察清單，唔係「平」（§14、§16.6）',
      );
    } else if (layer !== 'natal' && !forTopic.some((o) => layerOf(o.rule) === layer)) {
      /*
       * 「2026 年社交無突出方向」如果全部證據都係本命層，
       * 佢講緊嘅其實係呢個人一世人 —— 但讀者會當佢係 2026 年。
       * 一個冇嗰一層證據嘅「平」，同一個冇嗰一層證據嘅「順」，一樣係越權。
       */
      decision = `冇 ${layer} 層證據 —— 寫唔到呢一層嘅「平」`;
      reasons.push(`本主題喺 ${layer} 層一條規則都冇命中 —— 唔准用本命層證據去講呢一層無突出方向（§16.1）`);
    } else {
      // §16.5：輸入完整、盤點完成、一個方向證據都冇 → 平
      grade = 0;
      status = 'resolved';
      decision = '盤點完成，零方向證據 —— 平';
      reasons.push('輸入完整，支持同阻力都盤點過，一個講得出方向嘅群都冇 → 平（§16.5）');
      gates.push('§16.5 平：輸入完整 + 盤點完成');
    }
  } else {
    const win = supOk ? support : pressure;
    const lose = supOk ? pressure : support;
    const loseCore = supOk ? preCore : supCore;
    let mag: number = win.ceiling.ceiling;
    reasons.push(...win.ceiling.reasons);
    gates.push(`§16 結構上限 ±${mag}`);

    // §16 衝突降級第二條：有有效核心反向群 → 至少收窄一級
    if (loseCore.size > 0) {
      mag -= 1;
      reasons.push(`有 ${loseCore.size} 個核心反向群（${[...loseCore].sort().join('、')}）—— 收窄一級（§16 衝突降級）`);
    } else if (lose.outcomes.length > 0) {
      reasons.push(`反向有 ${lose.outcomes.length} 條修正層證據，保留為條件，唔機械降級（§16 衝突降級第一條）`);
    }

    /*
     * §16.1：「年度結論必須有流年群，並有本命或大限的相關支持。」
     *
     * 呢條唔係加分項，係前提。一個「2026 年職涯」結論，
     * 如果全部證據都係本命層，佢講緊嘅其實係呢個人一世人，唔係 2026 年 ——
     * 而讀者會當佢係 2026 年。所以冇嗰一層嘅群就唔准出。
     */
    const winLayers = new Set(win.outcomes.map((o) => layerOf(o.rule)));
    if (layer !== 'natal' && !winLayers.has(layer)) {
      mag = 0;
      reasons.push(
        `順向證據全部喺 ${[...winLayers].join('／') || '冇'} 層，冇一個 ${layer} 層嘅群 —— ` +
          `${layer === 'annual' ? '年度' : '大限'}結論唔准淨係靠本命撐（§16.1）`,
      );
    }

    // 年度結論冇疊宮驗證 → 封頂 ±1（§16.2 要求結構驗證）
    if (layer !== 'natal' && cross.overlap.status === 'failed' && mag > 1) {
      mag = 1;
      reasons.push('限流疊宮規則未有 —— 非本命層結論封頂 ±1（§16.2 結構驗證未完成）');
    }

    if (mag <= 0) {
      const byLayer = layer !== 'natal' && !new Set(win.outcomes.map((o) => layerOf(o.rule))).has(layer);
      status = byLayer ? 'undetermined' : 'conflicted';
      decision = byLayer ? `冇 ${layer} 層嘅同向群 —— 出唔到呢一層嘅結論` : '被核心反向群收窄到零 —— 交錯，唔係平';
      if (!byLayer) reasons.push('降到零唔自動等於「平」；只係衝突造成嘅話仍然係交錯（§16）');
    } else {
      grade = (win.direction === 'support' ? mag : -mag) as Interpretation['rating']['final_grade'];
      status = 'resolved';
      decision = `${win.direction === 'support' ? '順' : '阻力'}向成立，級數 ${mag}`;
    }
  }

  /* ── 五之二、§19 硬閘：喺呢一步先執行一次（§18.5）────── */
  const boundPalaces = [...new Set(forTopic.flatMap((o) => o.bindings.map((b) => b.palace)).filter(Boolean))] as string[];
  const riskFlags = [...new Set(boundPalaces.map((p) => PALACE_RISK[p]).filter(Boolean))].sort() as string[];
  const preGateGrade = grade;
  let hardGated = false;
  if ((riskFlags.includes('health') || riskFlags.includes('death')) && grade !== null) {
    hardGated = true;
    reasons.push('⛔ 健康／死亡主題唔准出盤面方向評級 —— grade 強制 null（§19、§4）');
    decision += '；但撞到 §19 健康硬閘';
    grade = null;
    status = 'undetermined';
  }

  /* ── 置信度（§17）────────────────────────────────────── */
  const applicableChecks = Object.values(cross).filter((c) => c.status !== 'not_applicable');
  const allPassed = applicableChecks.every((c) => c.status === 'passed');
  const hasConflict = split.conflictedGroups.length > 0 || (supCore.size > 0 && preCore.size > 0);
  let confidence: Interpretation['interpretation_confidence'];
  let confidenceReason: string;
  if (!inputComplete) {
    confidence = 'undetermined';
    confidenceReason = `關鍵資料缺失：${missing.join('、')}`;
  } else if (grade === null) {
    confidence = 'low';
    confidenceReason = status === 'conflicted' ? '支持同阻力形成唔到單一方向' : '過唔到發布門檻，只作觀察';
  } else if (allPassed && !hasConflict && Math.abs(grade) >= 2) {
    confidence = 'high';
    confidenceReason = '輸入完整、規則追溯得返、適用嘅交叉查閱全部 passed、冇未解決核心衝突';
  } else {
    confidence = 'medium';
    confidenceReason = hasConflict
      ? '有未解決嘅方向衝突，上限進／逆（§17）'
      : allPassed
        ? '門檻只過到一級，未夠 high 嘅跨層一致度'
        : `交叉查閱有 ${applicableChecks.filter((c) => c.status !== 'passed').length} 項唔係 passed`;
  }

  /* ── 砌 evidence（§17）───────────────────────────────── */
  const winDir: Direction | null = grade === null || grade === 0 ? null : grade > 0 ? 'support' : 'pressure';
  const evidence: Ev[] = [];
  for (const o of forTopic) {
    const v = ruleValence(o.rule);
    const conflicted = split.conflictedGroups.includes(o.rule.independence_group);
    let dir: Ev['direction'];
    if (conflicted || v === 'neutral' || v === 'mixed' || winDir === null) {
      dir = 'unresolved';
    } else if (v === winDir) {
      dir = 'support';
    } else {
      dir = o.rule.role === 'modifier' ? 'mitigating' : 'counter';
    }
    evidence.push(...evidenceOf(o, dir, chartId));
  }

  const checked = all.filter((o) => o.status === 'unmatched').length;
  const naCount = all.filter((o) => o.status === 'not_applicable').length;

  const prohibited = [...new Set(forTopic.flatMap((o) => o.rule.prohibited_inferences))].sort();
  const unknowns: string[] = [];
  if (layer !== 'natal') unknowns.push('限流疊宮：規則庫未有規則');
  if (naCount > 0) unknowns.push(`${naCount} 條規則因為輸入唔齊而查唔到 —— 查唔到唔等於冇`);
  if (split.conflictedGroups.length > 0) unknowns.push(`方向互相抵銷嘅群：${split.conflictedGroups.join('、')}`);
  const pendingGeju = reg.rules.filter((r: Rule) => r.review_status !== 'approved').length;
  if (pendingGeju > 0) unknowns.push(`${pendingGeju} 條未審核規則冇參與 —— 佢哋連行都冇行`);

  const obj = {
    claim_id: opts.claimId ?? `${chartId}:${topic}:${layer}`,
    chart_id: chartId,
    spec_version: specVersion,
    school_profile_id: schoolProfileId,
    rule_registry_version: reg.ref,
    topic,
    time_scope: {
      layer,
      year: layer === 'annual' ? (ctx.annual?.lunarYear ?? null) : null,
      start: null,
      end: null,
      year_boundary: 'lunar-new-year',
    },
    input_quality: inputComplete ? ('complete' as const) : ('incomplete' as const),
    missing_inputs: missing,
    evidence,
    supporting_ids: evidence.filter((e) => e.direction === 'support').map((e) => e.id),
    counter_ids: evidence.filter((e) => e.direction === 'counter').map((e) => e.id),
    mitigating_ids: evidence.filter((e) => e.direction === 'mitigating').map((e) => e.id),
    evidence_check_note:
      `掃過規則庫 ${reg.approved.length} 條已審核規則，本主題命中 ${forTopic.length} 條；` +
      `${checked} 條行過但唔中，${naCount} 條因為輸入唔齊查唔到。` +
      '「查唔到」唔等於「查過，冇」（§14）。',
    cross_checks: cross,
    rating: {
      candidate_grade: grade,
      final_grade: grade,
      status,
      change_reason: reasons.join('｜') || '冇需要升降級',
      passed_gates: gates,
    },
    interpretation_confidence: confidence,
    confidence_reason: confidenceReason,
    xiang,
    shi_trend: null,
    /* 事、解、文案係 C8b 嘅工作 —— 推理器唔識寫字，寫字嗰個唔准改評級。 */
    shi_scenarios: [],
    jie: [],
    user_context_refs: opts.userContextRefs ?? [],
    unknowns,
    risk_flags: riskFlags,
    prohibited_inferences: prohibited,
    title: null,
    body: null,
    reader_note: null,
    review_status: (riskFlags.length > 0 || (grade !== null && Math.abs(grade) === 3)
      ? 'needs_review'
      : 'draft') as Interpretation['review_status'],
    review_reasons:
      riskFlags.length > 0
        ? [`高風險主題（${riskFlags.join('、')}）必須人工覆核（§19）`]
        : grade !== null && Math.abs(grade) === 3
          ? ['盛／險必須人工覆核（§16.3）']
          : [],
  };

  const kind: ClaimKind = hardGated
    ? 'hard_gate'
    : grade !== null
      ? grade === 0
        ? 'flat'
        : 'graded'
      : !inputComplete || (layer !== 'natal' && !forTopic.some((o) => layerOf(o.rule) === layer))
        ? 'missing'
        : status === 'conflicted'
          ? 'conflicted'
          : 'observation';

  return {
    interpretation: Interpretation.parse(obj),
    trace: {
      support,
      pressure,
      neutralRules: split.neutral.map((o) => o.rule.rule_id).sort(),
      conflictedGroups: split.conflictedGroups,
      decision,
      kind,
      preGateGrade,
    },
  };
}

/** 一副盤、一個時間層，七個主題一次過。 */
export function inferAll(
  reg: RuleRegistry,
  ctx: { chart: Chart; annual?: AnnualChart },
  schoolProfileId: string,
  specVersion: string,
  base: Omit<InferOptions, 'topic'>,
): Record<Topic, InferResult> {
  const topics: Topic[] = ['self', 'career', 'finance', 'relationship', 'home', 'social', 'load'];
  const out = {} as Record<Topic, InferResult>;
  for (const topic of topics) out[topic] = infer(reg, ctx, schoolProfileId, specVersion, { ...base, topic });
  return out;
}
