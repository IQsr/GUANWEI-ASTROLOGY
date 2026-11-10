/*
 * 綜合判讀層（試點：錢、今年 · 2026-10-27，docs/synthesis-layer-2026-10-27.md）
 *
 * 舊做法：一宮 × 主星 → 查一張原書卡，其他因素變附加句。
 * 呢度：因素表 → 判斷卡配對（condition.ts）→ 裁決（固定規則）→ 一章寫 1–3 個判斷，
 * 每個判斷講「因為」邊幾個因素，再掛原文。
 *
 * 條件核對（設計 §4）喺呢度做嘅：
 *   G1 借星：卡 `seat` 預設 seated；本宮空宮就只接受 borrowed／both 卡。
 *   G2 廟陷：用 BOOK_BRIGHTNESS（引擎表加原書逐格裁決），唔用引擎表。
 *   G3 分層：卡寫明 natal／decade／annual，$L 只代入卡自己嘅層。
 *   G4 專條優先：同一 group 有 system 卡命中，general 卡唔出。
 *   G5 偏向：只用原文明寫嘅判準（而家得天機丑未「下游」一條）。
 *   G8 缺乏唔等於相反：`none` 只會令卡唔出，唔產生判斷。
 * 其餘（G6 G7 G9 G10）係寫作層 lint，見 `synthesisLint`。
 */
import { z } from 'zod';
import { annual as annualOf, type AnnualChart, type Chart } from '@guanwei/ziwei';
import { evaluate, type Binding, type Condition, type EvalContext } from '../condition';
import { ConditionSchema } from '../rule';
import { xingxiOf } from '../xingxi';
import type { MingStatement } from '../ming-writer';
import rawCards from './cards.json';
import rawSources from './sources.json';
import rawAnnualCai from './annual-cai.json';
import rawAnnualGuan from './annual-guan.json';
import rawAnnualFuqi from './annual-fuqi.json';
import rawAnnualJie from './annual-jie.json';
import rawAnnualFumu from './annual-fumu.json';
import rawAnnualXiongdi from './annual-xiongdi.json';
import rawAnnualZinv from './annual-zinv.json';
import rawAnnualTian from './annual-tian.json';
import rawAnnualQian from './annual-qian.json';
import rawAnnualPuyi from './annual-puyi.json';
import rawAnnualFude from './annual-fude.json';

export const SYNTHESIS_VERSION = 'synthesis-v1';
export const synthesisCiteId = (block: string) => `syn.v1:${block}`;

/* ── 原書段落 ───────────────────────────────────────── */

export type SynthesisSource = { id: string; sha256: string; page: number; section: string; excerpt: string };
const SOURCES = new Map(Object.values((rawSources as { sources: Record<string, SynthesisSource> }).sources).map((s) => [synthesisCiteId(s.id), s]));
/** 讀者見到嘅節名：刪走索引加嘅〔編輯導航…〕〔原提取序號…〕註（2026-10-28 盲評 ab8：唔可以出現喺付費正文）。 */
export const synthesisSource = (citeId: string): SynthesisSource | null => {
  const s = SOURCES.get(citeId);
  return s ? { ...s, section: s.section.replace(/〔[^〕]*〕/g, '').trim() } : null;
};
export const SYNTHESIS_SOURCES = [...SOURCES.values()];

/* ── 廟陷（G2）────────────────────────────────────────
 * 引擎表（brightness.json）抄自 iztro，同王亭之 p.327 有 61 格唔同。
 * 新層只採報告（docs/brightness-wang-check.md）「內文同書表一致」同「按內文改」嗰 12 格；
 * 其餘照引擎。引擎表本身唔郁，舊流程同快照不受影響。
 */
const BOOK_LUOXIAN: Record<string, string[]> = {
  太陽: ['丑', '戌'], 太陰: ['午', '未'], 破軍: ['寅', '申'], 天府: ['酉'], 武曲: ['卯'], 七殺: ['卯', '酉'], 天同: ['丑', '未'],
};
export function bookBrightness(star: { name: string; brightness?: string }, branch: string): string | undefined {
  return BOOK_LUOXIAN[star.name]?.includes(branch) ? '陷' : star.brightness;
}

/* ── 判斷卡 ─────────────────────────────────────────── */

const PalaceRefSchema = z.object({ name: z.string(), layer: z.string().optional() });
const Layer = z.enum(['natal', 'decade', 'annual']);
export const SynthesisCard = z.object({
  id: z.string().regex(/^syn(\.[a-z0-9-]+){2,3}$/),
  chapter: z.enum(['錢', '今年', '事業', '感情', '健康', '父母', '兄弟', '子女', '田宅', '遷移', '交友', '心境']),
  /** 同一個因素嘅卡一組；裁決時專條（system）壓通則（general）。 */
  group: z.string(),
  specificity: z.enum(['general', 'system']),
  polarity: z.enum(['吉', '凶', '中']),
  /** 原文語氣：斷（主、決主、必）／傾（往往、易、宜、一般）／提（樞紐、值得留意）。 */
  weight: z.enum(['斷', '傾', '提']),
  /** G1：只限實坐、只限借星、或者兩樣都得。 */
  seat: z.enum(['seated', 'borrowed', 'both']),
  layer: z.array(Layer).min(1),
  /** 只適用於呢幾個命宮星系（xingxi n）。 */
  system: z.array(z.number().int()).optional(),
  /** G1：命宮星系要實坐（預設）定借星都得。原書 p.185、p.193 講明借星後三合會變。 */
  ming: z.enum(['seated', 'both']).optional(),
  when: z.unknown().optional(),
  /** 額外要成立嘅條件（同 when 一樣，分開寫係為咗清楚邊句係主條件）。 */
  requires: z.unknown().optional(),
  none: z.unknown().optional(),
  /** 呢粒星喺呢個宮，而且係宮內唯一主星。 */
  alone: z.object({ star: z.string(), in: PalaceRefSchema }).optional(),
  /** G2：原書廟陷（該星所在宮）。 */
  bright: z.object({ star: z.string(), levels: z.array(z.string()).min(1) }).optional(),
  /** G5：原文明寫判準嘅偏向。 */
  lean: z.string().optional(),
  age: z.object({ gte: z.number().optional(), lt: z.number().optional() }).optional(),
  /** 唔能用條件語言寫嘅流年配對（同一粒星跨層），喺 SPECIAL 實作。 */
  special: z.enum(['luToJi', 'jiToLu', 'luChongPo', 'luWeak', 'luKongJie', 'changKeXian', 'changKe',
    'decLuToJi', 'decLuChongPo', 'jiToQuanJi', 'jiToQuan', 'dieLuDec', 'dieLuNatal', 'jiLands', 'yangTuoJiaJi',
    'decJiToLu', 'decJiToQuanJi', 'decJiToQuan', 'decJiLands']).optional(),
  because: z.string(),
  claim: z.string(),
  /** G9：建議一定要講得出點解係呢個盤。 */
  advice: z.object({ text: z.string(), why: z.string() }).optional(),
  source: z.string().regex(/^wtz\.deep\.p\d{3}\.b\d{3}$/),
  quote: z.string(),
}).strict();
export type SynthesisCard = z.infer<typeof SynthesisCard>;

const BASE_CARDS: SynthesisCard[] = (rawCards as { cards: unknown[] }).cards.map((c) => {
  const card = SynthesisCard.parse(c);
  for (const k of ['when', 'requires', 'none'] as const) if (card[k] !== undefined) ConditionSchema.parse(subst(card[k], 'annual'));
  const src = SOURCES.get(synthesisCiteId(card.source));
  if (!src) throw Error(`${card.id}: 未收段落 ${card.source}`);
  if (!src.excerpt.includes(card.quote)) throw Error(`${card.id}: 引文唔係原文子串`);
  if (!card.special && !card.when && !card.alone) throw Error(`${card.id}: 冇條件`);
  return card;
});

/*
 * 財帛空宮借星（2026-10-29）。初階轉錄第9篇第38–41段「借星安宮」：本宮無正曜，要借對宮成組星曜入本宮；
 * 本宮同對宮合起來嘅性質，大致等於借入之後。所以錢章嘅實坐卡，喺財帛空宮時改睇福德（財帛對宮）。
 * 只借條件借入後仍然睇得啱嘅卡：夾、對宮、三方會照、得祿、地支、廟陷都以星所在宮計，借入後會睇錯宮（第42段：三方要另借），唔借。
 */
const BORROW_FROM: Record<string, string> = { 財帛: '福德' };
/** 錢章輔煞通則卡（財帛篇首 p.430–432，唔分主星）：另計，最多兩段，唔同主星卡爭位。 */
const MINOR_GROUP = '輔煞.';
function borrowSafe(x: unknown): boolean {
  if (Array.isArray(x)) return x.every(borrowSafe);
  if (!x || typeof x !== 'object') return true;
  const o = x as Record<string, unknown>;
  if ('all' in o) return borrowSafe(o.all);
  if ('any' in o) return borrowSafe(o.any);
  if ('not' in o) return borrowSafe(o.not);
  if (('star' in o || 'hua' in o) && ('in' in o || 'hua' in o)) return true;
  if ('together' in o || 'sanfangOf' in o) return true;
  return 'meets' in o && o.reach === 'same';
}
/** 「X 坐財帛」「化X落財帛」→ 財帛或者福德（財帛自己嘅輔煞照計，主星一定喺福德）。 */
function borrowCond(x: unknown, from: string, to: string): unknown {
  if (Array.isArray(x)) return x.map((y) => borrowCond(y, from, to));
  if (!x || typeof x !== 'object') return x;
  const o = x as Record<string, unknown>;
  if ((typeof o.star === 'string' || typeof o.hua === 'string') && (o.in as { name?: string } | undefined)?.name === from)
    return { any: [o, { ...o, in: { ...(o.in as object), name: to } }] };
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, borrowCond(v, from, to)]));
}
function borrowed(c: SynthesisCard): SynthesisCard[] {
  if (c.chapter !== '錢' || c.seat !== 'seated' || c.bright || c.special || !c.when) return [];
  if (![c.when, c.requires, c.none].every(borrowSafe)) return [];
  const from = '財帛', to = BORROW_FROM[from]!;
  // 「坐守」「坐X」唔寫：借入唔等於實坐（盲評 ab10）
  const rest = c.because.replace(/^你的財帛宮(由|有)?/, '').replace(/^坐(?!守)/, '').replace(/坐守/, '').replace(/。$/, '');
  return [{ ...c, id: `${c.id}.borrowed`, seat: 'borrowed',
    when: { all: [{ empty: { name: from } }, borrowCond(c.when, from, to)] },
    ...(c.requires !== undefined ? { requires: borrowCond(c.requires, from, to) } : {}),
    ...(c.none !== undefined ? { none: borrowCond(c.none, from, to) } : {}),
    ...(c.alone ? { alone: { star: c.alone.star, in: { ...c.alone.in, name: to } } } : {}),
    because: c.group.startsWith(MINOR_GROUP) ? c.because.replace(/^你的財帛宮/, '你的財帛宮連同借入的福德宮星曜，') : `這一點看的是對宮福德宮的${rest}。` }];
}
/** 借星：第一段先講一次成組借入（初階第9篇第39段：唔止借正曜），之後每段只講睇邊粒。 */
function borrowLead(chart: Chart): string {
  const name = (p: Chart['palaces'][number]) => p.stars.map((x) => x.name + (x.sihua ? `化${x.sihua}` : '')).join('、');
  const cai = chart.palaces.find((p) => p.name === '財帛')!, fu = chart.palaces.find((p) => p.name === '福德')!;
  const own = cai.stars.length ? `，加上財帛宮本身的${name(cai)}` : '';
  return `你的財帛宮沒有主星，要連同對宮福德宮整組星曜一起看：${name(fu)}${own}。`;
}
export const SYNTHESIS_CARDS: SynthesisCard[] = [...BASE_CARDS, ...BASE_CARDS.flatMap(borrowed)];

/** 將條件入面嘅 `$L` 換成卡而家評估嗰層。 */
function subst<T>(x: T, layer: string): T {
  return JSON.parse(JSON.stringify(x).replaceAll('"$L"', JSON.stringify(layer))) as T;
}

