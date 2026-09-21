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
import type { AnnualChart, Branch, Brightness, Chart, PalaceName, Sihua } from '@guanwei/ziwei';
import { BRANCHES, overlayAt, sanFangPalaces } from '@guanwei/ziwei';

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
  | { star: string; between: [string, string] };

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

/** 某層四化：邊粒星化乜。 */
function huaAt(layer: Layer, ctx: EvalContext): { rows: { star: string; hua: Sihua }[] } | { missing: string } {
  if (layer === 'natal') {
    const rows: { star: string; hua: Sihua }[] = [];
    for (const p of ctx.chart.palaces) {
      for (const s of p.stars) if (s.sihua) rows.push({ star: s.name, hua: s.sihua });
    }
    return { rows };
  }
  if (!ctx.annual) return { missing: '冇流年資料' };
  const src = layer === 'annual' ? ctx.annual.sihua.annual : ctx.annual.sihua.decadal;
  if (!src) return { missing: '呢個虛歲未起運，冇大限四化' };
  return { rows: src.map((h) => ({ star: h.star, hua: h.hua })) };
}

function starBranch(star: string, ctx: EvalContext): string | null {
  return ctx.chart.palaces.find((p) => p.stars.some((s) => s.name === star))?.branch ?? null;
}

const LAYER_ZH: Record<Layer, string> = { natal: '本命', decade: '大限', annual: '流年' };

/** 行一條條件。純函數 —— 同一個 (cond, ctx) 永遠出同一個結果。 */
export function evaluate(cond: Condition, ctx: EvalContext): EvalResult {
  /* ── 組合子 ── */
  if ('all' in cond) {
    const bindings: Binding[] = [];
    for (const c of cond.all) {
      const r = evaluate(c, ctx);
      if (r.status === 'not_applicable') return r;
      if (r.status === 'unmatched') return { status: 'unmatched' };
      bindings.push(...r.bindings);
    }
    return { status: 'matched', bindings };
  }
  if ('any' in cond) {
    const bindings: Binding[] = [];
    let na: string | null = null;
    for (const c of cond.any) {
      const r = evaluate(c, ctx);
      if (r.status === 'not_applicable') { na ??= r.reason; continue; }
      if (r.status === 'matched') bindings.push(...r.bindings);
    }
    if (bindings.length > 0) return { status: 'matched', bindings };
    // 全部唔中，但有部分查唔到 → 唔可以話「冇」
    return na ? { status: 'not_applicable', reason: na } : { status: 'unmatched' };
  }
  if ('not' in cond) {
    const r = evaluate(cond.not, ctx);
    if (r.status === 'not_applicable') return r;
    return r.status === 'matched'
      ? { status: 'unmatched' }
      : { status: 'matched', bindings: [] };
  }

  /* ── 原子 ── */
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
    if (p.stars.some((s) => s.kind === 'major')) return { status: 'unmatched' };
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
    const ia = ctx.chart.palaces.findIndex((p) => p.branch === ba);
    const ib = ctx.chart.palaces.findIndex((p) => p.branch === bb);
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
      const hit = four.find((p) => p.stars.some((s) => s.name === cond.contains));
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
        if (ok) found.push({ branch: p.branch, star: s.name });
      }
    }
    const n = found.length;
    const pass = cond.op === 'gte' ? n >= cond.n : cond.op === 'lte' ? n <= cond.n : n === cond.n;
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
    const majors = p.stars.filter((s) => s.kind === 'major');
    if (majors.length === 0) return { status: 'unmatched' };
    const hit = majors.filter((s) => s.brightness && cond.levels.includes(s.brightness));
    if (hit.length === 0) return { status: 'unmatched' };
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
    const p = ctx.chart.palaces.find((q) => q.stars.some((s) => s.name === cond.star));
    const s = p?.stars.find((x) => x.name === cond.star);
    if (!p || !s) return { status: 'unmatched' };
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

  // { star, in }
  const b = branchOfPalace(cond.in, ctx);
  if ('missing' in b) return { status: 'not_applicable', reason: b.missing };
  const p = ctx.chart.palaces.find((q) => q.branch === b.branch)!;
  if (!p.stars.some((s) => s.name === cond.star)) return { status: 'unmatched' };
  const layer = cond.in.layer ?? 'natal';
  return {
    status: 'matched',
    bindings: [bind(b.branch, ctx, {
      layer, star: cond.star,
      note: `${cond.star} 坐${LAYER_ZH[layer]}${cond.in.name}（${b.branch}）`,
    })],
  };
}
