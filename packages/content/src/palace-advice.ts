import type { Chart } from '@guanwei/ziwei';
import type { FreeReadingSegment } from './free-ming-reader';
import { isYouthReader } from './youth';
import { xingxiOf } from './xingxi';
import rawAdvice from './cards/palace-advice.json';
import links from './cards/palace-advice-links.json';
import focus from './cards/palace-advice-focus.json';

/** Practical editorial advice; selection follows the existing reading, without adding astrological rules. */
type AdviceText = { adult: string; youth?: string };
type Group = { scene: string; combinations: string[] };
type AdviceConfig = { texts: Record<string, AdviceText>; groups: Group[]; otherwise: string; selected?: Record<string, string> };
const advice = rawAdvice as Record<string, Record<string, AdviceText>>;
const group = (scene: string, combinations: string): Group => ({ scene, combinations: combinations.split(' ').map((s) => s.split('+').sort().join('+')) });

const adviceConfig: Record<string, AdviceConfig> = {
  兄弟: {
    texts: advice['兄弟']!,
    groups: [group('advice', '天梁 天機+天梁 太陽+天梁'), group('continuity', '天機 天機+太陰 天機+巨門 天同+天梁 七殺+武曲 武曲+破軍 廉貞+破軍 破軍'), group('control', '紫微+破軍 紫微+天府 武曲+貪狼 武曲+天相 廉貞+貪狼')], otherwise: 'contribution',
  },
  夫妻: {
    texts: advice['夫妻']!,
    groups: [group('time', '天機 天機+天梁 太陽 太陽+天梁 天同+天梁 天梁 七殺 紫微+七殺'), group('resources', '紫微 紫微+天府 紫微+天相 武曲 武曲+天府 武曲+貪狼 武曲+天相 武曲+七殺 武曲+破軍 天相 廉貞+天相 破軍'), group('connection', '天同+太陰 廉貞 廉貞+破軍 廉貞+貪狼 紫微+貪狼')], otherwise: 'discussion', selected: { 'spouse-83-base': 'family' },
  },
  子女: {
    texts: advice['子女']!,
    groups: [group('expression', '太陽 太陽+巨門 巨門 天機+巨門 天同+巨門 太陽+太陰'), group('independence', '天機+天梁 廉貞+破軍 天相 天梁'), group('distance', '紫微+破軍 紫微+天相 紫微+七殺 武曲+七殺 武曲+破軍 廉貞+七殺 破軍 七殺')], otherwise: 'support', selected: { 'children-jiliang-fire': 'distance' },
  },
  財帛: {
    texts: advice['財帛']!,
    groups: [group('stewardship', '紫微+七殺 武曲 武曲+天府 武曲+七殺 天相 七殺'), group('professional', '天機+天梁 太陽 太陽+天梁 天相+武曲 天梁'), group('communication', '天機+巨門 太陽+巨門 天同+巨門 巨門')], otherwise: 'flow',
  },
  疾厄: {
    texts: advice['疾厄']!, groups: [group('water', '天同 天同+太陰 天相 太陰 紫微+天相 廉貞+天相'), group('digestion', '紫微 紫微+天府 紫微+七殺 天機+巨門 天機+天梁 天府 廉貞+天府 巨門'), group('ache', '天機 武曲+破軍 廉貞+破軍 天梁 天同+巨門'), group('respiration', '武曲 武曲+天府 武曲+七殺 廉貞+七殺 七殺')], otherwise: 'fatigue',
  },
  遷移: {
    texts: advice['遷移']!,
    groups: [group('movement', '天機 天機+太陰 天機+天梁 太陽+太陰 武曲 武曲+七殺 武曲+破軍 天同+太陰 七殺 破軍'), group('communication', '天機+巨門 太陽+巨門 天同+巨門 巨門 廉貞+貪狼 貪狼'), group('foundation', '紫微+天府 天府 武曲+天府 天同 天同+天梁 天梁 廉貞+天府 太陰')], otherwise: 'position',
  },
  僕役: {
    texts: advice['僕役']!,
    groups: [group('continuity', '紫微+破軍 天機 天機+太陰 天機+天梁 武曲+七殺 武曲+破軍 破軍'), group('advice', '天機+巨門 太陽+巨門 太陽+天梁 天同+巨門 天同+天梁 巨門 天梁'), group('networking', '紫微+貪狼 武曲+貪狼 廉貞+貪狼 貪狼 太陽')], otherwise: 'delegation',
  },
  官祿: {
    texts: advice['官祿']!,
    groups: [group('opening', '紫微+破軍 武曲+破軍 廉貞+破軍 破軍 天同'), group('foundation', '紫微+天府 天府 廉貞+天府'), group('managing', '紫微 紫微+貪狼 紫微+天相 紫微+七殺 武曲+天府 武曲+天相 武曲+七殺 天相 廉貞+天相 廉貞+七殺'), group('communication', '天機+巨門 太陽 太陽+巨門 天同+巨門 廉貞 廉貞+貪狼 貪狼 巨門'), group('professional', '太陽+天梁 天梁')], otherwise: 'planning',
  },
  田宅: {
    texts: advice['田宅']!,
    groups: [group('coordination', '太陽+巨門 太陽+天梁 天機+巨門 天同+巨門 巨門'), group('renewal', '紫微+破軍 天機 天機+太陰 天機+天梁 武曲+破軍 天同+天梁 廉貞+破軍 破軍')], otherwise: 'foundation',
  },
  福德: {
    texts: advice['福德']!,
    groups: [group('thinking', '天機 天機+太陰 天機+巨門 天機+天梁 太陰 巨門 天梁 廉貞+七殺'), group('action', '紫微+破軍 紫微+七殺 武曲+七殺 武曲+破軍 太陽 破軍 七殺 廉貞+破軍 廉貞'), group('pleasure', '紫微+貪狼 武曲 武曲+貪狼 天同 天同+太陰 貪狼 廉貞+貪狼')], otherwise: 'rest',
  },
  父母: {
    texts: advice['父母']!,
    groups: [group('autonomy', '紫微 紫微+天府 紫微+天相 紫微+七殺 天梁 天相'), group('distance', '紫微+破軍 紫微+貪狼 天機 天機+太陰 武曲+七殺 武曲+破軍 天同+天梁 太陰 貪狼 破軍 廉貞+七殺 廉貞+破軍'), group('communication', '天機+巨門 太陽+巨門 武曲 天同 天同+太陰 天同+巨門 巨門 廉貞')], otherwise: 'support',
  },
};

