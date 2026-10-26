/**
 * 觸發條件語言（工單 C2）
 *
 * 出處：docs/voice-spec.md §10「規則庫每條規則須包含…觸發條件、排除條件」
 *
 * ── 一條死規矩 ──
 *
 * **觸發條件係資料，唔係程式。** 一條規則嘅觸發條件係一舊 JSON，
 * 由呢度嘅 evaluator 直接對住 Chart 行。點解要咁：
 *
 *   1. 規則庫可以出版本、可以 diff、可以 pin —— 一舊 JS function 做唔到
 *   2. 規則改咗，唔使改引擎，亦都唔使改推理器
 *   3. 最重要：**每一次命中都答得出「因為邊一格」** ——
 *      evaluator 唔止回 true／false，佢回埋 binding（邊個宮、邊粒星、邊個化）。
 *      冇 binding 就砌唔到 §17 要求嘅 evidence[]。
 *
 * 所以呢度**冇 eval、冇 new Function、冇字串運算式**。
 * 條件語言細得滯就加原子，唔准開後門。
 */
import type { NatalQueryOptions, AnnualChart, Branch, Brightness, Chart, PalaceName, Sihua } from '@guanwei/ziwei';
import { BRANCHES, overlayAt, sanFangPalaces, lookupNatalStar, queryNatalStar, natalSihuaCoverage, MAJOR_STARS } from '@guanwei/ziwei';

/** 時間層。同 schema.ts 嘅 TimeLayer 對齊。 */
export type Layer = 'natal' | 'decade' | 'annual';

/**
 * 一個宮位點指。
 *
 * `{ name: '財帛' }` = 本命財帛宮。
 * `{ name: '命宮', layer: 'annual' }` = 流年命宮（即係太歲宮）。
 *
 * 三層嘅宮名喺同一副盤上面係三套叫法，所以指宮一定要連層一齊講 ——
 * 「財帛宮有忌」呢句話喺唔講層嘅時候係冇意思嘅。
 */
export type PalaceRef = { name: PalaceName; layer?: Layer };

export type CountOp = 'gte' | 'lte' | 'eq';

/** 星曜分類。用嚟數三方四正入面有幾多煞。 */
export type StarClass = 'major' | 'benefic' | 'malefic';

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  /** 某粒星坐某個宮。 */
  | { star: string; in: PalaceRef }
  /** 某粒星嘅廟旺喺呢幾檔之內。 */
  | { star: string; brightness: Brightness[] }
  /**
   * 某個宮**有主星**嘅廟旺喺呢幾檔之內。
   *
   * 唔指名邊粒星 —— 因為「命宮主星廟旺」呢句話唔應該逐粒星寫十四次。
   * 空宮會出 unmatched（冇主星就冇廟旺可言），唔係 not_applicable。
   */
  | { brightnessIn: PalaceRef; levels: Brightness[] }
  /** 某粒星喺某層化某。layer 預設 natal（生年四化）。 */
  | { star: string; hua: Sihua; layer?: Layer }
  /** 某個化落喺某個宮。 */
  | { hua: Sihua; in: PalaceRef; layer?: Layer }
  /** 空宮（冇主星）。 */
  | { empty: PalaceRef }
  /**
   * 身宮落喺呢個宮。
   *
   * 身宮唔係一粒星，係一個標記 —— 所以佢要自己一個原子，
   * 唔可以當成 `{star:'身宮'}` 去查。
   * 佢只可能落命、夫妻、財帛、遷移、官祿、福德六宮之一（不變量 05）。
   */
  | { shenIn: PalaceRef }
  /** 某個宮嘅三方四正見到某粒星。 */
  | { sanfangOf: PalaceRef; contains: string }
  /** 某個宮嘅三方四正入面某類星有幾多粒。 */
  | { sanfangOf: PalaceRef; count: StarClass; op: CountOp; n: number }
  /** 呢幾粒星同宮。 */
  | { together: string[] }
  /** 呢兩粒星喺對宮。 */
  | { opposite: [string, string] }
  /**
   * 夾宮：`star` 坐嘅宮，前後兩個宮分別坐住 `between` 兩粒星。
   *
   * 古書好多格局係夾出嚟嘅 —— 刑囚夾印、輔弼夾帝、財蔭夾印。
   * 夾同會照唔同：夾係鄰宮，會照係三合，兩者唔可以撈亂。
   * 前後唔分次序 —— A 喺前 B 喺後，同 B 喺前 A 喺後，都算夾。
   */
  | { star: string; between: [string, string] }
  /*
   * ── 2026-10-19 條件卡（新架構命宮試點）補嘅原子 ──
   * 王亭之原文嘅前提好多係「某粒星**所在嗰個宮**見乜」（紫微會輔弼、天府得祿），
   * 唔係「某個宮名」。以下原子全部以星為錨。
   */
  /**
   * 某粒星所在嘅宮：同度（same）、三方四正（sanfang，預設）、或者左右夾（jia）
   * 見到 `stars` 入面幾多粒。`stars` 可以寫「化祿／化權／化科／化忌」，指本命四化。
   * 預設 gte 1。
   */
  | { meets: string; stars: string[]; reach?: 'same' | 'sanfang' | 'jia'; op?: CountOp; n?: number }
  /** 流曜（大限／流年嘅祿存、擎羊、陀羅、昌曲、魁鉞、天馬）落喺某個宮，或者佢嘅三方四正。 */
  | { flow: FlowName; layer: 'decade' | 'annual'; in: PalaceRef; reach?: 'same' | 'sanfang' }
  /**
   * 得祿：某粒星嘅三方四正見祿存或者化祿。
   * layer 係 decade／annual 嗰陣，連埋嗰層嘅四化同流祿存一齊計。
   */
  | { deLu: string; layer?: Layer }
  /** 命名格局，定義見 `GEJU_DEF`。 */
  | { geju: GejuName }
  /**
   * 夾：某粒星左右兩個鄰宮，一邊見 `sides[0]` 任何一粒、另一邊見 `sides[1]` 任何一粒（兩邊唔可以係同一宮）。
   * 例：刑忌夾印 = 天相一邊化忌、另一邊擎羊或天梁。`meets … reach: jia` 只數兩邊合計，分唔到邊。
   */
  | { jia: string; sides: [string[], string[]] }
  /** 某粒星坐喺呢幾個地支（例：巨門在午）。`star` 寫「天刑」都得。 */
  | { star: string; at: string[] }
  /** 大限順行／逆行（陽男陰女順行）。 */
  | { decadeOrder: 'forward' | 'backward' }
  /** 而家行緊嘅大限起運歲數（虛歲）喺呢個範圍：`lt` 以下、`gte` 或以上。要流年資料。 */
  | { decadeAge: { lt?: number; gte?: number } }
  /** 日生／夜生，見 `birthHalf`。 */
  | { birth: BirthHalf };

