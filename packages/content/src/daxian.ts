import {LIFE_STEPS_VOICE} from './life-steps-voice';
import {lifeStepsCite,lifeStepsSource} from './life-steps-sources';
import type {MingStatement} from './ming-writer';
import { z } from 'zod';
import { resolveClashes } from './clash';
import { annual, flowStars, sanFangPalaces, sihuaOfStem, tianxingBranch, type AnnualChart, type Branch, type Chart, type Palace, type Sihua } from '@guanwei/ziwei';
import huaRaw from './daxian/hua.json';
import rulesRaw from './daxian/rules.json';
import pivotsRaw from './daxian/pivots.json';
import eventsRaw from './daxian/events.json';
import { CORPUS, cjkCount, normaliseForMatch } from './lexicon';
import { scanForbidden } from './lint';
import { scanPlain } from './plain';
import { AREA, palaceLabel } from './link';
import { STEPS_UNTIL_AGE, num } from './steps';
import { FORBIDDEN_TERMS } from './frame';
import { leanOf, xingxiOf } from './xingxi';
import { conclusionFor } from './palace-plain';
import { KUIYUE_SOURCE, KUIYUE_TEXT, kuiyueMatches, kuiyueText } from './kuiyue';

/* ───────────────────────────────────────────────────────────
 * 大限兩章（2026-09-30 · Issac：先做大限，參考書）
 *
 *   一生十二步（免費）  十二個大限，每步一行：幾歲、落邊宮、坐乜星；寫書嗰陣行到邊步
 *   這十年（收費）      寫書嗰陣行緊嗰個大限，詳細講；順帶預告下一個
 *
 * ── 讀法跟《深造講義》──
 *
 * 一、大限嗰個宮就係呢十年嘅命宮，讀法同本命命宮一樣（p.10「無論推斷天盤命宮，抑或運限的命宮」）。
 *     所以大限命宮套用六十星系，用大限四化判斷偏向。
 * 二、大限四化由大限宮干引出，落喺呢十年嘅邊一宮（p.235 例子講「大運事業宮」「大運財帛宮」）。
 *     每粒星化乜嘅意思出自 p.238–313 逐星逐化嗰段（`daxian/hua.json`）。
 * 三、本命四化係本質，大限四化係嗰段時期嘅環境；兩者碰到先起作用（p.235–237，`daxian/rules.json`）。
 *
 * ⚠ 書入面冇「大限落本命某宮 = 呢十年重心喺嗰方面」嘅講法，所以唔用。
 * ⚠ 唔預測事件、唔講病、唔講金額；本書寫咗唔變（R-008），寫「寫這本書時」唔寫「現在」。
 * ─────────────────────────────────────────────────────────── */

const Source = z.object({ corpus: z.literal('zhongzhou'), passage_id: z.string(), quote: z.string().min(4).max(24) });

function checkLine(id: string, text: string, src: z.infer<typeof Source>, ctx: z.RefinementCtx) {
  const issue = (m: string) => ctx.addIssue({ code: 'custom', message: `${id}：${m}` });
  const p = CORPUS[src.corpus]?.passages[src.passage_id];
  if (!p) issue(`語料庫搵唔到 ${src.passage_id}`);
  else if (!normaliseForMatch(p.text).includes(normaliseForMatch(src.quote))) issue(`引文「${src.quote}」唔喺原文`);
  const w = cjkCount(text);
  if (w < 15 || w > 60) issue(`${w} 字，要 15–60`);
  for (const f of [...scanForbidden(text, 'body'), ...scanPlain(text, 'body')]) issue(`${f.code} ${f.message}`);
}

/*
 * `areas`（2026-10-04）：句子講緊邊方面。四方面段落（`areaSegments`）只會用講緊嗰方面嘅句，
 * 例如天同化祿嘅句講錢，落喺心境就唔用佢 —— 改用嗰方面嘅通用句，星嘅句留返去四化段。
 */
const AreaSlot = z.enum(['工作', '錢', '感情', '心境']);

const Hua = z
  .object({ id: z.string(), star: z.string(), hua: z.enum(['祿', '權', '科', '忌']), text: z.string(), areas: z.array(AreaSlot).min(1), source: Source })
  .superRefine((x, ctx) => {
    checkLine(x.id, x.text, x.source, ctx);
    if (!x.text.startsWith('你')) ctx.addIssue({ code: 'custom', message: `${x.id}：要對住讀者講（「你⋯」開頭）` });
  });

const Rule = z
  .object({ id: z.string(), natal: z.enum(['祿', '權', '科', '忌']), decade: z.enum(['祿', '權', '科', '忌']), text: z.string(), source: Source })
  .superRefine((x, ctx) => checkLine(x.id, x.text.replace('{star}', '某星'), x.source, ctx));

const RulesDoc = z.object({
  rules: z.array(Rule),
  none: z.object({ id: z.string(), text: z.string(), source: Source }).superRefine((x, ctx) => checkLine(x.id, x.text.slice(0, 60), x.source, ctx)),
});

export const DAXIAN_HUA = z.array(Hua).parse(huaRaw);

/*
 * 回看過去：身體、出行、是非、錢、感情（2026-10-04，Issac：試讀嘅人最在意「講中過去」）
 *
 * 舊事件詞庫只供既有書稿索引；新章只採下方已核完整條件的分支，不用舊數值門檻。
 * 唔講病名、手術、死傷、官非、破財呢啲字，只講「身體要付出的多」「出入要小心」⋯
 * ⚠ 唔用喺將來嘅年份（這一年、這十年）：講過去係印證，講將來係嚇人。
 */
const Event = z
  .object({
    id: z.string(),
    kind: z.enum(['身體', '出行', '是非', '錢', '感情']),
    text: z.string(),
    /** 人睇嘅條件說明，同 `lookBackEvent()` 一條對一條 */
    rules: z.array(z.string()).min(1),
    sources: z.array(Source).min(1),
  })
  .superRefine((x, ctx) => x.sources.forEach((src) => checkLine(x.id, x.text, src, ctx)));
export const LOOKBACK_EVENTS = z.array(Event).parse(eventsRaw);

/**
 * 樞紐大限（2026-09-30）：《深造講義》下篇宮垣論・命宮（p.336–366）
 * 「X守命，以Y宮垣為大限／大運／命運的樞紐」—— 行到嗰幾步，吉凶影響一生特別大（p.339）。
 * 只收大限相關；淨係流年、年限嘅留畀流年章。條件：順逆行、命宮見唔見煞、丙年、天相獨坐睇四化。
 */
const STARS = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍', '文昌', '文曲'];
const Pivot = z
  .object({
    id: z.string(),
    /** decade = 大限樞紐；year = 流年／年限樞紐；both = 原文講「大運流年」或者冇分 */
    scope: z.enum(['decade', 'year', 'both']),
    ming: z.array(z.string()).min(1),
    branches: z.array(z.string()).nullable(),
    cond: z.enum(['forward', 'backward', 'sha', 'nosha', 'stem:丙', 'notstem:丙', 'hua']).nullable(),
    pivots: z.array(z.array(z.string()).min(1)),
    pendingSource:z.boolean().optional(), includeOpposite: z.boolean().optional(), includeLu: z.boolean().optional(), requiresJi: z.boolean().optional(), unresolvedTianji: z.boolean().optional(),
    source: Source,
  })
  .superRefine((x, ctx) => {
    const p = CORPUS[x.source.corpus]?.passages[x.source.passage_id];
    if (!p || !normaliseForMatch(p.text).includes(normaliseForMatch(x.source.quote))) {
      ctx.addIssue({ code: 'custom', message: `${x.id}：引文「${x.source.quote}」唔喺原文` });
    }
    for (const s of [...x.ming, ...x.pivots.flat()]) {
      if (!STARS.includes(s)) ctx.addIssue({ code: 'custom', message: `${x.id}：唔認得「${s}」` });
    }
    if (x.cond !== 'hua' && x.pivots.length === 0) ctx.addIssue({ code: 'custom', message: `${x.id}：冇樞紐` });
  });
export const DAXIAN_PIVOTS = z.array(Pivot).parse(pivotsRaw);

const SHA4 = ['擎羊', '陀羅', '火星', '鈴星'];

/**
 * 呢張盤嘅樞紐規則（大限或流年）：回一個「呢個宮係咪樞紐」嘅判斷。冇資料就回 null。
 */