/* ── 因素表 ─────────────────────────────────────────── */

const MAJOR = new Set(['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍']);
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const OPPOSITE = (b: string) => BRANCHES[(BRANCHES.indexOf(b) + 6) % 12]!;
const WEAK = ['子', '午', '卯', '酉'];
/** 宮名 → 讀者話題（今年章講「同X有關嘅錢」用）。 */
const TOPIC: Record<string, string> = {
  // 2026-10-28：要放得入「在X方面」「和X有關的錢」兩種句式；唔好有「和」、唔好用「你自己」
  命宮: '個人發展', 兄弟: '兄弟姊妹、平輩、合作夥伴', 夫妻: '伴侶、感情', 子女: '子女、親近的後輩', 財帛: '收入', 疾厄: '身體',
  遷移: '外出', 僕役: '朋友、一般往來的下屬', 官祿: '工作', 田宅: '家宅、物業', 福德: '心情、享受', 父母: '長輩、上司',
};

export type Period = { layer: 'decade' | 'annual'; label: string };

/** 一張卡嘅一次命中：證據（bindings）同填好嘅字。 */
export type SynthesisHit = { card: SynthesisCard; layer: 'natal' | 'decade' | 'annual'; vars: Record<string, string>; bindings: Binding[] };

type Ctx = { chart: Chart; annual?: AnnualChart; age?: number };

function palaceAt(ctx: Ctx, name: string, layer: string) {
  if (layer === 'natal') return ctx.chart.palaces.find((p) => p.name === name);
  const o = ctx.annual?.overlay.find((x) => (layer === 'annual' ? x.annual : x.decadal) === name);
  return o ? ctx.chart.palaces.find((p) => p.branch === o.branch) : undefined;
}
const majors = (p: Chart['palaces'][number]) => p.stars.filter((s) => MAJOR.has(s.name));

/** G5：天機丑未「下游」（p.130：「若无吉化，但有煞曜同躔，则此天机为下游」）。其他星系未有明寫判準，回 undefined。 */
function leanOf(chart: Chart): string | undefined {
  const x = xingxiOf(chart);
  if (!x || x.system.n !== 32 || x.borrowed) return undefined;
  const m = chart.palaces.find((p) => p.branch === chart.mingGong)!;
  const ji = m.stars.find((s) => s.name === '天機');
  const good = ji?.sihua && ji.sihua !== '忌';
  const sha = m.stars.some((s) => ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'].includes(s.name));
  return !good && sha ? '下游' : good ? '上進' : undefined;
}

/* ── 配對 ───────────────────────────────────────────── */

function matchCard(card: SynthesisCard, layer: 'natal' | 'decade' | 'annual', ctx: Ctx): SynthesisHit | null {
  const e: EvalContext = { chart: ctx.chart, ...(ctx.annual ? { annual: ctx.annual } : {}) };
  if (card.system) { const x = xingxiOf(ctx.chart); if (!x || !card.system.includes(x.system.n) || (x.borrowed && card.ming !== 'both')) return null; }
  if (card.lean && leanOf(ctx.chart) !== card.lean) return null;
  if (card.age && ctx.age !== undefined && ((card.age.gte !== undefined && ctx.age < card.age.gte) || (card.age.lt !== undefined && ctx.age >= card.age.lt))) return null;
  const vars: Record<string, string> = { period: layer === 'annual' ? '今年' : '這十年' };
  const bindings: Binding[] = [];
  // G1：卡指住嘅宮（alone／條件入面第一個宮）係空宮就要 borrowed／both
  if (card.alone) {
    const p = palaceAt(ctx, card.alone.in.name, card.alone.in.layer === '$L' ? layer : card.alone.in.layer ?? 'natal');
    if (!p) return null;
    const ms = majors(p);
    if (card.seat === 'seated' && ms.length === 0) return null;
    if (ms.length !== 1 || ms[0]!.name !== card.alone.star) return null;
    vars.branch = p.branch;
  }
  for (const k of ['when', 'requires'] as const) {
    if (card[k] === undefined) continue;
    const r = evaluate(subst(card[k], layer) as Condition, e);
    if (r.status !== 'matched') return null;
    bindings.push(...r.bindings);
    vars.branch ??= r.bindings.find((b) => b.branch)?.branch ?? '';
  }
  if (card.none !== undefined && evaluate(subst(card.none, layer) as Condition, e).status !== 'unmatched') return null;
  if (card.bright) {
    const p = ctx.chart.palaces.find((q) => q.stars.some((s) => s.name === card.bright!.star));
    const s = p?.stars.find((x) => x.name === card.bright!.star);
    if (!p || !s || !card.bright.levels.includes(bookBrightness(s, p.branch) ?? '')) return null;
  }
  if (card.special) {
    const extra = SPECIAL[card.special](ctx);
    if (!extra) return null;
    Object.assign(vars, extra);
    const at = AT[card.special]?.(ctx);
    if (at?.length) vars.at = at.join('');
  }
  // 借星卡：火鈴可以喺財帛自己或者借入嘅福德
  const fireIn = card.seat === 'borrowed' && card.chapter === '錢' ? ['財帛', '福德'] : ['財帛'];
  const fire = ctx.chart.palaces.filter((p) => fireIn.includes(p.name)).flatMap((p) => p.stars).filter((s) => s.name === '火星' || s.name === '鈴星').map((s) => s.name);
  if (fire?.length) vars.fireBell = fire.join('、');
  if (card.group.startsWith(MINOR_GROUP)) {
    const names = new Set<string>(), walk = (x: unknown): void => {
      if (Array.isArray(x)) x.forEach(walk);
      else if (x && typeof x === 'object') { const o = x as Record<string, unknown>; if (typeof o.star === 'string' && o.in) names.add(o.star); Object.values(o).forEach(walk); }
    };
    walk(card.when);
    const here = ctx.chart.palaces.filter((p) => fireIn.includes(p.name)).flatMap((p) => p.stars);
    const ji = JSON.stringify(card.when).includes('"hua":"忌","in"') ? here.filter((s) => s.sihua === '忌').map((s) => `化忌的${s.name}`) : [];
    vars.minor = [...here.filter((s) => names.has(s.name) && s.name !== '火星' && s.name !== '鈴星').map((s) => s.name), ...ji].join('、');
  }
  return { card, layer, vars, bindings };
}

/** 跨層、同一粒星嘅配對（條件語言寫唔到「本命化祿嗰粒今年化忌」）。 */
const SPECIAL: Record<NonNullable<SynthesisCard['special']>, (ctx: Ctx) => Record<string, string> | null> = {
  luToJi: ({ annual: a }) => {
    const s = a?.sihua.natal.find((n) => n.hua === '祿' && a.sihua.annual.some((y) => y.hua === '忌' && y.star === n.star));
    return s && s.natalPalace ? { star: s.star, palaceTopic: TOPIC[s.natalPalace] ?? s.natalPalace } : null;
  },
  jiToLu: ({ annual: a }) => {
    const s = a?.sihua.natal.find((n) => n.hua === '忌' && a.sihua.annual.some((y) => y.hua === '祿' && y.star === n.star));
    return s && s.natalPalace ? { star: s.star, palaceTopic: TOPIC[s.natalPalace] ?? s.natalPalace } : null;
  },
  luChongPo: ({ annual: a }) => {
    const ji = a?.sihua.annual.find((y) => y.hua === '忌');
    const lu = ji?.branch ? a!.sihua.natal.find((n) => n.hua === '祿' && n.branch === OPPOSITE(ji.branch!)) : undefined;
    return ji && lu && lu.natalPalace ? { jiStar: ji.star, jiBranch: ji.branch!, luStar: lu.star, luPalace: `${lu.natalPalace}宮`.replace('宮宮', '宮'), luTopic: TOPIC[lu.natalPalace] ?? lu.natalPalace } : null;
  },
  luWeak: ({ annual: a }) => {
    const lu = a?.sihua.annual.find((y) => y.hua === '祿');
    return lu?.branch && WEAK.includes(lu.branch) ? { star: lu.star, branch: lu.branch } : null;
  },
  luKongJie: ({ chart, annual: a }) => {
    const lu = a?.sihua.annual.find((y) => y.hua === '祿');
    const p = lu?.branch ? chart.palaces.find((q) => q.branch === lu.branch) : undefined;
    const kj = p?.stars.filter((s) => s.name === '地空' || s.name === '地劫').map((s) => s.name) ?? [];
    const topic = lu ? a!.overlay.find((o) => o.branch === lu.branch)?.annual : undefined;
    return lu && kj.length && topic ? { star: lu.star, branch: lu.branch!, kongjie: kj.join('、'), palaceTopic: TOPIC[topic] ?? topic } : null;
  },
  changKeXian: ({ annual: a }) => {
    const ke = a?.sihua.annual.find((y) => y.hua === '科' && y.star === '文昌');
    return ke?.branch && ['寅', '午', '戌'].includes(ke.branch) ? { branch: ke.branch } : null;
  },
  changKe: ({ annual: a }) => {
    const ke = a?.sihua.annual.find((y) => y.hua === '科' && y.star === '文昌');
    return ke?.branch && !['寅', '午', '戌'].includes(ke.branch) ? { branch: ke.branch } : null;
  },
  // ── 2026-10-28 交會卡（盲評 ab6 指出短版漏咗嘅交會）──
  /** 大限化祿嗰粒今年化忌（p.236 講原局；大限做背景，p.235 要睇大限同流年兩組）。 */
  decLuToJi: ({ annual: a }) => {
    const s = a?.sihua.decadal?.find((d) => d.hua === '祿' && a.sihua.annual.some((y) => y.hua === '忌' && y.star === d.star));
    return s && s.annualPalace ? { star: s.star, palaceTopic: topicOf(s.annualPalace) } : null;
  },
  /** 祿忌跨大限、流年相沖：流年忌沖大限祿，或者大限忌沖流年祿（p.236「化祿最嫌為忌沖破」）。 */
  decLuChongPo: ({ annual: a }) => {
    const dec = a?.sihua.decadal;
    if (!a || !dec) return null;
    const pair = (ji: typeof dec[number] | undefined, lus: typeof dec, jiLayer: string, luLayer: string) => {
      const lu = ji?.branch ? lus.find((n) => n.hua === '祿' && n.branch === OPPOSITE(ji.branch!)) : undefined;
      return ji && lu?.annualPalace ? { jiStar: `${jiLayer}${ji.star}`, jiBranch: ji.branch!, luStar: `${luLayer}${lu.star}`, luPalace: `今年${lu.annualPalace}宮`.replace('宮宮', '宮'), luTopic: topicOf(lu.annualPalace) } : null;
    };
    return pair(a.sihua.annual.find((y) => y.hua === '忌'), dec, '今年', '這十年')
      ?? pair(dec.find((d) => d.hua === '忌'), a.sihua.annual, '這十年', '今年');
  },
  /** 本命天機化忌，運限天機化權（p.263 專條）。 */
  jiToQuanJi: ({ annual: a }) => {
    if (!a?.sihua.natal.some((n) => n.hua === '忌' && n.star === '天機')) return null;
    const q = a.sihua.annual.find((y) => y.hua === '權' && y.star === '天機');
    return q?.annualPalace ? { palaceTopic: topicOf(q.annualPalace) } : null;
  },
  /** 本命化忌，運限化權（p.237 通則）；天機有專條，喺上面。 */
  jiToQuan: ({ annual: a }) => {
    const n = a?.sihua.natal.find((x) => x.hua === '忌' && x.star !== '天機' && a.sihua.annual.some((y) => y.hua === '權' && y.star === x.star));
    const q = n && a!.sihua.annual.find((y) => y.hua === '權' && y.star === n.star);
    return q?.annualPalace ? { star: q.star, palaceTopic: topicOf(q.annualPalace) } : null;
  },
  // ── 2026-11-09 大限化忌 × 流年（盲評 ab11、ab12：兩次都話大限化曜冇用齊）──
  // p.235：推斷流年「通常只需視大限及流年兩組化曜」，所以本命→運限嘅條文照用落大限→流年（同 decLuToJi 一樣）
  /** 大限化忌嗰粒今年化祿（p.236 b003 原局忌、運限祿）。 */
  decJiToLu: ({ annual: a }) => {
    const s = a?.sihua.decadal?.find((d) => d.hua === '忌' && a.sihua.annual.some((y) => y.hua === '祿' && y.star === d.star));
    const lu = s && a!.sihua.annual.find((y) => y.hua === '祿' && y.star === s.star);
    return s && lu?.annualPalace ? { star: s.star, palaceTopic: topicOf(lu.annualPalace) } : null;
  },
  /** 大限天機化忌，今年天機化權（p.263 b010 專條，原文講明「在流年或大運之內」）。 */
  decJiToQuanJi: ({ annual: a }) => {
    if (!a?.sihua.decadal?.some((d) => d.hua === '忌' && d.star === '天機')) return null;
    const q = a.sihua.annual.find((y) => y.hua === '權' && y.star === '天機');
    return q?.annualPalace ? { palaceTopic: topicOf(q.annualPalace) } : null;
  },
  /** 大限化忌，今年同一粒化權（p.237 b006 通則）；天機有專條。 */
  decJiToQuan: ({ annual: a }) => {
    const d = a?.sihua.decadal?.find((x) => x.hua === '忌' && x.star !== '天機' && a.sihua.annual.some((y) => y.hua === '權' && y.star === x.star));
    const q = d && a!.sihua.annual.find((y) => y.hua === '權' && y.star === d.star);
    return q?.annualPalace ? { star: q.star, palaceTopic: topicOf(q.annualPalace) } : null;
  },
  /** 大限化忌今年落喺邊個流年宮（p.235 化忌為障礙；大限化曜係呢段時期嘅環境）。命宮唔講（太泛）。 */
  decJiLands: ({ annual: a }) => {
    const ji = a?.sihua.decadal?.find((d) => d.hua === '忌');
    if (!ji?.branch || !ji.annualPalace || ji.annualPalace === '命宮') return null;
    // 宮名跟宮段標題用讀者叫法（交友宮、事業宮）
    const label = ({ 僕役: '交友宮', 官祿: '事業宮' } as Record<string, string>)[ji.annualPalace] ?? `${ji.annualPalace}宮`.replace('宮宮', '宮');
    return { star: ji.star, branch: ji.branch, annualPalace: label, topic: topicOf(ji.annualPalace) };
  },
  /** 流年化祿同大限化祿／大限祿存同度或相對（p.431：大運與流年亦可構成疊祿）。 */
  dieLuDec: ({ annual: a }) => {
    const lu = a?.sihua.annual.find((y) => y.hua === '祿');
    if (!lu?.branch || !a?.sihua.decadal) return null;
    const near = (b: string | null | undefined) => !!b && (b === lu.branch || b === OPPOSITE(lu.branch!));
    const d = a.sihua.decadal.find((x) => x.hua === '祿' && near(x.branch));
    const what = d ? `這十年的${d.star}化祿` : near(a.liuyao.decadal?.祿存) ? '這十年大限的祿存' : null;
    const at = d ? d.branch : a.liuyao.decadal?.祿存;
    return what ? { star: lu.star, what, rel: at === lu.branch ? '同宮' : '相對' } : null;
  },
  /** 流年化祿同本命祿存／本命化祿同度或相對（p.431：流年與原局構成之疊祿，力量甚輕）。 */
  dieLuNatal: ({ chart, annual: a }) => {
    const lu = a?.sihua.annual.find((y) => y.hua === '祿');
    if (!lu?.branch) return null;
    const near = (b: string | null | undefined) => !!b && (b === lu.branch || b === OPPOSITE(lu.branch!));
    const n = a!.sihua.natal.find((x) => x.hua === '祿' && x.star !== lu.star && near(x.branch));
    const cun = chart.palaces.find((p) => p.stars.some((s) => s.name === '祿存'))?.branch;
    const what = n ? `本命的${n.star}化祿` : near(cun) ? '本命祿存' : null;
    const at = n ? n.branch : cun;
    return what ? { star: lu.star, what, rel: at === lu.branch ? '同宮' : '相對' } : null;
  },
  /** 流年化忌落點：今年、本命兩層各叫乜（p.235「化忌一般意義為障礙」）。 */
  jiLands: ({ annual: a }) => {
    const ji = a?.sihua.annual.find((y) => y.hua === '忌');
    if (!ji?.branch || !ji.annualPalace) return null;
    const ts = [...new Set([ji.annualPalace, ji.natalPalace].filter((x): x is NonNullable<typeof x> => !!x).map(topicOf))];
    return { star: ji.star, branch: ji.branch, topics: ts.join('方面，以及') };
  },
  /** 流年化忌同本命祿存同度＝羊陀夾忌（p.228）。 */
  yangTuoJiaJi: ({ chart, annual: a }) => {
    const ji = a?.sihua.annual.find((y) => y.hua === '忌');
    const p = ji?.branch ? chart.palaces.find((q) => q.branch === ji.branch) : undefined;
    if (!ji || !p?.stars.some((s) => s.name === '祿存') || !ji.annualPalace) return null;
    const ts = [...new Set([ji.annualPalace, ji.natalPalace].filter((x): x is NonNullable<typeof x> => !!x).map(topicOf))];
    return { star: ji.star, branch: ji.branch!, topics: ts.join('方面，以及') };
  },
};
const topicOf = (palace: string) => TOPIC[palace] ?? palace;
const MONEY_TOPICS = new Set(['財帛', '官祿', '兄弟', '僕役', '田宅'].map((p) => TOPIC[p]!));

/**
 * 跨層卡嘅訊號落喺邊幾個地支（今年化曜所在、被沖嗰宮）。今年章按呢個將訊號併入同宮嘅話題段（2026-11-10，盲評 ab13：訊號寫咗出嚟但未改變該話題嘅結論）。
 * 只計化曜本身所在同忌沖嗰宮；三方會照唔計，免得一粒化曜併入幾個話題。
 */
const yearHua = (a: AnnualChart | undefined, hua: string) => a?.sihua.annual.find((y) => y.hua === hua);
const decHua = (a: AnnualChart | undefined, hua: string) => a?.sihua.decadal?.find((y) => y.hua === hua);
const bs = (...xs: (string | null | undefined)[]) => xs.filter((x): x is string => !!x);
const AT: Partial<Record<NonNullable<SynthesisCard['special']>, (ctx: Ctx) => string[]>> = {
  luToJi: ({ annual: a }) => bs(yearHua(a, '忌')?.branch),
  jiToLu: ({ annual: a }) => bs(yearHua(a, '祿')?.branch),
  luChongPo: ({ annual: a }) => { const j = yearHua(a, '忌')?.branch; return bs(j, j && OPPOSITE(j)); },
  luWeak: ({ annual: a }) => bs(yearHua(a, '祿')?.branch),
  luKongJie: ({ annual: a }) => bs(yearHua(a, '祿')?.branch),
  decLuToJi: ({ annual: a }) => bs(yearHua(a, '忌')?.branch),
  decLuChongPo: ({ annual: a }) => { const j = yearHua(a, '忌')?.branch, d = decHua(a, '忌')?.branch; return bs(j, j && OPPOSITE(j), d, d && OPPOSITE(d)); },
  jiToQuanJi: ({ annual: a }) => bs(yearHua(a, '權')?.branch),
  jiToQuan: ({ annual: a }) => bs(yearHua(a, '權')?.branch),
  dieLuDec: ({ annual: a }) => bs(yearHua(a, '祿')?.branch),
  dieLuNatal: ({ annual: a }) => bs(yearHua(a, '祿')?.branch),
  jiLands: ({ annual: a }) => bs(yearHua(a, '忌')?.branch),
  yangTuoJiaJi: ({ annual: a }) => bs(yearHua(a, '忌')?.branch),
  decJiToLu: ({ annual: a }) => bs(yearHua(a, '祿')?.branch),
  decJiToQuanJi: ({ annual: a }) => bs(yearHua(a, '權')?.branch),
  decJiToQuan: ({ annual: a }) => bs(yearHua(a, '權')?.branch),
  decJiLands: ({ annual: a }) => bs(decHua(a, '忌')?.branch),
};

/* ── 裁決同強度（設計 §3③、§5）──────────────────────── */

export type Strength = '定論' | '傾向' | '提示';
const STRENGTH: Record<SynthesisCard['weight'], Strength> = { 斷: '定論', 傾: '傾向', 提: '提示' };
const RANK: Record<Strength, number> = { 定論: 0, 傾向: 1, 提示: 2 };
/** 重話：一律最高傾向（用戶 2026-10-27 決定）。 */
const HEAVY = /生離死別|災難|官非|官司|刑克|早寡/;

export type Judgement = SynthesisHit & { strength: Strength; claim: string; because: string; advice?: string; parts?: Judgement[] };

const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? `{${k}}`);

