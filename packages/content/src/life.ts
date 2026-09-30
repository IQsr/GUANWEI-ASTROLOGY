import { z } from 'zod';
import linesRaw from './life/lines.json';
import { BASE_BLOCKS } from './baseblock-data';
import { CORPUS, cjkCount, normaliseForMatch } from './lexicon';
import { scanForbidden } from './lint';
import { scanPlain } from './plain';

/* ───────────────────────────────────────────────────────────
 * 生活裡的樣子（2026-09-30 · Issac：要考慮現代人，生活上、搬屋、職場方向）
 *
 * 十二宮章每格（主星 × 宮）一段，擺喺「結構」之後：將結論講成一個現代場景 ——
 * 搬家、租房買房、轉工、團隊入面嘅角色、儲錢投資、放假點過。
 *
 * ── 點解要有 ──
 *
 * 結論句由基塊撮出嚟，好多基塊本身得 66–100 字，撮完就差唔多講晒。
 * 168 格有 88 格剷完重複句之後基塊剩唔夠 60 字 —— 結論之後冇嘢解釋。
 * 田宅、官祿尤其薄：《全書》嗰兩段講嘅係祖業田產、官位文武，我哋唔講結果，冇一句用得著。
 *
 * ── 出處 ──
 *
 * 一、王亭之《深造講義》下篇宮垣論逐宮逐星（p.320–595）有「一般情形下」嘅講法，
 *     而且好多係現代講法（「在现代，亦主时时迁动……甚或主时时变换工作环境」）。有就引，逐字對返原文。
 * 二、書入面嗰格只有帶條件（見煞、化祿、某宮）或者講結果（祖業、子女數目、病）嘅句，就唔引，
 *     `source: null`，句子只准講嗰格基塊講過嘅嘢（`base.星.宮` 一定要存在）。疾厄全部係呢類 —— 原文講病。
 *
 * ⚠ 唔預測事件、唔講病、唔講金額、唔講幾多歲；用「你」講，冇星名、冇術語。
 * ─────────────────────────────────────────────────────────── */

const Source = z.object({ corpus: z.literal('zhongzhou'), passage_id: z.string(), quote: z.string().min(4).max(40) });

const Line = z
  .object({ id: z.string(), star: z.string(), palace: z.string(), text: z.string(), source: Source.nullable() })
  .superRefine((x, ctx) => {
    const issue = (m: string) => ctx.addIssue({ code: 'custom', message: `${x.id}：${m}` });
    if (x.source) {
      const p = CORPUS[x.source.corpus]?.passages[x.source.passage_id];
      if (!p) issue(`語料庫搵唔到 ${x.source.passage_id}`);
      else if (!normaliseForMatch(p.text).includes(normaliseForMatch(x.source.quote))) issue(`引文「${x.source.quote}」唔喺原文`);
    }
    if (!BASE_BLOCKS.some((b) => b.star === x.star && b.palace === x.palace)) issue('冇對應基塊');
    const w = cjkCount(x.text);
    if (w < 25 || w > 75) issue(`${w} 字，要 25–75`);
    for (const f of [...scanForbidden(x.text, 'body'), ...scanPlain(x.text, 'body', { leadsWithConclusion: true })]) {
      issue(`${f.code} ${f.message}`);
    }
  });

export type LifeLine = z.infer<typeof Line>;

export const LIFE_LINES: LifeLine[] = z.array(Line).parse(linesRaw);

/** 一格嘅生活場景。冇就回 undefined（168 格都有，測試驗）。 */
export function lifeLine(star: string, palace: string): LifeLine | undefined {
  return LIFE_LINES.find((x) => x.star === star && x.palace === palace);
}
