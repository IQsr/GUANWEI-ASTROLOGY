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

export const SYNTHESIS_VERSION = 'synthesis-v1';
export const synthesisCiteId = (block: string) => `syn.v1:${block}`;

/* ── 原書段落 ───────────────────────────────────────── */

export type SynthesisSource = { id: string; sha256: string; page: number; section: string; excerpt: string };
const SOURCES = new Map(Object.values((rawSources as { sources: Record<string, SynthesisSource> }).sources).map((s) => [synthesisCiteId(s.id), s]));
export const synthesisSource = (citeId: string) => SOURCES.get(citeId) ?? null;
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
  chapter: z.enum(['錢', '今年']),
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
  special: z.enum(['luToJi', 'jiToLu', 'luChongPo', 'luWeak', 'luKongJie', 'changKeXian', 'changKe']).optional(),
  because: z.string(),
  claim: z.string(),
  /** G9：建議一定要講得出點解係呢個盤。 */
  advice: z.object({ text: z.string(), why: z.string() }).optional(),
  source: z.string().regex(/^wtz\.deep\.p\d{3}\.b\d{3}$/),
  quote: z.string(),
}).strict();
export type SynthesisCard = z.infer<typeof SynthesisCard>;

export const SYNTHESIS_CARDS: SynthesisCard[] = (rawCards as { cards: unknown[] }).cards.map((c) => {
  const card = SynthesisCard.parse(c);
  for (const k of ['when', 'requires', 'none'] as const) if (card[k] !== undefined) ConditionSchema.parse(subst(card[k], 'annual'));
  const src = SOURCES.get(synthesisCiteId(card.source));
  if (!src) throw Error(`${card.id}: 未收段落 ${card.source}`);
  if (!src.excerpt.includes(card.quote)) throw Error(`${card.id}: 引文唔係原文子串`);
  if (!card.special && !card.when && !card.alone) throw Error(`${card.id}: 冇條件`);
  return card;
});

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
  命宮: '你自己', 兄弟: '兄弟姊妹、合作夥伴', 夫妻: '伴侶', 子女: '子女、後輩', 財帛: '收入', 疾厄: '身體',
  遷移: '外出、在外', 僕役: '朋友、同事', 官祿: '工作', 田宅: '家裏、物業', 福德: '心情、享受', 父母: '長輩、上司',
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
  }
  const fire = ctx.chart.palaces.find((p) => p.name === '財帛')?.stars.filter((s) => s.name === '火星' || s.name === '鈴星').map((s) => s.name);
  if (fire?.length) vars.fireBell = fire.join('、');
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
};

/* ── 裁決同強度（設計 §3③、§5）──────────────────────── */

export type Strength = '定論' | '傾向' | '提示';
const STRENGTH: Record<SynthesisCard['weight'], Strength> = { 斷: '定論', 傾: '傾向', 提: '提示' };
const RANK: Record<Strength, number> = { 定論: 0, 傾向: 1, 提示: 2 };
/** 重話：一律最高傾向（用戶 2026-10-27 決定）。 */
const HEAVY = /生離死別|災難|官非|官司|刑克|早寡/;

export type Judgement = SynthesisHit & { strength: Strength; claim: string; because: string; advice?: string };

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
    return { ...h, strength, claim, because: fill(h.card.because, h.vars), ...(h.card.advice ? { advice: fill(h.card.advice.text, h.vars) } : {}) };
  });
}

/* ── 寫作 ───────────────────────────────────────────── */

export type SynthesisSegment = { slot: string; text: string; heading?: string; statements: MingStatement[]; referenceConditions: string[] };

function segmentOf(j: Judgement, slot: string, heading?: string): SynthesisSegment {
  const cite = synthesisCiteId(j.card.source);
  const statements: MingStatement[] = [
    { text: j.claim, en: '', kind: 'interpretation', source_ids: [j.card.id], citations: [cite] },
    { text: j.because, en: '', kind: 'evidence', source_ids: [j.card.id], citations: [] },
    ...(j.advice ? [{ text: j.advice, en: '', kind: 'editorial-advice' as const, source_ids: [`${j.card.id}.advice`], citations: [] }] : []),
  ];
  return { slot, ...(heading ? { heading } : {}), text: statements.map((l) => l.text).join(''),
    statements, referenceConditions: [`判斷強度：${j.strength}`, `原文：「${j.card.quote}」`] };
}

/** 排序：強度高先；同強度專條先；再按卡嘅次序（sort 係穩定嘅）。 */
const byStrength = (a: Judgement, b: Judgement) => RANK[a.strength] - RANK[b.strength]
  || Number(b.card.specificity === 'system') - Number(a.card.specificity === 'system');

