import { z } from 'zod';
import { sanFangPalaces, type Chart, type Palace } from '@guanwei/ziwei';
import { XINGXI, leanOf, xingxiOf } from './xingxi';
import { BRANCH_RAW } from './branch/index';
import { CORPUS, normaliseForMatch } from './lexicon';
import { scanForbidden } from './lint';
import { scanPlain } from './plain';
import { STEPS_UNTIL_AGE, num } from './steps';

/* ───────────────────────────────────────────────────────────
 * 原文分支（2026-10-11 內容審查第 3 層 · 試點）
 *
 * 以前一格（星 × 宮）寫一段完整斷語，條件只有「呢粒星喺呢個宮」。原書唔係咁讀：
 * 同一格之下仲分化祿／化權／化科／化忌、同度邊粒星、坐邊個地支、夾宮、會照有冇煞忌，
 * 每個分支結論都唔同，有啲仲會推翻基本性質（天機守事業「多變」，化權反而「變為穩定」）。
 *
 * 呢度將原文拆成可以逐條核對嘅規則：
 *   when      條件（只用引擎排得出嘅星；排唔到嘅喺 $note 講明）
 *   role      base 基本 / refine 補充 / limit 限制 / exception 例外
 *   overrides 有原文根據先寫：呢條成立就唔講嗰幾條（例如化權取代「多變」）
 *   source    原文出處，引文喺 load 時對返語料庫；`also` 係第二個出處
 *   edit      讀者版改咗乜（「必」收窄、人格貶語不用⋯），唔印出嚟
 *
 * 成立嘅規則按檔案次序砌成一段「細讀」—— 先收斂成呢張盤嘅主張，再出字，
 * 唔係每粒星各寫一套再串埋。
 *
 * 試點只做兩個題目：命宮天同天梁坐寅申、官祿宮天機。其餘六十星系未做。
 * ─────────────────────────────────────────────────────────── */

const MAJOR = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const HUA = z.enum(['祿', '權', '科', '忌']);
const one = <T extends z.ZodTypeAny>(t: T) => z.union([t, z.array(t).min(1)]);
const At = z.enum(['same', 'opp', 'trine', 'sifang']);

type Cond =
  | { star: string | string[]; at: z.infer<typeof At> | z.infer<typeof At>[] }
  | { hua: z.infer<typeof HUA> | z.infer<typeof HUA>[]; star?: string | string[]; at: z.infer<typeof At> | z.infer<typeof At>[] }
  | { jia: [string, string] }
  | { branch: string[] }
  | { alone: true }
  | { with: string }
  | { lean: string }
  | { palace: string; is: 'good' | 'bad' }
  | { palace: string; star: string | string[] }
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond };

const Cond: z.ZodType<Cond> = z.lazy(() =>
  z.union([
    z.object({ hua: one(HUA), star: one(z.string()).optional(), at: one(At) }).strict(),
    z.object({ star: one(z.string()), at: one(At) }).strict(),
    z.object({ jia: z.tuple([z.string(), z.string()]) }).strict(),
    z.object({ branch: z.array(z.string()).min(1) }).strict(),
    z.object({ alone: z.literal(true) }).strict(),
    z.object({ with: z.string() }).strict(),
    /* 骨架章點票嘅偏向（xingxi.ts `leanOf`）；「未定」= 兩邊都冇訊號 */
    z.object({ lean: z.string() }).strict(),
    /* 宮位連動（2026-10-12）：另一個宮（本命宮名）吉／不吉，或者有某粒星 —— 見 `palaceState()` */
    z.object({ palace: z.string(), is: z.enum(['good', 'bad']) }).strict(),
    z.object({ palace: z.string(), star: one(z.string()) }).strict(),
    z.object({ all: z.array(Cond).min(1) }).strict(),
    z.object({ any: z.array(Cond).min(1) }).strict(),
    z.object({ not: Cond }).strict(),
  ]),
);

const Cite = z.object({ passage: z.string(), quote: z.string().min(4).max(40) });

