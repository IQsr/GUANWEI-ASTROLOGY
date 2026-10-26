import { oppositeBranch, type Chart, type Palace } from '@guanwei/ziwei';
import type { FreeReadingSegment } from './free-ming-reader';
import type { MingStatement } from './ming-writer';
import { isYouthReader } from './youth';
import type {AnalysisRecorder} from './analysis-record';
import { palaceRuleReference } from './palace-rule-reference';
import raw from './cards/palace-remaining.json';

import { evaluatePalacePredicate as evaluate, type PalacePredicate as Predicate } from './palace-predicate';

type Profile = { id: string; palace: string; stars: string[]; branches: string[]; heading: string; text: string;
  followHeading: string; follow: string; sources: string[]; conditions: string[] };
type Rule = { id: string; palace: string; keys: string[]; when: Predicate; heading: string; text: string;
  sources: string[]; conditions: string[]; priority: number };
type Scope = { text: string; advice: string; sources: string[]; conditions: string[] };
const data = raw as unknown as { palaces: string[]; profiles: Profile[]; rules: Rule[];
  scopes: Record<string, Scope>; sources: typeof raw.sources };
const keyOf = (names: string[]) => [...names].sort().join('+');
const major = (p: Palace) => p.stars.filter((s) => s.kind === 'major');
const label = (p: Palace) => `${p.name.endsWith('宮') ? p.name : `${p.name}宮`}${p.branch}`;
const citeId = (id: string) => `palace.remaining.v1:${id}`;
const sources = new Map(Object.entries(data.sources).map(([id, s]) => [citeId(id), s]));
export const remainingPalaceSource = (id: string) => sources.get(id) ?? null;
const profiles = new Map(data.profiles.flatMap((p) => p.branches.map((branch) => [`${p.palace}/${keyOf(p.stars)}/${branch}`, p] as const)));

/** Retain the two previously approved, chart-specific wealth/career samples and their stable citations. */
function approvedSample(palace: string, p: Palace): boolean {
  const names = major(p).map((s) => s.name);
  return names.length === 1 && ((palace === '財帛' && names[0] === '太陰' && ['辰', '戌'].includes(p.branch))
    || (palace === '官祿' && names[0] === '天機' && ['子', '午'].includes(p.branch)));
}