export function resolve(hits: SynthesisHit[]): Judgement[] {
  // G4：同一 group（同層）有 system 卡就唔出 general 卡
  const kept = hits.filter((h) => h.card.specificity === 'system'
    || !hits.some((o) => o !== h && o.card.group === h.card.group && o.layer === h.layer && o.card.specificity === 'system'));
  // 同一 group 同一層只留一張（卡嘅排列次序 = 作者嘅優先次序）
  const seen = new Set<string>();
  const one = kept.filter((h) => { const k = `${h.layer}|${h.card.group}`; if (seen.has(k)) return false; seen.add(k); return true; });
  return one.map((h) => {
    let strength = STRENGTH[h.card.weight];
    const claim = fill(h.card.claim, h.vars);
    if (HEAVY.test(claim) && strength === '定論') strength = '傾向';
    // 吉凶並見：同一 group 同層有相反極性嘅卡命中（未經去重嗰批），呢張降到傾向
    if (strength === '定論' && kept.some((o) => o !== h && o.layer === h.layer && o.card.group === h.card.group
      && ((o.card.polarity === '吉' && h.card.polarity === '凶') || (o.card.polarity === '凶' && h.card.polarity === '吉')))) strength = '傾向';
    // 盲評 ab14：「出錢、合夥先小額」套落子女、伴侶、心情就失真；淨係錢、合作相關嘅話題先出建議
    const adviceFits = !(h.card.special === 'luChongPo' || h.card.special === 'decLuChongPo') || MONEY_TOPICS.has(h.vars.luTopic ?? '');
    return { ...h, strength, claim, because: fill(h.card.because, h.vars), ...(h.card.advice && adviceFits ? { advice: fill(h.card.advice.text, h.vars) } : {}) };
  });
}

/* ── 寫作 ───────────────────────────────────────────── */

export type SynthesisSegment = { slot: string; text: string; heading?: string; statements: MingStatement[]; referenceConditions: string[] };

function segmentOf(j: Judgement, slot: string, heading?: string): SynthesisSegment {
  if (j.parts) return weighedSegment(j, slot, heading);
  const cite = synthesisCiteId(j.card.source);
  const statements: MingStatement[] = [
    { text: j.claim, en: '', kind: 'interpretation', source_ids: [j.card.id], citations: [cite] },
    { text: j.because, en: '', kind: 'evidence', source_ids: [j.card.id], citations: [] },
    ...(j.advice ? [{ text: j.advice, en: '', kind: 'editorial-advice' as const, source_ids: [`${j.card.id}.advice`], citations: [] }] : []),
  ];
  return { slot, ...(heading ? { heading } : {}), text: statements.map((l) => l.text).join(''),
    statements, referenceConditions: [`判斷強度：${j.strength}`, `原文：「${j.card.quote}」`] };
}

