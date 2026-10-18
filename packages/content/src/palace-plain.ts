import { z } from 'zod';
import raw from './plain/palace.json';
import pairsRaw from './plain/pairs.json';
import stanceRaw from './plain/stance.json';
import jiWatchRaw from './plain/ji-watch.json';
import { FORBIDDEN_TERMS } from './frame';
import { CORPUS, cjkCount, normaliseForMatch } from './lexicon';
import { scanForbidden } from './lint';
import { scanPlain } from './plain';

/**
 * 十二宮章嘅結論句（直白，2026-09-29 · docs/voice.md 第六節）
 *
 * 每粒主星 × 每個宮一條：`summary` 係章嘅第一句 —— 你喺呢方面係點樣；
 * `watch` 係一句「要留意的是：⋯」。兩句都由嗰格基塊（`base.星.宮`）撮出嚟，
 * 唔加基塊冇講過嘅象義，所以出處跟返基塊。
 *
 * ⚠ `source`（2026-10-18 · docs/leads-audit-2026-10-17.md A2 第三步）：逐格對過王亭之宮垣論嗰格嘅
 * 「一般情形」講法。有 `source` 嘅 `summary` 就係嗰句原文嘅白話，**唔再跟基塊**，引文逐字核過，
 * 入出處索引（citation.ts）—— 章第一段同目次答案就撳得出原文。冇 `source` 嘅仲未對過。
 *
 * 基塊本身照舊入書，擺喺結論後面做依據（星名、引文、廟旺都喺嗰度）。
 */
const PlainSource = z.object({ corpus: z.literal('zhongzhou'), passage_id: z.string(), quote: z.string().min(4).max(40) });

export const PalacePlain = z
  .object({
    id: z.string(),
    star: z.string(),
    palace: z.string(),
    summary: z.string(),
    watch: z.string(),
    source: PlainSource.optional(),
  })
  .superRefine((x, ctx) => {
    const issue = (m: string) => ctx.addIssue({ code: 'custom', message: `${x.id}：${m}` });
    if (x.id !== `plain.${x.star}.${x.palace}`) issue('id 要係 plain.星.宮');
    if (x.source) {
      const p = CORPUS[x.source.corpus]?.passages[x.source.passage_id];
      if (!p) issue(`語料庫搵唔到 ${x.source.passage_id}`);
      else if (!normaliseForMatch(p.text).includes(normaliseForMatch(x.source.quote))) issue(`引文「${x.source.quote}」唔喺原文`);
      /* 一定要係講緊呢粒星喺呢個宮嘅段（life.宮.星 或者 deep.宮.星.N） */
      const cell = new RegExp(`^(?:life\\.${x.palace}\\.${x.star}|deep\\.${x.palace}\\.${x.star}\\.\\d+)$`);
      if (!cell.test(x.source.passage_id)) issue(`出處 ${x.source.passage_id} 唔係呢格（${x.star}·${x.palace}）嘅段`);
    }
    const ws = cjkCount(x.summary);
    if (ws < 8 || ws > 40) issue(`summary ${ws} 字，要 8–40`);
    for (const f of scanPlain(x.summary, 'summary', { leadsWithConclusion: true })) issue(`summary ${f.code} ${f.message}`);
    const ww = cjkCount(x.watch);
    if (ww < 10 || ww > 40) issue(`watch ${ww} 字，要 10–40`);
    if (!x.watch.startsWith('要留意的是：')) issue('watch 要以「要留意的是：」開頭');
    if (!x.watch.includes('你')) issue('watch 要對住讀者講');
    const terms = FORBIDDEN_TERMS.filter((t) => x.watch.includes(t));
    if (terms.length) issue(`watch 有術語「${terms.join('、')}」`);
    for (const f of scanPlain(x.watch, 'watch')) issue(`watch ${f.code} ${f.message}`);
  });
export type PalacePlain = z.infer<typeof PalacePlain>;

/* 一次過報晒所有唔合格嘅條目 */
export const PALACE_PLAIN: PalacePlain[] = (() => {
  const results = (raw as unknown[]).map((r) => PalacePlain.safeParse(r));
  const bad = results.flatMap((r) => (r.success ? [] : r.error.issues.map((i) => i.message)));
  if (bad.length) throw new Error(`十二宮結論句唔合格（${bad.length} 處）：\n${bad.join('\n')}`);
  return results.map((r) => r.data!);
})();

export function palacePlain(star: string, palace: string): PalacePlain | undefined {
  return PALACE_PLAIN.find((x) => x.star === star && x.palace === palace);
}