/**
 * 日生／夜生（2026-10-26）。王亭之《深造講義》上篇主星論：
 *   p.9「日生人(寅卯辰巳午未時生人)以太陽為中天主星」；
 *   p.9–10、p.21「夜生人(申酉戌亥子丑時生人)」。
 * 只按安命嘅時辰地支分，唔再用真太陽時或節氣另劃日夜；子時（早子晚子）一律夜生。
 */
export type BirthHalf = '日生' | '夜生';
export function birthHalf(chart: Pick<Chart, 'lunar'>): BirthHalf {
  const s = chart.lunar.shichen;
  return s >= 2 && s <= 7 ? '日生' : '夜生';
}

export type FlowName = '祿存' | '擎羊' | '陀羅' | '文昌' | '文曲' | '天魁' | '天鉞' | '天馬';
export type GejuName = 'baiguan' | 'zaiye' | 'kongku' | 'luku' | 'caiyinShape' | 'caiyin' | 'xingji' | 'shizhong';

/**
 * 命中嘅細節。一個 binding = 之後 evidence[] 入面嘅一行。
 *
 * 冇 binding 嘅命中係冇用嘅 —— 追溯唔返去就等於冇證據（§17）。
 */
export type Binding = {
  layer: Layer;
  palace: PalaceName | null;
  branch: string | null;
  star: string | null;
  hua: Sihua | null;
  /** 人睇嘅一句：呢個 binding 講緊盤上邊一格。 */
  note: string;
};

export type EvalContext = {
  chart: Chart;
  /** Experimental catalogue is opt-in; existing writers retain their pinned P0 query behaviour. */
  natalQuery?: NatalQueryOptions;
  /** 冇流年就淨係行得到 natal 層。 */
  annual?: AnnualChart;
};

/**
 * 三個結果，唔係兩個。
 *
 * `not_applicable` 同 `false` **唔可以混為一談**：
 * 「冇流年資料所以查唔到」唔等於「查過，冇」。
 * 規範 §14 講明「未見支持不等於已有反證」—— 呢個分別喺型別度就守住。
 */
export type EvalResult =
  | { status: 'matched'; bindings: Binding[] }
  | { status: 'unmatched' }
  | { status: 'not_applicable'; reason: string };

const BENEFIC = new Set(['文昌', '文曲', '左輔', '右弼', '天魁', '天鉞']);
const MALEFIC = new Set(['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫']);

/** 三層嘅宮名 → 地支。呢個係成個條件語言唯一嘅「指宮」入口。 */
function branchOfPalace(ref: PalaceRef, ctx: EvalContext): { branch: string } | { missing: string } {
  const layer = ref.layer ?? 'natal';
  if (layer === 'natal') {
    const p = ctx.chart.palaces.find((q) => q.name === ref.name);
    return p ? { branch: p.branch } : { missing: `本命盤搵唔到 ${ref.name}` };
  }
  if (!ctx.annual) return { missing: `要流年資料先查得到${layer === 'annual' ? '流年' : '大限'}${ref.name}` };
  if (layer === 'decade' && !ctx.annual.decadal) {
    return { missing: '呢個虛歲未起運，冇大限層' };
  }
  const hit = ctx.annual.overlay.find((o) => (layer === 'annual' ? o.annual : o.decadal) === ref.name);
  return hit ? { branch: hit.branch } : { missing: `${layer} 層搵唔到 ${ref.name}` };
}

function palaceNamesOf(branch: string, ctx: EvalContext): Record<Layer, PalaceName | null> {
  const natal = ctx.chart.palaces.find((p) => p.branch === branch)?.name ?? null;
  const o = ctx.annual ? overlayAt(ctx.annual, branch as never) : null;
  return { natal, decade: o?.decadal ?? null, annual: o?.annual ?? null };
}

function bind(branch: string, ctx: EvalContext, over: Partial<Binding> & { note: string }): Binding {
  const names = palaceNamesOf(branch, ctx);
  const layer = over.layer ?? 'natal';
  return {
    layer,
    palace: names[layer],
    branch,
    star: over.star ?? null,
    hua: over.hua ?? null,
    note: over.note,
  };
}