/** 守得住錢／守唔住錢嘅講法（錢章卡 claim）。 */
const KEEP_POS = /較能守住錢|擅長把錢積存|較會把錢積存|逐步積聚|儲財能力|有儲錢和理財的能力/;
// 「財源充裕也不代表能積存」（紫微）係提醒，唔係守唔住，唔計
const KEEP_NEG = /難積聚|不容易一直積存|不容易積存|不太擅長守財/;
/** 兩個方向相反嘅判斷並排：「守財這一點，盤上有兩個方向相反的條件：一是…；二是…」，各自跟出處理由。 */
function conflictSegment(a: Judgement, b: Judgement): SynthesisSegment {
  const intro = '在守財這一點上，盤上有兩個方向相反的條件，各有根據：';
  const statements: MingStatement[] = [
    { text: intro, en: '', kind: 'editorial-explanation', source_ids: [a.card.id, b.card.id], citations: [] },
    { text: `一是${a.claim}`, en: '', kind: 'interpretation', source_ids: [a.card.id], citations: [synthesisCiteId(a.card.source)] },
    { text: a.because, en: '', kind: 'evidence', source_ids: [a.card.id], citations: [] },
    { text: `二是${b.claim}`, en: '', kind: 'interpretation', source_ids: [b.card.id], citations: [synthesisCiteId(b.card.source)] },
    { text: b.because, en: '', kind: 'evidence', source_ids: [b.card.id], citations: [] },
  ];
  const strength = RANK[a.strength] > RANK[b.strength] ? a.strength : b.strength;
  return { slot: '展開', text: statements.map((l) => l.text).join(''), statements,
    referenceConditions: [`判斷強度：${strength}`, `原文：「${a.card.quote}」`, `原文：「${b.card.quote}」`] };
}

/** 主線加限制併成一個結論：「甲；不過乙。」跟住兩張卡各自嘅理由。強度取弱嗰個。 */
function pairSegment(main: Judgement, limit: Judgement, slot: string): SynthesisSegment {
  const strength = RANK[limit.strength] > RANK[main.strength] ? limit.strength : main.strength;
  const claim = `${main.claim.replace(/。$/, '')}；不過${limit.claim}`;
  const ids = [main.card.id, limit.card.id];
  // 理由：一樣或者一句包住另一句（「太陽坐守」對「太陽坐守，沒有太陰同度」）就只講長嗰句；兩句借星講法併成一句
  const [m, l] = [main.because, limit.because], short = (x: string) => x.replace(/^你的財帛宮(由|有)?坐?/, '').replace(/坐守|。/g, '');
  const BORROW = '這一點看的是對宮福德宮的';
  const because = m === l || (short(l).includes(short(m)) || short(m).includes(short(l))) ? [m.length >= l.length ? m : l]
    : m.startsWith(BORROW) && l.startsWith(BORROW) ? [`這兩點看的是對宮福德宮的${m.slice(BORROW.length, -1)}、${l.slice(BORROW.length, -1)}。`]
    : [m, l];
  const statements: MingStatement[] = [
    { text: claim, en: '', kind: 'interpretation', source_ids: ids, citations: [...new Set([main, limit].map((j) => synthesisCiteId(j.card.source)))] },
    ...because.map((text): MingStatement => ({ text, en: '', kind: 'evidence', source_ids: ids, citations: [] })),
  ];
  return { slot, text: statements.map((l) => l.text).join(''), statements,
    referenceConditions: [`判斷強度：${strength}`, `原文：「${main.card.quote}」`, `原文：「${limit.card.quote}」`] };
}

/** 卡嘅條件有幾多個原子：越多越具體（例如「天同與火星同度」比「天同守財帛」具體）。 */
function atoms(c: SynthesisCard): number {
  const count = (x: unknown): number => !x || typeof x !== 'object' ? 0
    : Array.isArray(x) ? x.reduce((n: number, y) => n + count(y), 0)
    : 'all' in x || 'any' in x || 'not' in x ? count(Object.values(x)[0])
    // 「三方見煞／見吉」幾乎每張盤都成立，唔算具體
    : 'count' in x ? 0 : 1;
  return count(c.when) + count(c.requires) + count(c.none) + (c.alone ? 1 : 0) + (c.bright ? 1 : 0) + (c.special ? 1 : 0);
}
/** 排序：強度高先；同強度專條先；再條件多（具體）先；再按卡嘅次序（sort 係穩定嘅）。 */
const byStrength = (a: Judgement, b: Judgement) => RANK[a.strength] - RANK[b.strength]
  || Number(b.card.specificity === 'system') - Number(a.card.specificity === 'system')
  || atoms(b.card) - atoms(a.card);

/** 本命財帛命中嘅卡（裁決前），俾覆蓋審核用。 */
export function synthWealthHits(chart: Chart): string[] {
  const cai = chart.palaces.find((p) => p.name === '財帛');
  if (!cai) return [];
  return SYNTHESIS_CARDS.filter((c) => c.chapter === '錢' && !(c.seat === 'borrowed' && majors(cai).length) && !(c.seat === 'seated' && !majors(cai).length))
    .flatMap((c) => matchCard(c, 'natal', { chart }) ? [c.id] : []);
}

/** 兩句意思差唔多（字面雙字組重疊 ≥ 一半）。盲評 ab10、ab11：同義卡分開兩段講。 */
/** 虛字同時段詞唔計（佢哋令吉凶相反嘅句都好似一樣）。 */
const FILLER = /\{\w+\}|今年|這十年|你的|你|容易|較為|較易|較|比較|也|亦|會|可能|往往|多半|有機會|之象|的|了|得到|能/g;
const bigrams = (s: string) => new Set([...s.replace(FILLER, '').replace(/[，。、；：「」（）\s]/g, '')].flatMap((ch, i, a) => (i ? [a[i - 1]! + ch] : [])));
export function sameMeaning(a: string, b: string): boolean {
  const x = bigrams(a), y = bigrams(b);
  if (Math.min(x.size, y.size) < 3) return false;
  let n = 0;
  for (const g of x) if (y.has(g)) n++;
  // 主語一樣（兄弟姊妹、求財時）就易誤判：長嗰句都要有四成重疊
  return n / Math.min(x.size, y.size) >= 0.6 && n / Math.max(x.size, y.size) >= 0.4;
}
/** 同吉凶、意思差唔多就留前面嗰個（前面強度較高）。 */
// 身體唔刪：「腎臟」「神經系統」字面似但係兩樣病（2026-11-09 掃描）
const isHealth = (j: Judgement) => j.card.chapter === '健康' || j.card.group.startsWith('流年疾厄');
const dedupe = (js: Judgement[]) => js.filter((j, i) => isHealth(j) || !js.slice(0, i).some((o) => o.card.polarity === j.card.polarity && sameMeaning(o.claim, j.claim)));

/** 錢章揀出嚟嘅判斷（主星最多四、輔煞最多二，刪同義）；底子句同錢章共用。 */
function wealthJudgements(chart: Chart): Judgement[] {
  const ctx: Ctx = { chart };
  const cai = chart.palaces.find((p) => p.name === '財帛');
  if (!cai) return [];
  const hits = SYNTHESIS_CARDS.filter((c) => c.chapter === '錢').flatMap((c) => {
    if (c.seat === 'borrowed' && majors(cai).length) return [];
    if (c.seat === 'seated' && !majors(cai).length) return [];
    const h = matchCard(c, 'natal', ctx);
    return h ? [h] : [];
  });
  const all = resolve(hits).sort(byStrength), minor = (j: Judgement) => j.card.group.startsWith(MINOR_GROUP);
  // 輔煞兩段：凶、非凶各揀一張先（盲評 ab10：地空、火忌風險唔可以俾吉卡擠走），唔夠先補同類
  const ms = all.filter(minor), bad = ms.find((j) => j.card.polarity === '凶'), good = ms.find((j) => j.card.polarity !== '凶');
  const two = [bad, good].filter((j): j is Judgement => !!j);
  for (const j of ms) if (two.length < 2 && !two.includes(j)) two.push(j);
  return dedupe([...all.filter((j) => !minor(j)).slice(0, 4), ...two]);
}

/**
 * 錢章：本命財帛嘅判斷；冇卡命中回 null（沿用舊章）。
 * 盲評 ab11（2026-11-09）：逐星排列冇結論。結論段將主線同最重嘅限制（第一張凶卡）併成一句，理由兩句一齊交代，後面唔再重講。
 */
export function synthWealthChapter(chart: Chart): SynthesisSegment[] | null {
  const cai = chart.palaces.find((p) => p.name === '財帛');
  let js = wealthJudgements(chart);
  if (!cai || !js.length) return null;
  // 守財方向相反（盲評 ab15 盤4；用戶 2026-11-10 揀「並排講明各自條件」）：原書冇講邊個條件優先，所以唔判輕重，兩句放埋一段，各自講出處條件
  const keep = js.find((j) => KEEP_POS.test(j.claim)), lose = js.find((j) => KEEP_NEG.test(j.claim));
  const conflict = keep && lose && keep !== lose ? conflictSegment(keep, lose) : undefined;
  if (conflict) js = js.filter((j) => j !== keep && j !== lose);
  // 最強嗰個判斷（專條先）做主線，配最強嗰張相反一邊（凶對非凶）嘅卡；主星卡優先，冇先用輔煞卡
  // 盲評 ab12：輔煞卡（文昌化忌）同主線講緊兩件事，硬接「不過」唔係轉折，所以兩邊都要係主星卡先併
  const main = js[0], bad = (j: Judgement) => j.card.polarity === '凶';
  const star = (j: Judgement) => !j.card.group.startsWith(MINOR_GROUP);
  const partner = main && star(main) ? js.find((j) => j !== main && star(j) && bad(j) !== bad(main)) : undefined;
  const rest = js.filter((j) => j !== main && j !== partner);
  // 句內次序：財源、性質（非凶）先講，「不過」接限制（凶）
  const lead0 = !main ? [] : [partner ? (bad(main) ? pairSegment(partner, main, '結論') : pairSegment(main, partner, '結論')) : segmentOf(main, '結論')];
  const segs = [...lead0, ...(conflict ? [conflict] : []), ...rest.map((j) => segmentOf(j, '展開'))];
  segs[0] = { ...segs[0]!, slot: '結論' };
  if (majors(cai).length) return segs;
  // 借星成組講法放喺第一句理由前面
  const lead = borrowLead(chart), [first, ...more] = segs, k = first!.statements.findIndex((st) => st.kind === 'evidence');
  return [{ ...first!, text: first!.text.replace(first!.statements[k]!.text, lead + first!.statements[k]!.text),
    statements: first!.statements.map((st, i) => (i === k ? { ...st, text: lead + st.text } : st)) }, ...more];
}

/** 某年命中嘅今年卡（裁決前，流年層），俾覆蓋審核用。 */
export function synthYearHits(chart: Chart, year: number, layer: 'annual' | 'decade' = 'annual'): string[] {
  const a = annualOf(chart, year);
  if (!a.ok) return [];
  const ctx: Ctx = { chart, annual: a.value, age: a.value.nominalAge };
  return SYNTHESIS_CARDS.filter((c) => c.chapter === '今年' && c.layer.includes(layer)).flatMap((c) => matchCard(c, layer, ctx) ? [c.id] : []);
}

/* ── 流年財帛（2026-10-28）──────────────────────────────
 * 錢章卡（深造財帛章條文）喺流年財帛宮重新配對，claim 換成一年內嘅講法（annual-cai.json）。
 * 方法：初階轉錄第7篇（流年十二宮可推財帛運程）、第23篇（宮位條文「以此為例」用落大限流年宮）；
 * 深造 p.334、p.433：運限宮位係對本命本質嘅反應，所以段首先講本命財帛。強度一律提示。
 */

/** 卡條件入面嘅財帛／官祿／夫妻／疾厄宮改成流年層；星曜四化、得祿接受本命或者流年。 */
const ANNUAL_NAMES = new Set(['財帛', '官祿', '夫妻', '疾厄', '父母', '兄弟', '子女', '田宅', '遷移', '僕役', '福德']);
function toAnnual(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(toAnnual);
  if (!x || typeof x !== 'object') return x;
  const o = Object.fromEntries(Object.entries(x).map(([k, v]) => [k, toAnnual(v)])) as Record<string, unknown>;
  if (ANNUAL_NAMES.has(o.name as string) && o.layer === undefined) return { ...o, layer: 'annual' };
  if (('hua' in o || 'deLu' in o) && o.layer === undefined) return { any: [o, { ...o, layer: 'annual' }] };
  return o;
}

