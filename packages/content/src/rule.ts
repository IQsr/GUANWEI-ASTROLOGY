/**
 * 規則庫（工單 C2）
 *
 * 出處：docs/voice-spec.md §10（規則庫必要欄位）、§12（主題映射）、
 *       §13（角色權重）、§14（單一訊號禁則）、§15（去重群）
 *
 * 規範最後嗰句係成個檔案嘅理由：
 *
 * > 缺少已審核規則時，不得即席創作星曜含義。
 *
 * 呢句寫落 prompt 度係冇用嘅 —— 一個生成模型永遠有嘢好講。
 * 所以呢度將佢做成**機制**：evidence 只可以由 `approved` 規則產生，
 * 而規則庫係一舊帶版本、pin 得住嘅資料。冇規則 = 冇 evidence = 冇評級。
 *
 * ── 三道閘 ──
 *
 *   流派閘   規則聲明適用流派；同 school_profile_id 唔夾就唔准用
 *   審核閘   draft / needs_review / rejected 一律唔出 evidence
 *   輸入閘   所需輸入唔齊 → not_applicable，**唔係 unmatched**
 *
 * 第三道最易做錯。「冇流年資料所以查唔到」同「查過，冇」係兩件事，
 * 混埋一齊就會由缺資料推出「冇反證」（§14 明文禁止）。
 */
import { z } from 'zod';
import type { Condition, EvalContext, Layer } from './condition';
import { evaluate } from './condition';

/**
 * rule_id 格式：`<家族>.<分支>.<細目>`，最少三段。
 *
 *   sihua.ji.scope          四化「忌」嘅容許象義範圍
 *   brightness.low.modifier 落陷作為修正
 *   geju.sha-po-lang.core   殺破狼格局
 *   base.紫微.命宮           由 C4／C5 基塊派生嘅星宮規則
 *
 * 三段唔係裝飾：第一段決定去重群嘅預設前綴（§15），
 * 亦都令「呢條結論用咗邊幾類規則」一眼睇得出。
 *
 * 第一段一定係英文小寫（家族名），後面幾段容許中文 ——
 * 因為星曜同宮位嘅名本身就係中文，硬譯成拼音只會令規則難對。
 * L0 詞條同語料庫嘅 id 一樣係咁（star.紫微、palace.命宮）。
 */
export const RULE_ID = /^[a-z][a-z0-9]*(\.[a-z0-9\u3400-\u9fff][a-z0-9\u3400-\u9fff-]*){2,}$/;

export const ReviewStatus = z.enum(['draft', 'needs_review', 'approved', 'rejected']);

/** 角色，唔係分數。禁止相加（§13）。 */
export const Role = z.enum(['core', 'structural', 'modifier', 'link', 'none']);

/** 所需輸入。唔齊就 not_applicable。 */
export const RequiredInput = z.enum(['natal', 'decade', 'annual', 'brightness', 'user_context']);

/** §12 七個主題。宮名唔等於事件 —— 所以主題同宮位係兩樣嘢。 */
export const Topic = z.enum([
  'self',        // 自我與行為
  'career',      // 職涯與成果
  'finance',     // 財務與資源
  'relationship',// 關係與承諾
  'home',        // 居住與家庭安排
  'social',      // 合作與社群
  'load',        // 生活負荷
]);
export type Topic = z.infer<typeof Topic>;

const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(ConditionSchema).min(1) }),
    z.object({ any: z.array(ConditionSchema).min(1) }),
    z.object({ not: ConditionSchema }),
    z.looseObject({ star: z.string(), in: z.object({ name: z.string(), layer: z.string().optional() }) }),
    z.looseObject({ star: z.string(), brightness: z.array(z.string()).min(1) }),
    z.looseObject({ brightnessIn: z.object({ name: z.string(), layer: z.string().optional() }), levels: z.array(z.string()).min(1) }),
    z.looseObject({ star: z.string(), hua: z.string() }),
    z.looseObject({ hua: z.string(), in: z.object({ name: z.string(), layer: z.string().optional() }) }),
    z.looseObject({ empty: z.object({ name: z.string(), layer: z.string().optional() }) }),
    z.looseObject({ shenIn: z.object({ name: z.string(), layer: z.string().optional() }) }),
    z.looseObject({ sanfangOf: z.object({ name: z.string(), layer: z.string().optional() }) }),
    z.looseObject({ together: z.array(z.string()).min(2) }),
    z.looseObject({ opposite: z.tuple([z.string(), z.string()]) }),
    z.looseObject({ star: z.string(), between: z.tuple([z.string(), z.string()]) }),
  ]) as unknown as z.ZodType<Condition>,
);

