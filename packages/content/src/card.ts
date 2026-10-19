/**
 * 條件卡（新架構判斷層，2026-10-19 草稿，見 docs/architecture-v2-plan-2026-10-19.md）
 *
 * 一張卡 = 王亭之原文一個有條件嘅講法，用自己文字寫，條件寫成資料。
 * 判斷層逐宮逐話題揀卡；寫作層只寫揀中嘅卡，一個話題一把聲。
 *
 * 同舊做法嘅分別：舊做法每粒星各自出句，事後先搵矛盾剷句（clash.ts）。
 * 卡喺揀嘅時候已經知道自己屬邊個話題、邊頭偏向、要乜條件，所以唔使事後補鑊。
 *
 * 條件用 condition.ts 嘅語言（有層次：本命／大限／流年，命中會回 binding 做證據）。
 * 出處直接指 tools/wang-reference 索引嘅段落 id，連原文指紋 —— 原文提取一改，測試即刻提。
 */
import { z } from 'zod';
import { annual as annualOf, type AnnualChart, type Chart, type Decadal } from '@guanwei/ziwei';
import { STEPS_UNTIL_AGE } from './steps';
import { evaluate, type Binding, type Condition } from './condition';
import { ConditionSchema } from './rule';
import { leanOf, xingxiOf } from './xingxi';
/* 寫卡喺 tools/cards/ming/NN.json（一個星系一個檔），用 tools/cards/merge.mjs 合併成呢個檔 */
import raw from './cards/ming.json';

/** 命宮話題表（2026-10-19 批）。 */
export const MING_TOPICS = ['本質', '格局', '處事', '待人', '運程'] as const;

export const CardSource = z.object({
  /** 索引段落 id：wtz.deep.p070.b007 或者 wtz.initial.21.p0022 */
  id: z.string().regex(/^wtz\.(deep\.p\d{3}\.b\d{3}|initial\.\d{2}\.p\d{4})$/),
  /** 深造段落嘅 text_sha256（初階轉錄冇指紋，留空） */
  sha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
});

export const Card = z
  .object({
    id: z.string().regex(/^card\.[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$/),
    palace: z.literal('命宮'),
    topic: z.enum(MING_TOPICS),
    /**
     * claim：結論；caveat：修飾、限制；advice：點做。
     * 一個話題揀一張 claim，caveat／advice 跟住佢。
     */
    kind: z.enum(['claim', 'caveat', 'advice']),
    /** 命宮星系（六十星系編號，同 xingxi/systems.json 嘅 n）。 */
    system: z.number().int().min(1).max(60),
    /**
     * 只適用於呢個偏向；唔寫 = 點都啱。可以寫星系比較軸嘅一頭、「平衡」（兩頭都有證據而且一樣多，即原文「中和」），
     * 或者「無偏」（兩頭都冇證據）。原文講「非 X」就寫陣列，例如 ['目標', '平衡', '無偏']。
     */
    pole: z.union([z.string(), z.array(z.string()).min(1)]).optional(),
    /** 原文明寫嘅前提。 */
    when: ConditionSchema.optional(),
    /** 原文明寫嘅排除。 */
    none: ConditionSchema.optional(),
    /**
     * 本命「運程」卡講「邊幾個十年」：大限層條件（例如大限命宮見天府）。
     * 寫作層逐個大限對，將中咗嗰幾個十年嘅歲數填入 claim 嘅 `{decades}`。
     * 一個都唔中，卡唔出。
     */
    decades: ConditionSchema.optional(),
    /** 原文講嘅時間層。本命卡寫入命宮章；大限、流年卡由運限章揀。 */
    layer: z.enum(['natal', 'decade', 'annual']),
    /** 用自己文字寫嘅原文重點：唔可以比原文講得更強。 */
    claim: z.string().min(4),
    /** 英文版（新書用卡 id 做 key，唔再逐句對中文）。 */
    en: z.string().min(4).optional(),
    /** 原文嘅界線：唔可以推到幾遠。 */
    limit: z.string().optional(),
    /** 條件罕見（例如三層四化齊備），抽樣盤可能一次都唔中；測試唔要求命中。 */
    rare: z.boolean().optional(),
    sources: z.array(CardSource).min(1),
    /**
     * draft：寫好未覆核；reviewed：第二個人對過原頁；
     * needs_atom：原文條件（例如「在野孤君」「空庫露庫」）條件語言未寫得出，暫時唔出。
     * hold：原文有疑問（疑字、前後矛盾）待核，暫時唔出；note 要講明原因。
     */
    status: z.enum(['draft', 'reviewed', 'needs_atom', 'hold']),
    note: z.string().optional(),
  })
  .superRefine((c, ctx) => {
    if (c.layer !== 'natal' && c.topic !== '運程') {
      ctx.addIssue({ code: 'custom', message: `${c.id}：大限／流年卡只放「運程」` });
    }
    if (!!c.decades !== c.claim.includes('{decades}')) {
      ctx.addIssue({ code: 'custom', message: `${c.id}：有 decades 就要喺 claim 寫 {decades}，反之亦然` });
    }
    if (c.decades && (c.layer !== 'natal' || c.topic !== '運程')) {
      ctx.addIssue({ code: 'custom', message: `${c.id}：decades 只用喺本命「運程」卡` });
    }
  });
export type Card = z.infer<typeof Card>;

export const CARDS: Card[] = z.array(Card).parse(raw);

export function parseCards(x: unknown): Card[] {
  return z.array(Card).parse(x);
}

export type Hit = { card: Card; bindings: Binding[]; decades?: Decadal[] };

/** 邊幾個十年（虛歲 90 前）符合大限層條件。 */
export function decadesFor(chart: Chart, cond: Condition): Decadal[] {
  return chart.decadals.filter((d) => {
    if (d.fromAge >= STEPS_UNTIL_AGE) return false;
    const a = annualOf(chart, chart.lunar.y + d.fromAge - 1);
    return a.ok && evaluate(cond, { chart, annual: a.value }).status === 'matched';
  });
}

function check(cond: Condition | undefined, ctx: { chart: Chart; annual?: AnnualChart }) {
  return cond ? evaluate(cond, ctx) : { status: 'matched' as const, bindings: [] as Binding[] };
}

/**
 * 呢張盤命宮命中邊啲卡。
 *
 * 次序：星系 → 偏向 → 前提 → 排除。前提要成立（not_applicable 當唔成立：冇流年資料就唔講流年）。
 * 只出 status 唔係 needs_atom／hold 嘅卡。
 */
export function cardsFor(chart: Chart, annual?: AnnualChart, layer: Card['layer'] = 'natal', pool: Card[] = CARDS): Hit[] {
  const x = xingxiOf(chart);
  if (!x) return [];
  const lean = leanOf(chart, x.system);
  const pole = lean.state === 'none' ? '無偏' : lean.pole;
  const ctx = { chart, annual };
  const hits: Hit[] = [];
  for (const card of pool) {
    if (card.status === 'needs_atom' || card.status === 'hold' || card.layer !== layer || card.system !== x.system.n) continue;
    if (card.pole && !(Array.isArray(card.pole) ? card.pole : [card.pole]).includes(pole)) continue;
    const w = check(card.when, ctx);
    if (w.status !== 'matched') continue;
    if (card.none && evaluate(card.none, ctx).status === 'matched') continue;
    if (card.decades) {
      const ds = decadesFor(chart, card.decades);
      if (!ds.length) continue;
      hits.push({ card, bindings: w.bindings, decades: ds });
      continue;
    }
    hits.push({ card, bindings: w.bindings });
  }
  return hits;
}