const Rule = z.object({
  id: z.string(),
  role: z.enum(['base', 'refine', 'limit', 'exception']),
  /**
   * 星系題目：呢條規則斷定咗偏向邊一頭（2026-10-12）。骨架章點票出嚟係另一頭，就唔出 ——
   * 例如點票「虛浮」，就唔講「太陽在子化祿，本質沉穩」；平衡就兩頭都照講，未定就兩頭都唔講。
   */
  pole: z.string().optional(),
  /** 成立就改寫「性格的骨架」嘅偏向句（只限命宮題目） */
  gujia: z.boolean().optional(),
  /**
   * 呢條講「行到某星嗰步運」：列出講緊嘅星（或者「#地支」，直接講某宮嗰步運）。
   * 講到嘅運全部喺 STEPS_UNTIL_AGE（九十歲）之後先起步，大限章冇列，就唔出（2026-10-12 重疊檢查）。
   */
  decade: z.array(z.string()).optional(),
  /** gujia 例外：推力段（點票得出嘅偏向）後面補一句，講明偏向唔再成立 */
  tail: z.string().optional(),
  tailEn: z.string().optional(),
  when: Cond.optional(),
  overrides: z.array(z.string()).optional(),
  text: z.string(),
  en: z.string(),
  source: Cite,
  also: z.array(Cite).optional(),
  edit: z.string().optional(),
});
export type BranchRule = z.infer<typeof Rule>;

const Topic = z
  .object({
    topic: z.object({
      id: z.string(),
      palace: z.string(),
      /** 空 = 通則題目：唔限主星（例：財帛宮見祿馬交馳、擎羊坐財帛），宮內乜星都套 */
      stars: z.array(z.string()),
      branch: z.array(z.string()).optional(),
      /** 宮位連動題目（2026-10-12）：條件睇第二個宮，細讀入面排最前（唔被主星規則擠出四條上限） */
      link: z.boolean().optional(),
      /** 六十星系編號：有就係星系題目，細讀擺喺「性格的骨架」章，唔擺命宮章 */
      xingxi: z.number().optional(),
    }),
    /** 星系題目：骨架章嘅基本講法（plain.basis、兩頭偏向句）掛嘅出處 */
    basis: Cite.optional(),
    rules: z.array(Rule),
  })
  .superRefine((t, ctx) => {
    const issue = (m: string) => ctx.addIssue({ code: 'custom', message: `${t.topic.id}：${m}` });
    const ids = new Set(t.rules.map((r) => r.id));
    if (ids.size !== t.rules.length) issue('規則 id 重複');
    /* 偏向條件嘅名一定要係嗰個星系嘅兩頭（或者平衡、未定），寫錯名就永遠唔成立而冇人知 */
    if (t.topic.xingxi !== undefined) {
      const x = XINGXI.find((y) => y.n === t.topic.xingxi);
      if (!x) issue(`搵唔到第 ${t.topic.xingxi} 星系`);
      const ok = new Set([...(x?.poles ?? []), '平衡', '未定']);
      const leans = (c: Cond): string[] =>
        'lean' in c ? [c.lean] : 'all' in c ? c.all.flatMap(leans) : 'any' in c ? c.any.flatMap(leans) : 'not' in c ? leans(c.not) : [];
      for (const r of t.rules) for (const l of r.when ? leans(r.when) : []) if (!ok.has(l)) issue(`${r.id}：偏向「${l}」唔係呢個星系嘅兩頭`);
      for (const r of t.rules) if (r.pole && !x?.poles.includes(r.pole)) issue(`${r.id}：pole「${r.pole}」唔係呢個星系嘅兩頭`);
    }
    if (t.basis) {
      const p = CORPUS.zhongzhou?.passages[t.basis.passage];
      if (!p) issue(`basis：語料庫搵唔到 ${t.basis.passage}`);
      else if (!normaliseForMatch(p.text).includes(normaliseForMatch(t.basis.quote))) issue(`basis：引文「${t.basis.quote}」唔喺原文`);
    }
    for (const r of t.rules) {
      for (const o of r.overrides ?? []) if (!ids.has(o)) issue(`${r.id} overrides 搵唔到 ${o}`);
      for (const c of [r.source, ...(r.also ?? [])]) {
        const p = CORPUS.zhongzhou?.passages[c.passage];
        if (!p) issue(`${r.id}：語料庫搵唔到 ${c.passage}`);
        else if (!normaliseForMatch(p.text).includes(normaliseForMatch(c.quote))) issue(`${r.id}：引文「${c.quote}」唔喺原文`);
      }
      for (const t of [r.text, r.tail ?? '']) for (const f of [...scanForbidden(t, 'body'), ...scanPlain(t, 'body')]) issue(`${r.id} ${f.code} ${f.message}`);
      if (Boolean(r.tail) !== Boolean(r.tailEn)) issue(`${r.id}：tail 同 tailEn 要一齊有`);
      if (r.gujia && t.topic.palace !== '命宮') issue(`${r.id}：gujia 只限命宮題目`);
      for (const k of r.decade ?? []) if (!MAJOR.includes(k) && !(k.startsWith('#') && BRANCHES.includes(k.slice(1)))) issue(`${r.id}：decade「${k}」唔係主星或者「#地支」`);
    }
  });
