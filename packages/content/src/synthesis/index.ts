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
    'decLuToJi', 'decLuChongPo', 'jiToQuanJi', 'jiToQuan', 'dieLuDec', 'dieLuNatal', 'jiLands', 'yangTuoJiaJi']).optional(),
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
  命宮: '你自己', 兄弟: '兄弟姊妹、平輩朋友、合作夥伴', 夫妻: '伴侶', 子女: '子女和你提拔的後輩、助手', 財帛: '收入', 疾厄: '身體',
  遷移: '外出、在外', 僕役: '一般往來的晚輩、下屬', 官祿: '工作', 田宅: '家裏、物業', 福德: '心情、享受', 父母: '長輩、上司',
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
  /** 流年化祿同大限化祿／大限祿存同度或相對（p.431：大運與流年亦可構成疊祿）。 */
  dieLuDec: ({ annual: a }) => {
    const lu = a?.sihua.annual.find((y) => y.hua === '祿');
    if (!lu?.branch || !a?.sihua.decadal) return null;
    const near = (b: string | null | undefined) => !!b && (b === lu.branch || b === OPPOSITE(lu.branch!));
    const d = a.sihua.decadal.find((x) => x.hua === '祿' && near(x.branch));
    const what = d ? `這十年的${d.star}化祿` : near(a.liuyao.decadal?.祿存) ? '這十年的流祿存' : null;
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
    return { ...h, strength, claim, because: fill(h.card.because, h.vars), ...(h.card.advice ? { advice: fill(h.card.advice.text, h.vars) } : {}) };
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
  const claim = cfg.claims[c.id];
  if (!claim || c.chapter !== cfg.chapter) return [];
  const t = <T>(v: T) => (v === undefined ? v : (toAnnual(v) as T));
  return [{ ...c, id: c.id.replace(cfg.idFrom, cfg.idTo), chapter: '今年' as const, group: `流年${cfg.palace}.${c.group}`, weight: '提' as const,
    layer: ['annual' as const], when: t(c.when), requires: t(c.requires), none: t(c.none),
    ...(c.alone ? { alone: { star: c.alone.star, in: { ...c.alone.in, layer: 'annual' } } } : {}),
    claim, because: c.because.replaceAll(`你的${cfg.label}`, `今年的${cfg.label}`) }];
});
const ANNUAL_CARDS = new Map(ANNUAL_PALACES.map((cfg) => [cfg.palace, annualCards(cfg)]));