export function pivotRule(
  chart: Chart,
  scope: 'decade' | 'year',
): { isPivot: (p: Palace, period?:AnnualChart) => boolean; source: string; rule: (typeof DAXIAN_PIVOTS)[number] } | null {
  const ming = chart.palaces.find((p) => p.name === '命宮');
  if (!ming || chart.decadals.length < 2) return null;
  let stars = majors(ming);
  let branch = ming.branch as string;
  if (stars.length === 0 && ming.borrowsFrom) {
    const opp = chart.palaces.find((p) => p.branch === ming.borrowsFrom);
    stars = opp ? majors(opp) : [];
    branch = ming.borrowsFrom;
  }
  const key = [...stars].sort().join('·');
  const b0 = chart.palaces.findIndex((p) => p.branch === chart.decadals[0]!.branch);
  const b1 = chart.palaces.findIndex((p) => p.branch === chart.decadals[1]!.branch);
  const forward = (b1 - b0 + 12) % 12 === 1;
  const sha = sanFangPalaces(chart.palaces, ming.branch).some((p) => p.stars.some((s) => SHA4.includes(s.name)));
  const stem = chart.ganzhi.year[0];
  const ok = (c: (typeof DAXIAN_PIVOTS)[number]['cond']) =>
    c === null || c === 'hua' ||
    (c === 'forward' && forward) || (c === 'backward' && !forward) ||
    (c === 'sha' && sha) || (c === 'nosha' && !sha) ||
    (c === 'stem:丙' && stem === '丙') || (c === 'notstem:丙' && stem !== '丙');
  const rule = DAXIAN_PIVOTS.find(
    (r) =>
      (r.scope === scope || r.scope === 'both') &&
      [...r.ming].sort().join('·') === key &&
      (!r.branches || r.branches.includes(branch)) &&
      ok(r.cond) && (!r.requiresJi || sanFangPalaces(chart.palaces, ming.branch).some((p)=>p.stars.some((s)=>['左輔','右弼','文昌','文曲','天魁','天鉞'].includes(s.name)||['祿','權','科'].includes(s.sihua??'')))),
  );
  if (!rule) return null;
  const unresolvedFanbei=Boolean(rule.unresolvedTianji&&branch==='卯');
  const isPivot = (p: Palace,period?:AnnualChart) => {
    if(rule.pendingSource)return false;
    const scopeHua=period?[...(period.sihua.decadal??[]),...(scope==='year'?period.sihua.annual:[])]:[];
    const scopeLu=period?[period.liuyao.decadal,...(scope==='year'?[period.liuyao.annual]:[])].filter(Boolean):[];
    if(rule.cond==='hua')return p.stars.some((s)=>s.sihua)||scopeHua.some((h)=>h.branch===p.branch);
    const groups=rule.pivots.filter((g)=>!unresolvedFanbei||!g.includes('天機'));
    if(groups.some((g)=>pivotHit(g,p)))return true;
    if(rule.includeLu&&(p.stars.some((s)=>s.name==='祿存'||s.sihua==='祿')||scopeHua.some((h)=>h.branch===p.branch&&h.hua==='祿')||scopeLu.some((f)=>f?.祿存===p.branch)))return true;
    if(rule.includeOpposite){const opposite=chart.palaces.find((q)=>q.branch===oppositeBranch(p.branch));return Boolean(opposite&&groups.some((g)=>pivotHit(g,opposite)));}
    return false;
  };
  return { isPivot, source: rule.source.passage_id, rule };
}
const oppositeBranch=(b:Branch):Branch=>('子丑寅卯辰巳午未申酉戌亥'[(
  '子丑寅卯辰巳午未申酉戌亥'.indexOf(b)+6)%12] as Branch);
const pivotNames = (p: Palace) => p.stars.filter((s) => s.kind === 'major' || s.name === '文昌' || s.name === '文曲').map((s) => s.name);
const pivotHit = (g: string[], p: Palace) => g.every((s) => pivotNames(p).includes(s));

/*
 * 關鍵大限點解關鍵（2026-10-18 · Issac：「關鍵大限加一句王亭之出處講點解」）
 *
 * 一句講晒：命宮係乜星（同條件），書上以邊類大限做樞紐。只列呢張盤真係行到嗰幾類
 * （例如天機丑未以太陽、太陰為樞紐，太陰嗰步九十歲後先到，就淨講太陽），
 * 讀者對住下面逐步嘅星就見到點解係嗰幾步。出處註由 citation.ts 用 `pivotWhyPattern` 配返。
 */
const PIVOT_COND: Partial<Record<NonNullable<(typeof DAXIAN_PIVOTS)[number]['cond']>, string>> = {
  forward: '，大限順行',
  backward: '，大限逆行',
  /* 2026-10-18 · 後生讀者抽樣 C12：「三方四正見煞」讀者唔識，改白話；舊句（R-008）見 `PIVOT_COND_OLD` */
  sha: '，命宮和相關的幾個宮位見到煞星',
  nosha: '，命宮和相關的幾個宮位都沒有煞星，並見吉曜或吉化',
  'stem:丙': '，丙年生',
};
/** 舊書嘅寫法，出處註照認 */
const PIVOT_COND_OLD: Partial<Record<string, string>> = { sha: '，三方四正見煞', nosha: '，三方四正不見煞' };
const orList = (xs: string[]) => (xs.length < 2 ? (xs[0] ?? '') : `${xs.slice(0, -1).join('、')}或${xs[xs.length - 1]}`);
const pivotGroup = (g: string[]) => (g.length === 1 ? g[0]! : `${g.join('')}同宮`);
const WHY_TAIL = '：這樣的命盤，行到';

function pivotWhy(chart: Chart, rule: (typeof DAXIAN_PIVOTS)[number], keyPalaces: Palace[]): string {
  const ming = chart.palaces.find((p) => p.name === '命宮')!;
  const unresolvedFanbei=Boolean(rule.unresolvedTianji&&(majors(ming).length?ming.branch:ming.borrowsFrom)==='卯');
  const groups =
    rule.cond === 'hua' ? ['有化祿、化權、化科或化忌'] : rule.pivots.filter((g) => (!unresolvedFanbei||!g.includes('天機')) && keyPalaces.some((p) => pivotHit(g, p)||(rule.includeOpposite&&pivotHit(g,chart.palaces.find((q)=>q.branch===oppositeBranch(p.branch))!)))).map(pivotGroup);
  if(rule.includeOpposite)groups.push('上述星系的對拱宮垣');
  if(rule.includeLu)groups.push('祿存與化祿所在宮垣');
  return `你的命宮在${ming.branch}，${starsOf(chart, ming)}${PIVOT_COND[rule.cond ?? 'hua'] ?? ''}${WHY_TAIL}${orList(groups)}的大限，是原書列出的關鍵宮垣。`;
}

/** 認返「關鍵大限點解」嗰句係邊條規則寫嘅（出處註用）：星、命宮地支、條件都要對 */
export function pivotWhyPattern(rule: (typeof DAXIAN_PIVOTS)[number]): RegExp {
  const B = '子丑寅卯辰巳午未申酉戌亥';
  const opp = (b: string) => B[(B.indexOf(b) + 6) % 12]!;
  const stars = rule.ming.length === 2 ? `(?:${rule.ming.join('、')}|${[...rule.ming].reverse().join('、')})` : rule.ming[0]!;
  const own = rule.branches ? `[${rule.branches.join('')}]` : '.';
  const borrowed = rule.branches ? `[${rule.branches.map(opp).join('')}]` : '.';
  const conds = [PIVOT_COND[rule.cond ?? 'hua'] ?? '', PIVOT_COND_OLD[rule.cond ?? 'hua'],...(rule.cond==='nosha'?['，命宮和相關的幾個宮位都沒有煞星']:[])].filter((x): x is string => x !== undefined);
  return new RegExp(`^你的命宮在(?:${own}，坐${stars}|${borrowed}，沒有主星，借對面宮位的${stars})(?:${conds.join('|')})${WHY_TAIL}`);
}

/** 呢張盤邊幾步大限係樞紐。冇資料（書冇講嗰組命宮星）就回空。 */
export function pivotSteps(chart: Chart): { steps: number[]; source: string | null; rule: (typeof DAXIAN_PIVOTS)[number] | null } {
  const r = pivotRule(chart, 'decade');
  if (!r) return { steps: [], source: null, rule: null };
  const steps = chart.decadals.filter((d) => r.isPivot(chart.palaces.find((x) => x.branch === d.branch)!,(()=>{const a=annual(chart,chart.lunar.y+d.fromAge-1);return a.ok?a.value:undefined;})())).map((d) => d.index);
  return { steps, source: r.source, rule: r.rule };
}
export const DAXIAN_RULES = RulesDoc.parse(rulesRaw);