export type BranchTopic = z.infer<typeof Topic>;

export const BRANCH_TOPICS: BranchTopic[] = BRANCH_RAW.map((raw) => Topic.parse(raw));

/* ── 條件 ── */

/** 骨架章嘅偏向；兩邊都冇訊號就係「未定」（唔係「平衡」—— 冇訊號唔等於兩面調和） */
export function leanState(chart: Chart): string | null {
  const found = xingxiOf(chart);
  if (!found) return null;
  const { pole, score } = leanOf(chart, found.system);
  return Object.values(score).every((n) => n === 0) ? '未定' : pole;
}

const list = <T>(x: T | T[]): T[] => (Array.isArray(x) ? x : [x]);

function where(chart: Chart, p: Palace, at: z.infer<typeof At>): Palace[] {
  const [self, a, dui, b] = sanFangPalaces(chart.palaces, p.branch) as [Palace, Palace, Palace, Palace];
  /* 本宮用 `p` 本身：借星命宮嘅 `p` 係加咗對宮主星嘅版本 */
  if (at === 'same') return [p];
  if (at === 'opp') return [dui];
  if (at === 'trine') return [a, b];
  return [self, a, dui, b];
}

function majorsOf(p: Palace): string[] {
  return p.stars.filter((s) => MAJOR.includes(s.name)).map((s) => s.name);
}

const SHA_STARS = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'];
const AIDE_STARS = ['左輔', '右弼', '文昌', '文曲', '天魁', '天鉞'];

/** 某宮連借入嘅對宮主星（宮內冇主星先借），同 `applies()` 一樣讀法 */
function palaceView(chart: Chart, name: string): Palace | null {
  const p = chart.palaces.find((x) => x.name === name);
  if (!p) return null;
  if (majorsOf(p).length || !p.borrowsFrom) return p;
  const opp = chart.palaces.find((x) => x.branch === p.borrowsFrom);
  return opp ? { ...p, stars: [...p.stars, ...opp.stars.filter((s) => MAJOR.includes(s.name))] } : p;
}

/**
 * 原書講宮位連動，用「某宮星曜吉／不吉」（例：「财帛宫星曜吉，而事业宫星曜不吉」p.436）。
 * 呢度定得簡單、核對得到（2026-10-12）：
 *   不吉：宮內有化忌，或者煞星（羊陀火鈴空劫）兩粒或以上
 *   吉　：唔係不吉，而且有化祿／化權／化科或者祿存，或者輔佐星（左右昌曲魁鉞）兩粒或以上
 *   其餘係中性，連動規則唔出。
 */
export function palaceState(chart: Chart, name: string): 'good' | 'bad' | null {
  const p = palaceView(chart, name);
  if (!p) return null;
  const has = (names: string[]) => p.stars.filter((s) => names.includes(s.name)).length;
  if (p.stars.some((s) => s.sihua === '忌') || has(SHA_STARS) >= 2) return 'bad';
  if (p.stars.some((s) => s.sihua && s.sihua !== '忌') || has(['祿存']) || has(AIDE_STARS) >= 2) return 'good';
  return null;
}

/**
 * 條件睇嘅宮。借星（2026-10-12）：會照或對宮嗰宮冇主星，原書照借對宮主星嚟讀（「借星安宮的天同巨門」）。
 * 只借主星同主星嘅四化；輔星、煞星唔借。本宮（same）唔喺度借 —— 借星命宮由 `applies()` 造好。
 */