// Memoization belongs to a single synchronous evaluation, never to the caller's mutable chart/context.
const STAR_CACHE = Symbol('evaluation-stars');
const HUA_CACHE = Symbol('evaluation-hua');
type InternalContext = EvalContext & {
  [STAR_CACHE]?: Map<string, ReturnType<typeof lookupNatalStar>>;
  [HUA_CACHE]?: Map<Layer, ReturnType<typeof readHuaAt>>;
};
function positionOf(star: string, ctx: InternalContext) {
  const cached = ctx[STAR_CACHE]?.get(star);
  if (cached) return cached;
  const result = lookupNatalStar(ctx.chart, star, ctx.natalQuery);
  ctx[STAR_CACHE]?.set(star, result);
  return result;
}
function huaAt(layer: Layer, ctx: InternalContext): ReturnType<typeof readHuaAt> {
  const cached = ctx[HUA_CACHE]?.get(layer);
  if (cached) return cached;
  const result = readHuaAt(layer, ctx);
  ctx[HUA_CACHE]?.set(layer, result);
  return result;
}

/** 某層四化：邊粒星化乜。 */
function readHuaAt(layer: Layer, ctx: EvalContext): { rows: { star: string; hua: Sihua }[] } | { missing: string } {
  if (layer === 'natal') {
    const coverage = natalSihuaCoverage(ctx.chart);
    return coverage.status === 'unknown'
      ? { missing: '本命四化紀錄缺失、重複或星位未明，不能當成沒有四化' }
      : { rows: coverage.rows.map(({ star, hua }) => ({ star, hua })) };
  }
  if (!ctx.annual) return { missing: '冇流年資料' };
  const src = layer === 'annual' ? ctx.annual.sihua.annual : ctx.annual.sihua.decadal;
  if (!src) return { missing: '呢個虛歲未起運，冇大限四化' };
  return { rows: src.map((h) => ({ star: h.star, hua: h.hua })) };
}

function starBranch(star: string, ctx: EvalContext): string | null {
  const result = positionOf(star, ctx);
  return result.status === 'available' ? result.branch : null;
}

export const CONDITION_QUERY_VERSION = 'condition-query-v2';
export const P1A_CONDITION_VERSION = 'condition-query-v2+p1a-v1';
export const P1B_CONDITION_VERSION = 'condition-query-v2+p1b-v1';

/** Exact threshold logic with an interval for not-yet-known stars. */
function countPass(min: number, max: number, op: CountOp, n: number): boolean | null {
  if (op === 'gte') return min >= n ? true : max < n ? false : null;
  if (op === 'lte') return max <= n ? true : min > n ? false : null;
  return min === max && min === n ? true : n < min || n > max ? false : null;
}

/** Check anchors before evaluating their geometry; an unknown position is never a negative fact. */
function anchorNames(cond: Condition): string[] {
  if ('together' in cond) return cond.together;
  if ('opposite' in cond) return cond.opposite;
  if ('between' in cond) return [cond.star, ...cond.between];
  if ('star' in cond) return [cond.star];
  if ('contains' in cond) return [cond.contains];
  if ('meets' in cond) return [cond.meets];
  if ('jia' in cond) return [cond.jia];
  if ('deLu' in cond) return [cond.deLu];
  return [];
}

const LAYER_ZH: Record<Layer, string> = { natal: '本命', decade: '大限', annual: '流年' };

/** Shared three-state composition for conditions and their palace adapter. */
export function combineEvaluations(op: 'all' | 'any', results: EvalResult[]): EvalResult {
  const bindings: Binding[] = [];
  let missing: string | null = null;
  let hit = false;
  for (const r of results) {
    if (r.status === 'not_applicable') { missing ??= r.reason; continue; }
    if (op === 'all' && r.status === 'unmatched') return { status: 'unmatched' };
    if (r.status === 'matched') { hit = true; bindings.push(...r.bindings); }
  }
  if (op === 'any' && hit) return { status: 'matched', bindings };
  if (missing) return { status: 'not_applicable', reason: missing };
  return op === 'all' ? { status: 'matched', bindings } : { status: 'unmatched' };
}