/* 章框（冇來源，唔准讀象） */
export const DAXIAN_FRAMES = {
  stepsClose: '十二步是一條路的形狀，走得快慢、走向哪裡，仍然在你；關鍵的幾步，值得提早準備。',
  decadeClose: '環境只是背景；這十年要做成甚麼、做到哪一步，始終由你自己決定。',
} as const;
for (const t of Object.values(DAXIAN_FRAMES)) {
  const bad = FORBIDDEN_TERMS.filter((w) => t.includes(w));
  if (bad.length) throw new Error(`大限章框唔准講命理：${bad.join('、')}`);
}

/*
 * 冲起（2026-10-26 盲評）：以前「沒有碰到你本命的四化」只核同一粒星，但 p.235 嘅例子係
 * 「天機化祿冲起太陽化祿」——唔同星、同宮或會照都算冲起。新書而家再核：呢段時期嘅化曜同宮或對宮
 * 正正有本命（流年再加大限）嘅化曜，就講明位置；同一粒星嘅照舊用 rules.json。
 * 只取同宮、對宮（取嚴），三合會照唔計。
 */
export const MEET_TAIL = {
  jiji: { text: '兩重化忌碰在一起，本命的化忌被冲起，相關的事這段時期較容易受阻，是最要留意的一點。', id: 'dx.rule.meet', passage: 'daxian.rule.none', quote: '当生年四化被冲会之时，然后始须注意' },
  chongpo: { text: '原書說化祿最怕被化忌冲破，吉處藏凶：這段時期進財的事要多防一手。', id: 'dx.rule.chongpo', passage: 'daxian.rule.chongpo', quote: '化禄最嫌为忌冲破' },
  generic: { text: '本命的化曜被冲起，這段時期它也會起作用。', id: 'dx.rule.meet', passage: 'daxian.rule.none', quote: '当生年四化被冲会之时，然后始须注意' },
} as const;
for (const t of Object.values(MEET_TAIL)) {
  const p = CORPUS.zhongzhou?.passages[t.passage];
  if (!p || !normaliseForMatch(p.text).includes(normaliseForMatch(t.quote))) throw new Error(`冲起：引文「${t.quote}」唔喺 ${t.passage}`);
}
/** nameAt：嗰層盤（本命、大限）喺某地支叫咩宮；本命唔使傳。 */
type MeetBase = { who: '你本命' | '這十年大限'; hits: readonly { star: string; hua: Sihua }[]; nameAt?: (branch: Branch) => string | null };
/**
 * periodNameAt：呢段時期（大限或流年）盤喺某地支叫咩宮。2026-10-27 盲評：四化段講「落在僕役宮」（時期盤），
 * 冲起句以前講「落在你的命宮」（本命盤），讀落似同一粒星有兩個宮。而家先講時期盤，括號補本命。
 */
export function meetSegment(chart: Chart, span: '這十年' | '這一年', period: readonly { star: string; hua: Sihua }[], bases: readonly MeetBase[], periodNameAt?: (branch: Branch) => string | null): { text: string; id: string } | null {
  const at = (star: string) => chart.palaces.find((p) => p.stars.some((x) => x.name === star)) ?? null;
  const pairs = period.flatMap((h) => {
    const hp = at(h.star);
    if (!hp) return [];
    return bases.flatMap((b) => b.hits.flatMap((n) => {
      const np = at(n.star);
      if (!np || n.star === h.star) return [];
      const same = np.branch === hp.branch;
      if (!same && np.branch !== oppositeBranch(hp.branch)) return [];
      return [{ h, n, who: b.who, nameAt: b.nameAt, hp, np, same, rank: h.hua === '忌' && n.hua === '忌' ? 0 : h.hua === '忌' && n.hua === '祿' ? 1 : 2 }];
    }));
  }).sort((a, b) => a.rank - b.rank);
  if (!pairs.length) return null;
  const facts = pairs.slice(0, 2).map((x) => {
    const pName = periodNameAt?.(x.hp.branch);
    const where = pName ? `${palaceLabel(pName)}（你本命的${palaceLabel(x.hp.name)}）` : `你的${palaceLabel(x.hp.name)}`;
    const baseName = x.nameAt?.(x.np.branch) ?? x.np.name;
    return `${span}的${x.h.star}化${x.h.hua}落在${where}，` + (x.same
      ? `和${x.who}的${x.n.star}化${x.n.hua}同宮。`
      : `正對著${x.who}${x.n.star}化${x.n.hua}所在的${palaceLabel(baseName)}。`);
  });
  const tail = [MEET_TAIL.jiji, MEET_TAIL.chongpo, MEET_TAIL.generic][pairs[0]!.rank]!;
  return { text: facts.join('') + tail.text, id: tail.id };
}

/*
 * 大限／流年財帛宮天府見地空、地劫（2026-10-26 盲評）：結論句「守得住」同空劫相反。
 * 原書財帛宮天府（p.450）：「天府得祿見吉，若有空劫同度，每進財亦必受損失」；空庫再見空劫為府庫空露。
 */
export const KONGKU = {
  id: 'plain.天府.財帛.空劫',
  summary: '你有理財的心思，但這個宮位同時有地空或地劫，錢容易進了又出；這段時期要防的是守不住。',
  passage: 'deep.財帛.天府.空劫',
} as const;
if (!CORPUS.zhongzhou?.passages[KONGKU.passage]) throw new Error(`空庫：語料庫搵唔到 ${KONGKU.passage}`);

export const STEPS_SLUG = '一生十二步';
export const DECADE_SLUG = '這十年';

export type DaxianSegment = { slot: string; text: string; source_id: string | null; rule_ids: string[]; /** 建議段：給你的話用嘅一句撮要（唔入正文） */ brief?: string; statements?:MingStatement[]; heading?:string; referenceConditions?:string[]; referenceApplicability?:string[]; referenceFocus?:string[] };
type Out = { slug: string; title: string; segments: DaxianSegment[] } | null;

const DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;
export { num } from './steps';
export const yearCN = (y: number) => [...String(y)].map((d) => DIGITS[Number(d)]).join('');

const majors = (p: Palace) => p.stars.filter((s) => s.kind === 'major').map((s) => s.name);
export function starsOf(chart: Chart, p: Palace): string {
  const own = majors(p);
  if (own.length) return `坐${own.join('、')}`;
  const opp = p.borrowsFrom ? chart.palaces.find((x) => x.branch === p.borrowsFrom) : undefined;
  const b = opp ? majors(opp) : [];
  return b.length ? `沒有主星，借對面宮位的${b.join('、')}` : '沒有主星';
}
export const area = (palace: string | null) => (palace ? (AREA[palace]?.[0] ?? palaceLabel(palace)) : '');
/** 時間章結論句講某方面（2026-10-14）：命宮唔講「性格要多留神」，講「自己的狀態」 */
export const periodArea = (palace: string | null) => (palace === '命宮' ? '自己的狀態' : area(palace));

/* ── 分四方面讀一段時期（2026-10-02）───────────────────────
 *
 * 《深造講義》讀運限，係將大限／流年嗰盤嘅宮當本命咁讀：「大運事業宮」「大運財帛宮」「流年夫妻宮」
 * （p.235、p.440 嘅例子）。所以呢段時期嘅工作、錢、感情、心境，就睇嗰盤嘅官祿、財帛、夫妻、福德
 * 坐乜星（用嗰粒星喺嗰類宮嘅結論句），同埋呢段時期嘅四化有冇落入去。
 *
 * ⚠ p.440 寫明「不可一見大運財帛宮的煞忌，便立刻武斷為財帛不佳」—— 化忌只講「要多留神」，唔講衰。
 * ⚠ 唔講「大限落本命某宮＝重心」：書入面冇呢個講法。
 */
export const AREAS = [
  { palace: '官祿', slot: '工作', says: /做事|工作/ },
  { palace: '財帛', slot: '錢', says: /錢|資源|財/ },
  { palace: '夫妻', slot: '感情', says: /感情|親密|伴侶/ },
  { palace: '福德', slot: '心境', says: /安定|安心|心境/ },
] as const;

const TONE: Record<Sihua, string> = {
  祿: '比較順',
  權: '有發揮的空間，也要多扛一點',
  科: '容易得到認可',
  忌: '要多留神',
};

/*
 * 四化落入某方面、但嗰粒星嘅句講緊另一方面時用嘅通用句（2026-10-04）。
 * 只講「呢方面會點」，唔講星名、唔講化乜（括號嘅依據已經講咗）。化忌照 p.440 只講留神，唔講衰。
 */