function looked(chart: Chart, p: Palace, at: z.infer<typeof At> | z.infer<typeof At>[]): Palace[] {
  const places = list(at).flatMap((a) => where(chart, p, a));
  const borrowed = (q: Palace): Palace[] => {
    if (q === p || majorsOf(q).length || !q.borrowsFrom) return [];
    const opp = chart.palaces.find((x) => x.branch === q.borrowsFrom);
    return opp ? [{ ...opp, stars: opp.stars.filter((s) => MAJOR.includes(s.name)) }] : [];
  };
  return [...places, ...places.flatMap(borrowed)];
}

/**
 * 條件喺呢張盤中咗乜（2026-10-12 術語填實）：中咗嘅星（「左輔」）同四化（「天同化祿」），
 * 只計正面條件 —— `not` 入面嘅唔計，`any` 只計中咗嗰幾支。條件唔成立就冇。
 */
function evidence(chart: Chart, p: Palace, focus: string, c: Cond, seat: Palace['branch']): string[] {
  if (!holds(chart, p, focus, c, seat)) return [];
  if ('all' in c) return c.all.flatMap((x) => evidence(chart, p, focus, x, seat));
  if ('any' in c) return c.any.flatMap((x) => evidence(chart, p, focus, x, seat));
  if ('jia' in c) return [...c.jia];
  if ('palace' in c || !('at' in c)) return [];
  const qs = looked(chart, p, c.at);
  if ('hua' in c) {
    const stars = c.star ? list(c.star) : null;
    return qs.flatMap((q) =>
      q.stars
        .filter((s) => s.sihua && list(c.hua).includes(s.sihua as z.infer<typeof HUA>) && (!stars || stars.includes(s.name)))
        .map((s) => `${s.name}化${s.sihua}`),
    );
  }
  return qs.flatMap((q) => q.stars.filter((s) => list(c.star).includes(s.name)).map((s) => s.name));
}

/*
 * ── 泛稱填實（2026-10-12 讀者回饋：術語太多）──
 *
 * 原書講「見吉」「見煞忌」「輔佐吉星」，讀者唔知係邊粒星。規則文字用〔〕標住泛稱，
 * 引擎填返令呢條規則成立嘅星：「紫微見〔煞忌〕」→「紫微化忌，又見擎羊」。
 * 揀邊類星睇〔〕入面嘅字；乜都揾唔到（或者句子已經講咗）就照原本泛稱。
 * 英文暫時照原本泛稱譯（en/render.ts 用 `slotPattern` 對返模板句）。
 */
const FILL_VERB = '又見|見齊|見|又有|有|會到|加上|得|被|與|多';
const FILL = new RegExp(`(${FILL_VERB})?〔([^〕]+)〕`, 'g');

function pick(phrase: string, ev: string[]): string[] {
  const good = (e: string) => /化[祿權科]$/.test(e);
  if (phrase.includes('煞')) return ev.filter((e) => SHA_STARS.includes(e) || (phrase.includes('忌') && e.endsWith('化忌')));
  if (phrase === '吉化') return ev.filter(good);
  if (/^(吉星|輔佐吉星|成對的輔佐星|左輔右弼等吉星)$/.test(phrase)) return ev.filter((e) => AIDE_STARS.includes(e));
  return ev.filter((e) => AIDE_STARS.includes(e) || e === '祿存' || good(e));
}

export function fillSlots(text: string, ev: string[]): string {
  if (!text.includes('〔')) return text;
  const plain = text.replace(/〔[^〕]+〕/g, '');
  return text.replace(FILL, (_all, verb: string | undefined, phrase: string, off: number) => {
    /* 句子已經講咗嘅唔重複：「見〔煞忌〕或空劫」唔再填地空地劫 */
    const said = (e: string) =>
      plain.includes(e) || [['空劫', '地空', '地劫'], ['羊陀', '擎羊', '陀羅'], ['火鈴', '火星', '鈴星']].some(([k, ...xs]) => plain.includes(k!) && xs.includes(e));
    /* 次序跟慣用：四化先，然後左右昌曲魁鉞、祿存、羊陀火鈴空劫 */
    const rank = (e: string) => (e.includes('化') ? -1 : [...AIDE_STARS, '祿存', ...SHA_STARS].indexOf(e));
    const items = [...new Set(pick(phrase, ev))].filter((e) => !said(e)).sort((a, b) => rank(a) - rank(b));
    if (!items.length) return `${verb ?? ''}${phrase}`;
    /* 「天同見〔吉化〕」而化祿正係天同嘅：寫「天同化祿，又見左輔」，唔寫「天同見天同化祿」 */
    const before = text.slice(0, off);
    const own = MAJOR.find((m) => before.endsWith(m));
    const mine = own ? items.filter((e) => e.startsWith(`${own}化`)) : [];
    if (mine.length) {
      const rest = items.filter((e) => !mine.includes(e));
      const head = mine.map((e) => e.slice(own!.length)).join('、');
      return rest.length ? `${head}，又見${rest.join('、')}` : head;
    }
    /* 「多吉星」填實後讀「見左輔、右弼」 */
    return `${verb === '多' ? '見' : verb ?? ''}${items.join('、')}`;
  });
}