type AnnualPalace = { palace: '財帛' | '官祿' | '夫妻' | '疾厄' | '父母' | '兄弟' | '子女' | '田宅' | '遷移' | '僕役' | '福德'; label: string;
  chapter: '錢' | '事業' | '感情' | '健康' | '父母' | '兄弟' | '子女' | '田宅' | '遷移' | '交友' | '心境'; idFrom: string; idTo: string;
  claims: Record<string, string>; slot: string; method: string; methodNote: string;
  /** 底子只揀有一年講法嘅卡（父母、兄弟、子女：唔好用「子女四人」「父母災病」呢類講人本身嘅判斷做底子）。 */
  baseFromYear?: boolean };
const ANNUAL_PALACES: AnnualPalace[] = [
  { palace: '財帛', label: '財帛宮', chapter: '錢', idFrom: 'syn.wealth.', idTo: 'syn.cai-year.', claims: (rawAnnualCai as { cards: Record<string, string> }).cards,
    slot: '今年的錢', method: 'wtz.deep.p433.b003', methodNote: '方法：深造 p.433、p.334；初階轉錄第7篇「45、流年太歲」、第23篇田宅宮、第24篇福德宮篇首' },
  { palace: '官祿', label: '事業宮', chapter: '事業', idFrom: 'syn.career.', idTo: 'syn.guan-year.', claims: (rawAnnualGuan as { cards: Record<string, string> }).cards,
    slot: '今年的工作', method: 'wtz.deep.p334.b002', methodNote: '方法：深造 p.334；初階轉錄第7篇「45、流年太歲」、第22篇事業宮篇首、第23篇田宅宮' },
  { palace: '夫妻', label: '夫妻宮', chapter: '感情', idFrom: 'syn.spouse.', idTo: 'syn.fuqi-year.', claims: (rawAnnualFuqi as { cards: Record<string, string> }).cards,
    slot: '今年的感情', method: 'wtz.deep.p334.b002', methodNote: '方法：深造 p.334；初階轉錄第7篇「45、流年太歲」、第9篇「４、根據宮位元的觀察，追查運限」（流年夫妻宮例）' },
  { palace: '疾厄', label: '疾厄宮', chapter: '健康', idFrom: 'syn.health.', idTo: 'syn.jie-year.', claims: (rawAnnualJie as { cards: Record<string, string> }).cards,
    slot: '今年的身體', method: 'wtz.deep.p477.b011', methodNote: '方法：深造 p.477（疾厄星系「無論流年、大限、天盤，皆主克應」，仍須注意疾厄宮之本質）、p.334；初階轉錄第7篇「45、流年太歲」、第23篇田宅宮' },
  { baseFromYear: true, palace: '父母', label: '父母宮', chapter: '父母', idFrom: 'syn.parents.', idTo: 'syn.fumu-year.', claims: (rawAnnualFumu as { cards: Record<string, string> }).cards,
    slot: '今年與長輩、上司', method: 'wtz.deep.p334.b002', methodNote: '方法：深造 p.334；初階轉錄第7篇「45、流年太歲」、第23篇田宅宮' },
  { baseFromYear: true, palace: '兄弟', label: '兄弟宮', chapter: '兄弟', idFrom: 'syn.siblings.', idTo: 'syn.xiongdi-year.', claims: (rawAnnualXiongdi as { cards: Record<string, string> }).cards,
    slot: '今年與平輩、夥伴', method: 'wtz.deep.p334.b002', methodNote: '方法：深造 p.334；初階轉錄第7篇「45、流年太歲」、第23篇田宅宮' },
  { baseFromYear: true, palace: '子女', label: '子女宮', chapter: '子女', idFrom: 'syn.children.', idTo: 'syn.zinv-year.', claims: (rawAnnualZinv as { cards: Record<string, string> }).cards,
    slot: '今年與子女、後輩', method: 'wtz.deep.p334.b002', methodNote: '方法：深造 p.334；初階轉錄第7篇「45、流年太歲」、第23篇田宅宮' },
  { palace: '田宅', label: '田宅宮', chapter: '田宅', idFrom: 'syn.property.', idTo: 'syn.tian-year.', claims: (rawAnnualTian as { cards: Record<string, string> }).cards,
    slot: '今年的家宅', method: 'wtz.deep.p334.b002', methodNote: '方法：深造 p.334；初階轉錄第7篇「45、流年太歲」、第23篇田宅宮（流年田宅宮條文「以此為例」）' },
  { palace: '遷移', label: '遷移宮', chapter: '遷移', idFrom: 'syn.travel.', idTo: 'syn.qian-year.', claims: (rawAnnualQian as { cards: Record<string, string> }).cards,
    slot: '今年在外', method: 'wtz.deep.p334.b002', methodNote: '方法：深造 p.334；初階轉錄第7篇「45、流年太歲」、第23篇田宅宮' },
  { baseFromYear: true, palace: '僕役', label: '交友宮', chapter: '交友', idFrom: 'syn.friends.', idTo: 'syn.puyi-year.', claims: (rawAnnualPuyi as { cards: Record<string, string> }).cards,
    slot: '今年與朋友、下屬', method: 'wtz.deep.p334.b002', methodNote: '方法：深造 p.334；初階轉錄第7篇「45、流年太歲」、第23篇田宅宮' },
  { palace: '福德', label: '福德宮', chapter: '心境', idFrom: 'syn.wellbeing.', idTo: 'syn.fude-year.', claims: (rawAnnualFude as { cards: Record<string, string> }).cards,
    slot: '今年的心境', method: 'wtz.deep.p334.b002', methodNote: '方法：深造 p.334；初階轉錄第7篇「45、流年太歲」、第23篇田宅宮' },
];

const annualCards = (cfg: AnnualPalace): SynthesisCard[] => SYNTHESIS_CARDS.flatMap((c) => {
  // 2026-11-10 盲評 ab15：今年財帛空宮都要借對宮整組（初階第9篇借星安宮）；借星卡用返原卡嘅一年講法
  const claim = cfg.claims[c.id] ?? (c.seat === 'borrowed' ? cfg.claims[c.id.replace(/\.borrowed$/, '')] : undefined);
  if (!claim || c.chapter !== cfg.chapter) return [];
  const t = <T>(v: T) => (v === undefined ? v : (toAnnual(v) as T));
  return [{ ...c, id: c.id.replace(cfg.idFrom, cfg.idTo), chapter: '今年' as const, group: `流年${cfg.palace}.${c.group}`, weight: '提' as const,
    layer: ['annual' as const], when: t(c.when), requires: t(c.requires), none: t(c.none),
    ...(c.alone ? { alone: { star: c.alone.star, in: { ...c.alone.in, layer: 'annual' } } } : {}),
    claim, because: c.because.replaceAll(`你的${cfg.label}`, `今年的${cfg.label}`).replace('這一點看的是對宮福德宮的', '這一點看的是今年財帛宮對宮（今年的福德宮）的')
      .replace('連同借入的福德宮星曜', '連同借入的對宮星曜') }];
});
export const ANNUAL_CARDS = new Map(ANNUAL_PALACES.map((cfg) => [cfg.palace, annualCards(cfg)]));

/** 本命嗰宮嘅底子：本命卡第一個判斷，連埋佢自己嘅出處。 */
function natalBase(chart: Chart, cfg: AnnualPalace): { text: string; citations: string[]; polarity: SynthesisCard['polarity'] } | undefined {
  if (cfg.chapter === '錢') {
    const j = wealthJudgements(chart)[0];
    return j ? { text: j.claim, citations: [synthesisCiteId(j.card.source)], polarity: j.card.polarity } : undefined;
  }
  const p = chart.palaces.find((q) => q.name === cfg.palace);
  if (!p) return undefined;
  const seated = majors(p).length > 0;
  const j = resolve(SYNTHESIS_CARDS.filter((c) => c.chapter === cfg.chapter && !(c.seat === 'seated' && !seated) && !(c.seat === 'borrowed' && seated)
      && (!cfg.baseFromYear || c.id in cfg.claims) && !BASE_BAN.test(c.claim))
    .flatMap((c) => { const h = matchCard(c, 'natal', { chart }); return h ? [h] : []; })).sort(byStrength)[0];
  return j ? { text: j.claim, citations: [synthesisCiteId(j.card.source)], polarity: j.card.polarity } : undefined;
}

/**
 * 底子同今年嘅關係（盲評 ab11：「今年是在這個底子上的變化」只係並列，冇講係延續定轉向）。
 * 只按卡嘅吉凶比較，唔加新判斷：今年判斷全吉／全凶先講方向，好壞並見就照講並見。
 */
function bridge(base: SynthesisCard['polarity'], js: Judgement[]): string {
  const ps = new Set(js.map((j) => j.card.polarity).filter((p) => p !== '中'));
  const now = ps.size === 1 ? [...ps][0] : ps.size > 1 ? '並見' : '中';
  if (now === '並見') return '今年在這方面好壞並見';
  if (base === '中' || now === '中') return '今年是在這個底子上的變化';
  // 唔講「底子嘅弱點今年再現」：本命同今年講嘅往往唔係同一件事（例如眼睛、血分），原書冇咁連
  if (base === now) return now === '吉' ? '今年這方面同樣較順' : '今年這方面同樣要留神';
  return now === '吉' ? '底子雖有不足，今年這方面卻有轉好的地方' : '底子雖好，今年這方面卻有不利的變化';
}

/** 卡條件入面嘅 {star, hua}（冇寫層 = 流年版本命、流年都收）。 */
function huaAtoms(x: unknown, out: { star: string; hua: string }[] = []): { star: string; hua: string }[] {
  if (Array.isArray(x)) x.forEach((y) => huaAtoms(y, out));
  else if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    if (typeof o.star === 'string' && typeof o.hua === 'string' && o.layer === undefined) out.push({ star: o.star, hua: o.hua });
    Object.values(o).forEach((v) => huaAtoms(v, out));
  }
  return out;
}
const NATAL_CARD = new Map(SYNTHESIS_CARDS.map((c) => [c.id, c]));

const SHA = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'];
const JI_STARS = ['左輔', '右弼', '天魁', '天鉞', '文昌', '文曲', '祿存'];
const fourOf = (b: string) => { const i = BRANCHES.indexOf(b); return [0, 4, 6, 8].map((d) => BRANCHES[(i + d) % 12]!); };
const huasOf = (ctx: Ctx, star: string) => [
  ...ctx.chart.palaces.flatMap((q) => q.stars).filter((s) => s.name === star && s.sihua).map((s) => ({ hua: s.sihua as string, natal: true })),
  ...(ctx.annual?.sihua.annual ?? []).filter((y) => y.star === star).map((y) => ({ hua: y.hua as string, natal: false })),
];
/**
 * 卡冇講到、但宮內實有嘅反向條件（盲評 ab9；兩邊一樣處理，唔可以淨係刪吉句）：
 * 吉卡：主星帶化忌，或三方四正見兩粒以上煞而卡冇提煞。
 * 凶卡：主星帶化祿／化權／化科，或三方四正見兩粒以上吉曜（輔弼魁鉞昌曲祿存）而卡冇提吉。
 * 疾厄凶卡唔計吉曜：原書病象條文唔因吉曜取消。
 */
function opposed(ctx: Ctx, p: Chart['palaces'][number], card: SynthesisCard, palace: string): boolean {
  if (card.polarity === '中') return false;
  const text = JSON.stringify([card.when, card.requires, card.none, card.quote]);
  const hua = majors(p).flatMap((s) => huasOf(ctx, s.name).map((h) => h.hua));
  const stars = ctx.chart.palaces.filter((q) => fourOf(p.branch).includes(q.branch)).flatMap((q) => q.stars).map((s) => s.name);
  if (card.polarity === '吉') {
    if (hua.includes('忌') && !text.includes('忌')) return true;
    return stars.filter((s) => SHA.includes(s)).length >= 2 && !text.includes('煞') && !SHA.some((s) => text.includes(s)) && !/[羊陀火鈴空劫]/.test(card.quote);
  }
  if (palace === '疾厄') return false;
  if (hua.some((h) => h !== '忌') && !/化祿|化權|化科|吉化|祿|權|科/.test(text)) return true;
  return stars.filter((s) => JI_STARS.includes(s)).length >= 2 && !/吉|輔|弼|魁|鉞|昌|曲|祿/.test(text);
}