/** 行一條條件。純函數 —— 同一個 (cond, ctx) 永遠出同一個結果。 */
export function evaluate(cond: Condition, context: EvalContext): EvalResult {
  const inherited = context as InternalContext;
  const ctx: InternalContext = inherited[STAR_CACHE] ? inherited : { ...context, [STAR_CACHE]: new Map(), [HUA_CACHE]: new Map() };
  if ('all' in cond) {
    const results: EvalResult[] = [];
    for (const child of cond.all) {
      const result = evaluate(child, ctx);
      results.push(result);
      if (result.status === 'unmatched') break; // false is decisive even after an unknown child
    }
    return combineEvaluations('all', results);
  }
  if ('any' in cond) return combineEvaluations('any', cond.any.map((c) => evaluate(c, ctx)));
  if ('not' in cond) {
    const r = evaluate(cond.not, ctx);
    if (r.status === 'not_applicable') return r;
    return r.status === 'matched'
      ? { status: 'unmatched' }
      : { status: 'matched', bindings: [] };
  }

  /* ── 原子 ── */
  if (('meets' in cond && cond.stars.some((s) => HUA_WORD.test(s)))
    || ('jia' in cond && cond.sides.flat().some((s) => HUA_WORD.test(s))) || 'deLu' in cond) {
    const hua = huaAt('natal', ctx);
    if ('missing' in hua) return { status: 'not_applicable', reason: hua.missing };
  }
  for (const star of anchorNames(cond)) {
    const position = positionOf(star, ctx);
    if (position.status === 'unknown') return { status: 'not_applicable', reason: position.reason };
  }
  if ('shenIn' in cond) {
    const b = branchOfPalace(cond.shenIn, ctx);
    if ('missing' in b) return { status: 'not_applicable', reason: b.missing };
    const p = ctx.chart.palaces.find((q) => q.branch === b.branch)!;
    if (!p.isShen) return { status: 'unmatched' };
    const layer = cond.shenIn.layer ?? 'natal';
    return {
      status: 'matched',
      bindings: [bind(b.branch, ctx, {
        layer,
        note: `身宮落${LAYER_ZH[layer]}${cond.shenIn.name}（${b.branch}）`,
      })],
    };
  }

  if ('empty' in cond) {
    const b = branchOfPalace(cond.empty, ctx);
    if ('missing' in b) return { status: 'not_applicable', reason: b.missing };
    const p = ctx.chart.palaces.find((q) => q.branch === b.branch)!;
    const positions = MAJOR_STARS.map((star) => positionOf(star, ctx));
    if (positions.some((r) => r.status === 'available' && r.branch === b.branch)) return { status: 'unmatched' };
    if (positions.some((r) => r.status === 'unknown')) return { status: 'not_applicable', reason: '主星安星紀錄未齊，不能確認空宮' };
    return {
      status: 'matched',
      bindings: [bind(b.branch, ctx, {
        layer: cond.empty.layer ?? 'natal',
        note: `${LAYER_ZH[cond.empty.layer ?? 'natal']}${cond.empty.name}（${b.branch}）無主星，借對宮${p.borrowsFrom ?? '?'}參看`,
      })],
    };
  }

  if ('together' in cond) {
    const branches = cond.together.map((s) => starBranch(s, ctx));
    if (branches.some((b) => b === null)) return { status: 'unmatched' };
    if (new Set(branches).size !== 1) return { status: 'unmatched' };
    const branch = branches[0]!;
    return {
      status: 'matched',
      bindings: cond.together.map((s) => bind(branch, ctx, { star: s, note: `${s} 同宮於 ${branch}` })),
    };
  }

  if ('between' in cond) {
    const mid = starBranch(cond.star, ctx);
    if (!mid) return { status: 'unmatched' };
    const i = BRANCHES.indexOf(mid as Branch);
    const prev = BRANCHES[(i + 11) % 12]!;
    const next = BRANCHES[(i + 1) % 12]!;
    const [x, y] = cond.between;
    const bx = starBranch(x, ctx);
    const by = starBranch(y, ctx);
    if (!bx || !by) return { status: 'unmatched' };
    const ok = (bx === prev && by === next) || (bx === next && by === prev);
    if (!ok) return { status: 'unmatched' };
    return {
      status: 'matched',
      bindings: [
        bind(mid, ctx, { star: cond.star, note: `${cond.star}（${mid}）受 ${x}、${y} 相夾` }),
        bind(bx, ctx, { star: x, note: `${x} 坐 ${bx}，夾 ${cond.star}` }),
        bind(by, ctx, { star: y, note: `${y} 坐 ${by}，夾 ${cond.star}` }),
      ],
    };
  }

  if ('opposite' in cond) {
    const [a, b] = cond.opposite;
    const ba = starBranch(a, ctx);
    const bb = starBranch(b, ctx);
    if (!ba || !bb) return { status: 'unmatched' };
    const ia = BRANCHES.indexOf(ba as Branch);
    const ib = BRANCHES.indexOf(bb as Branch);
    if ((((ia - ib) % 12) + 12) % 12 !== 6) return { status: 'unmatched' };
    return {
      status: 'matched',
      bindings: [
        bind(ba, ctx, { star: a, note: `${a}（${ba}）對 ${b}（${bb}）` }),
        bind(bb, ctx, { star: b, note: `${b}（${bb}）對 ${a}（${ba}）` }),
      ],
    };
  }

  if ('sanfangOf' in cond) {
    const b = branchOfPalace(cond.sanfangOf, ctx);
    if ('missing' in b) return { status: 'not_applicable', reason: b.missing };
    const layer = cond.sanfangOf.layer ?? 'natal';
    const four = sanFangPalaces(ctx.chart.palaces, b.branch as never);
    if ('contains' in cond) {
      const position = queryNatalStar(ctx.chart, cond.contains, { branch: b.branch as Branch, reach: 'sanfang' }, ctx.natalQuery);
      if (position.status === 'unknown') return { status: 'not_applicable', reason: position.reason };
      const hit = position.status === 'present' ? four.find((p) => p.branch === position.branch) : null;
      if (!hit) return { status: 'unmatched' };
      return {
        status: 'matched',
        bindings: [bind(hit.branch, ctx, {
          layer,
          star: cond.contains,
          note: `${cond.contains} 落 ${hit.branch}，喺${LAYER_ZH[layer]}${cond.sanfangOf.name}嘅三方四正之內`,
        })],
      };
    }
    const want = cond.count === 'major' ? null : cond.count === 'benefic' ? BENEFIC : MALEFIC;
    const found: { branch: string; star: string }[] = [];
    for (const p of four) {
      for (const s of p.stars) {
        const ok = want === null ? s.kind === 'major' : want.has(s.name);
        if (ok && positionOf(s.name, ctx).status === 'available') found.push({ branch: p.branch, star: s.name });
      }
    }
    const n = found.length;
    const missing = [...(want ?? MAJOR_STARS)].filter((star) => positionOf(star, ctx).status === 'unknown');
    const pass = countPass(n, n + missing.length, cond.op, cond.n);
    if (pass === null) return { status: 'not_applicable', reason: `星曜覆蓋不足：${missing.join('、')}` };
    if (!pass) return { status: 'unmatched' };
    return {
      status: 'matched',
      bindings: found.map((f) => bind(f.branch, ctx, {
        layer,
        star: f.star,
        note: `${f.star}（${f.branch}）喺${LAYER_ZH[layer]}${cond.sanfangOf.name}三方四正，同類共 ${n} 粒`,
      })),
    };
  }

  if ('brightnessIn' in cond) {
    const b = branchOfPalace(cond.brightnessIn, ctx);
    if ('missing' in b) return { status: 'not_applicable', reason: b.missing };
    const p = ctx.chart.palaces.find((q) => q.branch === b.branch)!;
    const positions = MAJOR_STARS.map((star) => positionOf(star, ctx));
    const majors = p.stars.filter((s) => s.kind === 'major' && positions.some((r) => r.status === 'available' && r.star === s.name));
    if (majors.length === 0) return evaluate({ not: { empty: cond.brightnessIn } }, ctx);
    const hit = majors.filter((s) => s.brightness && cond.levels.includes(s.brightness));
    if (hit.length === 0) return majors.some((s) => !s.brightness) || positions.some((r) => r.status === 'unknown')
      ? { status: 'not_applicable', reason: '本宮主星廟旺資料未齊' } : { status: 'unmatched' };
    const layer = cond.brightnessIn.layer ?? 'natal';
    return {
      status: 'matched',
      bindings: hit.map((s) => bind(b.branch, ctx, {
        layer, star: s.name,
        note: `${s.name} 喺${LAYER_ZH[layer]}${cond.brightnessIn.name}（${b.branch}）為「${s.brightness}」`,
      })),
    };
  }

  if ('brightness' in cond) {
    const position = positionOf(cond.star, ctx);
    if (position.status === 'unknown') return { status: 'not_applicable', reason: position.reason };
    const p = { branch: position.branch };
    const s = position.placement;
    if (!s.brightness) return { status: 'not_applicable', reason: `${cond.star} 冇廟旺資料` };
    if (!cond.brightness.includes(s.brightness)) return { status: 'unmatched' };
    return {
      status: 'matched',
      bindings: [bind(p.branch, ctx, { star: cond.star, note: `${cond.star} 喺 ${p.branch} 為「${s.brightness}」` })],
    };
  }

  if ('hua' in cond && 'star' in cond) {
    const layer = cond.layer ?? 'natal';
    const rows = huaAt(layer, ctx);
    if ('missing' in rows) return { status: 'not_applicable', reason: rows.missing };
    if (!rows.rows.some((r) => r.star === cond.star && r.hua === cond.hua)) return { status: 'unmatched' };
    const branch = starBranch(cond.star, ctx);
    if (!branch) return { status: 'unmatched' };
    return {
      status: 'matched',
      bindings: [bind(branch, ctx, {
        layer, star: cond.star, hua: cond.hua,
        note: `${LAYER_ZH[layer]}四化：${cond.star}化${cond.hua}，坐 ${branch}`,
      })],
    };
  }

  if ('hua' in cond) {
    const layer = cond.layer ?? 'natal';
    const rows = huaAt(layer, ctx);
    if ('missing' in rows) return { status: 'not_applicable', reason: rows.missing };
    const b = branchOfPalace(cond.in, ctx);
    if ('missing' in b) return { status: 'not_applicable', reason: b.missing };
    for (const row of rows.rows.filter((r) => r.hua === cond.hua)) {
      const position = positionOf(row.star, ctx);
      if (position.status === 'unknown') return { status: 'not_applicable', reason: position.reason };
    }
    const star = rows.rows.find((r) => r.hua === cond.hua && starBranch(r.star, ctx) === b.branch);
    if (!star) return { status: 'unmatched' };
    return {
      status: 'matched',
      bindings: [bind(b.branch, ctx, {
        layer, star: star.star, hua: cond.hua,
        note: `${LAYER_ZH[layer]}化${cond.hua}（${star.star}）落${LAYER_ZH[cond.in.layer ?? 'natal']}${cond.in.name}（${b.branch}）`,
      })],
    };
  }

  if ('at' in cond) {
    const b = starBranch(cond.star, ctx);
    if (!b || !cond.at.includes(b)) return { status: 'unmatched' };
    return { status: 'matched', bindings: [bind(b, ctx, { star: cond.star, note: `${cond.star}坐${b}宮` })] };
  }
  if ('decadeOrder' in cond) {
    const [d1, d2] = ctx.chart.decadals;
    if (!d1 || !d2) return { status: 'unmatched' };
    const fwd = BRANCHES.indexOf(d2.branch) === (BRANCHES.indexOf(d1.branch) + 1) % 12;
    if ((cond.decadeOrder === 'forward') !== fwd) return { status: 'unmatched' };
    return { status: 'matched', bindings: [{ layer: 'natal', palace: null, branch: null, star: null, hua: null, note: `大限${fwd ? '順' : '逆'}行` }] };
  }
  if ('birth' in cond) {
    const half = birthHalf(ctx.chart);
    if (half !== cond.birth) return { status: 'unmatched' };
    return { status: 'matched', bindings: [{ layer: 'natal', palace: null, branch: null, star: null, hua: null, note: `${BRANCHES[ctx.chart.lunar.shichen]}時生，屬${half}人` }] };
  }
  if ('decadeAge' in cond) {
    if (!ctx.annual) return { status: 'not_applicable', reason: '冇流年資料，唔知行緊邊個大限' };
    const d = ctx.annual.decadal;
    if (!d) return { status: 'not_applicable', reason: '呢個虛歲未起運' };
    const { lt, gte } = cond.decadeAge;
    if ((lt !== undefined && d.fromAge >= lt) || (gte !== undefined && d.fromAge < gte)) return { status: 'unmatched' };
    return { status: 'matched', bindings: [bind(d.branch, ctx, { layer: 'decade', note: `虛歲${d.fromAge}至${d.toAge}歲嘅大限` })] };
  }
  if ('jia' in cond) {
    const at = starBranch(cond.jia, ctx);
    if (!at) return { status: 'unmatched' };
    type P = Chart['palaces'][number];
    const [l, r] = neighbours(at).map((b) => ctx.chart.palaces.find((p) => p.branch === b)!) as [P, P];
    if (!l || !r) return { status: 'not_applicable', reason: '左右鄰宮資料不足' };
    const [a, b] = cond.sides;
    const side = (p: P, names: string[]) => {
      if (seenIn(p, names, ctx).length) return true;
      return names.some((w) => !HUA_WORD.test(w) && positionOf(w, ctx).status === 'unknown') ? null : false;
    };
    const pair = (x: P, y: P): boolean | null => {
      const left = side(x, a), right = side(y, b);
      return left === false || right === false ? false : left === null || right === null ? null : true;
    };
    const forward = pair(l, r), reverse = pair(r, l);
    const got: [P, P] | null = forward === true ? [l, r] : reverse === true ? [r, l] : null;
    if (!got) return forward === null || reverse === null
      ? { status: 'not_applicable', reason: '夾宮所需星曜尚未完整安入或資料不足' } : { status: 'unmatched' };
    return {
      status: 'matched',
      bindings: [
        bind(got[0].branch, ctx, { note: `${cond.jia}（${at}）一邊${got[0].branch}見${seenIn(got[0], a, ctx).join('、')}` }),
        bind(got[1].branch, ctx, { note: `${cond.jia}（${at}）另一邊${got[1].branch}見${seenIn(got[1], b, ctx).join('、')}` }),
      ],
    };
  }
  if ('meets' in cond) return evalMeets(cond, ctx);
  if ('flow' in cond) return evalFlow(cond, ctx);
  if ('deLu' in cond) return evalDeLu(cond.deLu, cond.layer ?? 'natal', ctx);
  if ('geju' in cond) {
    const r = evaluate(GEJU_DEF[cond.geju].when, ctx);
    if (r.status !== 'matched') return r;
    const extra: Binding[] = [{ layer: 'natal', palace: null, branch: null, star: null, hua: null, note: `成${GEJU_DEF[cond.geju].name}` }];
    /* A2（2026-10-19 用戶定）：刑忌夾先論，但財蔭構形照記低 */
    if (cond.geju === 'xingji' && evaluate(GEJU_DEF.caiyinShape.when, ctx).status === 'matched') {
      extra.push({ layer: 'natal', palace: null, branch: null, star: null, hua: null, note: '同時有財蔭夾印構形（刑忌先論，財蔭唔計）' });
    }
    return { status: 'matched', bindings: [...r.bindings, ...extra] };
  }

  // { star, in }
  const b = branchOfPalace(cond.in, ctx);
  if ('missing' in b) return { status: 'not_applicable', reason: b.missing };
  const position = queryNatalStar(ctx.chart, cond.star, { branch: b.branch as Branch }, ctx.natalQuery);
  if (position.status === 'unknown') return { status: 'not_applicable', reason: position.reason };
  if (position.status === 'absent') return { status: 'unmatched' };
  const layer = cond.in.layer ?? 'natal';
  return {
    status: 'matched',
    bindings: [bind(b.branch, ctx, {
      layer, star: cond.star,
      note: `${cond.star} 坐${LAYER_ZH[layer]}${cond.in.name}（${b.branch}）`,
    })],
  };
}