/** 有〔〕嘅模板句嘅比對式（翻譯、出處用）：〔〕連前面動詞換成任意字 */
export function slotPattern(template: string, anchored = true): RegExp {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = template.split(new RegExp(`(?:${FILL_VERB})?〔[^〕]+〕`)).map(esc);
  const body = parts.join('[^。！？]+?');
  return new RegExp(anchored ? `^${body}$` : body);
}

/** `seat`：主星坐嘅地支（借星命宮係對宮；其餘就係本宮） */
function holds(chart: Chart, p: Palace, focus: string, c: Cond, seat: Palace['branch'] = p.branch): boolean {
  if ('all' in c) return c.all.every((x) => holds(chart, p, focus, x, seat));
  if ('any' in c) return c.any.some((x) => holds(chart, p, focus, x, seat));
  if ('not' in c) return !holds(chart, p, focus, c.not, seat);
  if ('lean' in c) return leanState(chart) === c.lean;
  if ('palace' in c && 'is' in c) return palaceState(chart, c.palace) === c.is;
  if ('palace' in c) {
    const q = palaceView(chart, c.palace);
    return Boolean(q?.stars.some((s) => list(c.star).includes(s.name)));
  }
  if ('branch' in c) return c.branch.includes(seat);
  if ('alone' in c) return majorsOf(p).length === 1;
  if ('with' in c) return majorsOf(p).includes(c.with) && majorsOf(p).includes(focus);
  if ('jia' in c) {
    /* 夾 = 地支前後兩宮（唔靠 chart.palaces 嘅排列次序） */
    const i = BRANCHES.indexOf(p.branch);
    const at = (b: string) => chart.palaces.find((x) => x.branch === b)?.stars.map((s) => s.name) ?? [];
    const sides = [at(BRANCHES[(i + 1) % 12]!), at(BRANCHES[(i + 11) % 12]!)];
    const [x, y] = c.jia;
    return (sides[0]!.includes(x) && sides[1]!.includes(y)) || (sides[0]!.includes(y) && sides[1]!.includes(x));
  }
  const withBorrowed = looked(chart, p, c.at);
  if ('hua' in c) {
    const huas = list(c.hua);
    const stars = c.star ? list(c.star) : null;
    return withBorrowed.some((q) => q.stars.some((s) => s.sihua && huas.includes(s.sihua as z.infer<typeof HUA>) && (!stars || stars.includes(s.name))));
  }
  const names = list(c.star);
  return withBorrowed.some((q) => q.stars.some((s) => names.includes(s.name)));
}

/* ── 收斂 ── */

/**
 * 呢個題目套唔套到呢張盤：宮內主星包晒題目嘅星，地支（如有）啱。
 *
 * 借星命宮（2026-10-12）：命宮冇主星，原書「借對宮某某安星」—— 主星連四化搬入命宮嚟讀，
 * 命宮自己嘅輔星煞星照留、三方四正照命宮計。所以造一個「加咗對宮主星」嘅命宮；
 * 地支條件（「坐子宮」）講嘅係主星，用主星原本坐嘅地支（`seat`）。
 * 以前呢類盤（約一成六）全部冇細讀。
 */