export const AREA_HUA: Record<(typeof AREAS)[number]['slot'], Record<Sihua, string>> = {
  工作: {
    祿: '工作上容易遇到合適的機會，肯主動爭取，比較容易做出成績。',
    權: '工作上你會多一點話事權，責任也跟著加重；不是每件事都要自己扛。',
    科: '你在工作上的表現容易被看見，適合爭取認可、考證或建立口碑。',
    忌: '工作上的計劃容易卡住或要返工，重要的決定先留一點餘地。',
  },
  錢: {
    祿: '收入有增加的機會，進賬比較順；順的時候也記得留一份。',
    權: '錢怎樣用多由你作主，可以主動規劃，但別一次押得太重。',
    科: '你在錢上信用好，借貸、合作都容易得到別人信任。',
    忌: '錢容易周轉緊或超出預算，大額支出和借貸先多想一步。',
  },
  感情: {
    祿: '感情上比較甜，容易遇到合拍的人，或和伴侶相處更融洽。',
    權: '感情裡你比較主導，記得留空間給對方，別變成一個人作主。',
    科: '感情上相處有禮，你們的關係容易得到身邊的人認同。',
    忌: '感情上容易有誤會，或有心事說不出口；有話早點講清楚。',
  },
  心境: {
    祿: '你的心情比較寬鬆，懂得享受生活，也較容易感到滿足。',
    權: '你心裡想做的事多，幹勁也足，但容易給自己太大壓力。',
    科: '你容易找到讓自己靜下來的方法，讀書和修養都合適，靜下來時想得特別清楚。',
    忌: '你心裡容易有放不下的事，多思多慮；記得給自己留出休息的時間。',
  },
};
for (const [slot, lines] of Object.entries(AREA_HUA)) {
  for (const [hua, text] of Object.entries(lines)) {
    const bad = [...scanForbidden(text, 'body'), ...scanPlain(text, 'body')];
    if (bad.length) throw new Error(`AREA_HUA ${slot}.${hua}：${bad.map((f) => `${f.code} ${f.message}`).join('；')}`);
  }
}

export type PeriodHit = { star: string; hua: Sihua; palace: string | null };

/**
 * 一段時期分四方面嘅段落。`nameAt(branch)` = 呢段時期嘅盤入面，嗰個地支叫乜宮。
 * 回嘅 `used` = 已經喺四方面講咗嘅四化（四化段唔使再講一次）。
 */
export function areaSegments(
  chart: Chart,
  nameAt: (branch: string) => string | null,
  hits: readonly PeriodHit[],
  scope: '這十年' | '這一年',
  /** 新書（`periodChecks`）：財帛天府見空劫換空劫版本 */
  checks = false,
): { segments: DaxianSegment[]; used: Set<string>; kongku?: boolean } {
  const used = new Set<string>();
  let leaks = false;
  const segments: DaxianSegment[] = [];
  for (const a of AREAS) {
    const p = chart.palaces.find((x) => nameAt(x.branch) === a.palace);
    if (!p) continue;
    const own = majors(p);
    const opp = own.length === 0 && p.borrowsFrom ? chart.palaces.find((x) => x.branch === p.borrowsFrom) : undefined;
    const names = (own.length ? own : opp ? majors(opp) : []) as string[];
    const ji = p.stars.find((s) => s.kind === 'major' && s.sihua === '忌')?.name ?? null;
    const found = names.length ? conclusionFor(names, a.palace, ji) : undefined;
    if (!found) continue;
    const kongku = checks && a.palace === '財帛' && names.includes('天府') && p.stars.some((s) => s.name === '地空' || s.name === '地劫');
    const pp = kongku ? { ...found, id: KONGKU.id, summary: KONGKU.summary } : found;
    if (kongku) leaks = true;
    const here = hits.filter((h) => h.palace === a.palace);
    const label = AREA[a.palace]![1];
    /* 化祿化忌同落一格：唔揀邊個，照講有得有失 */
    const tones = [...new Set(here.map((h) => TONE[h.hua]))];
    /*
     * 開頭點寫：
     *   有順／要留神 —— 一定講明係邊方面（「感情上，這十年要多留神。」）
     *   冇，而結論句自己已經講明係邊方面（「你在感情裡⋯」）—— 唔再加「感情上」，唔好講兩次
     */
    const says = a.says.test(pp.summary.slice(0, 8));
    /*
     * 2026-10-13 讀者 feedback（識斗數嘅讀者：「似照搬、似 AI」）：
     *   一、以前句尾跟一句「只是⋯」—— 嗰句係星嘅通用提醒，宮位章已經講過，同一本書講兩次就係照搬；剷走。
     *   二、以前句尾一個「（依據：大限的官祿宮坐⋯。）」括號，似機器記錄。改做開頭一句平常講法：
     *       「這十年的官祿宮坐紫微、貪狼，紫微化權。」—— 識斗數嘅一眼見到根據，唔識嘅當佢係一句背景。
     */
    const basis = `${scope}的${a.palace}宮${starsOf(chart, p)}${here.length ? `，${here.map((h) => `${h.star}化${h.hua}`).join('、')}` : ''}。`;
    const head = tones.length
      ? `${basis}${label}，${scope}${tones.join('，也')}。${pp.summary}`
      : says
        ? `${basis}${pp.summary}`
        : `${basis}${label}，${pp.summary}`;
    /*
     * 星嘅句講緊呢方面先用（記入 `used`，四化段唔再講）；講緊別方面就用呢方面嘅通用句，
     * 星嘅句留畀四化段。同一種化只出一句通用句。
     */
    const fits = here
      .map((h) => DAXIAN_HUA.find((e) => e.star === h.star && e.hua === h.hua))
      .filter((m): m is NonNullable<typeof m> => Boolean(m) && m!.areas.includes(a.slot));
    fits.forEach((m) => used.add(`${m.star}${m.hua}`));
    const generic = [...new Set(here.filter((h) => !fits.some((m) => m.star === h.star && m.hua === h.hua)).map((h) => h.hua))];
    const huaText = fits.map((m) => m.text).join('') + generic.map((hua) => AREA_HUA[a.slot][hua]).join('');
    segments.push({
      slot: a.slot,
      text: head + huaText,
      source_id: [pp.id, ...fits.map((m) => m.id)].join('+'),
      rule_ids: [],
    });
  }
  return { segments, used, kongku: leaks };
}

/*
 * 時間章第一段（2026-10-17，docs/leads-audit-2026-10-17.md B1＋B2）。
 *
 * 以前寫「你的X比較順，Y要多留神」：X、Y 係祿忌落入嘅宮，但「比較順」係我哋自己嘅語氣 ——
 * 後面四化段引《深造講義》嘅星句，可以講緊另一回事（天同化祿＝財祿增加），甚至唔係順
 * （天梁化祿＝容易被捲入別人的麻煩）。免費第一段同收費正文講兩樣嘢。
 *
 * 而家第一段直接用**章入面實際講嗰句**嘅第一個分句：
 *   星句喺四方面段用咗 → 星句；落四方面但用通用句 → 通用句；其餘 → 四化段嘅星句。
 * 咁第一段同後文講同一件事，亦唔加書冇講嘅推論。
 */
/*
 * 四化段（2026-10-18 · 後生讀者抽樣 B5）：以前逐粒寫「太陰化忌落在這十年的財帛宮，你容易有說不出口的感情困擾」——
 * 落點同意思黐埋一句，讀落似「財帛宮會有感情困擾」。呢段剩低嘅星句都係四方面段用唔到嘅（講緊另一方面），
 * 所以分開講：先一句講落點（盤面事實），再逐粒講嗰粒星化咗之後嘅意思。
 */
export function huaSegment(hits: readonly PeriodHit[], scope: '這十年' | '這一年'): { text: string; id: string | null } {
  const lines = hits.flatMap((h) => {
    const m = DAXIAN_HUA.find((e) => e.star === h.star && e.hua === h.hua);
    return m ? [{ h, m }] : [];
  });
  if (!lines.length) return { text: '', id: null };
  const placed = lines.filter((x) => x.h.palace);
  const fact = placed.length ? `${scope}，${placed.map((x) => `${x.h.star}化${x.h.hua}落在${palaceLabel(x.h.palace!)}`).join('、')}。` : '';
  return {
    text: fact + lines.map((x) => `${x.h.star}化${x.h.hua}，${x.m.text}`).join(''),
    id: lines.map((x) => x.m.id).join('+'),
  };
}

