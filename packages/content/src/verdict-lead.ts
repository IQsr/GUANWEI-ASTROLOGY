import type { Chart } from '@guanwei/ziwei';
import type { MingStatement } from './ming-writer';
import { conclusionFor } from './palace-plain';
import { variantFor } from './plain-variant';
import { KONGKU } from './daxian';
import { leanOf, xingxiOf } from './xingxi';
import { citation } from './citation';
import { normaliseForMatch } from './lexicon';
import { scanForbidden } from './lint';
import { scanPlain } from './plain';
import mingRaw from './plain/ming-verdict.json';
import healthRaw from './plain/health-verdict.json';

/*
 * 結論段第一句落判斷（2026-10-27，docs/verdict-lead-2026-10-27.md 3a、3b）
 *
 * 宮位章（同命宮）嘅結論段以前係「盤面事實＋要留意…」，冇「所以你係點」。新書而家喺盤面事實後面加一句
 * `plain/palace.json`／`plain/pairs.json` 嘅「你…」結論句，只用有王亭之出處嘅：
 *   一、呢張盤成立咗嘅變體（plain/variants.json，出處跟嗰條細讀規則）；
 *   二、本格有出處嘅結論句；
 *   三、都冇就唔寫（Issac 2026-10-27：等補齊出處先寫，唔寫冇出處嘅編輯判斷）。
 * 衝突：財帛天府同宮見地空、地劫，「守得住」同原書 p.450 相反，換空劫版本（同運限章一樣）。
 * 性格的骨架已經有偏向句，唔郁。只入新成書入口（createBookChapters `verdictLead`）。
 */
export type Verdict = { text: string; id: string; passages: string[] };

/*
 * 命宮按六十星系（2026-10-27）：plain 嘅單星句套落雙星命宮唔準，部分星系又冇出處。plain/ming-verdict.json 逐個星系寫，
 * base 唔分兩端；branches 按命宮地支；poles 只喺 leanOf 判到一端（state 'lean'）先用。
 * 打和或者冇訊號：有 fallback（原書兩端共通嘅講法，2026-10-27）就用，冇就唔寫。
 */
type Entry = { summary: string; passages: string[]; quote: string };
type MingEntry = { base?: Entry; branches?: Record<string, Entry>; poles?: Record<string, Entry>; fallback?: Entry };
const MING = new Map(Object.entries((mingRaw as { systems: Record<string, MingEntry> }).systems).map(([n, e]) => [Number(n), e]));
{
  const bad: string[] = [];
  for (const [n, e] of MING) for (const v of [e.base, ...Object.values(e.branches ?? {}), ...Object.values(e.poles ?? {}), e.fallback].filter((x): x is Entry => !!x)) {
    if (!v.summary.includes('你')) bad.push(`${n}：判斷句要對住「你」講`);
    const cites = v.passages.map((id) => citation(id));
    if (cites.some((c) => !c)) bad.push(`${n}：出處認唔到 ${v.passages.join(',')}`);
    else if (!normaliseForMatch(cites[0]!.text).includes(normaliseForMatch(v.quote))) bad.push(`${n}：引句唔喺 ${v.passages[0]}「${v.quote}」`);
    for (const f of [...scanForbidden(v.summary, 'body'), ...scanPlain(v.summary, 'body')]) bad.push(`${n}：${f.message}`);
  }
  if (bad.length) throw new Error(`命宮判斷句唔合格：\n${bad.join('\n')}`);
}
function mingVerdict(chart: Chart): Verdict | null {
  const x = xingxiOf(chart);
  const e = x && MING.get(x.system.n);
  if (!x || !e) return null;
  const m = chart.palaces.find((p) => p.name === '命宮')!;
  const lean = e.poles ? leanOf(chart, x.system) : null;
  const v = e.base ?? e.branches?.[x.borrowed ? m.borrowsFrom ?? '' : m.branch] ?? (lean?.state === 'lean' ? e.poles?.[lean.pole] : e.fallback);
  return v ? { text: v.summary, id: `ming.verdict.${x.system.n}`, passages: v.passages } : null;
}