/** 錢章：本命財帛嘅判斷，最多四個；冇卡命中回 null（試點：沿用舊章）。 */
export function synthWealthChapter(chart: Chart): SynthesisSegment[] | null {
  const ctx: Ctx = { chart };
  const cai = chart.palaces.find((p) => p.name === '財帛');
  if (!cai) return null;
  const hits = SYNTHESIS_CARDS.filter((c) => c.chapter === '錢').flatMap((c) => {
    if (c.seat === 'borrowed' && majors(cai).length) return [];
    if (c.seat === 'seated' && !majors(cai).length) return [];
    const h = matchCard(c, 'natal', ctx);
    return h ? [h] : [];
  });
  const js = resolve(hits).sort(byStrength).slice(0, 4);
  if (!js.length) return null;
  return js.map((j, i) => segmentOf(j, i === 0 ? '結論' : '展開'));
}

/** 今年章：流年判斷最多三個，加這十年背景一個，加明年提示一個；冇星系運限卡命中回 null。 */
export function synthYearChapter(chart: Chart, year: number): SynthesisSegment[] | null {
  const a = annualOf(chart, year);
  if (!a.ok) return null;
  const ctx: Ctx = { chart, annual: a.value, age: a.value.nominalAge };
  const pick = (layer: 'annual' | 'decade', c2: Ctx) => resolve(SYNTHESIS_CARDS.filter((c) => c.chapter === '今年' && c.layer.includes(layer))
    .flatMap((c) => { const h = matchCard(c, layer, c2); return h ? [h] : []; })).sort(byStrength);
  const now = pick('annual', ctx).slice(0, 3);
  // 試點：要有命宮星系嘅運限卡做主線先換章；淨係通則卡就比舊章薄，照用舊章
  if (!now.some((j) => j.card.system)) return null;
  const segs = now.map((j, i) => segmentOf(j, i === 0 ? '結論' : '展開'));
  // 這十年背景：第一個判斷；有相反極性嘅判斷就一齊出（吉凶並見唔可以只報一邊）
  const decades = pick('decade', ctx);
  const decade = decades[0];
  const other = decade && decades.find((j) => j !== decade && j.card.polarity !== '中' && decade.card.polarity !== '中' && j.card.polarity !== decade.card.polarity);
  for (const [i, j] of [decade, other].filter((x): x is Judgement => !!x).entries())
    segs.push(segmentOf({ ...j, strength: j.strength === '定論' ? '傾向' : j.strength }, '背景', i === 0 ? '這十年' : undefined));
  const next = annualOf(chart, year + 1);
  if (next.ok) {
    const n = pick('annual', { chart, annual: next.value, age: next.value.nominalAge }).find((j) => j.card.system && j.card.id !== decade?.card.id && j.card.id !== other?.card.id);
    if (n) {
      const j: Judgement = { ...n, strength: '提示', claim: n.claim.replaceAll('今年', '明年'), because: n.because.replaceAll('今年', '明年'), ...(n.advice ? { advice: n.advice.replaceAll('今年', '明年') } : {}) };
      segs.push(segmentOf(j, '明年', `${year + 1} 年`));
    }
  }
  return segs;
}

/* ── 寫作 lint（設計 §4 G6 G7 G9 G10）──────────────── */

export function synthesisLint(segs: SynthesisSegment[]): string[] {
  const out: string[] = [];
  for (const s of segs) for (const l of s.statements) {
    if (/剛開始工作|那次|那一次|你肯|你已經/.test(l.text)) out.push(`G6 假設讀者經歷：${l.text}`);
    if (/一生最|最順|最容易|最差|最好的/.test(l.text) && l.kind !== 'evidence') out.push(`G7 最高級：${l.text}`);
    if (/[一二三四五六七八九十]成|一半|百分之|\d+%/.test(l.text)) out.push(`G10 自創比例：${l.text}`);
    if (l.kind === 'editorial-advice' && !l.source_ids[0]?.endsWith('.advice')) out.push(`G9 建議冇掛卡：${l.text}`);
    if (/\{\w+\}/.test(l.text)) out.push(`未填變數：${l.text}`);
  }
  for (const s of segs) {
    const strength = s.referenceConditions[0]?.slice(5);
    if (strength === '提示' && /必|決主|主[^要]/.test(s.statements[0]!.text)) out.push(`強度用詞：提示級用咗肯定詞：${s.text}`);
  }
  return out;
}