/** 「你的錢」「你的朋友圈」；命宮係「自己的狀態」，寫「你自己的狀態」，唔好「你的自己的」 */
const yourArea = (palace: string) => {
  const a = periodArea(palace);
  return a.startsWith('自己') ? `你${a}` : `你的${a}`;
};
export const firstClause = (t: string) => (t.split(/[，；。]/)[0] ?? t).trim();
/** 一個分句講緊邊方面（回傳代表嗰方面嘅宮，`yourArea` 用）；認唔到回 null */
const DOMAIN: [string, RegExp][] = [
  ['財帛', /財|錢|收入|預算|周轉|開支|借貸/],
  ['夫妻', /感情|伴侶/],
  ['官祿', /工作|事業/],
  ['福德', /心情|心裡|情緒|心境/],
  ['僕役', /人際|朋友/],
];
const domainOf = (clause: string) => DOMAIN.find(([, re]) => re.test(clause))?.[0] ?? null;
/** 通用句（`AREA_HUA`）自己講明係邊方面，唔使再加「X這一方面：」；星句要標返落喺邊。 */
/*
 * 星句講緊嗰個宮嘅方面先冠「X這一方面，」（2026-10-18 · 後生讀者抽樣 B5）：
 * 以前一律冠落點嘅方面 ——「家這一方面，你的感情和人際容易有挫折」（廉貞化忌落田宅）、
 * 「朋輩這一方面，你容易憑名聲和地位得到收入」。星句係嗰粒星化咗之後嘅意思（《深造講義》大限四化），
 * 唔係落點嗰宮嘅事；對唔上就唔冠方面，淨講意思：「你的感情和人際容易有挫折」（第一句唔講星名，lint P2）。
 * 命宮唔冠（「自己的狀態這一方面，你的財源比較順遂」讀落唔通）。
 */
export function huaClause(h: PeriodHit, used: ReadonlySet<string>, areasRead: boolean): { text: string; generic: boolean; fits: boolean } {
  const star = DAXIAN_HUA.find((e) => e.star === h.star && e.hua === h.hua);
  const area = AREAS.find((a) => a.palace === h.palace);
  if (areasRead && area && !used.has(`${h.star}${h.hua}`)) return { text: firstClause(AREA_HUA[area.slot][h.hua]), generic: true, fits: true };
  /* 第一段只用星句第一個分句，佢講嘅係 `areas` 頭一樣（廉貞化祿 [錢, 工作]：「你肯為生活品味和人際應酬花錢」） */
  const fits = Boolean(area && star?.areas[0] === area.slot);
  return { text: star ? firstClause(star.text) : '', generic: false, fits };
}
export function periodGist(
  span: string,
  lu: PeriodHit,
  ji: PeriodHit,
  used: ReadonlySet<string>,
  areasRead: boolean,
  /** moneyLeaks：呢段時期財帛用咗空劫版本（守不住）；講錢順嘅半句要跟住講，唔好自己打自己（2026-10-27 盲評） */
  notes: { luBlocked?: boolean; jiEased?: boolean; moneyLeaks?: boolean } = {},
): string {
  const l = huaClause(lu, used, areasRead);
  const j = huaClause(ji, used, areasRead);
  if (!l.text || !j.text || !lu.palace || !ji.palace) return '';
  if (lu.palace === ji.palace && l.fits && j.fits)
    return `${span}，${yourArea(lu.palace)}有得有失：${l.text}；同時，${j.text}。`;
  /*
   * 兩半句冇方面字、但講緊同一方面（2026-10-18 晚 · 模擬讀者覆檢）：「這一年，你的財祿有增加的機會；
   * 錢容易周轉緊或超出預算。」讀落自己打自己。同樣講明「有得有失」。
   */
  const same = l.generic || !l.fits ? (j.generic || !j.fits ? domainOf(l.text) : null) : null;
  if (same && same === domainOf(j.text)) return `${span}，${yourArea(same)}有得有失：${l.text}；同時，${j.text}。`;
  const at = (c: { text: string; generic: boolean; fits: boolean }, h: PeriodHit) =>
    c.generic || !c.fits ? c.text : `${periodArea(h.palace)}這一方面，${c.text}`;
  const blocked = notes.luBlocked ? '，只是同時有阻滯' : notes.moneyLeaks && domainOf(l.text) === '財帛' ? '，只是錢進了也容易出' : '';
  const eased = notes.jiEased ? '，不過也有轉圜的餘地' : '';
  const body = `${at(l, lu)}${blocked}；${at(j, ji)}${eased}。`;
  /* 通用句冇「你」：第一句要對住讀者講（lint P2） */
  return body.includes('你') ? `${span}，${body}` : `${span}對你來說，${body}`;
}

/*
 * 建議段點講某一方面（2026-10-13）：以前係「家方面是這一年最順的地方」「性格方面的決定」——
 * 填格式嘅講法，「性格方面」「身心負荷方面」讀落生硬。逐宮寫一個平常講法。
 */
export const ADVICE_ON: Record<string, string> = {
  命宮: '自己的計劃',
  兄弟: '和兄弟、朋輩合作的事',
  夫妻: '感情',
  子女: '後輩和手上的作品',
  財帛: '錢的安排',
  疾厄: '照顧自己的身心',
  遷移: '外面的機會',
  僕役: '朋友和人脈',
  官祿: '工作',
  田宅: '家裡的事',
  福德: '自己的興趣和心境',
  父母: '和長輩、上司之間的事',
};

/*
 * 化忌星句講緊化祿嗰方面（2026-10-18 · 模擬讀者 D）：「這一年最順的是朋友和人脈」對住同章
 * 「廉貞化忌，你的感情和人際容易有挫折」。星句係嗰粒星化忌嘅意思，唔理落邊宮，所以佢講到嘅方面
 * 唔可以再叫「最順」。逐宮列出星句會點講嗰方面。
 */
const AREA_WORDS: Record<string, RegExp> = {
  兄弟: /人際|朋友|朋輩|兄弟/,
  僕役: /人際|朋友|朋輩|下屬/,
  夫妻: /感情|伴侶/,
  官祿: /工作|事業|上司/,
  財帛: /錢|財|收入|開支|借貸/,
  田宅: /家|住/,
  遷移: /在外|出門|外地/,
  父母: /長輩|上司|父母/,
  子女: /後輩|子女|下屬/,
  疾厄: /身心|健康|辛勞|勞碌/,
  福德: /心情|情緒|心裡/,
  命宮: /心情|情緒/,
};
/** 化祿嗰方面：化忌星句講緊佢就當冇（唔講最順） */
function luArea(hits: readonly PeriodHit[]): string | null {
  const lu = hits.find((h) => h.hua === '祿')?.palace ?? null;
  const ji = hits.find((h) => h.hua === '忌');
  const line = ji ? DAXIAN_HUA.find((e) => e.star === ji.star && e.hua === '忌')?.text : undefined;
  if (lu && line && ji?.palace !== lu && AREA_WORDS[lu]?.test(firstClause(line))) return null;
  return lu;
}

/** 呢段時期最值得做嘅事：力氣放喺化祿嗰方面，化忌嗰方面嘅決定慢一步。 */
export function adviceSegment(hits: readonly PeriodHit[], scope: '這十年' | '這一年'): DaxianSegment | null {
  const lu = luArea(hits);
  const ji = hits.find((h) => h.hua === '忌')?.palace ?? null;
  if (!lu && !ji) return null;
  const parts: string[] = [];
  if (lu && ji === lu) parts.push(`${scope}，${ADVICE_ON[lu]}有得著也有牽掛，進一步之前，先想好退路。`);
  else {
    if (lu) parts.push(`${scope}最順的是${ADVICE_ON[lu]}，力氣放在這裡，最容易見到回報。`);
    /* 兩章嘅尾句唔同 */
    /* 2026-10-14：以前「牽涉到錢的安排的決定」兩個「的」，改句式 */
    if (ji) parts.push(`關於${ADVICE_ON[ji]}，決定之前多花一點時間，${scope === '這十年' ? '簽字、承諾之前多問一句' : '急著要答覆的事，先放一晚'}。`);
  }
  return { slot: '建議', text: parts.join(''), source_id: null, rule_ids: [], brief: adviceBrief(hits, scope) ?? undefined };
}

/**
 * 給你的話嘅「時間」一句（2026-10-13）：以前將兩章嘅建議段原句再印一次（同一本書兩次）；
 * 而家用一句撮要：「這十年，力氣放在工作，錢的安排慢一步；這一年⋯」。
 */
export function adviceBrief(hits: readonly PeriodHit[], scope: '這十年' | '這一年'): string | null {
  const lu = luArea(hits);
  const ji = hits.find((h) => h.hua === '忌')?.palace ?? null;
  if (!lu && !ji) return null;
  if (lu && ji === lu) return `${scope}，${ADVICE_ON[lu]}進退都要想清楚`;
  if (lu && ji) return `${scope}，力氣放在${ADVICE_ON[lu]}，${ADVICE_ON[ji]}慢一步`;
  if (lu) return `${scope}，力氣放在${ADVICE_ON[lu]}`;
  return `${scope}，${ADVICE_ON[ji!]}慢一步`;
}