export const Rule = z
  .object({
    rule_id: z.string().regex(RULE_ID, 'rule_id 要係 family.branch.detail 呢種形式，最少三段'),
    version: z.string().min(1),
    /** 適用流派。唔准寫 latest，唔准留空 —— 冇流派嘅規則係冇意思嘅（§10）。 */
    schools: z.array(z.string().min(1)).min(1),
    requires: z.array(RequiredInput).min(1),
    role: Role,
    /**
     * 去重群嘅 key（§15）。同一機制衍生嘅規則要用同一個 group，
     * 咁「同一個化忌講三次」先唔會變成三票。
     */
    independence_group: z.string().min(1),

    trigger: ConditionSchema,
    /** 排除條件。中咗就當冇中 —— 用嚟寫「除非…」。 */
    exclude: ConditionSchema.nullable(),

    /**
     * 容許象義：呢條規則准講嘅詞義範圍。
     * §14：「這些是詞義範圍，不是自動吉凶對照。」
     */
    allowed_xiang: z.array(z.string().min(1)).min(1),
    /** 禁止延伸。寫得越具體越有用 —— 「夫妻宮有忌不等於離婚」。 */
    prohibited_inferences: z.array(z.string().min(1)),
    topics: z.array(Topic).min(1),
    depends_on: z.array(z.string()),

    review_status: ReviewStatus,
    review_reasons: z.array(z.string()),
    sources: z.array(z.object({ book: z.string().min(1), ref: z.string().min(1) })),
    note: z.string().optional(),
  })
  .superRefine((r, ctx) => {
    if (r.schools.includes('latest')) {
      ctx.addIssue({ code: 'custom', message: '適用流派唔准用 latest（§10）' });
    }
    /*
     * 來源門檻分兩級，因為「規則講緊乜」有兩種：
     *
     *   純結構（role: structural）—— 三方四正、空宮，係幾何。
     *     一個來源就夠，但唔准零 —— 要指得出個算法寫喺邊。
     *
     *   講象義（role: core / modifier）—— 「呢個盤象容許講邊啲詞」。
     *     兩個來源，同內容系統 §8 對基塊嘅要求一樣。
     *     兩個講法唔同就唔准自己調和 —— 標 disputed 或者唔好 approve。
     */
    if (r.review_status === 'approved') {
      if (r.sources.length < 1) {
        ctx.addIssue({
          code: 'custom',
          message: `${r.rule_id}：approved 規則一定要有來源。冇來源嘅規則唔准出 evidence`,
        });
      } else if ((r.role === 'core' || r.role === 'modifier') && r.sources.length < 2) {
        ctx.addIssue({
          code: 'custom',
          message: `${r.rule_id}：講象義嘅 approved 規則要至少兩個來源（內容系統 §8）`,
        });
      }
    }
    if (r.role === 'none' && r.review_status === 'approved') {
      ctx.addIssue({ code: 'custom', message: 'role: none 即係冇推理資格，唔應該 approved' });
    }
  });

export type Rule = z.infer<typeof Rule>;

/* ──────────────────────────────────────────────
   規則庫
   ────────────────────────────────────────────── */

/**
 * 同 school-profile.ts 一樣嘅純 JS 變更偵測器。
 * **唔係密碼學 checksum** —— 佢嘅工作係「有嘢改咗一定會變」。
 */
function fingerprint(s: string): string {
  const pass = (offset: number): string => {
    let h = offset >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  };
  return pass(0x811c9dc5) + pass(0x9e3779b9);
}

