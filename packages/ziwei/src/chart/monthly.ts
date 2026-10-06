/**
 * 流月（2026-10-06）
 *
 * 出處：《紫微斗數全書》卷二〈安斗君訣〉（維基文庫本，公有領域）——
 *
 *   「於流年太歲宮起正月，逆至本生月，又從本生月起子順數至本生時安斗君。」
 *   「斗君，正月初一日管事……若斗君正月初一日值在某宮過度……依月限斷之。」
 *
 * 斗君就係嗰個流年**正月**所在嘅宮；之後每月順行一宮（全書冇明寫，通行做法，iztro 一樣）。
 * 全書十二宮每宮都有一句「斗君過度」嘅月份讀法（例：財帛「斗君遇吉其月發財」）。
 *
 * ── 規則 ──
 *   生月：同安命宮一樣嘅閏月處理（R-006，`monthForPalace`）
 *   生時：時辰地支（子＝0）；早子、晚子都係子
 *   流月命宮：斗君 ＋（月 − 1），順行
 *   流月十二宮：由流月命宮逆佈，同本命、流年一樣（`palaceNameAt`）
 *
 * 對照 iztro（conformance-iztro-monthly.test.ts）。
 *
 * ── 唔喺呢層嘅嘢 ──
 *   流月天干、流月四化 —— 全書斗君只講「遇吉遇凶」，唔講流月四化；要用先做
 *   流日、流時 —— 未做
 *
 * ⚠ 呢度唔判吉凶，只答「喺邊個宮」。點讀係內容庫嘅事。
 */
import { BRANCHES, type Branch, type Chart, type PalaceName } from '../types';
import { monthForPalace, palaceNameAt } from './palaces';
import { pillarFromIndex } from '../ganzhi/sexagenary';
import { yearPillarIndexFromLunarYear } from '../ganzhi/four-pillars';

const at = (i: number) => BRANCHES[((i % 12) + 12) % 12]!;

/** 某個農曆年嘅斗君（流年正月所在宮）。 */
export function douJun(chart: Chart, lunarYear: number): Branch {
  const taisui = BRANCHES.indexOf(pillarFromIndex(yearPillarIndexFromLunarYear(lunarYear)).branch);
  const m = monthForPalace(chart.lunar.m, chart.lunar.d, chart.lunar.isLeapMonth);
  const hour = BRANCHES.indexOf(chart.ganzhi.hour[1]);
  return at(taisui - (m - 1) + hour);
}

export type MonthlyChart = {
  lunarYear: number;
  /** 農曆月，一至十二。閏月點計由 caller 決定（通常上半月當本月、下半月當下月）。 */
  month: number;
  douJun: Branch;
  /** 流月命宮 */
  mingGong: Branch;
  /** 流月十二宮：由子到亥，每個地支喺流月叫乜宮 */
  palaces: { branch: Branch; name: PalaceName }[];
};

/** 某年某月嘅流月盤（只有宮位，唔判吉凶）。 */
export function monthly(chart: Chart, lunarYear: number, month: number): MonthlyChart {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError(`流月要係一至十二月，收到 ${month}`);
  const dj = douJun(chart, lunarYear);
  const ming = BRANCHES.indexOf(dj) + (month - 1);
  return {
    lunarYear,
    month,
    douJun: dj,
    mingGong: at(ming),
    palaces: BRANCHES.map((b, i) => ({ branch: b, name: palaceNameAt(((ming % 12) + 12) % 12, i) })),
  };
}
