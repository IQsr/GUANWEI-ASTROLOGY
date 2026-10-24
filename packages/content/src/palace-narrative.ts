import { readingFocus, type FocusedReadingSegment } from './reading-focus';
import type { Chart } from '@guanwei/ziwei';
import type { FreeReadingSegment } from './free-ming-reader';
import type { MingStatement } from './ming-writer';
import { isYouthReader } from './youth';
import data from './cards/palace-narrative.json';
import { palaceResidualContext, type ResidualContext } from './palace-residual-context';

type Entry = { original: string; prose: string | null; heading?: string; relocated: string[]; context?: ResidualContext };
const entries = data.entries as Record<string, Entry>;
const union = <T,>(items: T[]) => [...new Set(items)];
const isScope = (s: FreeReadingSegment) => s.statements.some((line) => line.source_ids.some((id) => /-(?:remaining-|focused-)?scope$/.test(id)));

/** A new-book presentation pass. Selection and quoted source text remain owned by the audited readers. */
export function palaceNarrative(chart: Chart, palace: string, year: number, input: FreeReadingSegment[]): FocusedReadingSegment[] {
  if (palace === '性格的骨架') return readingFocus(chart,palace,input);
  const m = chart.palaces.find((p) => p.name === '命宮');
  const p = chart.palaces.find((p) => p.name === palace);
  if (!p) return input;
  const youth = isYouthReader(chart, year);
  const removed: FreeReadingSegment[] = [];
  let healthIntroduced = false;
  const rows = input.flatMap((segment): FreeReadingSegment[] => {
    if (isScope(segment)) { removed.push(segment); return []; }
    let title = segment.heading;
    let touched = false;
    const relocated: string[] = [];
    const lines = segment.statements.flatMap((line): MingStatement[] => {
      const id = line.source_ids.find((id) => entries[id]);
      if (!id) return [line];
      const entry = entries[id]!;
      const original = entry.original.replaceAll('{branch}', m?.branch ?? '');
      const at = line.text.indexOf(original);
      if (at < 0) throw Error(`Narrative input changed; re-read its source: ${id}`);
      touched = true;
      // The old editorial explanations stay available with the original interpretation conditions.
      if (entry.relocated.length) relocated.push(...entry.relocated);
      if (entry.prose === null) return [];
      let prefix = line.text.slice(0, at);
      let suffix = line.text.slice(at + original.length);
      if (id.endsWith('-base') && !p.stars.some((s) => s.kind === 'major')) {
        // The factual lead already says which opposite palace supplies the theme.
        prefix = ''; suffix = '';
      }
      prefix = prefix.replace(/^說到將來的婚姻，/, '');
      if (palace === '夫妻' && youth && id.endsWith('-base')) prefix = `說到將來的婚姻，${prefix}`;
      if (palace === '疾厄' && !healthIntroduced) {
        prefix += '依王亭之的傳統疾厄論，'; healthIntroduced = true;
      }
      const context = palaceResidualContext(chart, p, entry.context);
      if (context?.conditions) relocated.push(...context.conditions);
      if (context?.heading ?? entry.heading) title = context?.heading ?? entry.heading;
      const fact: MingStatement[] = context?.fact ? [{ text: context.fact, en: '', kind: 'evidence', source_ids: [`${id}-context-fact`], citations: [] }] : [];
      return [...fact, { ...line, text: prefix + (context?.prose ?? entry.prose) + suffix, citations: union([...line.citations, ...(context?.citations ?? [])]) }];
    });
    if (touched && !lines.some((line) => line.citations.length)) {
      removed.push(segment); return [];
    }
    if (!touched) return [segment];
    return [{ ...segment, heading: title, text: lines.map((line) => line.text).join(''), statements: lines,
      referenceConditions: union([...(segment.referenceConditions ?? []), ...relocated]) }];
  });
  // Keep every source and every original condition when an editorial scope paragraph is folded away.
  const first = rows.findIndex((row) => row.statements.some((line) => line.citations.length));
  if (first >= 0 && removed.length) {
    const target = rows[first]!;
    const citations = union(removed.flatMap((row) => row.statements.flatMap((line) => line.citations)));
    const index = target.statements.findIndex((line) => line.citations.length);
    const statements = target.statements.map((line, i) => i === index ? { ...line, citations: union([...line.citations, ...citations]) } : line);
    rows[first] = { ...target, statements, referenceConditions: union([...(target.referenceConditions ?? []),
      ...removed.flatMap((row) => [...(row.referenceConditions ?? []), row.text])]) };
  }
  return readingFocus(chart,palace,rows);
}