/* 盲評 2026-10-28：理由句唔好抄卡條件嘅「或」，改講盤上實際係邊樣。 */
const MAJOR_RE = /紫微|天機|太陽|武曲|天同|廉貞|天府|太陰|貪狼|巨門|天相|天梁|七殺|破軍/g;
const MINOR = '擎羊|陀羅|火星|鈴星|地空|地劫|左輔|右弼|天魁|天鉞|文昌|文曲';
const branchOf = (ctx: Ctx, star: string) => ctx.chart.palaces.find((q) => q.stars.some((s) => s.name === star))?.branch;
const subjectBefore = (t: string, at: number) => [...t.slice(0, at).matchAll(MAJOR_RE)].pop()?.[0];
function concrete(ctx: Ctx, t: string): string {
  if (/這十年|明年/.test(t)) return t;
  const inAt = (star: string | undefined, near: boolean) => {
    const b = star && branchOf(ctx, star);
    return b ? new Set(ctx.chart.palaces.filter((q) => (near ? [b] : fourOf(b)).includes(q.branch)).flatMap((q) => q.stars.map((s) => s.name))) : undefined;
  };
  // 「化祿、化權或化科」→ 實際嘅化
  t = t.replace(/(?:本命)?化([祿權科忌])((?:、(?:本命)?化[祿權科忌])*)或(本命)?化([祿權科忌])/g, (m, a: string, mid: string, _n, z: string, at: number) => {
    if (t[at + m.length] === '的') return m; // 「化祿、化權或化科的太陰」：主語喺後面，下面另處理
    const want = new Set([a, ...[...mid.matchAll(/化([祿權科忌])/g)].map((x) => x[1]!), z]);
    const s = subjectBefore(t, at);
    const got = s ? huasOf(ctx, s).filter((h) => want.has(h.hua)) : [];
    return got.length ? got.map((h) => `${h.natal && !got.some((g) => !g.natal) && got.length === 1 ? '本命' : ''}化${h.hua}`).join('、') : m;
  });
  // 「與T同宮或相對／同度或會照」→ 實際關係
  t = t.replace(new RegExp(`與(本命的?|廟旺的)?(${MAJOR_RE.source}|祿存)(化祿)?(同宮|同度)或(相對|會照|對照|對拱|受\\2拱照)`, 'g'), (m, pre = '', other: string, lu = '', same: string, _r, at: number) => {
    const a = branchOf(ctx, subjectBefore(t, at) ?? ''), b = branchOf(ctx, other);
    if (!a || !b) return m;
    const rel = a === b ? same : OPPOSITE(a) === b ? '相對' : '會照';
    return `與${pre}${other}${lu}${rel}`;
  });
  // 夾宮後備：主條件已經成立就刪走「或受…夾」
  t = t.replace(new RegExp(`((?:會照?|會見)((?:${MINOR})(?:、(?:${MINOR}))*或(?:${MINOR})))，?或(?:受到?|被)[^，。]*?夾宮?`, 'g'), (m, head: string, list: string, at: number) => {
    const set = inAt(subjectBefore(t, at), false);
    return set && list.split(/、|或/).some((x) => set.has(x)) ? head : m;
  });
  // 「X或Y同度」「會X或Y」→ 實際見到嗰幾粒
  t = t.replace(new RegExp(`(與|會照?|會見|見|有)((?:${MINOR})(?:、(?:${MINOR}))*或(?:${MINOR}))(同度|同宮)?`, 'g'), (m, verb: string, list: string, same = '', at: number) => {
    const set = inAt(subjectBefore(t, at), verb === '與' || verb === '有' || !!same);
    const got = set ? list.split(/、|或/).filter((x) => set.has(x)) : [];
    return got.length ? `${verb}${got.join('、')}${same}` : m;
  });
  // 「與鈴星同度，或受火鈴夾宮」：同度成立就刪夾宮
  t = t.replace(new RegExp(`(與((?:${MINOR})(?:、(?:${MINOR}))*)(?:同度|同宮))，?或(?:受到?|被)[^，。]*?夾宮?`, 'g'), (m, head: string, list: string, at: number) => {
    const set = inAt(subjectBefore(t, at), true);
    return set && list.split('、').some((x) => set.has(x)) ? head : m;
  });
  // 「會照羊陀火鈴，或被羊陀、火鈴夾宮」
  t = t.replace(/會照?羊陀火鈴，?或(?:受到?|被)[^，。]*?夾宮?/g, (m, at: number) => {
    const set = inAt(subjectBefore(t, at), false);
    const got = set ? ['擎羊', '陀羅', '火星', '鈴星'].filter((x) => set.has(x)) : [];
    return got.length ? `會照${got.join('、')}` : m;
  });
  // 「會武曲、廉貞或破軍」「會到化吉的武曲、廉貞或破軍」「會到化祿、化權或化科的太陰」
  t = t.replace(new RegExp(`(會到?|會照)(化吉的)?((?:${MAJOR_RE.source})(?:、(?:${MAJOR_RE.source}))*或(?:${MAJOR_RE.source}))`, 'g'), (m, verb: string, ji = '', list: string, at: number) => {
    const set = inAt(subjectBefore(t, at), false);
    const got = set ? list.split(/、|或/).filter((x) => set.has(x) && (!ji || huasOf(ctx, x).some((h) => h.hua !== '忌'))) : [];
    if (!got.length) return m;
    return ji ? `${verb}${got.map((x) => `${x}${huasOf(ctx, x).filter((h) => h.hua !== '忌').map((h) => `化${h.hua}`).join('、')}`).join('、')}` : `${verb}${got.join('、')}`;
  });
  t = t.replace(new RegExp(`會到化([祿權科])((?:、化[祿權科])*)或化([祿權科])的(${MAJOR_RE.source})`, 'g'), (m, a: string, mid: string, z: string, s: string) => {
    const want = new Set([a, ...[...mid.matchAll(/化([祿權科])/g)].map((x) => x[1]!), z]);
    const got = huasOf(ctx, s).filter((h) => want.has(h.hua));
    return got.length ? `會到${s}${got.map((h) => `化${h.hua}`).join('、')}` : m;
  });
  // 「天府得祿或化科」
  t = t.replace(new RegExp(`(${MAJOR_RE.source})得祿或化科`, 'g'), (m, s: string) => {
    const b = branchOf(ctx, s);
    const cun = !!b && ctx.chart.palaces.some((q) => q.branch === b && q.stars.some((x) => x.name === '祿存'));
    const h = huasOf(ctx, s);
    return cun || h.some((x) => x.hua === '祿') ? `${s}得祿` : h.some((x) => x.hua === '科') ? `${s}化科` : m;
  });
  // 「祿存或化祿」
  t = t.replace(/不見祿存或化祿/g, '不見祿存，也不見化祿');
  t = t.replace(/(會見?|見|又見)(祿存或化祿|化祿或祿存)/g, (m, verb: string, _l, at: number) => {
    const s = subjectBefore(t, at), b = s && branchOf(ctx, s);
    if (!b) return m;
    const four = fourOf(b);
    const cun = ctx.chart.palaces.some((q) => four.includes(q.branch) && q.stars.some((x) => x.name === '祿存'));
    const lus = ctx.chart.palaces.filter((q) => four.includes(q.branch)).flatMap((q) => q.stars)
      .filter((x) => huasOf(ctx, x.name).some((h) => h.hua === '祿')).map((x) => `${x.name}化祿`);
    const got = [...(cun ? ['祿存'] : []), ...lus];
    return got.length ? `${verb}${got.join('、')}` : m;
  });
  return t;
}
/** 今年章（唔計明年段）嘅理由句換成盤上實況。 */
const concreteSegs = (ctx: Ctx, segs: SynthesisSegment[]) => segs.map((s) => {
  if (s.slot === '明年') return s;
  const statements = s.statements.map((l) => (l.kind === 'evidence' ? { ...l, text: concrete(ctx, l.text) } : l));
  return { ...s, statements, text: statements.map((l) => l.text).join('') };
});

/** 底子句同一年講法用同一套禁字（破相、手術、生離…唔放入今年章）。 */
const BASE_BAN = /早逝|刑傷|生男|生女|離婚|再婚|分手|離異|生離|死別|刑剋|開刀|手術|血光|意外(?!之財)|死亡|壽|絕症|癌|流產|破相|殘疾/;

/** 盲評 ab9：唔假設讀者有物業、有下屬。 */
function forReader(cfg: AnnualPalace, s: string): string {
  if (cfg.palace === '田宅') return s.replace(/^(今年)?你的產業/, '$1如有物業，產業');
  if (cfg.palace === '僕役' || cfg.palace === '子女') return s.replace(/^(今年)?你的下屬/, '$1如有下屬，下屬');
  return s;
}

