import { sanFangPalaces, queryNatalStar, lookupNatalStar, type Sihua, type Chart, type Palace } from '@guanwei/ziwei';
import { evaluate } from './condition';
import { xingxiOf } from './xingxi';
import { isYouthReader } from './youth';
import type { MingStatement } from './ming-writer';
import type { FreeReadingSegment } from './free-ming-reader';
import { systemReadingCiteId } from './free-ming-systems-sources';
import data from './cards/free-ming-systems.json';

type Part = { text: string; sources: string[]; conditions?: string[] };
type Modifier = { id: string; star: string; hua: string; where: string; text: string; sources: string[]; requiresAbsent?: string[] };
type Profile = { n: number; name: string; title: string; lead: Part; detail: Part; bone: Part; limit: Part; conditions: string; example: string; signals: Modifier[] };
const profiles = new Map((data.profiles as Profile[]).map((p) => [p.n, p]));

/**
 * 2026-10-25「條件唔成立就唔寫」：句子點名嘅四化（例如「破軍化祿或權」、「武曲忌」），
 * 命宮三方四正（借宮就用對宮嗰組）一個都冇，呢句就唔出。冇點名四化嘅句照舊。
 * 只係揀句，唔改句；喺敘事層之後做（見 withConditionalBranches）。舊書照讀快照，基準入口 bookChapters 預設唔開。
 * 新書版本記喺 web `reader-release.ts` MING_BRANCH_FILTER_VERSION。
 */
const HUA_STARS = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍', '文昌', '文曲', '左輔', '右弼'];
/** 「X化Y」同簡寫「X忌」「天同權與天機科」都算點名。 */
const HUA_MENTION = new RegExp(`(${HUA_STARS.join('|')})化?([祿權科忌])((?:[或與、及和]化?[祿權科忌])*)`, 'g');
export function huaMentions(sentence: string): { star: string; hua: string }[] {
  return [...sentence.matchAll(HUA_MENTION)].flatMap((m) => [m[2]!, ...(m[3]!.match(/[祿權科忌]/g) ?? [])].map((hua) => ({ star: m[1]!, hua })));
}
const DEPENDENT = /^(這些|此處|這是有條件分支|這一項|它)/;
function keepBranches(text: string, four: readonly Palace[]): string {
  const onChart = (star: string, hua: string) => four.some((p) => p.stars.some((s) => s.name === star && s.sihua === hua));
  let dropped = false;
  const out = text.split(/(?<=[。；])/).filter((s) => {
    const named = huaMentions(s);
    // 緊跟被刪分支嘅附屬句（「這些配合…」「此處…」）指涉已冇，一齊唔出。
    const keep = named.length ? named.some((n) => onChart(n.star, n.hua)) : !(dropped && DEPENDENT.test(s));
    dropped = !keep;
    return keep;
  }).join('');
  return out.endsWith('；') ? `${out.slice(0, -1)}。` : out;
}

/** 命宮／骨架成稿（敘事層之後）逐條 statement 揀句；段文由 statements 重砌，冇剩就成段唔出。 */
export function withConditionalBranches<T extends { text: string; statements?: MingStatement[] }>(chart: Chart, segments: T[]): T[] {
  const m = chart.palaces.find((p) => p.name === '命宮');
  if (!m) return segments;
  const origin = m.stars.some((s) => s.kind === 'major') ? m : chart.palaces.find((p) => p.branch === m.borrowsFrom) ?? m;
  const four = sanFangPalaces(chart.palaces, origin.branch);
  return segments.flatMap((seg) => {
    if (!seg.statements?.length) return [seg];
    const next = seg.statements.map((l) => ({ ...l, text: keepBranches(l.text, four) }));
    if (next.every((l, i) => l.text === seg.statements![i]!.text)) return [seg];
    const statements = next.filter((l) => l.text);
    if (!statements.length) return [];
    // 段文逐句替換，唔假設段文一定等於 statements 串埋。
    let text = seg.text;
    seg.statements.forEach((l, i) => { if (next[i]!.text !== l.text) text = text.includes(l.text) ? text.replace(l.text, next[i]!.text) : text; });
    if (text === seg.text) throw Error('Branch filter could not place a changed statement in its segment');
    return [{ ...seg, text, statements }];
  });
}