/** 寫書嗰年嘅虛歲同大限。未起運回第一個大限，`started: false`。 */
function decadeAt(chart: Chart, year: number) {
  const a = annual(chart, year);
  if (!a.ok) return null;
  const A = a.value;
  if (A.decadal) return { A, d: A.decadal, started: true as const };
  const first = chart.decadals[0];
  if (!first || A.nominalAge >= first.fromAge) return null;
  const stem = chart.palaces.find((p) => p.branch === first.branch)!.stem;
  return { A, d: { ...first, stem }, started: false as const };
}

/* ── 一生十二步（免費） ─────────────────────────────── */
/** Reviewed past dates: ages select the language, never imply an event happened. */
export const LOOKBACK_FROM_AGE=12;
const realAgeIn=(year:number,nominalAge:number,born?:number)=>born===undefined?nominalAge-1:year-born;

// Reviewed retrospective rules: every returned event has its own complete source gate.
export function lookBackEvent(chart:Chart,A:AnnualChart):(typeof LOOKBACK_EVENTS)[number]|null {
  const palace=chart.palaces.find((p)=>p.branch===A.mingGong)!;
  const annualJi=A.sihua.annual.find((h)=>h.hua==='忌');
  const hits=(names:string[])=>names.every((n)=>palace.stars.some((s)=>s.name===n&&s.kind==='major'));
  // p.12: use actual flanking Yang/Tuo, not a weighted count of overlapping malefics.
  if(annualJi?.star==='武曲'&&annualJi.branch&&['命宮','財帛'].includes(annualJi.annualPalace??'')){
    const target=annualJi.branch;
    const branches='子丑寅卯辰巳午未申酉戌亥';const i=branches.indexOf(target);
    const adjacent=[branches[(i+11)%12],branches[(i+1)%12]];
    const natalYang=chart.palaces.find((p)=>p.stars.some((s)=>s.name==='擎羊'))?.branch;
    const natalTuo=chart.palaces.find((p)=>p.stars.some((s)=>s.name==='陀羅'))?.branch;
    const candidates=[{name:'本命',yang:natalYang,tuo:natalTuo},
      {name:'大限',yang:A.liuyao.decadal?.擎羊,tuo:A.liuyao.decadal?.陀羅},
      {name:'流年',yang:A.liuyao.annual.擎羊,tuo:A.liuyao.annual.陀羅}];
    const flank=candidates.find((f)=>f.yang&&f.tuo&&f.yang!==f.tuo&&adjacent.includes(f.yang)&&adjacent.includes(f.tuo));
    if(flank){const e=LOOKBACK_EVENTS.find((e)=>e.kind==='錢')!;return {...e,
      rules:[`流年武曲化忌在${palaceLabel(annualJi.annualPalace!)}，由${flank.name}擎羊、陀羅在兩鄰宮相夾；同宮煞數或疊忌不能代替相夾。原文另說不一定代表事業失敗，可能是投入超過負荷。`],
      text:'投入與周轉是這一年值得回看的重點，承擔是否超過手上資源，會影響往後怎樣接續',
      sources:[{corpus:'zhongzhou',passage_id:'huigu.yangtuo.jiaji',quote:'亦不一定代表事业失败'}]};}
  }
  // p.29 is about a period Life Palace containing Ju Men, not any palace with Ju Men Ji.
  if(hits(['巨門'])&&annualJi?.star==='巨門'&&annualJi.branch===A.mingGong){
    const sf=sanFangPalaces(chart.palaces,A.mingGong);const branches=new Set(sf.map((p)=>p.branch));
    const sunRelief=sf.some((p)=>p.stars.some((s)=>s.name==='太陽'&&['廟','旺'].includes(s.brightness??'')));
    const hua=[...A.sihua.natal,...(A.sihua.decadal??[]),...A.sihua.annual];
    const luQuan=hua.some((h)=>h.branch&&branches.has(h.branch)&&['祿','權'].includes(h.hua))
      ||sf.some((p)=>p.stars.some((s)=>s.name==='祿存'))||[A.liuyao.annual,A.liuyao.decadal].some((f)=>f&&branches.has(f.祿存));
    const sha=sf.some((p)=>p.stars.some((s)=>SHA4.includes(s.name)))||[A.liuyao.annual,A.liuyao.decadal].some((f)=>f&&(branches.has(f.擎羊)||branches.has(f.陀羅)));
    if(!sunRelief&&!luQuan&&sha){const e=LOOKBACK_EVENTS.find((e)=>e.kind==='是非')!;return {...e,rules:['本年命宮逢巨門化忌，相關宮位見煞；已核原局、大限與流年的權祿及祿存，未見該範圍權祿，亦無廟旺太陽化解。原文見諸吉及吉化的相反分支仍須並讀。'],sources:[{corpus:'zhongzhou',passage_id:'huigu.jumen',quote:'大限流年命宫逢巨门'}]};}
  }
  return null;
}