function applies(chart: Chart, t: BranchTopic): { p: Palace; seat: Palace['branch'] } | null {
  let p = chart.palaces.find((x) => x.name === t.topic.palace);
  if (!p) return null;
  let seat = p.branch;
  if (t.topic.xingxi !== undefined) {
    const found = xingxiOf(chart);
    if (!found || found.system.n !== t.topic.xingxi) return null;
  }
  /* 宮位題目同樣：宮內冇主星就借對宮（原書「借入對宮」，例如夫妻宮〔機梁〕「借入對宮」） */
  if (!majorsOf(p).length && p.borrowsFrom) {
    const opp = chart.palaces.find((x) => x.branch === p!.borrowsFrom);
    if (!opp) return null;
    p = { ...p, stars: [...p.stars, ...opp.stars.filter((s) => MAJOR.includes(s.name))] };
    seat = opp.branch;
  }
  const majors = majorsOf(p);
  if (!t.topic.stars.every((s) => majors.includes(s))) return null;
  if (t.topic.branch && !t.topic.branch.includes(seat)) return null;
  return { p, seat };
}

/** 呢張盤喺某題目成立嘅規則（已除去被取代嗰啲），照檔案次序。 */
export function branchRules(chart: Chart, t: BranchTopic): BranchRule[] {
  const at = applies(chart, t);
  if (!at) return [];
  const { p, seat } = at;
  const focus = t.topic.stars[0] ?? '';
  const state = t.topic.xingxi !== undefined ? leanState(chart) : null;
  /* 未定（兩頭都冇訊號）：斷定咗某一頭嘅規則都唔出，否則同偏向句「兩頭都不明顯」打架 */
  const against = (r: BranchRule) => Boolean(r.pole && state && state !== '平衡' && state !== r.pole);
  /* 講到嘅大限全部九十歲後先起步：讀者喺大限章搵唔到嗰步，唔講 */
  const fromAge = (k: string) => {
    const b = k.startsWith('#') ? k.slice(1) : chart.palaces.find((q) => q.stars.some((s) => s.name === k))?.branch;
    return chart.decadals.find((d) => d.branch === b)?.fromAge ?? 0;
  };
  const tooLate = (r: BranchRule) => Boolean(r.decade?.length && r.decade.every((k) => fromAge(k) >= STEPS_UNTIL_AGE));
  const hit = t.rules.filter((r) => (!r.when || holds(chart, p, focus, r.when, seat)) && !against(r) && !tooLate(r));
  const gone = new Set(hit.flatMap((r) => r.overrides ?? []));
  /* 泛稱填實：返回嘅文字已經係呢張盤嘅星（模板仍然喺 BRANCH_TOPICS） */
  return hit
    .filter((r) => !gone.has(r.id))
    .map((r) => (r.text.includes('〔') ? { ...r, text: fillSlots(r.text, r.when ? evidence(chart, p, focus, r.when, seat) : []) } : r));
}

/** 一段細讀最多幾條規則：雙星宮會同時中組合題目同兩粒星嘅通則，唔封頂就太長 */
const READING_MAX = 4;

/**
 * 一個宮嘅「細讀」段：成立嘅規則砌成一段。冇題目或者冇規則成立就 null。
 * 一個宮可以有幾個題目（夫妻宮：地支／組合題目、每粒星嘅通則），照檔案次序合併，
 * 同一句意思（6 字相同）只講一次，最多 READING_MAX 條。
 */
export function branchReading(chart: Chart, palace: string): { text: string; ids: string[]; sources: string[] } | null {
  const rules: BranchRule[] = [];
  const topics = BRANCH_TOPICS.filter((t) => t.topic.palace === palace && t.topic.xingxi === undefined);
  for (const t of [...topics.filter((x) => x.topic.link), ...topics.filter((x) => !x.topic.link)]) {
    /* 唔限主星嘅通則（財帛宮見祿馬、擎羊⋯）係後備：主星規則已經有兩條就唔出 */
    if (!t.topic.stars.length && rules.length >= 2) continue;
    for (const r of branchRules(chart, t)) {
      if (r.gujia || rules.length >= READING_MAX) continue;
      if (rules.some((x) => x.id === r.id || restates(r.text, x.text))) continue;
      rules.push(r);
    }
  }
  if (!rules.length) return null;
  return {
    text: rules.map((r) => r.text).join(''),
    ids: rules.map((r) => r.id),
    sources: [...new Set(rules.flatMap((r) => [r.source.passage, ...(r.also ?? []).map((a) => a.passage)]))],
  };
}