function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object).sort().map((k) => `${k}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

export type RuleRegistry = {
  id: string;
  /** 完整版本：`<id>@<fingerprint>`。填落 interpretation object 嗰個。 */
  ref: string;
  fingerprint: string;
  rules: Rule[];
  /** 只有呢批出得到 evidence。 */
  approved: Rule[];
};

export function buildRegistry(id: string, rules: unknown[]): RuleRegistry {
  const parsed = rules.map((r) => Rule.parse(r));
  const seen = new Set<string>();
  for (const r of parsed) {
    if (seen.has(r.rule_id)) throw new Error(`規則 ID 重複：${r.rule_id}`);
    seen.add(r.rule_id);
  }
  for (const r of parsed) {
    for (const d of r.depends_on) {
      if (!seen.has(d)) throw new Error(`${r.rule_id} 依賴唔存在嘅規則 ${d}`);
    }
  }
  const fp = fingerprint(canonical({ id, rules: parsed }));
  return {
    id,
    ref: `${id}@${fp}`,
    fingerprint: fp,
    rules: parsed,
    approved: parsed.filter((r) => r.review_status === 'approved'),
  };
}

/* ──────────────────────────────────────────────
   行規則
   ────────────────────────────────────────────── */

export type RuleOutcome =
  | { status: 'matched'; rule: Rule; bindings: import('./condition').Binding[] }
  | { status: 'unmatched'; rule: Rule }
  | { status: 'excluded'; rule: Rule; reason: string }
  | { status: 'not_applicable'; rule: Rule; reason: string }
  /** 唔准用：流派唔夾，或者未審核。 */
  | { status: 'blocked'; rule: Rule; reason: string };

const LAYER_OF: Record<string, Layer> = { natal: 'natal', decade: 'decade', annual: 'annual' };

/** 所需輸入齊唔齊。 */
function missingInput(rule: Rule, ctx: EvalContext): string | null {
  for (const need of rule.requires) {
    if (need === 'annual' && !ctx.annual) return '冇流年資料';
    if (need === 'decade' && !ctx.annual?.decadal) return '冇大限層（未起運或者冇流年資料）';
    if (need === 'user_context') return '呢條規則要讀者自述，而自述唔可以倒改命盤（§11）';
    if (need === 'brightness') {
      const any = ctx.chart.palaces.some((p) => p.stars.some((s) => s.brightness));
      if (!any) return '盤上冇廟旺資料';
    }
    if (LAYER_OF[need] === 'natal' && ctx.chart.palaces.length !== 12) return '本命盤唔完整';
  }
  return null;
}

/**
 * 行一條規則。
 *
 * 次序好緊要：**先閘後行**。一條唔准用嘅規則，連行都唔應該行 ——
 * 因為行完就會有 binding，而有 binding 就好容易畀人攞去當證據。
 */
export function runRule(rule: Rule, ctx: EvalContext, schoolProfileId: string): RuleOutcome {
  const school = schoolProfileId.split('@')[0]!;
  if (!rule.schools.includes(school) && !rule.schools.includes(schoolProfileId)) {
    return { status: 'blocked', rule, reason: `規則適用於 ${rule.schools.join('／')}，而家嘅流派係 ${school}` };
  }
  if (rule.review_status !== 'approved') {
    return { status: 'blocked', rule, reason: `審核狀態 ${rule.review_status} —— 未審核嘅規則唔准出 evidence（§10）` };
  }
  const missing = missingInput(rule, ctx);
  if (missing) return { status: 'not_applicable', rule, reason: missing };

  const t = evaluate(rule.trigger, ctx);
  if (t.status === 'not_applicable') return { status: 'not_applicable', rule, reason: t.reason };
  if (t.status === 'unmatched') return { status: 'unmatched', rule };

  if (rule.exclude) {
    const e = evaluate(rule.exclude, ctx);
    if (e.status === 'matched') {
      return { status: 'excluded', rule, reason: '排除條件成立' };
    }
  }
  return { status: 'matched', rule, bindings: t.bindings };
}

/** 行成個規則庫。回晒所有結果 —— 唔中嗰啲都要留返，因為「查過冇」本身係資訊。 */
export function runRegistry(
  registry: RuleRegistry,
  ctx: EvalContext,
  schoolProfileId: string,
): RuleOutcome[] {
  return registry.rules.map((r) => runRule(r, ctx, schoolProfileId));
}

/**
 * 命中咗嘅規則有幾多個**去重群**（§15）。
 *
 * 呢個數就係 §14 單一訊號禁則同 §16 門檻嗰個數 ——
 * 唔係命中幾多條規則，係命中咗幾多個唔同機制。
 *
 * ⚠ **一定要傳 topic。**
 *
 * 規範 §16 開宗明義：「評級對象必須是指定時間範圍內的指定主題。」
 * 所以門檻要數嘅係「支持呢個主題嘅群」，唔係「成張盤命中嘅群」。
 *
 * 唔分主題會出現一個好易中伏嘅情況：基塊規則一次過中六條
 * （六粒主星各坐一個宮），群數一下子變六，門檻就好似過咗。
 * 但當中五條講緊完全唔同嘅主題 —— 講職涯嗰條結論，
 * 唔可以攞「太陰坐田宅」去湊夠票。
 *
 * 唔傳 topic 只應該喺診斷用途（想睇成張盤命中乜）。
 */
export function independenceGroups(outcomes: RuleOutcome[], topic?: Topic): Set<string> {
  return new Set(
    outcomes
      .filter((o): o is Extract<RuleOutcome, { status: 'matched' }> => o.status === 'matched')
      .filter((o) => o.rule.role !== 'none')
      .filter((o) => (topic ? o.rule.topics.includes(topic) : true))
      .map((o) => o.rule.independence_group),
  );
}

/* ──────────────────────────────────────────────
   規則 → evidence（接去 §17）
   ────────────────────────────────────────────── */

/**
 * 將一條命中嘅規則轉成 §17 要求嘅 evidence 行。
 *
 * 呢個係規則庫同結論物件之間唯一嘅橋。**佢冇判方向** ——
 * `direction` 要由呼叫者（推理器 C8）按主題同象義決定，
 * 因為「化忌落官祿」對「職涯壓力」係 support，對「職涯順遂」係 counter，
 * 同一個盤象喺唔同候選結論度角色唔同。規則庫唔知你問緊咩，所以唔應該替你答。
 *
 * `source_ref` 指返命盤：`chart://<chart_id>/<layer>/<branch>`。
 * fixture:// 只准喺測試用（schema 有 refine 守住）。
 */
export function toEvidence(
  outcome: Extract<RuleOutcome, { status: 'matched' }>,
  direction: 'support' | 'counter' | 'mitigating' | 'unresolved',
  chartId: string,
): {
  id: string;
  source_ref: string;
  layer: Layer;
  palace: string | null;
  star: string | null;
  transformation: '祿' | '權' | '科' | '忌' | null;
  rule_id: string;
  direction: typeof direction;
  role: Rule['role'];
  independence_group: string;
}[] {
  return outcome.bindings.map((b, i) => ({
    id: `${outcome.rule.rule_id}#${i}`,
    source_ref: `chart://${chartId}/${b.layer}/${b.branch ?? 'unknown'}`,
    layer: b.layer,
    palace: b.palace,
    star: b.star,
    transformation: b.hua,
    rule_id: outcome.rule.rule_id,
    direction,
    role: outcome.rule.role,
    independence_group: outcome.rule.independence_group,
  }));
}

/**
 * 一批 outcome 夠唔夠出評級（§14 單一訊號禁則）。
 *
 * **呢個唔係建議，係硬閘。** 一個化忌可以入觀察清單，
 * 但唔足以判「慎」或者「逆」——所以少過兩個去重支持群就一定係 null。
 */
export function canGrade(
  outcomes: RuleOutcome[],
  topic: Topic,
): { ok: boolean; groups: number; reason: string } {
  const groups = independenceGroups(outcomes, topic);
  if (groups.size < 2) {
    return {
      ok: false,
      groups: groups.size,
      reason: `「${topic}」主題只有 ${groups.size} 個去重支持群 —— 單一訊號唔准下結論（§14）`,
    };
  }
  return { ok: true, groups: groups.size, reason: `「${topic}」主題有 ${groups.size} 個去重支持群` };
}

/* ──────────────────────────────────────────────
   §16 發布門檻階梯
   ────────────────────────────────────────────── */

/** 一條規則屬邊個時間層。由 requires 推 —— 最高嗰層話事。 */
export function layerOf(rule: Rule): Layer {
  if (rule.requires.includes('annual')) return 'annual';
  if (rule.requires.includes('decade')) return 'decade';
  return 'natal';
}

export type Ceiling = {
  /** 呢個主題最高出得到幾多級（絕對值）。0 = 只可以出平或者 null。 */
  ceiling: 0 | 1 | 2 | 3;
  groups: number;
  coreGroups: number;
  coreLayers: Layer[];
  structuralGroups: number;
  reasons: string[];
};

/**
 * 算出一個主題最高出得到幾多級（§16 發布門檻）。
 *
 * 規範把門檻寫成一條階梯，而唔係一個分數 ——
 * 呢個 function 就係逐級查，唔係加總。§13 明文禁止相加。
 *
 *   ±1 順／慎　至少兩群同向，**至少一群為核心**
 *   ±2 進／逆　至少三群，**至少兩群來自不同時間層的核心**
 *   　　　　　 例外（門檻四）：本命篇章可以用兩個本命核心群 ＋ 一個結構驗證群
 *   ±3 盛／險　至少四群；本命、大限、流年**均有**核心同向；另有一群非重複結構證據
 *
 * 呢度只算**結構**上嘅上限。置信度、人工覆核、反證衝突由 schema 同推理器再收窄；
 * 兩邊都要過，取較嚴格嗰個（§16 最後一句）。
 *
 * `natalChapter: true` 係本命或單一大限篇章 —— 規範第四條明寫
 * 「本命不需要假借流年湊證據」。
 */
export function gradeCeiling(
  outcomes: RuleOutcome[],
  topic: Topic,
  opts: { natalChapter?: boolean } = {},
): Ceiling {
  const matched = outcomes
    .filter((o): o is Extract<RuleOutcome, { status: 'matched' }> => o.status === 'matched')
    .filter((o) => o.rule.role !== 'none')
    .filter((o) => o.rule.topics.includes(topic));

  const byGroup = new Map<string, { role: Rule['role']; layer: Layer }[]>();
  for (const o of matched) {
    const arr = byGroup.get(o.rule.independence_group) ?? [];
    arr.push({ role: o.rule.role, layer: layerOf(o.rule) });
    byGroup.set(o.rule.independence_group, arr);
  }

  const groups = byGroup.size;
  const coreLayerSet = new Set<Layer>();
  let coreGroups = 0;
  let structuralGroups = 0;
  for (const entries of byGroup.values()) {
    // §15：每群「只以最高有效角色參與門檻」
    if (entries.some((e) => e.role === 'core')) {
      coreGroups++;
      for (const e of entries) if (e.role === 'core') coreLayerSet.add(e.layer);
    } else if (entries.some((e) => e.role === 'structural')) {
      structuralGroups++;
    }
  }
  const coreLayers = [...coreLayerSet];
  const reasons: string[] = [];

  if (groups < 2) {
    reasons.push(`「${topic}」只有 ${groups} 個去重群 —— 單一訊號唔准下結論（§14）`);
    return { ceiling: 0, groups, coreGroups, coreLayers, structuralGroups, reasons };
  }
  if (coreGroups < 1) {
    reasons.push('冇核心群 —— 修正層唔可以獨力撐起方向（§13、§16 門檻一）');
    return { ceiling: 0, groups, coreGroups, coreLayers, structuralGroups, reasons };
  }
  reasons.push(`門檻一過：${groups} 群，其中 ${coreGroups} 群核心`);

  // 門檻二：三群 + 兩群不同層核心
  const crossLayer = coreGroups >= 2 && coreLayers.length >= 2;
  // 門檻四：本命篇章例外 —— 兩個本命核心群 + 一個結構驗證群
  const natalException = Boolean(opts.natalChapter) && coreGroups >= 2 && structuralGroups >= 1;
  if (groups < 3 || !(crossLayer || natalException)) {
    if (groups < 3) reasons.push(`得 ${groups} 群，進／逆要三群（§16 門檻二）`);
    else if (!crossLayer && !natalException) {
      reasons.push(
        `核心群喺 ${coreLayers.join('／') || '冇'} 層 —— 進／逆要兩群來自不同時間層嘅核心，` +
          '或者本命篇章嘅兩核心加一結構（門檻二、四）',
      );
    }
    return { ceiling: 1, groups, coreGroups, coreLayers, structuralGroups, reasons };
  }
  reasons.push(natalException ? '門檻四過：本命兩核心群加結構驗證群' : `門檻二過：核心群跨 ${coreLayers.length} 層`);

  // 門檻三：四群 + 三層都有核心 + 另有非重複結構證據
  const allLayers = (['natal', 'decade', 'annual'] as const).every((l) => coreLayerSet.has(l));
  if (groups < 4 || !allLayers || structuralGroups < 1) {
    if (groups < 4) reasons.push(`得 ${groups} 群，盛／險要四群（§16 門檻三）`);
    if (!allLayers) reasons.push('本命、大限、流年唔係都有核心同向 —— 盛／險唔成立');
    if (structuralGroups < 1) reasons.push('冇非重複嘅結構驗證群 —— 盛／險唔成立');
    return { ceiling: 2, groups, coreGroups, coreLayers, structuralGroups, reasons };
  }
  reasons.push('門檻三過（結構上）—— 但盛／險仲要高置信度同人工覆核');
  return { ceiling: 3, groups, coreGroups, coreLayers, structuralGroups, reasons };
}
