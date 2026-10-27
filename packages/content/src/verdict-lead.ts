import type { Chart } from '@guanwei/ziwei';
import type { MingStatement } from './ming-writer';
import { conclusionFor } from './palace-plain';
import { variantFor } from './plain-variant';
import { KONGKU } from './daxian';

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

export function verdictFor(chart: Chart, palace: string): Verdict | null {
  const p = chart.palaces.find((x) => x.name === palace);
  if (!p) return null;
  const own = p.stars.filter((s) => s.kind === 'major');
  const opp = own.length ? undefined : chart.palaces.find((x) => x.branch === p.borrowsFrom);
  const names = (own.length ? own : opp?.stars.filter((s) => s.kind === 'major') ?? []).map((s) => s.name);
  if (!names.length) return null;
  const ji = p.stars.find((s) => s.kind === 'major' && s.sihua === '忌')?.name ?? null;
  const pp = conclusionFor(names, palace, ji);
  if (!pp) return null;
  if (palace === '財帛' && names.includes('天府') && p.stars.some((s) => s.name === '地空' || s.name === '地劫'))
    return { text: KONGKU.summary, id: KONGKU.id, passages: [KONGKU.passage] };
  const v = variantFor(chart, pp);
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