/** 本命嗰宮嘅底子：本命卡第一個判斷，連埋佢自己嘅出處。 */
function natalBase(chart: Chart, cfg: AnnualPalace): { text: string; citations: string[] } | undefined {
  if (cfg.chapter === '錢') {
    const st = synthWealthChapter(chart)?.[0]?.statements[0];
    return st ? { text: st.text, citations: st.citations } : undefined;
  }
  const p = chart.palaces.find((q) => q.name === cfg.palace);
  if (!p) return undefined;
  const seated = majors(p).length > 0;
  const j = resolve(SYNTHESIS_CARDS.filter((c) => c.chapter === cfg.chapter && !(c.seat === 'seated' && !seated) && !(c.seat === 'borrowed' && seated)
      && (!cfg.baseFromYear || c.id in cfg.claims) && !BASE_BAN.test(c.claim))
    .flatMap((c) => { const h = matchCard(c, 'natal', { chart }); return h ? [h] : []; })).sort(byStrength)[0];
  return j ? { text: j.claim, citations: [synthesisCiteId(j.card.source)] } : undefined;
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
function annualPalaceSegment(ctx: Ctx, cfg: AnnualPalace, said: string): { seg: SynthesisSegment; specific: number } | null {
  const p = palaceAt(ctx, cfg.palace, 'annual');
  const natal = ctx.chart.palaces.find((q) => q.name === cfg.palace);
  if (!p || !natal) return null;
  const seated = majors(p).length > 0;
  const js = resolve(ANNUAL_CARDS.get(cfg.palace)!.filter((c) => !(c.seat === 'seated' && !seated) && !(c.seat === 'borrowed' && seated))
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
    .filter((j) => !opposed(ctx, p, j.card, cfg.palace))
    .slice(0, 2);
  if (!js.length) return null;
  const names = (q: typeof p) => majors(q).map((s) => s.name).join('、');
  const base = natalBase(ctx.chart, cfg);
  const lead = `今年你的${cfg.label}在${p.branch}宮，${seated ? `坐${names(p)}` : '是空宮'}。`
    + (majors(natal).length ? `你本命${cfg.label}坐${names(natal)}${base ? `，底子是：${forReader(cfg, base.text).replace(/。$/, '')}；今年是在這個底子上的變化。` : '。'}` : '');
  const statements: MingStatement[] = [
    { text: lead, en: '', kind: 'editorial-explanation', source_ids: [`${cfg.idTo}lead`], citations: [...(base?.citations ?? []), synthesisCiteId(cfg.method)] },
    ...js.flatMap((j): MingStatement[] => [
      { text: forReader(cfg, j.claim), en: '', kind: 'interpretation', source_ids: [j.card.id], citations: [synthesisCiteId(j.card.source)] },
      { text: j.because, en: '', kind: 'evidence', source_ids: [j.card.id], citations: [] },
    ]),
  ];
  return { seg: { slot: cfg.slot, heading: cfg.slot, text: statements.map((l) => l.text).join(''), statements,
    referenceConditions: ['判斷強度：提示', cfg.methodNote, ...js.map((j) => `原文：「${j.card.quote}」`)] },
    specific: js.filter((j) => j.card.specificity === 'system').length };
}
/** 一章最多幾個宮段：十一個宮全出太長。錢、工作、感情、身體（問題章）先；同一層講明宮位或雙星（system）嘅段優先，再照宮位次序。 */
const CORE_PALACES = new Set(['財帛', '官祿', '夫妻', '疾厄']);
const MAX_PALACE_SEGMENTS = 3;
const annualPalaceSegments = (ctx: Ctx, prior: SynthesisSegment[]) => {
  const said = prior.map((x) => x.text).join('');
  const segs = ANNUAL_PALACES.flatMap((cfg, i) => { const x = annualPalaceSegment(ctx, cfg, said); return x ? [{ ...x, i, core: CORE_PALACES.has(cfg.palace) ? 1 : 0 }] : []; });
  return segs.sort((p, q) => q.core - p.core || q.specific - p.specific || p.i - q.i).slice(0, MAX_PALACE_SEGMENTS).sort((p, q) => p.i - q.i).map((x) => x.seg);
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
  const all = weigh(pick('annual', ctx));
  // 通則卡強度可以高過星系卡；頭三個冇星系卡就將第一張星系卡換入第三位，唔好令星系主線消失
  const sys = all.find((j) => j.card.system);
  const now = sys && !all.slice(0, 3).includes(sys) ? [...all.slice(0, 2), sys] : all.slice(0, 3);
  const decades = pick('decade', ctx).filter((j) => j.card.system);
  // 要有命宮星系嘅運限卡做主線先換章（流年層或者大限層）；淨係通則卡就比舊章薄，照用舊章
  if (!now.some((j) => j.card.system) && !decades.length) {
    if (!opts.general) return null;
    const more = all.slice(0, 4);
    if (more.length < 2) return null;
    const head = more.map((j, i) => segmentOf(j, i === 0 ? '結論' : '展開'));
    return concreteSegs(ctx, [...head, ...annualPalaceSegments(ctx, head)]);
  }
  // 這十年背景：第一個判斷；有相反極性嘅判斷就一齊出（吉凶並見唔可以只報一邊）
  const decade = decades[0];
  const other = decade && decades.find((j) => j !== decade && j.card.polarity !== '中' && decade.card.polarity !== '中' && j.card.polarity !== decade.card.polarity);
  const ten = [decade, other].filter((x): x is Judgement => !!x).map((j) => ({ ...j, strength: j.strength === '定論' ? '傾向' as const : j.strength }));
  // 流年有星系卡：流年做結論，十年做背景；冇：十年做結論（「今年處於…的十年」），流年通則卡跟後
  const annualLead = now.some((j) => j.card.system);
  const segs = annualLead
    ? [...now.map((j, i) => segmentOf(j, i === 0 ? '結論' : '展開')), ...ten.map((j, i) => segmentOf(j, '背景', i === 0 ? '這十年' : undefined))]
    : [...ten.map((j, i) => segmentOf(j, i === 0 ? '結論' : '背景', i === 0 ? '這十年' : undefined)), ...now.map((j) => segmentOf(j, '展開'))];
  const bg = segs.findIndex((x) => x.slot === '背景');
  segs.splice(bg < 0 || !annualLead ? segs.length : bg, 0, ...annualPalaceSegments(ctx, segs));
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

