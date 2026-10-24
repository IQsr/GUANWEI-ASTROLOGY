import { deriveP1bStar, P1B_STARS, P1B_STAR_VERSION, P1B_STAR_REFERENCES, P1B_STAR_INPUTS, P1B_INITIAL_SOURCE_SHA256, type P1bStar } from './p1b-stars';
import { BRANCHES, type Branch, type Chart, type PalaceName, type Sihua, type StarPlacement } from '../types';
import { MAJOR_STARS } from './major-stars';
import { BRIGHTNESS_META } from './brightness';
import { SIHUA_META } from './sihua';
import { AUX_STARS } from './aux-stars';
import { peachStars, tianxingBranch } from './liuyao';
import { deriveP1aStar, P1A_STARS, P1A_STAR_VERSION, P1A_STAR_REFERENCES, P1A_STAR_INPUTS, P1A_INITIAL_SOURCE_SHA256, type P1aStar } from './p1a-stars';

/** Version of the query contract, independent of cast()'s unchanged stored-chart contract. */
export const STAR_QUERY_VERSION = 'natal-star-query-v1';
export const P1A_QUERY_VERSION = 'natal-star-query-v2-p1a';
export const P1B_QUERY_VERSION = 'natal-star-query-v3-p1b';
export type NatalQueryOptions = { catalogue?: 'p0' | 'p1a' | 'p1b'; birthSex?: 'male' | 'female' };
export const HELPER_STARS = ['天刑', '天姚', '紅鸞', '天喜', '咸池'] as const;
const STORED_NATAL_STARS: readonly string[] = [...MAJOR_STARS, ...AUX_STARS];
export const QUERYABLE_NATAL_STARS: readonly string[] = [...STORED_NATAL_STARS, ...HELPER_STARS];
export type StarQuerySource = {
  queryVersion: typeof STAR_QUERY_VERSION | typeof P1A_QUERY_VERSION | typeof P1B_QUERY_VERSION;
  engineVersion: string;
  schoolProfile: string;
  method: 'stored-native-placement' | 'liuyao-natal-v1' | typeof P1A_STAR_VERSION | typeof P1B_STAR_VERSION;
  inputs?: readonly string[];
  inputValues?: { birthSex: 'male' | 'female' };
  notes?: readonly string[];
  dependencies?: { star: string; branch: Branch }[];
  sourceFingerprint?: string;
  references: readonly string[];
  /** Source review is independent of placement availability; neither implies interpretation support. */
  verification: 'stored-chart-not-recollated' | 'transcription-not-original-collated';
};
type Unknown = { status: 'unknown'; star: string; code: 'not-implemented' | 'not-enabled' | 'missing-input' | 'missing-placement' | 'conflicting-data' | 'unsupported-version' | 'invalid-scope'; reason: string; source?: StarQuerySource };
type Located = { status: 'available'; star: string; branch: Branch; palace: PalaceName; placement: StarPlacement; source: StarQuerySource };
export type NatalStarLookup = Located | Unknown;
export type NatalStarScope =
  | { branch: Branch; reach?: 'same' | 'sanfang' | 'jia' }
  | { palace: PalaceName; reach?: 'same' | 'sanfang' | 'jia' }
  | { branches: readonly Branch[] };
export type NatalStarQuery = Unknown | (Omit<Located, 'status'> & { status: 'present' | 'absent'; scope: readonly Branch[] });

const refs = (star: string): readonly string[] => star === '天刑' || star === '天姚'
  ? ['wtz.initial.07.p0163', 'wtz.initial.07.p0164']
  : star === '咸池' ? ['wtz.initial.07.p0147', 'wtz.initial.07.p0148', 'wtz.initial.07.p0149', 'wtz.initial.07.p0150']
    : ['wtz.initial.07.p0126', 'wtz.initial.07.p0127', 'wtz.initial.07.p0128', 'wtz.initial.07.p0129', 'wtz.initial.07.p0130'];

