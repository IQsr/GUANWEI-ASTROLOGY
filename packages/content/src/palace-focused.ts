import { oppositeBranch, type Chart, type Palace } from '@guanwei/ziwei';
import type { FreeReadingSegment } from './free-ming-reader';
import type { MingStatement } from './ming-writer';
import { isYouthReader } from './youth';
import type {AnalysisRecorder} from './analysis-record';
import { palaceRuleReference } from './palace-rule-reference';
import raw from './cards/palace-focused.json';

import { evaluatePalacePredicate as evaluate, type PalacePredicate as Predicate } from './palace-predicate';

type Profile = { id: string; palace: string; stars: string[]; branches: string[]; heading: string; text: string;
  followHeading: string; follow: string; sources: string[]; conditions: string[]; advice: string };
type Rule = { id: string; palace: string; keys: string[]; when: Predicate; heading: string; text: string;
  sources: string[]; conditions: string[]; priority: number };
const data = raw as unknown as { profiles: Profile[]; rules: Rule[]; sources: typeof raw.sources };
const keyOf = (names: string[]) => [...names].sort().join('+');
const major = (p: Palace) => p.stars.filter((s) => s.kind === 'major');
const citeId = (id: string) => `palace.focused.v1:${id}`;
const sourceMap = new Map(Object.entries(data.sources).map(([id, s]) => [citeId(id), s]));
export const focusedPalaceSource = (id: string) => sourceMap.get(id) ?? null;