/* ── 2026-10-19 條件卡原子 ─────────────────────────────── */

const HUA_WORD = /^化([祿權科忌])$/;

function neighbours(branch: string): string[] {
  const i = BRANCHES.indexOf(branch as Branch);
  return [BRANCHES[(i + 11) % 12]!, BRANCHES[(i + 1) % 12]!];
}

function palacesAround(branch: string, reach: 'same' | 'sanfang' | 'jia', ctx: EvalContext) {
  const ps = ctx.chart.palaces;
  if (reach === 'same') return ps.filter((p) => p.branch === branch);
  if (reach === 'jia') return ps.filter((p) => neighbours(branch).includes(p.branch));
  return sanFangPalaces(ps, branch as never);
}

/** 一個宮入面，`want` 列出嘅星（或者「化X」）見到邊幾粒。 */
function seenIn(p: Chart['palaces'][number], want: string[], ctx: EvalContext): string[] {
  const out: string[] = [];
  for (const w of want) {
    const h = HUA_WORD.exec(w);
    const ok = h
      ? p.stars.some((s) => s.sihua === h[1])
      : queryNatalStar(ctx.chart, w, { branch: p.branch }, ctx.natalQuery).status === 'present';
    if (ok) out.push(w);
  }
  return out;
}

function evalMeets(
  cond: { meets: string; stars: string[]; reach?: 'same' | 'sanfang' | 'jia'; op?: CountOp; n?: number },
  ctx: EvalContext,
): EvalResult {
  const at = starBranch(cond.meets, ctx);
  if (!at) return { status: 'unmatched' };
  const reach = cond.reach ?? 'sanfang';
  const found: { branch: string; star: string }[] = [];
  for (const p of palacesAround(at, reach, ctx)) for (const w of seenIn(p, cond.stars, ctx)) found.push({ branch: p.branch, star: w });
  const n = found.length;
  const op = cond.op ?? 'gte';
  const k = cond.n ?? 1;
  const missing = [...new Set(cond.stars)].filter((w) => !HUA_WORD.test(w) && positionOf(w, ctx).status === 'unknown');
  const pass = countPass(n, n + missing.length, op, k);
  if (pass === null) return { status: 'not_applicable', reason: `會照所需星曜未齊：${missing.join('、')}` };
  if (!pass) return { status: 'unmatched' };
  const where = reach === 'same' ? '同度' : reach === 'jia' ? '相夾' : '三方四正';
  if (found.length === 0) {
    return { status: 'matched', bindings: [bind(at, ctx, { star: cond.meets, note: `${cond.meets}（${at}）${where}不見${cond.stars.join('、')}` })] };
  }
  return {
    status: 'matched',
    bindings: found.map((f) =>
      bind(f.branch, ctx, { star: f.star.startsWith('化') ? null : f.star, note: `${cond.meets}（${at}）${where}見${f.star}（${f.branch}）` }),
    ),
  };
}