/** 今年嘅錢／工作／感情／身體：流年財帛、官祿、夫妻或疾厄宮嘅判斷（最多兩個），段首先講本命嗰宮嘅底子。 */
function annualPalaceSegment(ctx: Ctx, cfg: AnnualPalace, said: string, heads: Judgement[] = []): { seg: SynthesisSegment; specific: number; moved: Judgement[]; topic: string; judged: Judgement[] } | null {
  const p = palaceAt(ctx, cfg.palace, 'annual');
  const natal = ctx.chart.palaces.find((q) => q.name === cfg.palace);
  if (!p || !natal) return null;
  const seated = majors(p).length > 0;
  const found = resolve(ANNUAL_CARDS.get(cfg.palace)!.filter((c) => !(c.seat === 'seated' && !seated) && !(c.seat === 'borrowed' && seated))
    .flatMap((c) => { const h = matchCard(c, 'annual', ctx); return h ? [h] : []; })).sort(byStrength)
    // 盲評 ab8：本命化曜坐今年宮，要講明係本命；前面四化段已經講咗「本命某星化某」就唔再重講
    .flatMap((j) => {
      const natalOnly = huaAtoms(NATAL_CARD.get(j.card.id.replace(cfg.idTo, cfg.idFrom)))
        .filter((h) => ctx.annual?.sihua.natal.some((y) => y.star === h.star && y.hua === h.hua)
          && !ctx.annual.sihua.annual.some((y) => y.star === h.star && y.hua === h.hua));
      if (natalOnly.some((h) => said.includes(`本命${h.star}化${h.hua}`))) return [];
      let because = j.because;
      for (const h of natalOnly) {
        const k = because.indexOf(`化${h.hua}`, Math.max(0, because.indexOf(h.star)));
        // 「化祿或化權」入面嘅一粒唔好改成「化祿或本命化權」，句尾補一句
        const alt = k >= 0 && (because[k - 1] === '或' || because.slice(k + 2, k + 3) === '或');
        because = k >= 0 && !alt ? `${because.slice(0, k)}本命化${h.hua}${because.slice(k + 2)}` : `${because}${h.star}化${h.hua}是本命帶來的。`;
      }
      return [{ ...j, because }];
    })
    // 盲評 ab9：宮內有卡冇考慮嘅反向條件（主星帶忌、三方四正見兩粒以上煞）就唔出吉句，免得淨揀好嗰面
    .filter((j) => !opposed(ctx, p, j.card, cfg.palace));
  const js = dedupe(found).slice(0, 2);
  if (!js.length) return null;
  // 2026-11-10 按話題裁決：跨層訊號（化祿、化忌、大限化忌）落喺呢一宮就併入嚟，同呢一宮嘅判斷一齊睇（盲評 ab13 盤5：廉忌就喺今年財帛宮，卻分開兩段講）
  const moved = heads.filter((h) => h.vars.at?.includes(p.branch));
  const names = (q: typeof p) => majors(q).map((s) => s.name).join('、');
  const base = natalBase(ctx.chart, cfg);
  // 空宮：講明借對宮邊幾粒（成組借入，連本宮輔煞）
  const opp = palaceAt(ctx, cfg.palace === '財帛' ? '福德' : '', 'annual');
  const starsOf = (q: typeof p) => q.stars.map((x) => x.name + (x.sihua ? `化${x.sihua}` : '')).join('、');
  const emptyNote = !seated && opp && majors(opp).length && js.some((j) => j.card.seat === 'borrowed')
    ? `是空宮，要連同對宮${opp.branch}宮整組星曜一起看：${starsOf(opp)}${p.stars.length ? `，加上本宮的${starsOf(p)}` : ''}` : '是空宮';
  const lead = `今年你的${cfg.label}在${p.branch}宮，${seated ? `坐${names(p)}` : emptyNote}。`
    + (majors(natal).length ? `你本命${cfg.label}坐${names(natal)}${base ? `，底子是：${forReader(cfg, base.text).replace(/。$/, '')}${moved.length ? '' : `；${bridge(base.polarity, js)}`}。` : '。'}` : '');
  const topic = topicOf(cfg.palace);
  const ps = new Set([...moved, ...js].map((j) => j.card.polarity).filter((x) => x !== '中'));
  // 方向句只講訊號喺邊同吉凶，唔自創結果：凶多就先講跨層嘅凶訊號
  const verdict = !moved.length ? '' : ps.size > 1 ? `今年在${topic}方面，機會和風險落在同一宮。` : ps.has('凶') ? `今年在${topic}方面，要留神的訊號集中在這一宮。` : `今年在${topic}方面，有利的訊號集中在這一宮。`;
  const statements: MingStatement[] = [
    ...(verdict ? [{ text: verdict, en: '', kind: 'editorial-explanation' as const, source_ids: moved.map((j) => j.card.id), citations: [] }] : []),
    { text: lead, en: '', kind: 'editorial-explanation', source_ids: [`${cfg.idTo}lead`], citations: [...(base?.citations ?? []), synthesisCiteId(cfg.method)] },
    ...[...moved].sort((x, y) => Number(y.card.polarity === '凶') - Number(x.card.polarity === '凶')).flatMap((j): MingStatement[] => [
      { text: j.claim, en: '', kind: 'interpretation', source_ids: [j.card.id], citations: [synthesisCiteId(j.card.source)] },
      { text: j.because, en: '', kind: 'evidence', source_ids: [j.card.id], citations: [] },
      ...(j.advice ? [{ text: j.advice, en: '', kind: 'editorial-advice' as const, source_ids: [`${j.card.id}.advice`], citations: [] }] : []),
    ]),
    // 盲評 ab11：兩個判斷理由一樣（例如兩張天梁疾厄卡）就只喺第二個後面講一次理由
    ...js.flatMap((j, k): MingStatement[] => [
      { text: forReader(cfg, j.claim), en: '', kind: 'interpretation', source_ids: [j.card.id], citations: [synthesisCiteId(j.card.source)] },
      ...(js[k + 1]?.because === j.because ? [] : [{ text: j.because, en: '', kind: 'evidence' as const, source_ids: js.slice(k > 0 && js[k - 1]!.because === j.because ? k - 1 : k, k + 1).map((x) => x.card.id), citations: [] }]),
    ]),
  ];
  return { seg: { slot: cfg.slot, heading: cfg.slot, text: statements.map((l) => l.text).join(''), statements,
    referenceConditions: ['判斷強度：提示', cfg.methodNote, ...[...moved, ...js].map((j) => `原文：「${j.card.quote}」`)] },
    specific: js.filter((j) => j.card.specificity === 'system').length, moved, topic, judged: [...moved, ...js] };
}
/** 一章最多幾個宮段：十一個宮全出太長。錢、工作、感情、身體（問題章）先；同一層講明宮位或雙星（system）嘅段優先，再照宮位次序。 */
const CORE_PALACES = new Set(['財帛', '官祿', '夫妻', '疾厄']);
const MAX_PALACE_SEGMENTS = 3;
/** `heads`：今年章頭段嘅判斷（第一個係結論，唔搬）；落喺某宮嘅就併入嗰宮段，有併入嘅宮段優先入選。回傳宮段同搬走咗嘅判斷。 */
const annualPalaceSegments = (ctx: Ctx, prior: SynthesisSegment[], heads: Judgement[] = [], keepFirst = true) => {
  const said = prior.map((x) => x.text).join('');
  const movable = keepFirst ? heads.slice(1) : heads;
  const segs = ANNUAL_PALACES.flatMap((cfg, i) => { const x = annualPalaceSegment(ctx, cfg, said, movable); return x ? [{ ...x, i, core: CORE_PALACES.has(cfg.palace) ? 1 : 0 }] : []; });
  // 盲評 ab15：今年財帛（收入）係最影響付費價值嘅話題，有內容就一定入選
  const money = (x: { i: number }) => Number(ANNUAL_PALACES[x.i]!.palace === '財帛');
  const picked = segs.sort((p, q) => money(q) - money(p) || q.core - p.core || q.moved.length - p.moved.length || q.specific - p.specific || p.i - q.i).slice(0, MAX_PALACE_SEGMENTS);
  // 一個訊號只併入一宮（化忌同被沖嗰宮都喺同一章時，併入先出嗰個）
  const taken = new Set<Judgement>();
  const out = picked.sort((p, q) => p.i - q.i).map((x) => {
    const mine = x.moved.filter((j) => !taken.has(j));
    mine.forEach((j) => taken.add(j));
    return mine.length === x.moved.length ? x : annualPalaceSegment(ctx, ANNUAL_PALACES[x.i]!, said, mine)!;
  });
  return { segs: out.map((x) => x.seg), moved: taken, topics: out.map((x) => ({ topic: x.topic, judged: x.judged })) };
};

/* ── 權衡（2026-10-28 盲評 ab7：同一粒流年化祿嘅好壞判斷要併埋一段講）── */

/** 呢幾張卡都係講「今年化祿嗰粒星」嘅成色。 */
const ANNUAL_LU = new Set<SynthesisCard['special']>(['luWeak', 'luKongJie', 'dieLuDec', 'dieLuNatal']);

/** 同一粒流年化祿有 ≥2 個判斷就併成一個：先講有助力嗰邊，再講折扣，冇自創淨值。 */
/** 每張化祿卡喺併段開頭嘅短語。 */
const LU_PHRASE: Partial<Record<NonNullable<SynthesisCard['special']>, string>> = {
  dieLuDec: '有{what}相疊', dieLuNatal: '和{what}相疊（力量很輕）', luWeak: '落在弱地，多名聲、少實利', luKongJie: '遇上{kongjie}',
};
/** 化忌已經有更具體嘅卡講（祿轉忌、羊陀夾忌），就唔再出一般落點。 */
const JI_COVERED = new Set<SynthesisCard['special']>(['luToJi', 'decLuToJi', 'yangTuoJiaJi']);

function weigh(input: Judgement[]): Judgement[] {
  const js = input.some((j) => JI_COVERED.has(j.card.special)) ? input.filter((j) => j.card.special !== 'jiLands') : input;
  const lu = js.filter((j) => ANNUAL_LU.has(j.card.special));
  if (lu.length < 2) return js;
  const parts = [...lu.filter((j) => j.card.polarity === '吉'), ...lu.filter((j) => j.card.polarity !== '吉')];
  const mixed = parts.some((j) => j.card.polarity === '吉') && parts.some((j) => j.card.polarity === '凶');
  const star = lu[0]!.vars.star ?? '';
  const weakest = parts.reduce((w, j) => (RANK[j.strength] > RANK[w.strength] ? j : w));
  const merged: Judgement = { ...lu[0]!, strength: weakest.strength, parts,
    claim: '', because: '' };
  const say = (ps: Judgement[]) => ps.map((p) => fill(LU_PHRASE[p.card.special!] ?? '', p.vars)).join('，又');
  const goods = parts.filter((p) => p.card.polarity === '吉'), bads = parts.filter((p) => p.card.polarity !== '吉');
  merged.claim = mixed ? `今年${star}化祿給你的進財，${say(goods)}，但${say(bads)}，實際得益要打折扣。`
    : bads.length ? `今年${star}化祿給你的進財，${say(bads)}，實際得益要打折扣。` : `今年${star}化祿給你的進財，${say(goods)}，財源較順。`;
  const at = js.indexOf(lu[0]!);
  return js.flatMap((j, i) => (i === at ? [merged] : lu.includes(j) ? [] : [j]));
}

function weighedSegment(j: Judgement, slot: string, heading?: string): SynthesisSegment {
  const statements: MingStatement[] = [
    { text: j.claim, en: '', kind: 'interpretation', source_ids: j.parts!.map((p) => p.card.id), citations: [...new Set(j.parts!.map((p) => synthesisCiteId(p.card.source)))] },
    ...j.parts!.map((p): MingStatement => ({ text: p.because, en: '', kind: 'evidence', source_ids: [p.card.id], citations: [] })),
  ];
  return { slot, ...(heading ? { heading } : {}), text: statements.map((l) => l.text).join(''), statements,
    referenceConditions: [`判斷強度：${j.strength}`, ...j.parts!.map((p) => `原文：「${p.card.quote}」`)] };
}

/**
 * 大限化忌同今年嘅交涉（忌轉祿、忌轉權、落點）一定要有一個位（盲評 ab11、ab12：大限訊號冇用齊）。
 * p.235：推斷流年「通常只需視大限及流年兩組化曜」。頭幾個冇就換走最後一個唔係星系卡嘅判斷。
 */
const DECADE_JI = new Set<SynthesisCard['special']>(['decJiToLu', 'decJiToQuanJi', 'decJiToQuan', 'decJiLands']);
function withDecade(top: Judgement[], all: Judgement[]): Judgement[] {
  const dec = all.find((j) => DECADE_JI.has(j.card.special));
  if (!dec || top.includes(dec)) return top;
  const k = top.map((j) => !j.card.system).lastIndexOf(true);
  return k < 0 ? [...top, dec] : [...top.slice(0, k), ...top.slice(k + 1), dec];
}

/** 今年章：流年判斷最多三個，加這十年背景一個，加明年提示一個；冇星系運限卡命中回 null。 */
/**
 * `general`：冇星系運限卡嘅年份，用流年四化通則卡（p.236、p.284）砌一個短版（要 ≥2 個判斷）。
 * 2026-10-28 盲評（tmp/ab6-20261028）五盤全勝舊章，準確度 7.6 對 4.8；但嫌薄，要補交會卡。
 */