/** Past dates are selected as reading examples, never as evidence that an event happened. */
export function lookBackSegments(chart:Chart,year:number,solarBorn?:number):DaxianSegment[]{
  const pivot=pivotRule(chart,'year'),keys=pivotSteps(chart).steps;
  const rows:{year:number;A:AnnualChart;turn:Chart['decadals'][number]|undefined;key:boolean;event:ReturnType<typeof lookBackEvent>}[]=[];
  for(let y=chart.lunar.y+LOOKBACK_FROM_AGE-1;y<year;y++){
    const result=annual(chart,y);if(!result.ok)continue;const A=result.value;
    if(realAgeIn(y,A.nominalAge,solarBorn)<LOOKBACK_FROM_AGE)continue;
    const turn=chart.decadals.find((d)=>d.fromAge===A.nominalAge);
    const p=chart.palaces.find((p)=>p.branch===A.mingGong)!;
    const key=Boolean(pivot?.isPivot(p,A));
    const event=realAgeIn(y,A.nominalAge,solarBorn)>=18?lookBackEvent(chart,A):null;
    if(turn||key||event)rows.push({year:y,A,turn,key,event});
  }
  // Most recent examples with different Life Palace branches; include a decade boundary when available.
  const latest=[...rows].reverse();const selected:typeof rows=[];
  const boundary=latest.find((r)=>r.turn);if(boundary)selected.push(boundary);
  for(const r of latest){if(selected.length>=3)break;if(selected.some((s)=>s.year===r.year||Math.abs(s.year-r.year)<3||s.A.mingGong===r.A.mingGong))continue;selected.push(r);}
  return selected.sort((a,b)=>a.year-b.year).map((r)=>{
    const {A,turn,key,event}=r,p=chart.palaces.find((p)=>p.branch===A.mingGong)!;
    const prefix=`${yearCN(r.year)}年（${A.ganzhi.join('')}年，你虛歲${num(A.nominalAge)}），`;
    const lines:MingStatement[]=[];
    const add=(text:string,ids:string[]=[],kind:MingStatement['kind']='evidence')=>lines.push({text,en:'',kind,source_ids:ids,citations:ids.map(lifeStepsCite)});
    add(prefix+(turn?`你走進第${num(turn.index)}個大限，${keys.includes(turn.index)?'也是你人生較重要的一步，':''}${starsOf(chart,chart.palaces.find((p)=>p.branch===turn.branch)!)}。`:`你在第${num(A.decadal!.index)}個大限之內，流年命宮在${p.branch}，${starsOf(chart,p)}。`));
    if(turn)add(`這一年的命宮在${p.branch}，${starsOf(chart,p)}。`);

    const ji=A.sihua.annual.find((h)=>h.hua==='忌'),lu=A.sihua.annual.find((h)=>h.hua==='祿');
    if(ji&&lu)add(`當年的${lu.star}化祿在${palaceLabel(lu.annualPalace!)}，${ji.star}化忌在${palaceLabel(ji.annualPalace!)}。`,['method']);
    // These two general four-transformation interactions are stated explicitly at PDF236.
    const natal=new Map(A.sihua.natal.map((h)=>[h.star,h.hua]));
    const interaction=A.sihua.annual.map((h)=>({h,rule:DAXIAN_RULES.rules.find((r)=>['dx.rule.lu_to_ji','dx.rule.ji_to_lu'].includes(r.id)&&r.natal===natal.get(h.star)&&r.decade===h.hua)})).find((r)=>r.rule);
    if(interaction?.rule)add(interaction.rule.text.replace('{star}',interaction.h.star).replace('這十年','這一年'),['method'],'interpretation');
    if(event)add(event.text+'。',event.sources.map((s)=>s.passage_id),'interpretation');
    if(key){lines[0]!.source_ids.push(pivot!.source);lines[0]!.citations.push(lifeStepsCite(pivot!.source));}
    const young=realAgeIn(r.year,A.nominalAge,solarBorn)<18;
    // Only use the newly reviewed meanings below; other combinations keep their chart facts.
    // The advice is stored separately from source-supported interpretation even when read continuously.
    const focus:MingStatement[]=[];
    const focusLine=(key:keyof typeof LIFE_STEPS_VOICE,ids:string[]=[],kind:MingStatement['kind']='editorial-explanation')=>focus.push({text:LIFE_STEPS_VOICE[key].zh,en:LIFE_STEPS_VOICE[key].en,kind,source_ids:ids,citations:ids.map(lifeStepsCite)});
    if(young)focusLine('study',[],'editorial-advice');
    else if(interaction?.rule?.id==='dx.rule.lu_to_ji')focusLine('resources',['method']);
    else if(interaction?.rule?.id==='dx.rule.ji_to_lu')focusLine('opening',['method']);
    else if(ji?.star==='天機'&&ji.annualPalace==='福德')focusLine('planning',['voice.tianji.ji']);
    else if(ji?.star==='文昌')focusLine('documents',['voice.wenchang.ji']);
    else if(lu?.star==='天機'){
      focusLine('initiative',['voice.tianji.lu']);
      if(ji?.annualPalace==='僕役')focusLine('team',[],'editorial-advice');
      else if(ji?.annualPalace==='疾厄')focusLine('pace',[],'editorial-advice');
    }
    // Keep the date and stage first, then explain the focus before the supporting star positions.
    lines.splice(1,0,...focus);
    const ids=[...new Set(lines.flatMap((l)=>l.citations))];
    return {slot:'回看',heading:`${yearCN(r.year)}年`,text:lines.map((l)=>l.text).join(''),statements:lines,source_id:ids.join('+')||null,rule_ids:[],
      referenceFocus:ids.flatMap((id)=>lifeStepsSource(id)?.quoteSpans.filter((span)=>!id.endsWith(':method')||span.id===(interaction?.rule?.id==='dx.rule.lu_to_ji'?'wtz.deep.p236.b002':interaction?'wtz.deep.p236.b003':'wtz.deep.p235.b005')).map((span)=>span.id)??[]),
      referenceApplicability:[`本盤當年為${A.ganzhi.join('')}，流年命宮在${p.branch}；${A.decadal?`所處大限為第${num(A.decadal.index)}步（虛歲${num(A.decadal.fromAge)}至${num(A.decadal.toAge)}歲）`:'尚未起大限'}。`,...(key?[`本命${starsOf(chart,chart.palaces.find((p)=>p.name==='命宮')!)}；本年行到該星系原文列明的樞紐宮垣。`]:[]),...(event?.rules??[])],
      referenceConditions:['年份取自已走過的大限交界及可確認的樞紐宮垣，最多列三個不同宮位的近年例子；不是按事件吉凶計分，也不是完整的重要年份名單。','四化先看星曜與原局、大限的交會，再分具體得失；只見某宮有祿或忌，尚不足以確定生活事件。','生活上的整理與做法屬編輯解說或建議，不表示曾發生某件往事。天機祿只取主動策劃的方向，未推為獲利；天機忌只在本年福德落點解說計劃與思慮，未套疾病分支；文昌忌只取文件及責任核對，未推為實際損失。',...(event?[`本段判讀只採${event.sources.map((s)=>s.passage_id==='huigu.jumen'?'巨門原段的完整限制':'武曲羊陀夾忌的周轉限制').join('、')}；其餘星系案例不套入。`]:[])]};
  });
}
/** Compatibility for callers that need one segment; the chapter uses the separate dated paragraphs. */
export function lookBack(chart:Chart,year:number,solarBorn?:number):DaxianSegment|null{return lookBackSegments(chart,year,solarBorn)[0]??null;}

/**
 * 一生十二步只列到虛歲九十歲左右起步嗰幾步（2026-10-02）。
 * 以前列晒十二步，水二局會去到「第十二步 一百十二至一百二十一歲 關鍵大限」——
 * 讀者見到百幾歲，第一個感覺係「機器排出嚟」。之後嘅一句帶過。
 * 常數喺 steps.ts，細讀（branch.ts）共用。
 */
export { STEPS_UNTIL_AGE } from './steps';

/** `solar`：國曆生辰（有就回看用實歲，見 `realAgeIn`） */
export function lifeStepsChapter(input: { chart: Chart; year: number; solar?: { y: number } }): Out {
  const { chart, year } = input;
  const at = decadeAt(chart, year);
  if (!at || chart.decadals.length === 0) return null;
  const first = chart.decadals[0]!;
  const lead = at.started
    ? `你的大限由虛歲${num(first.fromAge)}歲起，每十年換一步；寫這本書時（${yearCN(year)}年），你走到第${num(at.d.index)}步。`
    : `你的大限由虛歲${num(first.fromAge)}歲起，每十年換一步；寫這本書時（${yearCN(year)}年），你還未起步。`;
  const shown = chart.decadals.filter((d) => d.fromAge < STEPS_UNTIL_AGE);
  /* 先按本盤列出可核對的過去年份，不把生活例子當成已發生的事。 */
  const back = lookBackSegments(chart, year, input.solar?.y);
  const rest = chart.decadals.find((d) => d.fromAge >= STEPS_UNTIL_AGE);
  const pv = pivotSteps(chart);
  const keySteps = pv.steps.filter((n) => shown.some((d) => d.index === n));
  const keyPalaces = keySteps.map((n) => chart.palaces.find((p) => p.branch === chart.decadals.find((d) => d.index === n)!.branch)!);
  const keyLine = keySteps.length
    ? `你命盤裡的關鍵大限是${keySteps.map((n) => `第${num(n)}步`).join('、')}：${keySteps.length === 1 ? '這一步' : '這幾步'}前後的選擇與安排，值得多留一份心。`
    : '';
  const steps: DaxianSegment[] = shown.map((d) => {
    const p = chart.palaces.find((x) => x.branch === d.branch)!;
    const now = (pv.steps.includes(d.index) ? '　關鍵大限。' : '') + (at.started && d.index === at.d.index ? '　寫這本書時，你在這一步。' : '');
    return {
      slot: '步',
      text: `第${num(d.index)}步　${num(d.fromAge)}至${num(d.toAge)}歲　${palaceLabel(p.name)}，${starsOf(chart, p)}。${now}`,
      source_id: null,
      rule_ids: [],
    };
  });
  return {
    slug: STEPS_SLUG,
    title: STEPS_SLUG,
    segments: [
      { slot: '結論', text: lead + keyLine, source_id: keySteps.length ? pv.source : null, rule_ids: [],
        statements:[{text:lead+keyLine,en:'',kind:'evidence',source_ids:pv.source?[pv.source]:[],citations:pv.source?[lifeStepsCite(pv.source)]:[]}],
        referenceApplicability:keySteps.length?[pivotWhy(chart,pv.rule!,keyPalaces)]:[],
        referenceConditions:[...(pv.rule?.pendingSource?['這組原文有跨頁重複或疑字，尚未釐清的樞紐分支暫不列為已確認；未列不等於確定沒有作用。']:[]),'關鍵大限按本命星系及順逆、配曜條件選出；樞紐本身不等於吉凶，仍須連同該限四化及原局判斷。',
          ...(pv.rule?.requiresJi?['本盤同陰的吉支另核見吉曜或吉化，不能以沒有四煞代替見吉。']:[]),
          ...(pv.rule?.includeOpposite?['本盤除原星系所在宮垣，也列入原書明說的對拱宮垣；對拱不等於把原宮星曜移入本宮。']:[]),
          ...(pv.rule?.includeLu?['本盤加列原局及該限祿存、化祿所在宮垣；流年另核當年四化，不能因有祿便當成吉限。']:[]),
          ...(pv.rule?.unresolvedTianji&&(chart.palaces.find((p)=>p.name==='命宮')!.borrowsFrom??chart.mingGong)==='卯'?['原文反背用詞有分歧；目前只標不受分歧影響的巨門、廉相、七殺。天機一支待釐清，不硬判為有或沒有。']:[])] },
      ...back,
      ...steps,
      ...(rest ? [{ slot: '步', text: `之後的大限從虛歲${num(rest.fromAge)}歲起，這裡不再細列。`, source_id: null, rule_ids: [] }] : []),
      { slot: '留白', text: DAXIAN_FRAMES.stepsClose, source_id: null, rule_ids: [] },
    ],
  };
}