function evalFlow(
  cond: { flow: FlowName; layer: 'decade' | 'annual'; in: PalaceRef; reach?: 'same' | 'sanfang' },
  ctx: EvalContext,
): EvalResult {
  if (!ctx.annual) return { status: 'not_applicable', reason: '冇流年資料，查唔到流曜' };
  const set = cond.layer === 'annual' ? ctx.annual.liuyao.annual : ctx.annual.liuyao.decadal;
  if (!set) return { status: 'not_applicable', reason: '呢個虛歲未起運，冇大限流曜' };
  const b = branchOfPalace(cond.in, ctx);
  if ('missing' in b) return { status: 'not_applicable', reason: b.missing };
  const at = set[cond.flow];
  const reach = cond.reach ?? 'same';
  const ok = reach === 'same' ? at === b.branch : sanFangPalaces(ctx.chart.palaces, b.branch as never).some((p) => p.branch === at);
  if (!ok) return { status: 'unmatched' };
  return {
    status: 'matched',
    bindings: [
      bind(at, ctx, {
        layer: cond.layer,
        note: `${LAYER_ZH[cond.layer]}流${cond.flow}（${at}）${reach === 'same' ? '入' : '照'}${LAYER_ZH[cond.in.layer ?? 'natal']}${cond.in.name}`,
      }),
    ],
  };
}

