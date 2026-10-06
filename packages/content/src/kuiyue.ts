import { BRANCHES, sanFangPalaces, type Branch, type Chart, type FlowStars } from '@guanwei/ziwei';
import { CORPUS, normaliseForMatch } from './lexicon';
import { scanForbidden } from './lint';
import { scanPlain } from './plain';

/* ───────────────────────────────────────────────────────────
 * 流魁流鉞冲起本命魁鉞（2026-10-06 · 〈這十年〉、〈這一年〉）
 *
 * 讀法跟《深造講義》：
 *   p.323  「若流曜冲起原局的[輔佐煞化]，則力量彼此加強」
 *   p.8    「若流魁流鉞在三方四正冲起原局的魁鉞，在此運限之內便主其人的才智得以發揮，由發揮而生變動」
 *   p.9    「倘更得流魁、流鉞冲照原局的魁鉞，則主多機遇」
 *   p.351  「流魁流鉞恰迭冲星盤之魁鉞，主突發」
 *   p.362  「經行流魁流鉞拱會的宮垣，往往亦為良好的轉機」
 *
 * 條件（取嚴嗰個）：嗰段時期（大限或流年）命宮嘅三方四正入面，有本命天魁或天鉞，
 * 而嗰段時期嘅流魁或流鉞正正落喺佢同一宮或者對宮（「恰迭冲」）。
 * 量過：大限約一成二嘅人有；流年只喺個別年份出現（流魁鉞同流年命宮都跟年份走）。
 *
 * ⚠ 正面講法，但唔承諾結果：講「容易有發揮」「常帶來轉變」，唔講升職加薪。
 * ─────────────────────────────────────────────────────────── */

const QUOTES: { passage: string; quote: string }[] = [
  { passage: 'kuiyue.liu.tongze', quote: '則力量彼此加強' },
  { passage: 'kuiyue.liu.caizhi', quote: '主其人的才智得以發揮' },
  { passage: 'kuiyue.liu.jiyu', quote: '則主多機遇' },
  { passage: 'kuiyue.liu.tufa', quote: '恰迭冲星盤之魁鉞' },
  { passage: 'kuiyue.liu.zhuanji', quote: '往往亦為良好的轉機' },
];

export const KUIYUE_TEXT = {
  decade:
    '這十年有貴人和機會的助力：大限的天魁、天鉞，正好碰上你本命的天魁、天鉞，才智容易有發揮的地方，也常常因此帶來轉變。',
  year: '這一年有貴人和機會的助力：今年的天魁、天鉞，正好碰上你本命的天魁、天鉞，才智容易有發揮的地方，也常常因此帶來轉變。',
} as const;

export const KUIYUE_SOURCE = 'kuiyue.liu.caizhi+kuiyue.liu.jiyu';

for (const q of QUOTES) {
  const p = CORPUS.zhongzhou?.passages[q.passage];
  if (!p) throw new Error(`魁鉞：語料庫搵唔到 ${q.passage}`);
  if (!normaliseForMatch(p.text).includes(normaliseForMatch(q.quote))) throw new Error(`魁鉞：引文「${q.quote}」唔喺 ${q.passage}`);
}
for (const t of Object.values(KUIYUE_TEXT)) {
  const bad = [...scanForbidden(t, 'body'), ...scanPlain(t, 'body')];
  if (bad.length) throw new Error(`魁鉞「${t}」：${bad.map((f) => f.message).join('；')}`);
}

const opp = (b: Branch) => BRANCHES[(BRANCHES.indexOf(b) + 6) % 12]!;

/** 嗰段時期嘅流魁、流鉞，有冇喺命宮三方四正入面冲起本命魁鉞。 */
export function kuiyueRises(chart: Chart, ming: Branch, flow: Pick<FlowStars, '天魁' | '天鉞'>): boolean {
  const sf = new Set(sanFangPalaces(chart.palaces, ming).map((p) => p.branch));
  const natal = chart.palaces.filter((p) => sf.has(p.branch) && p.stars.some((s) => s.name === '天魁' || s.name === '天鉞')).map((p) => p.branch);
  return [flow.天魁, flow.天鉞].some((f) => natal.some((n) => f === n || f === opp(n)));
}