/** Native positions only. Borrowing never moves a star, its hua or its auxiliaries. No mutable-chart cache. */
export function lookupNatalStar(chart: Chart, star: string, options: NatalQueryOptions = {}): NatalStarLookup {
  const firstBatch = (P1A_STARS as readonly string[]).includes(star);
  const secondBatch = (P1B_STARS as readonly string[]).includes(star);
  const secondEnabled = options.catalogue === 'p1b';
  const enabled = options.catalogue === 'p1a' || secondEnabled;
  if (secondBatch && !secondEnabled) return { status: 'unknown', star, code: 'not-enabled', reason: `${star} 已在P1b試點實作，所選查詢版本未啟用` };
  if (firstBatch && !enabled) return { status: 'unknown', star, code: 'not-enabled', reason: `${star} 已在P1a試點實作，現行P0查詢版本未啟用` };
  if (!QUERYABLE_NATAL_STARS.includes(star) && !(firstBatch && enabled) && !(secondBatch && secondEnabled)) return { status: 'unknown', star, code: 'not-implemented', reason: `${star} 未實作本命安星，不能當成沒有` };
  const helper = (HELPER_STARS as readonly string[]).includes(star);
  const source: StarQuerySource = {
    queryVersion: secondEnabled ? P1B_QUERY_VERSION : enabled ? P1A_QUERY_VERSION : STAR_QUERY_VERSION, engineVersion: chart.meta?.engineVersion ?? 'unknown',
    schoolProfile: chart.meta?.schoolProfile ?? 'unknown',
    method: secondBatch ? P1B_STAR_VERSION : firstBatch ? P1A_STAR_VERSION : helper ? 'liuyao-natal-v1' : 'stored-native-placement',
    references: secondBatch ? P1B_STAR_REFERENCES[star as P1bStar] : firstBatch ? P1A_STAR_REFERENCES[star as P1aStar] : helper ? refs(star) : ['docs/rules.md', 'packages/ziwei/src/chart/major-stars.ts', 'packages/ziwei/src/chart/aux-stars.ts'],
    verification: helper || firstBatch || secondBatch ? 'transcription-not-original-collated' : 'stored-chart-not-recollated',
    ...(secondBatch ? { inputs: P1B_STAR_INPUTS[star as P1bStar], sourceFingerprint: P1B_INITIAL_SOURCE_SHA256 } : {}),
    ...(firstBatch ? { inputs: P1A_STAR_INPUTS[star as P1aStar], sourceFingerprint: P1A_INITIAL_SOURCE_SHA256 } : {}),
  };
  const unknown = (code: Unknown['code'], reason: string): Unknown => ({ status: 'unknown', star, code, reason, source });
  if (!Array.isArray(chart.palaces)) return unknown('missing-input', '缺少本命宮位資料');
  const stored: { p: Chart['palaces'][number]; placement: StarPlacement }[] = [];
  for (const p of chart.palaces) for (const placement of p.stars ?? []) {
    if (placement.name === star) stored.push({ p, placement });
  }
  // Even duplicate records in the same palace are not silently counted twice.
  if (stored.length > 1) return unknown('conflicting-data', `${star} 有重複安星紀錄，須先核對`);
  let branch: Branch;
  if (secondBatch) {
    const result = deriveP1bStar(chart, star as P1bStar, options);
    if (result.status === 'unknown') return unknown(result.code, result.reason);
    branch = result.branch;
    source.dependencies = result.dependencies; source.notes = result.notes;
    if (star === '天傷' && options.birthSex) source.inputValues = { birthSex: options.birthSex };
    if (stored[0] && stored[0].p.branch !== branch) return unknown('conflicting-data', `${star} 已存位置與P1b計算不一致`);
  } else if (firstBatch) {
    const result = deriveP1aStar(chart, star as P1aStar, (anchor) => lookupNatalStar(chart, anchor));
    if (result.status === 'unknown') return unknown(result.code, result.reason);
    branch = result.branch;
    source.dependencies = result.dependencies;
    if (stored[0] && stored[0].p.branch !== branch) return unknown('conflicting-data', `${star} 已存位置與P1a計算不一致`);
  } else if (helper) {
    // The helper is derived, so an unrecognised historic chart must be recast/migrated explicitly.
    if (chart.meta?.engineVersion !== '0.4.0') return unknown('unsupported-version', `${star} 未核此盤版本的 helper 安法：${source.engineVersion}`);
    const monthBased = star === '天刑' || star === '天姚';
    const l = chart.lunar;
    if (monthBased && (!l || !Number.isInteger(l.m) || l.m < 1 || l.m > 12 || !Number.isInteger(l.d) || l.d < 1 || l.d > 30 || typeof l.isLeapMonth !== 'boolean')) {
      return unknown('missing-input', `${star} 缺少有效農曆月、日或閏月資料`);
    }
    if (!monthBased && !BRANCHES.includes(chart.ganzhi?.year?.[1])) return unknown('missing-input', `${star} 缺少有效生年地支`);
    // peachStars computes all four, but only the requested star's required inputs matter.
    // Fill unused inputs on a separate view, never on the caller's chart.
    const view = { ...chart, lunar: monthBased ? chart.lunar : { ...chart.lunar, m: 1, d: 1, isLeapMonth: false },
      ganzhi: monthBased ? { ...chart.ganzhi, year: ['甲', '子'] as const } : chart.ganzhi } as Chart;
    branch = star === '天刑' ? tianxingBranch(view) : peachStars(view)[star as keyof ReturnType<typeof peachStars>];
    if (stored[0] && stored[0].p.branch !== branch) return unknown('conflicting-data', `${star} 已存位置與 helper 計算不一致`);
  } else {
    if (!stored[0]) return unknown('missing-placement', `${star} 應有安星但此盤缺少紀錄，不能當成沒有`);
    branch = stored[0].p.branch;
  }
  if (!BRANCHES.includes(branch)) return unknown('missing-placement', `${star} 地支無效`);
  const palaces = chart.palaces.filter((p) => p.branch === branch);
  if (palaces.length !== 1 || chart.palaces.filter((p) => p.name === palaces[0]!.name).length !== 1) return unknown('conflicting-data', `${star} 所在宮位不唯一或缺失`);
  return { status: 'available', star, branch, palace: palaces[0]!.name,
    placement: { ...(stored[0]?.placement ?? { name: star, kind: 'aux' as const }) }, source };
}

