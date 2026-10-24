import { BRANCHES, type Branch, type Chart } from '../types';
import type { NatalStarLookup } from './star-query';

export const P1A_STAR_VERSION = 'minor-p1a-v1';
export const P1A_STARS = ['天空', '天才', '華蓋', '龍池', '鳳閣', '三台', '八座', '恩光', '天貴', '台輔', '封誥'] as const;
export type P1aStar = typeof P1A_STARS[number];
/** Third-party Initial transcript, chapter 7; not original-book collation. */
export const P1A_INITIAL_SOURCE_SHA256 = '0f9f208e963cbb5e00c2264bae5aa4da9b482231f6c44e50df7c3abb81ff4a12';
const ids = (...n: number[]) => n.map((p) => `wtz.initial.07.p${String(p).padStart(4, '0')}`);
export const P1A_STAR_REFERENCES: Record<P1aStar, readonly string[]> = {
  天空: ids(117,118,119,120,121), 天才: ids(154,155), 華蓋: ids(147,148,149,150),
  龍池: ids(156,157,158), 鳳閣: ids(156,157,158),
  三台: ids(180,181,182), 八座: ids(180,181,182),
  恩光: ids(183,184,185), 天貴: ids(183,184,185),
  台輔: ids(159,160,161,162), 封誥: ids(159,160,161,162),
};
export const P1A_STAR_INPUTS: Record<P1aStar, readonly string[]> = {
  天空: ['ganzhi.year.branch'], 華蓋: ['ganzhi.year.branch'], 龍池: ['ganzhi.year.branch'], 鳳閣: ['ganzhi.year.branch'],
  天才: ['ganzhi.year.branch', 'native.命宮'], 三台: ['native.左輔', 'lunar.d'], 八座: ['native.右弼', 'lunar.d'],
  恩光: ['native.文昌', 'lunar.d'], 天貴: ['native.文曲', 'lunar.d'], 台輔: ['native.文曲'], 封誥: ['native.文曲'],
};
type Missing = { status: 'unknown'; code: 'missing-input' | 'conflicting-data' | 'unsupported-version' | 'missing-placement'; reason: string };
type Derived = { status: 'available'; branch: Branch; dependencies: { star: string; branch: Branch }[] };
const at = (i: number) => BRANCHES[((i % 12) + 12) % 12]!;

/** Derive one star from its actual inputs. Month/hour dependencies are already embodied in the native anchors. */
export function deriveP1aStar(chart: Chart, star: P1aStar, lookup: (star: string) => NatalStarLookup): Derived | Missing {
  if (chart.meta?.engineVersion !== '0.4.0') return { status: 'unknown', code: 'unsupported-version', reason: `${star} 尚未核此盤版本的安法` };
  const dependencies: Derived['dependencies'] = [];
  const yearBased = ['天空','天才','華蓋','龍池','鳳閣'].includes(star);
  let year = 0;
  if (yearBased) {
    year = BRANCHES.indexOf(chart.ganzhi?.year?.[1]);
    if (year < 0) return { status: 'unknown', code: 'missing-input', reason: `${star} 缺少有效生年地支` };
  }
  if (star === '天空') return { status: 'available', branch: at(year + 1), dependencies };
  if (star === '華蓋') return { status: 'available', branch: (['辰','丑','戌','未'] as const)[year % 4]!, dependencies };
  if (star === '龍池') return { status: 'available', branch: at(4 + year), dependencies };
  if (star === '鳳閣') return { status: 'available', branch: at(10 - year), dependencies };
  if (star === '天才') {
    const palaces = chart.palaces?.filter((p) => p.name === '命宮') ?? [];
    if (palaces.length !== 1 || !BRANCHES.includes(chart.mingGong)) return { status: 'unknown', code: 'missing-input', reason: '天才缺少唯一有效命宮' };
    if (palaces[0]!.branch !== chart.mingGong) return { status: 'unknown', code: 'conflicting-data', reason: '命宮標記與實坐宮位不一致' };
    return { status: 'available', branch: at(BRANCHES.indexOf(chart.mingGong) + year), dependencies: [{ star: '命宮', branch: chart.mingGong }] };
  }
  const anchorName = star === '三台' ? '左輔' : star === '八座' ? '右弼' : star === '恩光' ? '文昌' : '文曲';
  const anchor = lookup(anchorName);
  if (anchor.status === 'unknown') return { status: 'unknown', code: anchor.code === 'conflicting-data' ? 'conflicting-data' : 'missing-placement', reason: `${star} 所依的${anchorName}未能定位：${anchor.reason}` };
  dependencies.push({ star: anchorName, branch: anchor.branch });
  const i = BRANCHES.indexOf(anchor.branch);
  if (star === '台輔' || star === '封誥') return { status: 'available', branch: at(i + (star === '台輔' ? 2 : -2)), dependencies };
  const day = chart.lunar?.d;
  if (!Number.isInteger(day) || day < 1 || day > 30) return { status: 'unknown', code: 'missing-input', reason: `${star} 缺少有效農曆生日` };
  const offset = star === '三台' ? day - 1 : star === '八座' ? -(day - 1) : day - 2;
  return { status: 'available', branch: at(i + offset), dependencies };
}