/** 57組新稿及借星參照；只採用已核的共同主題與明確單項修飾，不定兩端總分。 */
export function systemMingReading(chart: Chart, year: number): { ming: FreeReadingSegment[]; bone: FreeReadingSegment[] } | null {
  const x = xingxiOf(chart);
  if (!x) return null;
  // 三組實坐專用條件留在先行稿；此處三組 profile 僅供借入參照。
  if (!x.borrowed && [17, 55, 60].includes(x.system.n)) return null;
  const profile = profiles.get(x.system.n);
  if (!profile) throw new Error(`Missing reviewed system reading: ${x.system.n}`);
  const m = chart.palaces.find((p) => p.name === '命宮')!;
  const stars = x.system.stars.join('、');
  const conditions = x.borrowed
    ? [`本盤命宮在${m.branch}，無主星，借對宮${m.borrowsFrom}的${stars}；以下實坐篇條件只作參照，未當成本宮已成立。`, profile.conditions]
    : [profile.conditions, '下述是原書的判讀前提與限制；沒有用單項修飾或吉煞數量，替整張盤選定兩端。'];
  const statement = (text: string, kind: MingStatement['kind'], id: string, citations: string[] = []): MingStatement => ({
    text, en: '', kind, source_ids: [id], citations,
  });
  const part = (key: 'lead' | 'detail' | 'bone' | 'limit', slot: string, heading: string): FreeReadingSegment => {
    const p = profile[key];
    return { slot, heading, text: p.text, referenceConditions: [...conditions, ...(p.conditions ?? [])],
      statements: [statement(p.text, 'editorial-explanation', `system-${profile.n}-${key}`, p.sources.map(systemReadingCiteId))] };
  };
  const editorial = (text: string, slot: string, heading?: string, kind: MingStatement['kind'] = 'editorial-advice'): FreeReadingSegment => ({
    slot, text, ...(heading ? { heading } : {}), statements: [statement(text, kind, `system-${profile.n}-${slot}`)],
  });
  const lead = part('lead', '結論', profile.title);
  const factText = x.borrowed
    ? `你的命宮在${m.branch}，沒有主星，借對宮${m.borrowsFrom}的${stars}來讀。`
    : `你的命宮是${stars}${x.system.stars.length === 2 ? '同坐' : '坐'}${m.branch}宮。`;
  if (x.borrowed) {
    lead.text = `${factText}${lead.text}`;
    lead.statements.unshift(statement(factText, 'evidence', `system-${profile.n}-borrowed-fact`));
  }
  const four = sanFangPalaces(chart.palaces, m.branch);
  const modifiers = x.borrowed ? [] : profile.signals.filter((s) => {
    const ps = s.where === 'same' ? [m] : four;
    if (evaluate({ all: [{ star: s.star, at: ps.map((p) => p.branch) }, { star: s.star, hua: s.hua as Sihua }] }, { chart }).status !== 'matched') return false;
    // 「單見」只在四方皆實坐、另星確實不在四方時使用；借會不拿來猜缺曜。
    if (s.requiresAbsent?.length && (four.some((p) => p.borrowsFrom)
      || s.requiresAbsent.some((name) => queryNatalStar(chart, name, { branches: four.map((p) => p.branch) }).status !== 'absent'))) return false;
    return true;
  }).map((s): FreeReadingSegment => {
    const position = lookupNatalStar(chart, s.star);
    if (position.status !== 'available') throw Error('Matched modifier lost its native placement');
    const palace = four.find((p) => p.branch === position.branch)!;
    const palaceLabel = palace.name.endsWith('宮') ? palace.name : `${palace.name}宮`;
    const fact = `本盤${palaceLabel}有${s.star}化${s.hua}。`;
    return { slot: '展開', heading: '本盤可確認的修飾', text: fact + s.text,
      referenceConditions: [`本命${s.star}化${s.hua}實際在${palaceLabel}${palace.branch}，${palace === m ? '與命宮主星同度' : '在命宮三方四正會照'}。`,
        ...(s.requiresAbsent?.length ? [`命宮四方皆實坐，且未見${s.requiresAbsent.join('、')}同會，才選此單見分支。`] : []),
        '此段只確認列明的一項修飾，不代表相反因素已排除，也不作整體定性。'],
      statements: [statement(fact, 'evidence', `${s.id}-fact`), statement(s.text, 'interpretation', s.id, s.sources.map(systemReadingCiteId))] };
  });
  const bone: FreeReadingSegment[] = [
    editorial(factText, '因為', '盤面依據', 'evidence'),
    part('bone', '骨架', x.borrowed ? '原書實坐篇的結構' : '這個組合怎樣一起讀'),
    part('limit', '骨架', '不能省略的條件'),
  ];
  const observed = four.flatMap((p) => p.stars.filter((s) => s.sihua).map((s) => `${p.name.endsWith('宮') ? p.name : `${p.name}宮`}${s.name}化${s.sihua}`));
  const companions = m.stars.filter((s) => ['左輔', '右弼', '文昌', '文曲', '天魁', '天鉞', '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫', '祿存', '天馬'].includes(s.name)).map((s) => s.name);
  if (observed.length || companions.length) bone.splice(1, 0, editorial([
    ...(observed.length ? [`命宮四方實際坐曜的本命四化有：${observed.join('、')}。`] : []),
    ...(companions.length ? [`命宮同度的配曜另見${companions.join('、')}。`] : []),
    '這些先列作盤面位置資料，未用顆數決定偏向，也沒有把借入星曜重複計入。',
  ].join(''), '因為', '本盤實際列出的配合', 'evidence'));
  if (x.borrowed) bone.push(editorial('借入星曜不等於把對宮整張盤搬過來。這章保留原書主題，但沒有把對宮的四化、相夾與三合配合，直接當成本宮已成立的判斷。', '做法', '借入與坐守分開'));
  if (isYouthReader(chart, year)) bone.push(editorial('你現在仍在成長，可以先觀察自己在不同情境中的反應，不必把一次表達當成固定性格。若章中的描述不像你，也可以記下不適用的情況。這是閱讀方法，不是另一條命理判斷。', '做法'));
  return {
    ming: [lead, part('detail', '展開', '這組配合要分清的地方'), ...modifiers,
      editorial(`${profile.example}這是幫助理解的編輯例子，不表示你曾經遇過，也不用你的回答替命盤選定偏向。`, '情境', '可以怎樣對照生活', 'editorial-example'),
      editorial('接下來的「性格的骨架」，會列出盤面與原書的配合，並交代哪些條件仍不能省略。', '做法')],
    bone,
  };
}