export function focusedPalaceReading(chart: Chart, palace: string, year: number, separateRuleReferences = false, recorder?: AnalysisRecorder): FreeReadingSegment[] | null {
  if (!['夫妻', '田宅'].includes(palace)) return null;
  const p = chart.palaces.find((q) => q.name === palace);
  if (!p) return null;
  const borrowed = !major(p).length;
  const origin = borrowed ? chart.palaces.find((q) => q.branch === oppositeBranch(p.branch)) : p;
  if (!origin) throw Error('Missing opposite palace');
  const names = major(origin).map((s) => s.name);
  const key = keyOf(names);
  const profiles = data.profiles.filter((r) => r.palace === palace && keyOf(r.stars) === key);
  const profile = profiles.find((r) => r.branches.includes(origin.branch)) ?? profiles.find((r) => !r.branches.length);
  if (!profile) throw Error(`Missing reviewed combination: ${palace}/${key}/${origin.branch}`);
  const fact = borrowed ? `你的${palace}宮在${p.branch}，本宮沒有主星，借對宮${origin.branch}的${names.join('、')}作參照。`
    : `你的${palace}宮在${p.branch}，${names.join('、')}${names.length === 1 ? '坐守' : '同宮'}。`;
  const applicable = data.rules.filter((r) => r.palace === palace && r.keys.some((k) => k.startsWith('has:') ? names.includes(k.slice(4)) : keyOf(k.split('+')) === key));
  const reviewed = borrowed ? [] : applicable.map((rule) => ({ rule, evaluated: evaluate(rule.when, chart, p) }));
  const selected = reviewed.filter((r) => r.evaluated.matched).sort((a, b) => b.rule.priority - a.rule.priority).slice(0, 2);
  const youth = isYouthReader(chart, year);
  recorder?.palace({palace,profile,borrowed,namespace:'palace.focused.v1',rules:applicable.map(rule=>({rule,evaluated:reviewed.find(r=>r.rule===rule)?.evaluated,selected:selected.some(r=>r.rule===rule)}))});
  const shared = [fact,
    borrowed ? '以下只參照原書實坐篇的組合主題；未把對宮的四化、配曜、夾宮及三方條件搬成本宮已成立。對宮實坐宮支與本宮宮支分開保存。'
      : '本宮實坐組合與宮支已核；修飾按下列實際位置選段，未以兩條單星說法相加或吉煞數量判定。',
    '只寫本命閱讀重點；原文所列大限、流年、日夜、廟陷、桃花或刑耗等須各核前提。未把引擎未收的雜曜當成不存在，未用引擎亮度表冒充原書表已校定。',
    ...profile.conditions];
  const make = (id: string, heading: string, text: string, refs: string[], extra: string[] = [], prefix = '', advice = false): FreeReadingSegment => {
    if (youth && palace === '夫妻' && !advice) text = `說到將來的婚姻，${text}`;
    const kind: MingStatement['kind'] = advice ? 'editorial-advice' : borrowed ? 'editorial-explanation' : 'interpretation';
    const statement: MingStatement = { text, en: '', kind, source_ids: [id], citations: refs.map(citeId) };
    return { slot: prefix ? '結論' : advice ? '做法' : '細讀', heading, text: prefix + text,
      ...(refs.length ? { referenceConditions: [...shared, ...extra] } : {}),
      statements: [...(prefix ? [{ text: prefix, en: '', kind: 'evidence' as const, source_ids: [`${id}-fact`], citations: [] }] : []), statement] };
  };
  /* 2026-10-26 新書（separateRuleReferences）「據」只掛符合或未能判定嘅規則原段；
   * 未符合嘅分支唔再掛出嚟（決定照記喺 recorder）。基準入口照舊。 */
  const shown = (r: (typeof reviewed)[number]) => r.evaluated.matched || r.evaluated.status === 'not_applicable';
  const result = [make(`${profile.id}-base`, profile.heading,
    borrowed ? `這裡參照的是原書實坐${names.join('、')}一組的主題：${profile.text}借入參照仍須保留範圍，以上不是本宮已成立的個人分支。` : profile.text,
    [...new Set([...profile.sources, ...reviewed.filter((r) => separateRuleReferences ? shown(r) : (r.evaluated.matched && !selected.includes(r))).flatMap((r) => r.rule.sources)])],
    borrowed ? [`參照原節實坐宮支${origin.branch}，沒有將其宮支分支當成本宮${p.branch}。`] :
      reviewed.filter((r) => !separateRuleReferences || shown(r)).map(({ rule, evaluated }) => separateRuleReferences
        ? palaceRuleReference(rule, evaluated, selected.some((s) => s.rule.id === rule.id))
        : `${rule.heading}：${evaluated.matched ? selected.some((s) => s.rule.id === rule.id) ? '符合本輪已核前提，正文採用' : '符合本輪已核前提，受篇幅排序未另起正文段；不可視為已被其他支抵銷' : '未符合本輪全部已核前提，未採其個人分支'}。${evaluated.checks.join('')}`), fact)];
  for (const { rule, evaluated } of selected) {
    const positions = evaluated.facts.length ? `本盤${evaluated.facts.join('；')}。` : '';
    result.push(make(rule.id, rule.heading, positions + rule.text, rule.sources, separateRuleReferences ? [palaceRuleReference(rule, evaluated, true)] : [...evaluated.checks, ...rule.conditions]));
  }
  const follow = make(`${profile.id}-follow`, profile.followHeading, profile.follow,
    [...profile.sources, ...(palace === '田宅' ? ['property-scope'] : [])]);
  follow.statements.at(-1)!.kind = 'editorial-explanation';
  result.push(follow);
  if (borrowed || result.length < 3) {
    const text = palace === '田宅'
      ? '田宅亦參照服務機構與環境變動。居住、產業與工作基礎可以分開對照；其中一邊的情況，未能代替另一邊的實際生活。原書亦明說投機買賣的得失，一般不能由田宅宮顯示。'
      : '本章保留原書對關係的觀察範圍；支持、相處磨合與環境阻力分開看，不把一項配置換成伴侶品德、婚姻次數或已發生的結局。';
    /* 《深造講義》夫妻宮篇首只得標題（PDF377），冇總論可引；舊 spouse-scope 係巨門專段，唔再掛。JSON 保留俾已存舊書讀。 */
    const boundary = make(`${palace}-focused-scope`, '這章的閱讀範圍', text, palace === '田宅' ? ['property-scope'] : [], ['這段是原書範圍與編輯閱讀說明，不是另一項已成立的個人結果。']);
    boundary.statements.at(-1)!.kind = 'editorial-explanation';
    result.push(boundary);
  }
  const advice = youth ? '你仍在成長，伴侶與資產可以先當作日後才會接觸的主題，毋須用現在的生活硬套。可以記下哪段有共鳴、哪段不適用，保留未知的情況。這是編輯提供的閱讀方法。'
    : palace === '夫妻' ? '如果你正在一段關係中，可以挑一件近期反覆談不攏的小事，分開寫下事情本身怎樣處理、自己希望對方理解甚麼，以及哪些部分願意共同決定。這是編輯提供的練習；尚未有伴侶，可以先保留觀察問題，不必預先安排結局。'
      : '若你正與其他人共同使用一個空間，可以挑一項安排，寫清楚誰使用、誰決定、誰維護，以及改動時怎樣商量。工作資源可另選一項對照。這是編輯提供的例子，不表示你目前擁有物業或正與人爭產。';
  result.push(make(`${palace}-focused-advice`, '可以怎樣對照生活', advice, [], [], '', true));
  result[0]!.slot = '結論';
  return result;
}