/* ───────────────────────────────────────────────────────────
 * 雙星整合版（2026-10-11 內容審查第 2 層）
 *
 * 結論、生活句以前淨係跟領銜星揀，同座星嘅句照入「結構」——
 * 兩粒星喺呢宮講相反嘢嗰陣（父母宮天機「繞過分歧」、巨門「分歧攤在檯面」），
 * 讀者喺同一章讀到兩個講法，冇人話佢知點樣並存。
 *
 * `plain/stance.json` 每宮一條主軸，逐粒星標立場；一 A 一 B 嘅組合（68 個）
 * 喺 `plain/pairs.json` 有人手寫嘅整合版。只用兩條基塊講過嘅嘢，講清楚兩面點樣並存，
 * 唔加新象義。英文跟條目一齊存（`en`），en/render.ts 載入翻譯表。
 * ─────────────────────────────────────────────────────────── */

export const PairPlain = z
  .object({
    id: z.string(),
    stars: z.tuple([z.string(), z.string()]),
    palace: z.string(),
    summary: z.string(),
    watch: z.string(),
    life: z.string(),
    en: z.object({ summary: z.string(), watch: z.string(), life: z.string() }),
    /* 2026-10-18 · A2：宮垣論講呢個組合嘅「一般情形」，逐字核過（同單星版 `source` 一樣） */
    source: PlainSource.optional(),
  })
  .superRefine((x, ctx) => {
    const issue = (m: string) => ctx.addIssue({ code: 'custom', message: `${x.id}：${m}` });
    /* id 唔用「+」：段嘅 source_id 用「+」分隔幾個出處 */
    if (x.id !== `pair.${x.stars.join('')}.${x.palace}`) issue('id 要係 pair.星星.宮');
    if (x.source) {
      const p = CORPUS[x.source.corpus]?.passages[x.source.passage_id];
      if (!p) issue(`語料庫搵唔到 ${x.source.passage_id}`);
      else if (!normaliseForMatch(p.text).includes(normaliseForMatch(x.source.quote))) issue(`引文「${x.source.quote}」唔喺原文`);
      /* 一定要係呢宮其中一粒星嘅段 */
      const cell = new RegExp(`^(?:life|deep)\\.${x.palace}\\.(?:${x.stars.join('|')})(?:\\.\\d+)?$`);
      if (!cell.test(x.source.passage_id)) issue(`出處 ${x.source.passage_id} 唔係呢個組合（${x.stars.join('')}·${x.palace}）嘅段`);
    }
    /* 結論、留意句同單星版用同一套檢查 */
    const r = PalacePlain.safeParse({ id: `plain.${x.stars[0]}.${x.palace}`, star: x.stars[0], palace: x.palace, summary: x.summary, watch: x.watch });
    if (!r.success) r.error.issues.forEach((i) => issue(i.message));
    const w = cjkCount(x.life);
    if (w < 25 || w > 75) issue(`life ${w} 字，要 25–75`);
    for (const f of [...scanForbidden(x.life, 'body'), ...scanPlain(x.life, 'body', { leadsWithConclusion: true })]) issue(`life ${f.code} ${f.message}`);
  });
export type PairPlain = z.infer<typeof PairPlain>;

export const PAIR_PLAIN: PairPlain[] = (() => {
  const results = (pairsRaw as unknown[]).map((r) => PairPlain.safeParse(r));
  const bad = results.flatMap((r) => (r.success ? [] : r.error.issues.map((i) => i.message)));
  if (bad.length) throw new Error(`雙星整合版唔合格（${bad.length} 處）：\n${bad.join('\n')}`);
  return results.map((r) => r.data!);
})();

export type Stance = { axis: [string, string]; A: string[]; B: string[] };
export const STANCE: Record<string, Stance> = Object.fromEntries(
  Object.entries(stanceRaw as Record<string, unknown>).filter(([k]) => !k.startsWith('$')),
) as Record<string, Stance>;

/** 兩粒星喺呢宮嘅主軸上一 A 一 B。 */
export function clashes(a: string, b: string, palace: string): boolean {
  const s = STANCE[palace];
  if (!s) return false;
  const side = (x: string) => (s.A.includes(x) ? 'A' : s.B.includes(x) ? 'B' : null);
  const [x, y] = [side(a), side(b)];
  return Boolean(x && y && x !== y);
}

/** 同宮兩粒主星嘅整合版（唔理次序）。 */
export function pairPlain(stars: readonly string[], palace: string): PairPlain | undefined {
  if (stars.length !== 2) return undefined;
  return PAIR_PLAIN.find((x) => x.palace === palace && x.stars.includes(stars[0]!) && x.stars.includes(stars[1]!));
}

/**
 * 一個宮嘅結論句：有雙星整合版就用佢，冇就跟領銜星。
 * 回傳嘅 `id` 係 `pair.…` 或者 `plain.…`，`star` 係領銜星。
 */