/*
 * 疾厄（2026-10-27，Issac：疾厄都要落判斷，只講要留意嘅身體系統）：plain/health-verdict.json 每粒星一個部位，
 * 出處係宮垣論疾厄宮嗰粒星開頭講五行臟腑嗰句。雙星兩個部位用「、」連，相同就寫一次。唔講病名、輕重。
 */
type HealthEntry = { part: string; en: string; ja: string; passage: string; quote: string };
const HEALTH = new Map(Object.entries((healthRaw as { stars: Record<string, HealthEntry> }).stars));
export const healthSentence = (parts: string[]) => `你要留意${[...new Set(parts)].join('、')}，這是你身體較弱的一環。`;
{
  const bad: string[] = [];
  for (const [s, e] of HEALTH) {
    const c = citation(e.passage);
    if (!c) bad.push(`${s}：出處認唔到 ${e.passage}`);
    else if (!normaliseForMatch(c.text).includes(normaliseForMatch(e.quote))) bad.push(`${s}：引句唔喺 ${e.passage}「${e.quote}」`);
    for (const f of [...scanForbidden(healthSentence([e.part]), 'body'), ...scanPlain(healthSentence([e.part]), 'body')]) bad.push(`${s}：${f.message}`);
  }
  if (bad.length) throw new Error(`疾厄判斷句唔合格：\n${bad.join('\n')}`);
}
function healthVerdict(names: string[]): Verdict | null {
  const es = names.map((n) => HEALTH.get(n)).filter((e): e is HealthEntry => !!e);
  if (!es.length) return null;
  return { text: healthSentence(es.map((e) => e.part)), id: `health.verdict.${names.join('')}`, passages: [...new Set(es.map((e) => e.passage))] };
}

export function verdictFor(chart: Chart, palace: string): Verdict | null {
  const p = chart.palaces.find((x) => x.name === palace);
  if (!p) return null;
  if (palace === '命宮') { const v = mingVerdict(chart); if (v) return v; }
  const own = p.stars.filter((s) => s.kind === 'major');
  const opp = own.length ? undefined : chart.palaces.find((x) => x.branch === p.borrowsFrom);
  const names = (own.length ? own : opp?.stars.filter((s) => s.kind === 'major') ?? []).map((s) => s.name);
  if (!names.length) return null;
  if (palace === '疾厄') return healthVerdict(names);
  const ji = p.stars.find((s) => s.kind === 'major' && s.sihua === '忌')?.name ?? null;
  const pp = conclusionFor(names, palace, ji);
  if (!pp) return null;
  if (palace === '財帛' && names.includes('天府') && p.stars.some((s) => s.name === '地空' || s.name === '地劫'))
    return { text: KONGKU.summary, id: KONGKU.id, passages: [KONGKU.passage] };
  const v = variantFor(chart, pp, { verdict: true });
  if (v) return { text: v.summary, id: `${pp.id}#${v.rule}`, passages: v.passages };
  if (pp.source) return { text: pp.summary, id: pp.id, passages: [pp.source.passage_id] };
  return null;
}

type Seg = { slot: string; text: string; statements?: MingStatement[] };

/** 喺第一個結論段嘅盤面事實（evidence）後面加判斷句；冇判斷、已經有同一句，就原封不動。 */
export function withVerdictLead<T extends Seg>(chart: Chart, palace: string, segments: T[]): T[] {
  const verdict = verdictFor(chart, palace);
  const at = segments.findIndex((s) => s.slot === '結論' && s.statements?.length);
  if (!verdict || at < 0 || segments.some((s) => s.text.includes(verdict.text))) return segments;
  const seg = segments[at]!;
  const lines = seg.statements!;
  let k = 0;
  while (k < lines.length && lines[k]!.kind === 'evidence') k++;
  const line: MingStatement = { text: verdict.text, en: '', kind: 'interpretation', source_ids: [verdict.id], citations: verdict.passages };
  const before = lines.slice(0, k).map((l) => l.text).join('');
  const text = seg.text.startsWith(before) ? before + verdict.text + seg.text.slice(before.length) : verdict.text + seg.text;
  return segments.map((s, i) => i === at ? { ...seg, text, statements: [...lines.slice(0, k), line, ...lines.slice(k)] } : s);
}
