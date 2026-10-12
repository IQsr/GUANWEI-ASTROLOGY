import { z } from 'zod';
import { sanFangPalaces, type Chart, type Palace } from '@guanwei/ziwei';
import tongliangRaw from './branch/tongliang-ming.json';
import tianjiRaw from './branch/tianji-guanlu.json';
import { CORPUS, normaliseForMatch } from './lexicon';
import { scanForbidden } from './lint';
import { scanPlain } from './plain';

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
    z.object({ all: z.array(Cond).min(1) }).strict(),
    z.object({ any: z.array(Cond).min(1) }).strict(),
    z.object({ not: Cond }).strict(),
  ]),
);

const Cite = z.object({ passage: z.string(), quote: z.string().min(4).max(40) });

const Rule = z.object({
  id: z.string(),
  role: z.enum(['base', 'refine', 'limit', 'exception']),
  /** 成立就改寫「性格的骨架」嘅偏向句（只限命宮題目） */
  gujia: z.boolean().optional(),
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
    topic: z.object({ id: z.string(), palace: z.string(), stars: z.array(z.string()).min(1), branch: z.array(z.string()).optional() }),
    rules: z.array(Rule).min(1),
  })
  .superRefine((t, ctx) => {
    const issue = (m: string) => ctx.addIssue({ code: 'custom', message: `${t.topic.id}：${m}` });
    const ids = new Set(t.rules.map((r) => r.id));
    if (ids.size !== t.rules.length) issue('規則 id 重複');
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
    }
  });
export type BranchTopic = z.infer<typeof Topic>;

export const BRANCH_TOPICS: BranchTopic[] = [tongliangRaw, tianjiRaw].map((raw) => Topic.parse(raw));

/* ── 條件 ── */

const list = <T>(x: T | T[]): T[] => (Array.isArray(x) ? x : [x]);

function where(chart: Chart, p: Palace, at: z.infer<typeof At>): Palace[] {
  const [self, a, dui, b] = sanFangPalaces(chart.palaces, p.branch) as [Palace, Palace, Palace, Palace];
  if (at === 'same') return [self];
  if (at === 'opp') return [dui];
  if (at === 'trine') return [a, b];
  return [self, a, dui, b];
}

function majorsOf(p: Palace): string[] {
  return p.stars.filter((s) => MAJOR.includes(s.name)).map((s) => s.name);
}

function holds(chart: Chart, p: Palace, focus: string, c: Cond): boolean {
  if ('all' in c) return c.all.every((x) => holds(chart, p, focus, x));
  if ('any' in c) return c.any.some((x) => holds(chart, p, focus, x));
  if ('not' in c) return !holds(chart, p, focus, c.not);
  if ('branch' in c) return c.branch.includes(p.branch);
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
  const places = list(c.at).flatMap((a) => where(chart, p, a));
  if ('hua' in c) {
    const huas = list(c.hua);
    const stars = c.star ? list(c.star) : null;
    return places.some((q) => q.stars.some((s) => s.sihua && huas.includes(s.sihua as z.infer<typeof HUA>) && (!stars || stars.includes(s.name))));
  }
  const names = list(c.star);
  return places.some((q) => q.stars.some((s) => names.includes(s.name)));
}

/* ── 收斂 ── */

/** 呢個題目套唔套到呢張盤：宮內主星包晒題目嘅星，地支（如有）啱。 */
function applies(chart: Chart, t: BranchTopic): Palace | null {
  const p = chart.palaces.find((x) => x.name === t.topic.palace);
  if (!p) return null;
  const majors = majorsOf(p);
  if (!t.topic.stars.every((s) => majors.includes(s))) return null;
  if (t.topic.branch && !t.topic.branch.includes(p.branch)) return null;
  return p;
}

/** 呢張盤喺某題目成立嘅規則（已除去被取代嗰啲），照檔案次序。 */
export function branchRules(chart: Chart, t: BranchTopic): BranchRule[] {
  const p = applies(chart, t);
  if (!p) return [];
  const focus = t.topic.stars[0]!;
  const hit = t.rules.filter((r) => !r.when || holds(chart, p, focus, r.when));
  const gone = new Set(hit.flatMap((r) => r.overrides ?? []));
  return hit.filter((r) => !gone.has(r.id));
}

/** 一個宮嘅「細讀」段：成立嘅規則砌成一段。冇題目或者冇規則成立就 null。 */
export function branchReading(chart: Chart, palace: string): { text: string; ids: string[]; sources: string[] } | null {
  for (const t of BRANCH_TOPICS) {
    if (t.topic.palace !== palace) continue;
    const rules = branchRules(chart, t).filter((r) => !r.gujia);
    if (!rules.length) continue;
    return {
      text: rules.map((r) => r.text).join(''),
      ids: rules.map((r) => r.id),
      sources: [...new Set(rules.flatMap((r) => [r.source.passage, ...(r.also ?? []).map((a) => a.passage)]))],
    };
  }
  return null;
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