export function queryNatalStar(chart: Chart, star: string, scope: NatalStarScope, options: NatalQueryOptions = {}): NatalStarQuery {
  const located = lookupNatalStar(chart, star, options);
  if (located.status === 'unknown') return located;
  let branches: readonly Branch[];
  if ('branches' in scope) branches = [...new Set(scope.branches)];
  else {
    const matches = 'palace' in scope ? chart.palaces.filter((p) => p.name === scope.palace) : chart.palaces.filter((p) => p.branch === scope.branch);
    if (matches.length !== 1) return { status: 'unknown', star, code: 'invalid-scope', reason: '查詢宮位缺失或不唯一', source: located.source };
    const i = BRANCHES.indexOf(matches[0]!.branch);
    const offsets = scope.reach === 'sanfang' ? [0, 4, 6, 8] : scope.reach === 'jia' ? [11, 1] : [0];
    branches = offsets.map((offset) => BRANCHES[(i + offset) % 12]!);
  }
  if (branches.some((b) => !BRANCHES.includes(b) || chart.palaces.filter((p) => p.branch === b).length !== 1)) {
    return { status: 'unknown', star, code: 'invalid-scope', reason: '查詢範圍含缺失或重複的宮位', source: located.source };
  }
  return { ...located, status: branches.includes(located.branch) ? 'present' : 'absent', scope: branches };
}

/** Coverage is per requested star and per chart, never inferred from absence in palaces[].stars. */
export function natalStarCoverage(chart: Chart, stars?: readonly string[], options: NatalQueryOptions = {}): NatalStarLookup[] {
  const requested = stars ?? (options.catalogue === 'p1b' ? [...QUERYABLE_NATAL_STARS, ...P1A_STARS, ...P1B_STARS] : options.catalogue === 'p1a' ? [...QUERYABLE_NATAL_STARS, ...P1A_STARS] : QUERYABLE_NATAL_STARS);
  return [...new Set(requested)].map((star) => lookupNatalStar(chart, star, options));
}

/** Stored four-hua coverage; no recalculation using a different source table. */
export function natalSihuaCoverage(chart: Chart) {
  const counts = new Map<string, number>();
  const rows: { star: string; hua: Sihua; branch: Branch; palace: PalaceName }[] = [];
  for (const p of chart.palaces ?? []) for (const s of p.stars) {
    counts.set(s.name, (counts.get(s.name) ?? 0) + 1);
    if (s.sihua) rows.push({ star: s.name, hua: s.sihua, branch: p.branch, palace: p.name });
  }
  const complete = ['祿', '權', '科', '忌'].every((hua) => rows.filter((s) => s.hua === hua).length === 1)
    && rows.length === 4 && new Set(rows.map((s) => s.star)).size === 4
    && rows.every((s) => counts.get(s.star) === 1 && STORED_NATAL_STARS.includes(s.star)
      && BRANCHES.includes(s.branch) && chart.palaces.filter((p) => p.branch === s.branch).length === 1);
  return { status: complete ? 'available' as const : 'unknown' as const,
    ...SIHUA_META, storage: 'stored-native-values' as const, rows };
}

/** Availability and source verification are separate axes. These describe stored values, not book predicates. */
export function natalTableCoverage(chart: Chart) {
  const majors = MAJOR_STARS.map((star) => lookupNatalStar(chart, star));
  const missingBrightness = majors.flatMap((r) => r.status !== 'available' || !r.placement.brightness ? [r.star] : []);
  return {
    queryVersion: STAR_QUERY_VERSION,
    engineVersion: chart.meta?.engineVersion ?? 'unknown',
    schoolProfile: chart.meta?.schoolProfile ?? 'unknown',
    brightness: { status: missingBrightness.length ? 'unknown' as const : 'available' as const,
      missing: missingBrightness, ...BRIGHTNESS_META,
      // The engine's seven-level table is not a collation of the Deep book's six-level table.
      originalBookTable: 'not-collated' as const },
    sihua: natalSihuaCoverage(chart),
    dayNight: { status: 'not-implemented' as const, reason: '原書所用日夜判準尚未實作，不由鐘面時間代填' },
  };
}