/** 「性格的骨架」章嘅星系細讀（星系題目成立嘅規則，例外句除外） */
/** 兩段字有冇講同一句：最長共同片段（只計漢字）夠唔夠 n 字 */
function restates(a: string, b: string, n = 6): boolean {
  const x = a.replace(/[^\p{Script=Han}]/gu, '');
  const y = b.replace(/[^\p{Script=Han}]/gu, '');
  for (let i = 0; i + n <= x.length; i++) if (y.includes(x.slice(i, i + n))) return true;
  return false;
}

/**
 * `avoid`：骨架章已經講咗嘅字（骨架段、偏向句）。細讀唔重複 —— 例如骨架段已講「子午的七殺相對是強格」，
 * 細讀就唔再講一次。
 */
export function xingxiReading(
  chart: Chart,
  avoid = '',
  year?: number,
): { text: string; ids: string[]; sources: string[] } | null {
  for (const t of BRANCH_TOPICS) {
    if (t.topic.xingxi === undefined) continue;
    const rules = branchRules(chart, t).filter((r) => !r.gujia && !(avoid && restates(r.text, avoid)));
    if (!rules.length) continue;
    return {
      text: (() => {
        /* 「已經走過，可以對照當時的經歷」一段只講一次，之後縮做「也已經走過」 */
        let told = false;
        return rules
          .map((r) => {
            let note = decadeNote(chart, r, year);
            if (note.includes(PAST_FULL)) {
              if (told) note = note.replace(PAST_FULL, PAST_AGAIN);
              told = true;
            }
            return r.text + note;
          })
          .join('');
      })(),
      ids: rules.map((r) => r.id),
      sources: [...new Set(rules.flatMap((r) => [r.source.passage, ...(r.also ?? []).map((a) => a.passage)]))],
    };
  }
  return null;
}

/**
 * 講「某星嗰步運」嘅規則後面補一句：嗰步運係虛歲幾多至幾多歲（2026-10-12）。
 * 有寫書年份就講埋行過未：已經走過嘅叫讀者對照當時經歷，正在走嘅講明。
 * 只列大限章列得到嘅步（九十歲前起步）。規則冇 `decade` 就唔補。
 */
const PAST_FULL = '，你已經走過，可以對照當時的經歷';
const PAST_AGAIN = '，也已經走過';

export function decadeNote(chart: Chart, r: BranchRule, year?: number): string {
  if (!r.decade?.length) return '';
  const branches = r.decade.map((k) => (k.startsWith('#') ? k.slice(1) : chart.palaces.find((p) => p.stars.some((s) => s.name === k))?.branch));
  const steps = chart.decadals
    .filter((d) => branches.includes(d.branch) && d.fromAge < STEPS_UNTIL_AGE)
    .sort((a, b) => a.fromAge - b.fromAge);
  if (!steps.length) return '';
  const age = year === undefined ? null : year - chart.lunar.y + 1;
  const state = (d: { fromAge: number; toAge: number }) => (age === null ? 'future' : d.toAge < age ? 'past' : d.fromAge <= age ? 'now' : 'future');
  const span = (d: { fromAge: number; toAge: number }) => `${num(d.fromAge)}至${num(d.toAge)}歲`;
  if (steps.length === 1) {
    const d = steps[0]!;
    const tail = { past: PAST_FULL, now: '，你正走在這一步', future: '' }[state(d)];
    return `這一步在虛歲${span(d)}${tail}。`;
  }
  const mark = { past: '（已走過）', now: '（正在走）', future: '' };
  return `這幾步在虛歲${steps.map((d) => span(d) + mark[state(d)]).join('、')}。`;
}

/** 星系題目嘅基本出處（骨架章 basis、偏向句用） */
export function xingxiBasis(n: number): BranchTopic | undefined {
  return BRANCH_TOPICS.find((t) => t.topic.xingxi === n);
}

/** 命宮題目入面會改寫「性格的骨架」偏向句嘅例外（例如天同化忌羊陀夾忌）。 */
export function gujiaException(chart: Chart): BranchRule | null {
  for (const t of BRANCH_TOPICS) {
    if (t.topic.palace !== '命宮') continue;
    const r = branchRules(chart, t).find((x) => x.gujia);
    if (r) return r;
  }
  return null;
}