function evalDeLu(star: string, layer: Layer, ctx: EvalContext): EvalResult {
  const at = starBranch(star, ctx);
  if (!at) return { status: 'unmatched' };
  const four = sanFangPalaces(ctx.chart.palaces, at as never);
  const branches = new Set<string>(four.map((p) => p.branch));
  const bindings: Binding[] = [];
  for (const p of four) {
    if (queryNatalStar(ctx.chart, '祿存', { branch: p.branch }, ctx.natalQuery).status === 'present') bindings.push(bind(p.branch, ctx, { star: '祿存', note: `${star}（${at}）會祿存（${p.branch}）` }));
    for (const s of p.stars) if (s.sihua === '祿') bindings.push(bind(p.branch, ctx, { star: s.name, hua: '祿', note: `${star}（${at}）會${s.name}化祿（${p.branch}）` }));
  }
  if (layer !== 'natal') {
    const rows = huaAt(layer, ctx);
    if ('missing' in rows) return { status: 'not_applicable', reason: rows.missing };
    for (const r of rows.rows) {
      const b = starBranch(r.star, ctx);
      if (r.hua === '祿' && b && branches.has(b)) {
        bindings.push(bind(b, ctx, { layer, star: r.star, hua: '祿', note: `${star}（${at}）會${LAYER_ZH[layer]}${r.star}化祿（${b}）` }));
      }
    }
    const set = layer === 'annual' ? ctx.annual!.liuyao.annual : ctx.annual!.liuyao.decadal;
    if (set && branches.has(set.祿存)) bindings.push(bind(set.祿存, ctx, { layer, note: `${star}（${at}）會${LAYER_ZH[layer]}流祿（${set.祿存}）` }));
  }
  if (!bindings.length) {
    const lu = lookupNatalStar(ctx.chart, '祿存');
    if (lu.status === 'unknown') return { status: 'not_applicable', reason: lu.reason };
  }
  return bindings.length ? { status: 'matched', bindings } : { status: 'unmatched' };
}

const FUZUO = ['左輔', '右弼', '天魁', '天鉞', '文昌', '文曲'];