const heading = '給你的建議｜編輯建議';
const unsourced = (s: FreeReadingSegment) => s.statements.every((line) => !line.citations.length);
const mingAdviceTexts: Record<string, number[]> = {
  balance: [1,28,50], adapt: [2,10,11,13,20,31,39,44,47], values: [3,14,22,25,43,46],
  expression: [4,6,24,42,56], ambition: [5,23,29,33,51,57], principle: [8,17,26,36,41,59],
  cooperate: [7,16,19,27,30,35,45,53,58], plan: [9,18,32,34,37,40,52,54],
  scope: [12,21,49,55], continuity: [38,48], judgement: [15,60],
};

type Modifier = 'ji' | 'quan' | 'lu' | 'ke' | 'sha' | 'fu';
const pick = (t: AdviceText, youth: boolean) => youth ? t.youth ?? t.adult : t.adult;

/** 新書：本宮有化忌、化權、化祿／祿存、化科、煞曜或輔曜，就加一句點名該星嘅做法（只揀一項）。 */
function modifierSentence(chart: Chart, palace: string, youth: boolean, skip: Modifier[] = []): { key: Modifier; text: string } | null {
  const stars = chart.palaces.find((p) => p.name === palace)?.stars ?? [];
  const hua = (h: string) => stars.filter((s) => s.sihua === h).map((s) => `${s.name}化${h}`);
  const named = (list: string[]) => stars.filter((s) => list.includes(s.name)).map((s) => s.name);
  const found: Record<Modifier, string> = {
    ji: hua('忌').length ? `本宮見${hua('忌').join('、')}。` : '',
    quan: hua('權').length ? `本宮有${hua('權').join('、')}。` : '',
    lu: hua('祿').length || named(['祿存']).length ? `本宮有${[...hua('祿'), ...named(['祿存'])].join('、')}。` : '',
    ke: hua('科').length ? `本宮有${hua('科').join('、')}。` : '',
    sha: named(focus.sha).length ? `本宮同度${named(focus.sha).join('、')}。` : '',
    fu: named(focus.fu).length ? `本宮同度${named(focus.fu).join('、')}。` : '',
  };
  const key = (focus.modifierOrder as Modifier[]).find((k) => found[k] && !skip.includes(k));
  if (!key) return null;
  const tail = (focus.palaceModifiers as Record<string, Partial<Record<Modifier, string>>>)[palace]?.[key] ?? focus.modifiers[key];
  const domain = (focus.domains as Record<string, AdviceText>)[palace];
  return { key, text: found[key] + tail.replace('{domain}', domain ? pick(domain, youth) : '') };
}

