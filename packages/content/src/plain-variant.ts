import { z } from 'zod';
import type { Chart } from '@guanwei/ziwei';
import raw from './plain/variants.json';
import verdictRaw from './plain/verdict-variants.json';
import { BRANCH_TOPICS, branchRules } from './branch';
import { PALACE_PLAIN, PAIR_PLAIN, PalacePlain } from './palace-plain';

/* ───────────────────────────────────────────────────────────
 * 帶條件嘅結論句（2026-10-18 · docs/leads-audit-2026-10-17.md A2 放寬準則）
 *
 * 宮位結論（`plain/palace.json`、`plain/pairs.json`）係每格一句；原書冇「一般情形」嗰啲格就冇出處。
 * 但原書好多講法係帶條件嘅（子午、見煞、見祿、同宮有火鈴…），呢啲條件細讀（branch.ts）已經逐張盤判斷咗。
 *
 * 呢度：一條「變體」掛住一條細讀規則。嗰條規則喺呢張盤成立，而原本嗰格結論冇出處，
 * 結論句就換做變體 —— 出處跟返嗰條規則（已經逐字核過）。留意句照用原本嗰句。
 * 細讀句照舊留喺收費部分；變體係白話嘅結論，唔係將細讀句搬上嚟。
 *
 * 準則（同 A2 第三步一樣，Issac 揀）：只收講你本身、或者關係本身點樣嘅規則；
 * 事件（遲婚、婚前波折、白頭偕老、長久）同對方本人（伴侶精明、性格剛強）唔做變體。
 * ─────────────────────────────────────────────────────────── */

const Variant = z.object({
  /** 換邊格嘅結論：plain.星.宮 或者 pair.星星.宮 */
  target: z.string(),
  /** 細讀規則 id —— 佢成立先用呢句 */
  rule: z.string(),
  summary: z.string(),
  en: z.string().min(1),
});
export type PlainVariant = z.infer<typeof Variant> & { palace: string; passages: string[] };

const RULES = new Map(BRANCH_TOPICS.flatMap((t) => t.rules.map((r) => [r.id, { r, palace: t.topic.palace }] as const)));

function load(raw: unknown, label: string): PlainVariant[] {
  const bad: string[] = [];
  const out: PlainVariant[] = [];
  for (const v of z.array(Variant).parse(raw)) {
    const base = [...PALACE_PLAIN, ...PAIR_PLAIN].find((x) => x.id === v.target);
    const hit = RULES.get(v.rule);
    if (!base) bad.push(`${v.target}：冇呢格結論`);
    if (!hit) bad.push(`${v.target}：冇呢條規則 ${v.rule}`);
    if (!base || !hit) continue;
    if (hit.palace !== base.palace) bad.push(`${v.target}：規則 ${v.rule} 係${hit.palace}，唔係${base.palace}`);
    if (base.source) bad.push(`${v.target}：本身已經有出處，唔使變體`);
    /* 同結論句一樣嘅檢查（字數、對住「你」、直白） */
    const r = PalacePlain.safeParse({ id: `plain.x.${base.palace}`, star: 'x', palace: base.palace, summary: v.summary, watch: '要留意的是：你這是一句佔位的留意句。' });
    if (!r.success) bad.push(...r.error.issues.map((i) => `${v.target}／${v.rule}：${i.message}`));
    out.push({ ...v, palace: base.palace, passages: [hit.r.source.passage, ...(hit.r.also ?? []).map((a) => a.passage)] });
  }
  if (bad.length) throw new Error(`${label}唔合格（${bad.length} 處）：\n${bad.join('\n')}`);
  return out;
}

export const PLAIN_VARIANTS: PlainVariant[] = load(raw, '帶條件結論句');

/*
 * 新書判斷句專用（2026-10-27，Issac：連事件、對方本人都准講）。只喺 `verdictFor` 用，
 * 舊書、免費章、給你的話照用上面 PLAIN_VARIANTS，唔會變。次序同 PLAIN_VARIANTS 一樣：先寫先揀。
 */
export const VERDICT_VARIANTS: PlainVariant[] = load(verdictRaw, '判斷句變體');

/** 呢張盤喺某宮成立嘅全部細讀規則（唔封頂，同 branchReading 用同一套題目） */
export function firedRules(chart: Chart, palace: string): Set<string> {
  const topics = BRANCH_TOPICS.filter((t) => t.topic.palace === palace && t.topic.xingxi === undefined);
  return new Set(topics.flatMap((t) => branchRules(chart, t).map((r) => r.id)));
}

/**
 * 結論冇出處，而呢張盤有變體嘅規則成立：回變體（檔案次序第一條）。否則 undefined。
 * `pp` 係 `conclusionFor()` 回嘅結論。
 */
export function variantFor(chart: Chart, pp: { id: string; palace: string; source?: unknown }, opts: { verdict?: boolean } = {}): PlainVariant | undefined {
  if (pp.source) return undefined;
  const mine = (opts.verdict ? [...PLAIN_VARIANTS, ...VERDICT_VARIANTS] : PLAIN_VARIANTS).filter((v) => v.target === pp.id);
  if (!mine.length) return undefined;
  const fired = firedRules(chart, pp.palace);
  return mine.find((v) => fired.has(v.rule));
}