export function conclusionFor(stars: readonly string[], palace: string, ji?: string | null): PalacePlain | undefined {
  const pair = pairPlain(stars, palace);
  const base = pair
    ? { id: pair.id, star: stars[0]!, palace, summary: pair.summary, watch: pair.watch, source: pair.source }
    : stars[0]
      ? palacePlain(stars[0], palace)
      : undefined;
  /* 呢宮有主星生年化忌：留意句改講化忌（見 JI_WATCH；命宮以外逐宮一句，見 JI_WATCH_PALACE） */
  const jw = ji && stars.includes(ji) ? jiWatch(ji, palace) : undefined;
  return base && jw ? { ...base, watch: jw.zh } : base;
}

/*
 * 生年化忌嘅留意句（2026-10-11 內容審查第 2 層）
 *
 * 示範命宮：結論「很懂得把日子過得舒服」，同一章四化段「天同化忌，舒服的條件恰好最缺」——
 * 結論冇理化忌。化忌係同一粒星、更具體嘅訊號，所以佢做留意句；意思跟返 modifiers/sihua.json 嗰句。
 *
 * 下面呢八句係命宮用嘅（講你自己）。其餘十一宮用 `plain/ji-watch.json` 逐宮一句（2026-10-17 · B5）：
 * 以前十二宮同一句，太陰化忌落財帛都講「把感受壓得很深」，同嗰章講錢對唔上。
 */
export const JI_WATCH: Record<string, { zh: string; en: string }> = {
  天機: { zh: '要留意的是：你的念頭容易轉個不停，一件事想來想去，遲遲定不下來。', en: 'The catch: your mind easily keeps turning, going round and round one thing without settling.' },
  太陽: { zh: '要留意的是：你付出得多，回應卻常常跟不上，最耗的是你的熱度。', en: 'The catch: you give a lot, but the response often falls short, and what it drains most is your warmth.' },
  武曲: { zh: '要留意的是：你想做的事容易卡住，就算辦成了，付出也可能比預期多。', en: 'The catch: what you want to do can easily get stuck, and even when it gets done, it may cost more than you expected.' },
  天同: { zh: '要留意的是：你想安頓下來，舒服的條件卻常常湊不齊，事情容易拖著。', en: "The catch: you want to settle, but the conditions for ease often don't come together, and things tend to drag." },
  廉貞: { zh: '要留意的是：你投入了卻得不到回應時，情緒容易比事情來得更大。', en: "The catch: when you've invested and get no response, your feelings can run bigger than the matter itself." },
  太陰: { zh: '要留意的是：你把感受壓得很深，心裡積了很多，嘴上卻很少說。', en: 'The catch: you press your feelings down deep, so a lot builds up inside while little gets said.' },
  貪狼: { zh: '要留意的是：你求而不得的東西，很容易一直纏在心上。', en: "The catch: what you want and can't get easily stays wound around your mind." },
  巨門: { zh: '要留意的是：你說出口的話容易被誤解，越想說清楚，越容易糾纏。', en: 'The catch: what you say is easily misunderstood, and the harder you try to make it clear, the more tangled it gets.' },
};

export const JI_WATCH_PALACE: Record<string, Record<string, { zh: string; en: string }>> = Object.fromEntries(
  Object.entries(jiWatchRaw as Record<string, unknown>).filter(([k]) => !k.startsWith('$')),
) as Record<string, Record<string, { zh: string; en: string }>>;

/** 化忌留意句：命宮用星嘅通用句，其餘宮用嗰宮嗰句。 */
export function jiWatch(star: string, palace: string): { zh: string; en: string } | undefined {
  return palace === '命宮' ? JI_WATCH[star] : (JI_WATCH_PALACE[star]?.[palace] ?? JI_WATCH[star]);
}

/** 所有化忌留意句（翻譯表載入用） */
export const ALL_JI_WATCH = [...Object.values(JI_WATCH), ...Object.values(JI_WATCH_PALACE).flatMap((m) => Object.values(m))];

for (const [star, w] of Object.entries(JI_WATCH)) {
  const r = PalacePlain.safeParse({ id: `plain.${star}.命宮`, star, palace: '命宮', summary: '你這是一句佔位的結論句子。', watch: w.zh });
  if (!r.success) throw new Error(`化忌留意句唔合格：${r.error.issues.map((i) => i.message).join('；')}`);
}
{
  const bad: string[] = [];
  for (const [star, m] of Object.entries(JI_WATCH_PALACE)) {
    if (!JI_WATCH[star]) bad.push(`${star}：冇命宮通用句`);
    for (const [palace, w] of Object.entries(m)) {
      if (palace === '命宮') bad.push(`${star}.命宮：命宮用 JI_WATCH`);
      const r = PalacePlain.safeParse({ id: `plain.${star}.${palace}`, star, palace, summary: '你這是一句佔位的結論句子。', watch: w.zh });
      if (!r.success) bad.push(...r.error.issues.map((i) => i.message));
    }
  }
  if (bad.length) throw new Error(`逐宮化忌留意句唔合格（${bad.length} 處）：\n${bad.join('\n')}`);
}