/**
 * 命名格局。定義跟《深造講義》原文；引擎冇嘅雜曜（三台八座、恩光天貴、天空、截空旬空、天刑未入盤）計唔到，
 * 所以以下全部係「計得到嗰部分」—— 寫卡要喺 limit 講明。
 */
export const GEJU_DEF: Record<GejuName, { name: string; when: Condition; sources: string[]; note: string }> = {
  baiguan: {
    name: '百官朝拱',
    when: { meets: '紫微', stars: FUZUO, n: 2 },
    sources: ['wtz.deep.p005.b005', 'wtz.deep.p005.b006', 'wtz.deep.p006.b001'],
    note: '正曜府相朝垣喺紫微三方四正差唔多必然有，所以只計輔佐：三方四正見兩粒或以上。雜曜朝拱引擎冇，計唔到。',
  },
  zaiye: {
    name: '在野孤君',
    when: { all: [{ star: '紫微', brightness: ['平', '不', '陷'] }, { not: { meets: '紫微', stars: FUZUO, n: 2 } }] },
    sources: ['wtz.deep.p006.b008'],
    note: '「落陷又無百官朝拱」。紫微喺現行廟旺表最低係子宮「平」，當落陷計。',
  },
  kongku: {
    name: '空庫',
    when: { any: [{ not: { deLu: '天府' } }, { meets: '天府', stars: ['地空'], reach: 'same' }] },
    sources: ['wtz.deep.p020.b005', 'wtz.deep.p005.b008'],
    note: '無祿同會，或者同地空（原文「地空、天空」，引擎冇天空）同度。p.20「年限中…無空庫露庫之說」講嘅係唔可以因此話人本質奸刁；各星系「經行」段（p.72、80、140、151…）仍然用府庫空露判斷嗰十年／嗰年嘅際遇，所以大限卡可以用。',
  },
  luku: {
    name: '露庫',
    when: {
      any: [
        { meets: '天相', stars: ['擎羊', '陀羅', '火星', '鈴星', '化忌'], reach: 'same' },
        { all: [{ meets: '天府', stars: ['擎羊', '陀羅', '火星', '鈴星'], n: 2 }, { meets: '天府', stars: ['化忌'] }] },
      ],
    },
    sources: ['wtz.deep.p020.b005'],
    note: '「天相不吉，或甚至帶煞來會」，或者「四煞刑忌交會」。天相不吉當天相同度見煞忌；交會當三方四正兩煞以上再見化忌（天刑未計）。',
  },
  caiyinShape: {
    name: '財蔭夾印構形',
    when: {
      all: [
        { jia: '天相', sides: [['化祿'], ['天梁']] },
        { any: [{ star: '巨門', hua: '祿' }, { star: '天同', hua: '祿' }] },
      ],
    },
    sources: ['wtz.deep.p005.b009', 'wtz.deep.p030.b005'],
    note: '只睇夾嘅形狀，唔理有冇同時成刑忌夾。寫卡用 `caiyin`；呢個留俾記錄同統計（A2）。',
  },
  caiyin: {
    name: '財蔭夾印',
    when: {
      all: [
        { geju: 'caiyinShape' },
        /* 同一邊又見化忌（例：辛年巨門化祿、文昌化忌同宮）就成刑忌夾，刑忌先論 */
        { not: { geju: 'xingji' } },
      ],
    },
    sources: ['wtz.deep.p005.b009', 'wtz.deep.p030.b005'],
    note: '天梁同化祿（天同或巨門化祿）夾天相。同時成刑忌夾印就唔算，刑忌先論；構形本身記喺 `caiyinShape`，刑忌夾命中時 binding 會註明（2026-10-19 用戶定 A2）。',
  },
  xingji: {
    name: '刑忌夾印',
    when: {
      all: [
        { jia: '天相', sides: [['化忌'], ['擎羊', '天梁']] },
        /* p030.b010：天梁化科、天相三方四正不見煞、見魁鉞輔弼昌曲，先可解 */
        {
          not: {
            all: [
              { star: '天梁', hua: '科' },
              { meets: '天相', stars: ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'], op: 'eq', n: 0 },
              { meets: '天相', stars: ['左輔', '右弼', '天魁', '天鉞', '文昌', '文曲'] },
            ],
          },
        },
      ],
    },
    sources: ['wtz.deep.p005.b009', 'wtz.deep.p030.b009', 'wtz.deep.p030.b010', 'wtz.deep.p358.b004'],
    note: '一邊化忌、另一邊擎羊或天梁夾天相（兩樣喺同一邊唔算，p358.b004「雖不成刑忌夾印」）。天梁化科、三方無煞、見吉就解（p030.b010）。',
  },
  shizhong: {
    name: '石中隱玉',
    when: {
      all: [
        { star: '巨門', at: ['子', '午'] },
        { any: [{ star: '巨門', hua: '祿' }, { star: '巨門', hua: '權' }] },
        { not: { meets: '巨門', stars: ['擎羊', '陀羅', '火星', '鈴星'] } },
      ],
    },
    sources: ['wtz.deep.p029.b001', 'wtz.deep.p081.b011', 'wtz.deep.p082.b001', 'wtz.deep.p082.b007'],
    note: '嚴格定義（2026-10-19 用戶定 A5）：子午巨門、巨門本身本命化祿或化權（p082.b007「必須巨門本身化祿化權」）、三方四正不見羊陀火鈴（A13：空劫唔算煞）。祿存同度係次一等，另寫卡，唔用呢個格。',
  },
};