export function synthYearChapter(chart: Chart, year: number, opts: { general?: boolean } = {}): SynthesisSegment[] | null {
  const a = annualOf(chart, year);
  if (!a.ok) return null;
  const ctx: Ctx = { chart, annual: a.value, age: a.value.nominalAge };
  const pick = (layer: 'annual' | 'decade', c2: Ctx) => resolve(SYNTHESIS_CARDS.filter((c) => c.chapter === '今年' && c.layer.includes(layer))
    .flatMap((c) => { const h = matchCard(c, layer, c2); return h ? [h] : []; })).sort(byStrength);
  const all = dedupe(weigh(pick('annual', ctx)));
  // 通則卡強度可以高過星系卡；頭三個冇星系卡就將第一張星系卡換入第三位，唔好令星系主線消失
  const sys = all.find((j) => j.card.system);
  const now = withDecade(sys && !all.slice(0, 3).includes(sys) ? [...all.slice(0, 2), sys] : all.slice(0, 3), all);
  const decades = pick('decade', ctx).filter((j) => j.card.system);
  // 要有命宮星系嘅運限卡做主線先換章（流年層或者大限層）；淨係通則卡就比舊章薄，照用舊章
  if (!now.some((j) => j.card.system) && !decades.length) {
    if (!opts.general) return null;
    const more = withDecade(all.slice(0, 4), all);
    if (!more.length) return null;
    const { segs: palaces, moved, topics } = annualPalaceSegments(ctx, more.map((j, i) => segmentOf(j, i === 0 ? '結論' : '展開')), more);
    const left = more.filter((j) => !moved.has(j));
    const head = left.map((j, i) => segmentOf(j, i === 0 ? '結論' : '展開'));
    // 2026-10-28：年長讀者冇文昌化科卡（限虛歲 <56），通常只剩一張通則卡；有流年宮段補足就照成章
    if (more.length < 2 && !palaces.length) return null;
    return concreteSegs(ctx, withOverview([...head, ...palaces, ...decadeFacts(ctx)], left, topics));
  }
  // 這十年背景：第一個判斷；有相反極性嘅判斷就一齊出（吉凶並見唔可以只報一邊）
  const decade = decades[0];
  const other = decade && decades.find((j) => j !== decade && j.card.polarity !== '中' && decade.card.polarity !== '中' && j.card.polarity !== decade.card.polarity);
  const ten = [decade, other].filter((x): x is Judgement => !!x).map((j) => ({ ...j, strength: j.strength === '定論' ? '傾向' as const : j.strength }));
  // 流年有星系卡：流年做結論，十年做背景；冇：十年做結論（「今年處於…的十年」），流年通則卡跟後
  const annualLead = now.some((j) => j.card.system);
  const build = (heads: Judgement[]) => annualLead
    ? [...heads.map((j, i) => segmentOf(j, i === 0 ? '結論' : '展開')), ...ten.map((j, i) => segmentOf(j, '背景', i === 0 ? '這十年' : undefined))]
    : [...ten.map((j, i) => segmentOf(j, i === 0 ? '結論' : '背景', i === 0 ? '這十年' : undefined)), ...heads.map((j) => segmentOf(j, '展開'))];
  const { segs: palaces, moved, topics } = annualPalaceSegments(ctx, build(now), now, annualLead);
  const left = now.filter((j) => !moved.has(j));
  const segs = build(left);
  const bg = segs.findIndex((x) => x.slot === '背景');
  segs.splice(bg < 0 || !annualLead ? segs.length : bg, 0, ...palaces);
  segs.push(...decadeFacts(ctx));
  const overviewed = withOverview(segs, [...left, ...ten], topics);
  segs.splice(0, segs.length, ...overviewed);
  const next = annualOf(chart, year + 1);
  if (next.ok) {
    const n = pick('annual', { chart, annual: next.value, age: next.value.nominalAge }).find((j) => j.card.system && j.card.id !== decade?.card.id && j.card.id !== other?.card.id);
    if (n) {
      const j: Judgement = { ...n, strength: '提示', claim: n.claim.replaceAll('今年', '明年'), because: n.because.replaceAll('今年', '明年'), ...(n.advice ? { advice: n.advice.replaceAll('今年', '明年') } : {}) };
      segs.push(segmentOf(j, '明年', `${year + 1} 年`));
    }
  }
  return concreteSegs(ctx, segs);
}

/**
 * 回看（2026-11-10，Issac：一生十二步回看要講返嗰年大概點）。
 * 已過去嘅年份用同一批今年卡（王亭之）判斷，改講「那一年」；唔出建議（講過去冇得建議）。
 * 先星系卡，再流年宮卡（錢、工作、感情、身體先），再通則卡；同一話題只出一個。重字（BASE_BAN、HEAVY）唔出。
 */
export type LookbackLine = { id: string; claim: string; because: string; cite: string; quote: string; polarity: SynthesisCard['polarity'] };
// 「那一年這一宮是你的X宮」唔講方法（plain P1）：改「那一年正是你的X宮」
const past = (s: string) => s.replaceAll('今年', '那一年').replaceAll('明年', '翌年').replaceAll('那一年這一宮是', '那一年正是');
/** 回看免費章唔講病、意外、官非、破財、離婚、死（2026-10-02 回看規矩，2026-11-10 保留）。 */
const LOOKBACK_BAN = /病|意外|手術|受傷|官非|破財|離婚|死/;
const YEAR_ANNUAL = SYNTHESIS_CARDS.filter((c) => c.chapter === '今年' && c.layer.includes('annual'));
/** 身體唔做回看（唔講病名；「那一年要多留意X」讀落似補建議）；錢、工作、感情先。 */
const LOOKBACK_PALACES = [...ANNUAL_PALACES.filter((c) => CORE_PALACES.has(c.palace)), ...ANNUAL_PALACES.filter((c) => !CORE_PALACES.has(c.palace))].filter((c) => c.palace !== '疾厄');
export function synthLookback(chart: Chart, year: number, max = 2): LookbackLine[] {
  const a = annualOf(chart, year);
  if (!a.ok) return [];
  const ctx: Ctx = { chart, annual: a.value, age: a.value.nominalAge };
  const general = dedupe(weigh(resolve(YEAR_ANNUAL.flatMap((c) => { const h = matchCard(c, 'annual', ctx); return h ? [h] : []; })).sort(byStrength))).filter((j) => !j.parts);
  // 逐宮慢慢計，夠數就停（一本書要計幾年，十一宮全計太慢）
  function* ordered() {
    for (const j of general) if (j.card.system) yield { j, topic: j.card.group };
    for (const cfg of LOOKBACK_PALACES) {
      const x = annualPalaceSegment(ctx, cfg, '');
      if (x) for (const j of x.judged) yield { j: { ...j, claim: forReader(cfg, j.claim) }, topic: x.topic };
    }
    for (const j of general) if (!j.card.system) yield { j, topic: j.card.group };
  }
  const out: LookbackLine[] = [];
  const topics = new Set<string>();
  for (const { j, topic } of ordered()) {
    if (out.length >= max) break;
    // 建議式判斷（「今年要…」「不宜…」）講過去唔通，唔出
    if (topics.has(topic) || isHealth(j) || /^今年(要|不宜|宜|可按|應)/.test(j.claim) || BASE_BAN.test(j.claim) || HEAVY.test(j.claim) || LOOKBACK_BAN.test(j.claim + j.because) || out.some((o) => o.id === j.card.id || sameMeaning(o.claim, j.claim))) continue;
    topics.add(topic);
    out.push({ id: j.card.id, claim: past(j.claim), because: past(concrete(ctx, j.because)), cite: synthesisCiteId(j.card.source), quote: j.card.quote, polarity: j.card.polarity });
  }
  return out;
}

/**
 * 章首總覽（2026-11-10，盲評 ab14：讀者讀完仍然唔清楚今年邊方面可以進、邊方面要保留）。
 * 每個判斷按話題歸類，只睇卡嘅吉凶：淨吉＝較有利；吉凶都有＝有機會、同時要防；淨凶＝要放慢、多留神。中性唔計。
 * 財祿類通則卡（祿轉忌、祿逢沖破、疊祿、弱地）講嘅係進財，歸「收入」；其餘用卡自己嘅話題。
 */
const MONEY_SPECIAL = new Set<SynthesisCard['special']>(['luToJi', 'luChongPo', 'luWeak', 'luKongJie', 'decLuToJi', 'decLuChongPo', 'dieLuDec', 'dieLuNatal']);
function topicsOfHead(j: Judgement): string[] {
  if (j.parts) return topicsOfHead(j.parts[0]!);
  if (MONEY_SPECIAL.has(j.card.special)) return [TOPIC['財帛']!];
  if (j.card.special === 'changKe' || j.card.special === 'changKeXian') return ['考試、進修'];
  const v = j.vars.palaceTopic ?? j.vars.topic ?? j.vars.topics;
  return v ? v.split('方面，以及') : [];
}
export const OVERVIEW_ID = 'syn.year.overview';
function withOverview(segs: SynthesisSegment[], heads: Judgement[], palaces: { topic: string; judged: Judgement[] }[]): SynthesisSegment[] {
  const pol = new Map<string, Set<string>>(), ids: string[] = [];
  // 盲評 ab15 盤2：「力量很輕」嘅疊祿、提示級嘅吉句唔計做轉好，否則總結會將正文嘅保留判斷升格；凶訊號照計
  const weakGood = (j: Judgement) => j.card.polarity === '吉' && (j.strength === '提示' || j.card.special === 'dieLuNatal');
  const add = (t: string, j: Judgement) => { if (j.card.polarity === '中' || weakGood(j)) return; (pol.get(t) ?? pol.set(t, new Set()).get(t)!).add(j.card.polarity); ids.push(j.card.id); };
  // 權衡併咗嘅判斷（例如疊祿但落弱地）逐張卡計吉凶
  for (const j of heads) for (const t of topicsOfHead(j)) for (const x of j.parts ?? [j]) add(t, x);
  for (const p of palaces) for (const j of p.judged) add(p.topic, j);
  const of = (f: (x: Set<string>) => boolean) => [...pol].filter(([, x]) => f(x)).map(([t]) => t);
  const good = of((x) => x.size === 1 && x.has('吉')), both = of((x) => x.size > 1), bad = of((x) => x.size === 1 && x.has('凶'));
  if (good.length + both.length + bad.length < 2 || !segs.length) return segs;
  const j = (ts: string[]) => ts.map((t) => `「${t}」`).join('');
  const parts = [good.length ? `有轉好機會的是${j(good)}` : '', both.length ? `有機會、同時要防的是${j(both)}` : '', bad.length ? `要放慢、多留神的是${j(bad)}` : ''].filter(Boolean);
  const text = `今年整體來看：${parts.join('；')}。下面逐項講原因。`;
  const [first, ...rest] = segs;
  const st: MingStatement = { text, en: '', kind: 'editorial-explanation', source_ids: [OVERVIEW_ID, ...new Set(ids)], citations: [] };
  return [{ ...first!, text: text + first!.text, statements: [st, ...first!.statements] }, ...rest];
}

/**
 * 今年用到嘅大限同兩組四化（盲評 ab13：年度章要講明大限區間、宮干同兩組四化，讀者先核對得到）。
 * 純盤面資料，唔係判斷；放喺明年之前嘅尾段。
 */
function decadeFacts(ctx: Ctx): SynthesisSegment[] {
  const a = ctx.annual;
  const age = a?.nominalAge;
  const dec = age !== undefined ? ctx.chart.decadals.find((d) => age >= d.fromAge && age <= d.toAge) : undefined;
  const p = dec && ctx.chart.palaces.find((q) => q.branch === dec.branch);
  if (!a || !dec || !p || !a.sihua.decadal?.length) return [];
  const list = (xs: { star: string; hua: string }[]) => xs.map((x) => `${x.star}化${x.hua}`).join('、');
  const text = `這一章用到的運限：你今年虛歲${age}，行${dec.fromAge}至${dec.toAge}歲的${p.stem}${p.branch}大限（本命${p.name}${p.name.endsWith('宮') ? '' : '宮'}）。`
    + `這十年的四化是${list(a.sihua.decadal)}；今年的四化是${list(a.sihua.annual)}。`;
  return [{ slot: '運限', heading: '這一章用到的運限', text, statements: [{ text, en: '', kind: 'evidence', source_ids: ['syn.year.decade-facts'], citations: [] }], referenceConditions: ['盤面資料'] }];
}

/* ── 寫作 lint（設計 §4 G6 G7 G9 G10）──────────────── */

export function synthesisLint(segs: SynthesisSegment[]): string[] {
  const out: string[] = [];
  for (const s of segs) for (const l of s.statements) {
    if (/剛開始工作|那次|那一次|你肯|你已經/.test(l.text)) out.push(`G6 假設讀者經歷：${l.text}`);
    if (/一生最|最順|最容易|最差|最好的|最合|最適合/.test(l.text) && l.kind !== 'evidence') out.push(`G7 最高級：${l.text}`);
    if (/[一二三四五六七八九十]成|一半|百分之|\d+%/.test(l.text)) out.push(`G10 自創比例：${l.text}`);
    if (l.kind === 'editorial-advice' && !l.source_ids[0]?.endsWith('.advice')) out.push(`G9 建議冇掛卡：${l.text}`);
    if (/\{\w+\}/.test(l.text)) out.push(`未填變數：${l.text}`);
  }
  for (const s of segs) {
    const strength = s.referenceConditions[0]?.slice(5);
    if (strength === '提示' && /(?<!未)必|決主|主[^要]/.test(s.statements[0]!.text)) out.push(`強度用詞：提示級用咗肯定詞：${s.text}`);
  }
  return out;
}

