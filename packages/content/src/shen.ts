import { z } from 'zod';
import { sanFangPalaces, type Chart, type Palace } from '@guanwei/ziwei';
import raw from './shen/lines.json';
import { CORPUS, cjkCount, normaliseForMatch } from './lexicon';
import { scanForbidden } from './lint';
import { scanPlain } from './plain';

/**
 * 身宮章嘅實質內容（2026-09-29 · Issac：「身宮與五行局好似有啲空泛」）
 *
 * 以前身宮嗰段得一句「你把力氣放在做事上」—— 六條，冇出處。
 * 而家按盤揀三樣，每句都有原文：
 *
 *   坐乜星   《全書》逐粒星「守身」嘅講法（天機守身逢天梁，必有高藝隨身⋯）
 *   有乜化   《全書》四化「守身命」
 *   命身組合 《深造講義》（貪狼坐命兼視身宮、天機命太陰身主日夜奔忙⋯）
 *
 * 原文講死嘅改成傾向（「定歷艱辛」→「多數要經歷一番辛苦」），
 * 講壽元、家庭事件嘅唔用（見 lines.json `$note`）。
 */

const Source = z.object({ corpus: z.enum(['quanshu', 'zhongzhou']), passage_id: z.string(), quote: z.string().min(4) });

const Line = z
  .object({ id: z.string(), text: z.string(), source: Source })
  .passthrough()
  .superRefine((x, ctx) => {
    const issue = (m: string) => ctx.addIssue({ code: 'custom', message: `${x.id}：${m}` });
    const p = CORPUS[x.source.corpus]?.passages[x.source.passage_id];
    if (!p) issue(`語料庫搵唔到 ${x.source.passage_id}`);
    else if (!normaliseForMatch(p.text).includes(normaliseForMatch(x.source.quote))) issue(`引文「${x.source.quote}」唔喺原文`);
    const w = cjkCount(x.text);
    if (w < 15 || w > 50) issue(`${w} 字，要 15–50`);
    if (!x.text.startsWith('你')) issue('要對住讀者講');
    for (const f of [...scanForbidden(x.text, 'body'), ...scanPlain(x.text, 'body')]) issue(`${f.code} ${f.message}`);
  });

const Doc = z.object({
  stars: z.array(
    Line.and(
      z.object({
        star: z.string(),
        withSees: z.array(z.string()).optional(),
        withSeesAny: z.object({ stars: z.array(z.string()), min: z.number() }).optional(),
        brightness: z.array(z.string()).optional(),
      }),
    ),
  ),
  sihua: z.array(Line.and(z.object({ hua: z.enum(['祿', '權', '科', '忌']) }))),
  combos: z.array(
    Line.and(
      z.object({
        ming: z.array(z.string()).optional(),
        mingBranch: z.array(z.string()).optional(),
        shen: z.array(z.string()).optional(),
        shenBranch: z.array(z.string()).optional(),
        shenAll: z.array(z.string()).optional(),
        notMing: z.boolean().optional(),
        sha: z.boolean().optional(),
      }),
    ),
  ),
});

export const SHEN_LINES = Doc.parse(raw);

const SHA = ['擎羊', '陀羅', '火星', '鈴星'];
const names = (p: Palace) => p.stars.map((s) => s.name);

/** 身宮嗰幾句：坐乜星 → 有乜化 → 命身組合。每句一條 id（出處跟住 source）。 */
export function shenLines(chart: Chart): { id: string; text: string; passage: string }[] {
  const shen = chart.palaces.find((p) => p.isShen);
  const ming = chart.palaces.find((p) => p.name === '命宮');
  if (!shen || !ming) return [];
  const four = sanFangPalaces(chart.palaces, shen.branch);
  const seen = new Set(four.flatMap(names));
  const out: { id: string; text: string; passage: string }[] = [];
  const add = (x: { id: string; text: string; source: { passage_id: string } }, text = x.text) =>
    out.push({ id: x.id, text, passage: x.source.passage_id });

  /* 身宮無主星就借對宮嘅星（同其餘各章一樣） */
  const hasMajor = shen.stars.some((s) => s.kind === 'major');
  const opp = !hasMajor && shen.borrowsFrom ? chart.palaces.find((p) => p.branch === shen.borrowsFrom) : undefined;
  const starHome = opp ?? shen;

  for (const x of SHEN_LINES.stars) {
    const here = starHome.stars.find((s) => s.name === x.star && s.kind === 'major');
    if (!here) continue;
    if (x.withSees && !x.withSees.every((s) => seen.has(s))) continue;
    if (x.withSeesAny && x.withSeesAny.stars.filter((s) => seen.has(s)).length < x.withSeesAny.min) continue;
    if (x.brightness && !x.brightness.includes(here.brightness ?? '')) continue;
    add(x);
  }

  const huas = new Set(shen.stars.map((s) => s.sihua).filter(Boolean));
  for (const x of SHEN_LINES.sihua) if (huas.has(x.hua)) add(x);

  /* 命身同宮嗰陣冇「組合」可講 —— 同一個宮 */
  if (shen.branch !== ming.branch) {
    for (const x of SHEN_LINES.combos) {
      if (x.ming && !x.ming.some((s) => names(ming).includes(s))) continue;
      if (x.mingBranch && !x.mingBranch.includes(ming.branch)) continue;
      const hit = x.shen ? x.shen.filter((s) => names(shen).includes(s)) : [];
      if (x.shen && hit.length === 0) continue;
      if (x.shenBranch && !x.shenBranch.includes(shen.branch)) continue;
      if (x.shenAll && !x.shenAll.every((s) => names(shen).includes(s))) continue;
      if (x.notMing && x.shenAll?.every((s) => names(ming).includes(s))) continue;
      if (x.sha) {
        const around = new Set([...four, ...sanFangPalaces(chart.palaces, ming.branch)].flatMap(names));
        if (!SHA.some((s) => around.has(s))) continue;
      }
      add(x, x.text.replace('{shen}', hit.join('、')));
    }
  }
  return out;
}