/** 新書疾厄：按結論段實際講到的取象揀建議；只講一方面用原有專項建議，講到幾方面就照列。 */
function healthFocus(segments: FreeReadingSegment[], youth: boolean): { key: string; text?: string } | null {
  const lead = segments.find((s) => s.slot === '結論') ?? segments[0];
  if (!lead) return null;
  const hits = focus.health.families.filter((f) => new RegExp(f.pattern).test(lead.text));
  if (!hits.length) return { key: 'observation' };
  if (hits.length === 1 && advice['疾厄']![hits[0]!.key]) return { key: hits[0]!.key };
  return { key: `mixed.${hits.map((f) => f.key).join('+')}`, text: pick(focus.health.mixed, youth).replace('{labels}', hits.map((f) => f.label).join('、')) };
}

/** Direct advice follows the complete combination and any already selected conditional branch.
 * `focused`（只限新書）：主題跟正文改配、疾厄跟結論取象，並按本宮實際星曜加一句。 */
export function withPalaceAdvice(chart: Chart, palace: string, year: number, segments: FreeReadingSegment[], opts: { focused?: boolean } = {}): FreeReadingSegment[] {
  const youth = isYouthReader(chart, year);
  const withModifier = (key: string, text: string, skip: Modifier[] = []) => {
    const m = opts.focused ? modifierSentence(chart, palace, youth, skip) : null;
    return m ? { key: `${key}+${m.key}`, text: `${text}${m.text}` } : { key, text };
  };
  if (palace === '命宮') {
    const n = xingxiOf(chart)?.system.n;
    const key = (links.ming as Record<string, string>)[String(n)] ?? Object.entries(mingAdviceTexts).find(([, ids]) => n !== undefined && ids.includes(n))?.[0];
    if (!key) return segments;
    const ji = opts.focused && key === 'ambition' && chart.palaces.find((p) => p.name === '命宮')?.stars.some((s) => s.kind === 'major' && s.sihua === '忌');
    const base = ji ? { key: 'ambition-ji', text: pick(focus.ming['ambition-ji'], youth) } : { key, text: pick(advice['命宮']![key]!, youth) };
    const { key: id, text } = withModifier(base.key, base.text, ji ? ['ji'] : []);
    return segments.map((s) => unsourced(s) && s.statements.every((line) => line.kind === 'editorial-example')
      ? { ...s, slot: '做法', heading, text, statements: [{ text, en: '', kind: 'editorial-advice', source_ids: [`editorial.advice.命宮.${id}`], citations: [] }] }
      : s);
  }
  const config = adviceConfig[palace];
  if (!config) return segments;
  const p = chart.palaces.find((entry) => entry.name === palace);
  if (!p) return segments;
  const own = p.stars.filter((s) => s.kind === 'major');
  const origin = own.length ? p : chart.palaces.find((entry) => entry.branch === p.borrowsFrom);
  const combination = origin?.stars.filter((s) => s.kind === 'major').map((s) => s.name).sort().join('+');
  if (!combination) return segments;
  const selectedIds = segments.flatMap((s) => s.statements.flatMap((line) => line.source_ids));
  const ruleIds = [...new Set([...links.priority, ...Object.keys(links.rules)])];
  const selectedRule = ruleIds.find((id) => selectedIds.includes(id));
  const ruleAdvice = selectedRule ? (links.rules as Record<string, string>)[selectedRule] : undefined;
  const profileId = selectedIds.find((id) => id in links.profiles);
  const profiles = { ...links.profiles, ...(opts.focused ? focus.profiles : {}) } as Record<string, string>;
  const profileAdvice = profileId ? profiles[profileId] : undefined;
  const override = ruleAdvice ?? profileAdvice ?? Object.entries(config.selected ?? {}).find(([id]) => selectedIds.includes(id))?.[1];
  const health = opts.focused && palace === '疾厄' && !ruleAdvice ? healthFocus(segments, youth) : null;
  const sceneKey = health?.key ?? override ?? config.groups.find((g) => g.combinations.includes(combination))?.scene ?? config.otherwise;
  const selectedAdvice = health?.text ? { adult: health.text } : config.texts[sceneKey];
  if (!selectedAdvice) throw Error(`Missing editorial advice: ${palace}/${sceneKey}`);
  const { key, text } = withModifier(sceneKey, pick(selectedAdvice, youth));
  const closingAdvice: FreeReadingSegment = { slot: '做法', heading, text, statements: [{ text, en: '', kind: 'editorial-advice', source_ids: [`editorial.advice.${palace}.${key}`], citations: [] }] };
  const last = segments.at(-1);
  const body = last && unsourced(last) && last.statements.every((line) => line.kind === 'editorial-advice') ? segments.slice(0, -1) : segments;
  return [...body, closingAdvice];
}