export function remainingPalaceReading(chart: Chart, palace: string, year: number, separateRuleReferences = false, recorder?: AnalysisRecorder): FreeReadingSegment[] | null {
  if (!data.palaces.includes(palace)) return null;
  const p = chart.palaces.find((q) => q.name === palace);
  if (!p || (approvedSample(palace, p) && !recorder)) return null;
  const retainedReader=approvedSample(palace,p)?'approved specific reader retained; generic candidate cards recorded without changing prose':undefined;
  const borrowed = !major(p).length;
  const origin = borrowed ? chart.palaces.find((q) => q.branch === oppositeBranch(p.branch)) : p;
  if (!origin) throw Error(`Missing opposite palace: ${palace}`);
  const names = major(origin).map((s) => s.name);
  const key = keyOf(names);
  const profile = profiles.get(`${palace}/${key}/${origin.branch}`);
  if (!profile) throw Error(`Missing remaining-palace combination: ${palace}/${key}/${origin.branch}`);
  const boundary = data.scopes[palace]!;
  const opposite = chart.palaces.find((q) => q.branch === oppositeBranch(p.branch))!;
  const fact = borrowed
    ? `你的${palace}宮在${p.branch}，本宮沒有主星，借對宮${origin.branch}的${names.join('、')}作參照。`
    : `你的${palace}宮在${p.branch}，${names.join('、')}${names.length === 1 ? '坐守' : '同宮'}。${major(opposite).length ? `對宮${label(opposite)}實坐${major(opposite).map((s) => s.name).join('、')}。` : '對宮沒有主星。'}`;
  const applicable = data.rules.filter((r) => r.palace === palace && r.keys.some((k) => k.startsWith('has:')
    ? names.includes(k.slice(4)) : keyOf(k.split('+')) === key));
  const reviewed = borrowed ? [] : applicable.map((rule) => ({ rule, evaluated: evaluate(rule.when, chart, p) }));
  const matched = reviewed.filter((r) => r.evaluated.matched).sort((a, b) => b.rule.priority - a.rule.priority);
  const selected = retainedReader ? [] : matched.slice(0, 2);
  recorder?.palace({palace,profile,borrowed,namespace:'palace.remaining.v1',retainedReader,rules:applicable.map(rule=>({rule,evaluated:reviewed.find(r=>r.rule===rule)?.evaluated,selected:selected.some(r=>r.rule===rule)}))});
  if(retainedReader)return null;
  const shared = [fact, borrowed
    ? '以下只參照原書實坐組合的主題；未把對宮的四化、配曜、夾宮及三方條件搬成本宮已成立，亦未把對宮宮支當成本宮宮支。'
    : '本宮主星組合與宮支已確認；以下四化及配曜按實際同宮、對照與三方位置核對。星曜數量不能代替完整格局的條件。',
  '這裡只讀本命。原文涉及的大限流年、日夜、廟陷、府庫、朝拱及其他雜曜，仍須各按完整前提判定；未確認的配合保留未知。',
  ...profile.conditions];
  const make = (id: string, heading: string, text: string, refs: string[], extra: string[] = [], prefix = '',
    kind: MingStatement['kind'] = borrowed || palace === '疾厄' ? 'editorial-explanation' : 'interpretation'): FreeReadingSegment => ({
    slot: prefix ? '結論' : kind === 'editorial-advice' ? '做法' : '細讀', heading, text: prefix + text,
    ...(refs.length ? { referenceConditions: [...shared, ...extra] } : {}),
    statements: [...(prefix ? [{ text: prefix, en: '', kind: 'evidence' as const, source_ids: [`${id}-fact`], citations: [] }] : []),
      { text, en: '', kind, source_ids: [id], citations: refs.map(citeId) }],
  });
  /* 2026-10-26 新書（separateRuleReferences）「據」只掛符合或未能判定嘅規則原段；
   * 未符合嘅分支唔再掛出嚟（決定照記喺 recorder）。基準入口照舊。 */
  const shown = (r: (typeof reviewed)[number]) => r.evaluated.matched || r.evaluated.status === 'not_applicable';
  const checks = reviewed.filter((r) => !separateRuleReferences || shown(r)).map(({ rule, evaluated }) => separateRuleReferences
    ? palaceRuleReference(rule, evaluated, selected.some((s) => s.rule.id === rule.id))
    : `${rule.heading}：${evaluated.matched
      ? selected.some((s) => s.rule.id === rule.id) ? '符合本輪已核前提，正文採用' : '符合本輪已核前提，受篇幅排序未另起段，並非被抵銷'
      : '未符合本輪全部前提，未採此個人分支'}。${evaluated.checks.join('')}${rule.conditions.join('；')}`);
  const result = [make(`${profile.id}-base`, profile.heading,
    borrowed ? `這裡參照原書實坐${names.join('、')}的組合主題：${profile.text}以上不是本宮已成立的個人分支。` : profile.text,
    [...new Set([...profile.sources, ...(separateRuleReferences ? reviewed.filter(shown) : matched.filter((r) => !selected.includes(r))).flatMap((r) => r.rule.sources)])], checks, fact)];
  for (const { rule, evaluated } of selected) result.push(make(rule.id, rule.heading,
    `${evaluated.facts.length ? `本盤${evaluated.facts.join('；')}。` : ''}${rule.text}`, rule.sources, separateRuleReferences ? [palaceRuleReference(rule, evaluated, true)] : [...evaluated.checks, ...rule.conditions]));
  result.push(make(`${profile.id}-follow`, profile.followHeading, profile.follow, profile.sources, [], '', 'editorial-explanation'));
  // Always retain chapter scope: it separates actual relationships, money, work and health.
  result.push(make(`${palace}-remaining-scope`, '這章的閱讀範圍', boundary.text, boundary.sources, boundary.conditions, '', 'editorial-explanation'));
  const advice = isYouthReader(chart, year)
    ? `你仍在成長，本章關於工作、資源與人際的內容，可以先作日後的觀察問題，毋須硬套成現在已有的經歷。可以記下哪一句有共鳴、哪一句未適用，容許答案改變。這是編輯提供的閱讀方法。`
    : `${boundary.advice}以上是編輯提供的對照方法，與原書判詞分開。`;
  result.push(make(`${palace}-remaining-advice`, '可以怎樣對照生活', advice, [], [], '', 'editorial-advice'));
  return result;
}
