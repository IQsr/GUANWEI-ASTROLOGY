import { BRANCHES, oppositeBranch, sanFangPalaces, lookupNatalStar, QUERYABLE_NATAL_STARS, type Chart, type Palace, type Sihua } from '@guanwei/ziwei';
import { evaluate, combineEvaluations, birthHalf, type Condition, type EvalResult } from './condition';

export type PalacePredicate = { op: string; scope?: string; names?: string[]; hua?: string; branches?: string[]; is?: string; args?: PalacePredicate[] };
export type PalaceEvaluation = { matched: boolean; status: EvalResult['status']; facts: string[]; checks: string[]; reason?: string };
const label = (p: Palace) => `${p.name.endsWith('宮') ? p.name : `${p.name}宮`}${p.branch}`;

function scope(chart: Chart, p: Palace, name: string): Palace[] {
  if (name === 'own') return [p];
  if (name === 'opposite') return chart.palaces.filter((q) => q.branch === oppositeBranch(p.branch));
  if (name === 'four') return sanFangPalaces(chart.palaces, p.branch);
  if (name.startsWith('named:')) return chart.palaces.filter((q) => q.name === name.slice(6));
  throw Error(`Unknown reviewed palace scope: ${name}`);
}

/** Adapter to the existing tri-state condition engine. No second star/negation evaluator. */
export function evaluatePalacePredicate(when: PalacePredicate, chart: Chart, p: Palace): PalaceEvaluation {
  if (when.op === 'all' || when.op === 'any') {
    const children = when.args!.map((a) => evaluatePalacePredicate(a, chart, p));
    const result = combineEvaluations(when.op, children.map((c): EvalResult => c.status === 'matched'
      ? { status: 'matched', bindings: [] } : c.status === 'not_applicable'
        ? { status: 'not_applicable', reason: c.reason! } : { status: 'unmatched' }));
    return { matched: result.status === 'matched', status: result.status,
      ...(result.status === 'not_applicable' ? { reason: result.reason } : {}),
      facts: [...new Set(children.flatMap((c) => c.facts))], checks: children.flatMap((c) => c.checks) };
  }
  if (when.op === 'branch') {
    const matched = when.branches!.includes(p.branch);
    return { matched, status: matched ? 'matched' : 'unmatched', facts: [],
      checks: [`宮支要求${when.branches!.join('／')}，本宮${p.branch}：${matched ? '符合' : '不符合'}。`] };
  }
  if (when.op === 'birth') {
    // 日生／夜生只由安命時辰定（見 condition `birthHalf`）；唔需要宮位資料。
    if (when.is !== '日生' && when.is !== '夜生') throw Error(`Unknown birth half: ${when.is}`);
    const half = birthHalf(chart);
    const matched = half === when.is;
    return { matched, status: matched ? 'matched' : 'unmatched', facts: matched ? [`${BRANCHES[chart.lunar.shichen]}時生，屬${half}人`] : [],
      checks: [`日夜生要求${when.is}人（原書以寅至未時為日生、申至丑時為夜生），本盤${BRANCHES[chart.lunar.shichen]}時生：${matched ? '符合' : '不符合'}。`] };
  }
  if (!['has', 'lacks-hua', 'lacks'].includes(when.op)) throw Error(`Unknown reviewed predicate: ${when.op}`);
  if (when.op === 'lacks' && when.hua) throw Error('lacks takes stars only; use lacks-hua for 四化');
  const names = when.names ?? [];
  const huas = when.hua?.split(' ') ?? [];
  const selected = scope(chart, p, when.scope!);
  if (!selected.length) return { matched: false, status: 'not_applicable', reason: '查詢宮位資料不足', facts: [], checks: ['查詢宮位資料不足。'] };
  const candidates = names.length ? names : QUERYABLE_NATAL_STARS;
  const cond: Condition = { any: candidates.map((star): Condition => ({ all: [
    { star, at: selected.map((q) => q.branch) },
    ...(huas.length ? [{ any: huas.map((hua): Condition => ({ star, hua: hua as Sihua })) }] : []),
  ] })) };
  const result = evaluate(when.op === 'has' ? cond : { not: cond }, { chart });
  // Preserve the original native palace/star order for existing facts. Append helpers only when requested/present.
  const located = candidates.map((star) => lookupNatalStar(chart, star));
  const hits = selected.flatMap((q) => {
    const ordered = [...q.stars.map((s) => s.name), ...candidates.filter((n) => !q.stars.some((s) => s.name === n))];
    return ordered.flatMap((name) => {
      const hit = located.find((s) => s.status === 'available' && s.star === name && s.branch === q.branch);
      if (!hit || hit.status !== 'available' || (huas.length && (!hit.placement.sihua || !huas.includes(hit.placement.sihua)))) return [];
      return [`${name}${huas.length ? `化${hit.placement.sihua}` : ''}在${label(q)}${q.branch === p.branch ? '同宮'
        : q.branch === oppositeBranch(p.branch) ? '對照' : sanFangPalaces(chart.palaces, p.branch).some((x) => x.branch === q.branch) ? '三方會照' : '實坐'}`];
    });
  });
  const where = when.scope === 'own' ? '本宮' : when.scope === 'opposite' ? '對宮' : when.scope === 'four' ? '三方四正' : when.scope!.slice(6);
  const target = `${where}${names.length ? names.join('／') : '星曜'}${huas.length ? `化${huas.join('／')}` : ''}`;
  return { matched: result.status === 'matched', status: result.status, facts: hits,
    ...(result.status === 'not_applicable' ? { reason: result.reason } : {}),
    checks: [`核對${target}：${result.status === 'not_applicable' ? `資料未齊（${result.reason}）` : hits.length ? hits.join('；') : '未見所列配合'}。`] };
}
