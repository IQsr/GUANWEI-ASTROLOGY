import { BRANCHES, type Branch, type Result, type ShichenIndex, type Stem } from '../types';
import { STEMS } from '../types';
import { termBefore, TERM_COUNT, termAt } from '../calendar/solar-term';
import { termName } from '../calendar/tables';
import { pillarFromIndex, type Pillar } from './sexagenary';
import { ziHourStemIndex, yinPalaceStemIndex } from './wuhudun';

export type FourPillars = {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
};

/**
 * 十二節（唔係中氣）劃分月支。
 * 節氣一年二十四個，一節一氣相間；月柱以「節」為界，唔係以農曆月為界。
 */
const JIE_TO_BRANCH: Record<string, number> = {
  立春: 2, // 寅
  驚蟄: 3, // 卯
  清明: 4, // 辰
  立夏: 5, // 巳
  芒種: 6, // 午
  小暑: 7, // 未
  立秋: 8, // 申
  白露: 9, // 酉
  寒露: 10, // 戌
  立冬: 11, // 亥
  大雪: 0, // 子
  小寒: 1, // 丑
};

/** 甲子年基準：1984 = 甲子。 */
const JIAZI_YEAR = 1864;

export function yearPillarIndexFromLunarYear(lunarYear: number): number {
  return (((lunarYear - JIAZI_YEAR) % 60) + 60) % 60;
}

/** 由 UTC 時刻搵返「立春年」—— 只有 yearBoundary: 'lichun' 先用得著。 */
export function lichunYear(utcMinutes: number): number | null {
  let idx = termBefore(utcMinutes)?.index ?? null;
  if (idx === null) return null;
  while (idx >= 0 && termName(idx) !== '立春') idx -= 1;
  if (idx < 0) return null;
  const t = termAt(idx);
  if (!t) return null;
  // 立春 所屬嘅公曆年：由該節氣嘅 UTC 時刻推
  const d = new Date(Date.UTC(1900, 0, 1) + t.utcMinutes * 60000);
  return d.getUTCFullYear();
}

export type FourPillarsInput = {
  /** 已經過真太陽時同早／晚子時調整嘅日序。 */
  dayIndex: number;
  shichen: ShichenIndex;
  /** 真實出生瞬間（UTC 分鐘）。節氣係物理時刻，唔受真太陽時表示法影響。 */
  utcMinutes: number;
  /** 由 dayIndex 查返嘅農曆年。 */
  lunarYear: number;
  yearBoundary: 'lunar-new-year' | 'lichun';
};

/** 日柱錨點：1900-01-01 日序 0 對應六十甲子序 10。 */
const DAY_PILLAR_OFFSET = 10;

export function fourPillars(input: FourPillarsInput): Result<FourPillars> {
  // ── 年柱 ──
  let yearIndex: number;
  if (input.yearBoundary === 'lichun') {
    const ly = lichunYear(input.utcMinutes);
    if (ly === null) {
      return { ok: false, code: 'OUT_OF_RANGE', message: '搵唔到對應嘅立春。' };
    }
    yearIndex = yearPillarIndexFromLunarYear(ly);
  } else {
    yearIndex = yearPillarIndexFromLunarYear(input.lunarYear);
  }
  const year = pillarFromIndex(yearIndex);

  // ── 月柱：月支由節定，月干由五虎遁 ──
  let ti = termBefore(input.utcMinutes)?.index ?? null;
  if (ti === null || ti >= TERM_COUNT) {
    return { ok: false, code: 'OUT_OF_RANGE', message: '出生時刻喺節氣表範圍之外。' };
  }
  while (ti >= 0 && JIE_TO_BRANCH[termName(ti)] === undefined) ti -= 1;
  if (ti < 0) {
    return { ok: false, code: 'OUT_OF_RANGE', message: '搵唔到對應嘅節。' };
  }
  const monthBranchIndex = JIE_TO_BRANCH[termName(ti)]!;

  // 月干用「立春年」嘅年干起五虎遁，唔係用年柱嘅年干。
  //
  // 呢兩者喺正月初一同立春之間會唔同（R-001 揀咗正月初一做年界），
  // 但月柱本身係節氣曆嘅嘢 —— 佢由立春起算，所以五虎遁一定要用立春年。
  // 混用會令 1984-02-02 呢類日期嘅月柱錯成 丁丑（正解 乙丑）。
  const solarYear = lichunYear(input.utcMinutes);
  if (solarYear === null) {
    return { ok: false, code: 'OUT_OF_RANGE', message: '搵唔到對應嘅立春。' };
  }
  const solarYearStem = pillarFromIndex(yearPillarIndexFromLunarYear(solarYear)).stem;
  const yinStem = yinPalaceStemIndex(solarYearStem);
  // 寅 = 2，由寅月起順排
  const monthOffset = (monthBranchIndex - 2 + 12) % 12;
  const month: Pillar = {
    stem: STEMS[(yinStem + monthOffset) % 10]!,
    branch: BRANCHES[monthBranchIndex]! as Branch,
  };

  // ── 日柱：連續六十甲子 ──
  const day = pillarFromIndex(input.dayIndex + DAY_PILLAR_OFFSET);

  // ── 時柱：五鼠遁 ──
  const ziStem = ziHourStemIndex(day.stem as Stem);
  const hour: Pillar = {
    stem: STEMS[(ziStem + input.shichen) % 10]!,
    branch: BRANCHES[input.shichen]!,
  };

  return { ok: true, value: { year, month, day, hour } };
}
