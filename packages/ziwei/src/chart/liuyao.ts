/**
 * 流曜同天刑（2026-10-04）
 *
 * 《深造講義》推運限嘅吉凶，差唔多每個例子都用「流羊、流陀」：大限干同流年干各自起一套
 * 祿存、擎羊、陀羅（p.235 起嘅例子：「受大運之流羊流陀照射」「流年擎羊同度」）。
 * 刑曜（天刑）亦常同化忌、煞曜並講（「若更見刑曜，則可能導致官非口舌」）。
 *
 * ── 規則 ──
 *   流祿存：由大限／流年天干定，表同本命祿存一樣（`lucunBranchIndex`）
 *   流羊：流祿存前一宮；流陀：流祿存後一宮（同本命一樣夾住祿存）
 *   天刑：酉宮起正月，順數至生月（生月用同安命宮一樣嘅閏月處理，R-006）
 *
 * 天刑對照文墨天機 21 張盤（conformance-wenmo）。
 *
 * ── 桃花諸曜（2026-10-06）──
 *   紅鸞：卯宮起子年，逆數至生年；天喜：紅鸞對宮
 *   天姚：丑宮起正月，順數至生月（同天刑一樣嘅閏月處理）
 *   咸池：生年三合 —— 申子辰酉、寅午戌卯、巳酉丑午、亥卯未子
 *   四粒都對照文墨天機 21 張盤（liuyao.test.ts）。
 *
 * ⚠ 呢度唔判吉凶，只答「喺邊個宮」。點讀係內容庫嘅事。
 * ⚠ 天刑同桃花諸曜唔落 `palaces[].stars`：加一粒星入盤，會牽動命盤圖、內容庫逐宮嘅星曜清單同對照測試。
 *   要用就由 `tianxingBranch()`、`peachStars()` 攞。
 */
import { BRANCHES, type Branch, type Chart, type Stem } from '../types';
import { lucunBranchIndex } from './aux-stars';
import { monthForPalace } from './palaces';

export type FlowStars = { 祿存: Branch; 擎羊: Branch; 陀羅: Branch };

const at = (i: number) => BRANCHES[((i % 12) + 12) % 12]!;

/** 某個天干起嘅一套流祿存、流羊、流陀。 */
export function flowStars(stem: Stem): FlowStars {
  const lu = lucunBranchIndex(stem);
  return { 祿存: at(lu), 擎羊: at(lu + 1), 陀羅: at(lu - 1) };
}

/** 本命天刑所在地支。 */
export function tianxingBranch(chart: Chart): Branch {
  const m = monthForPalace(chart.lunar.m, chart.lunar.d, chart.lunar.isLeapMonth);
  return at(9 + (m - 1));
}

export type PeachStars = { 紅鸞: Branch; 天喜: Branch; 天姚: Branch; 咸池: Branch };

/** 咸池：生年地支三合局 → 所在地支（申子辰酉、寅午戌卯、巳酉丑午、亥卯未子）。 */
const XIANCHI: Record<Branch, Branch> = {
  申: '酉', 子: '酉', 辰: '酉',
  寅: '卯', 午: '卯', 戌: '卯',
  巳: '午', 酉: '午', 丑: '午',
  亥: '子', 卯: '子', 未: '子',
};

/** 本命紅鸞、天喜、天姚、咸池所在地支。 */
export function peachStars(chart: Chart): PeachStars {
  const yb = chart.ganzhi.year[1];
  const y = BRANCHES.indexOf(yb);
  const m = monthForPalace(chart.lunar.m, chart.lunar.d, chart.lunar.isLeapMonth);
  return {
    紅鸞: at(3 - y),
    天喜: at(3 - y + 6),
    天姚: at(1 + (m - 1)),
    咸池: XIANCHI[yb],
  };
}