/* ── 這十年（收費） ─────────────────────────────────── */

type Hit = { star: string; hua: Sihua; decadalPalace: string | null };

/** 大限命宮當命宮讀：改名，四化用大限嗰套（冇大限化嘅星留本命化）。 */
export function decadeView(chart: Chart, branch: string, hits: { star: string; hua: Sihua }[]): Chart {
  const by = new Map(hits.map((h) => [h.star, h.hua]));
  return {
    ...chart,
    palaces: chart.palaces.map((p) => ({
      ...p,
      name: p.branch === branch ? '命宮' : p.name === '命宮' ? ('__本命' as never) : p.name,
      stars: p.stars.map((s) => (by.has(s.name) ? { ...s, sihua: by.get(s.name) } : s)),
    })),
  };
}

/** `periodChecks`（新書）：魁鉞講位置、冲起本命化曜、財帛空劫（2026-10-26）。基準入口唔開，歷史比對唔變。 */
export function decadeChapter(input: { chart: Chart; year: number; periodChecks?: boolean }): Out {
  const { chart, year } = input;
  const at = decadeAt(chart, year);
  if (!at) return null;
  const { A, d, started } = at;
  const dp = chart.palaces.find((p) => p.branch === d.branch)!;

  /* 大限四化：已起運用引擎嗰份；未起運自己由宮干算，落喺邊宮用大限命宮推 */
  const table = sihuaOfStem(d.stem);
  if (!table) return null;
  const decIdx = chart.palaces.findIndex((p) => p.branch === d.branch);
  const ORDER = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];
  const natalOrder = ORDER.indexOf(chart.palaces[decIdx]!.name);
  const decadalNameOf = (starName: string): string | null => {
    const p = chart.palaces.find((x) => x.stars.some((s) => s.name === starName));
    if (!p) return null;
    const k = (ORDER.indexOf(p.name) - natalOrder + 12) % 12;
    return ORDER[k]!;
  };
  const hits: Hit[] = (['祿', '權', '科', '忌'] as Sihua[]).map((h) => ({
    star: table[h],
    hua: h,
    decadalPalace: started ? (A.sihua.decadal?.find((x) => x.hua === h)?.decadalPalace ?? decadalNameOf(table[h])) : decadalNameOf(table[h]),
  }));
  const natal = new Map(A.sihua.natal.map((h) => [h.star, h.hua]));

  /* 結論：祿落邊、忌落邊（呢十年嘅宮） */
  const lu = hits.find((h) => h.hua === '祿')!;
  const ji = hits.find((h) => h.hua === '忌')!;
  const when = started
    ? `寫這本書時（${yearCN(year)}年），你虛歲${num(A.nominalAge)}，正行第${num(d.index)}個大限（${num(d.fromAge)}至${num(d.toAge)}歲）。`
    : `寫這本書時（${yearCN(year)}年），你虛歲${num(A.nominalAge)}，第一個大限從虛歲${num(d.fromAge)}歲開始。`;
  /* 未成年：下面講嘅（實權、上級、合約）係呢十年身邊嘅環境，唔係佢自己要做嘅事 */
  const young = d.toAge <= 20 ? '你還年少，下面講的是這十年身邊的環境，很多要到長大後才用得上。' : '';
  /*
   * 未起運（2026-10-16 審稿 J 盤：虛歲三、四歲起運）：上一句講咗第一個大限仲未開始，
   * 呢句再講「這十年」就似講緊而家。點明係由幾歲起嗰十年，後面嘅「這十年」都跟住指返佢。
   */
  const span = started ? '這十年' : `從虛歲${num(d.fromAge)}歲起的這十年`;
  /* 祿忌冇落宮（理論上唔會）先用舊講法；正常情況見 `periodGist` */
  const fallbackGist =
    lu.decadalPalace && lu.decadalPalace === ji.decadalPalace
      ? `${span}，你的${periodArea(lu.decadalPalace)}起伏較大，有得著，也有牽掛。`
      : `${span}，你的${periodArea(lu.decadalPalace)}比較順，${periodArea(ji.decadalPalace)}要多留神。`;

  /* 大限命宮：盤面事實 ＋ 六十星系偏向（用大限四化） */
  const fact = `這個大限落在你的${palaceLabel(dp.name)}，${starsOf(chart, dp)}，宮干是${d.stem}。`;
  const view = decadeView(chart, d.branch, hits);
  const x = xingxiOf(view);
  const leanLine = x ? `這十年裡，${x.system.plain.lean[leanOf(view, x.system).pole]}` : '';

  /* 分四方面（工作、錢、感情、心境）：起咗運先有大限盤 */
  const areas = started
    ? areaSegments(
        chart,
        (b) => A.overlay.find((o) => o.branch === b)?.decadal ?? null,
        hits.map((h) => ({ star: h.star, hua: h.hua, palace: h.decadalPalace })),
        '這十年',
        input.periodChecks,
      )
    : { segments: [], used: new Set<string>() };
  const advice = started ? adviceSegment(hits.map((h) => ({ star: h.star, hua: h.hua, palace: h.decadalPalace })), '這十年') : null;
  const gist =
    periodGist(span, { star: lu.star, hua: '祿', palace: lu.decadalPalace }, { star: ji.star, hua: '忌', palace: ji.decadalPalace }, areas.used, started, { moneyLeaks: areas.kongku }) ||
    fallbackGist;

  /* 四化：逐粒講，落喺呢十年嘅邊宮（四方面已經講咗嘅唔再講） */
  const huaLines = huaSegment(
    hits.filter((h) => !areas.used.has(`${h.star}${h.hua}`)).map((h) => ({ star: h.star, hua: h.hua, palace: h.decadalPalace })),
    '這十年',
  );

  /* 同本命四化碰唔碰到 */
  const inter = hits.flatMap((h) => {
    const n = natal.get(h.star);
    if (!n) return [];
    const r = DAXIAN_RULES.rules.find((r) => r.natal === n && r.decade === h.hua);
    return r ? [{ text: r.text.replace('{star}', h.star), id: r.id }] : [];
  });
  const touched = hits.some((h) => natal.has(h.star));
  const meet = input.periodChecks ? meetSegment(chart, '這十年', hits, [{ who: '你本命', hits: A.sihua.natal }], started ? (b) => A.overlay.find((o) => o.branch === b)?.decadal ?? null : undefined) : null;
  const interSeg = inter.length || meet
    ? { text: inter.map((i) => i.text).join('') + (meet?.text ?? ''), id: [...inter.map((i) => i.id), ...(meet ? [meet.id] : [])].join('+') }
    : touched
      ? null
      : { text: DAXIAN_RULES.none.text, id: DAXIAN_RULES.none.id };

  /* 下一個十年 */
  const next = chart.decadals.find((x) => x.index === d.index + 1);
  let nextLine = '';
  if (next) {
    const np = chart.palaces.find((p) => p.branch === next.branch)!;
    const nt = sihuaOfStem(np.stem);
    nextLine = `下一個大限從虛歲${num(next.fromAge)}歲開始，轉到${palaceLabel(np.name)}，${starsOf(chart, np)}${nt ? `；那十年${nt['祿']}化祿、${nt['忌']}化忌` : ''}。`;
  }

  const seg = (slot: string, text: string, source_id: string | null = null): DaxianSegment => ({ slot, text, source_id, rule_ids: [] });
  const kuiyue = kuiyueMatches(chart, d.branch, flowStars(d.stem, d.branch));
  const segments = [
    seg('結論', gist + when + young + (pivotSteps(chart).steps.includes(d.index) ? '這十年是你命盤裡的關鍵大限之一，這段時期的得失，對你一生影響特別大。' : '')),
    seg('大限', fact + leanLine, x ? `xingxi.${x.system.n}` : null),
    /* 流魁流鉞冲起本命魁鉞（深造講義 p.8、9，`kuiyue.ts`） */
    ...(kuiyue.length ? [seg('魁鉞', input.periodChecks ? kuiyueText('decade', kuiyue) : KUIYUE_TEXT.decade, KUIYUE_SOURCE)] : []),
    ...areas.segments,
    seg('四化', huaLines.text, huaLines.id),
    ...(interSeg ? [seg('互動', interSeg.text, interSeg.id)] : []),
    ...(advice ? [advice] : []),
    ...(nextLine ? [seg('下一步', nextLine)] : []),
    seg('留白', DAXIAN_FRAMES.decadeClose),
  ].filter((s) => s.text.trim() !== '');
  /* 同章相反講法（clash.ts）：運限章唔剷，只講明係另一面 */
  return { slug: DECADE_SLUG, title: DECADE_SLUG, segments: resolveClashes(segments, { drop: false }).segments };
}
