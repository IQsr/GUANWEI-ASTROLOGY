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
 *   流魁、流鉞（2026-10-06）：由大限／流年天干查本命魁鉞嗰張表（「甲戊庚牛羊……」）
 *   流昌（2026-10-06）：流祿存順數三宮（甲巳、乙午、丙戊申、丁己酉、庚亥、辛子、壬寅、癸卯）
 *   流曲（2026-10-06）：甲酉、乙申、丙戊午、丁己巳、庚卯、辛寅、壬子、癸亥
 *   流馬（2026-10-06）：由流年地支／大限宮支查本命天馬嗰張表（寅午戌申、申子辰寅、巳酉丑亥、亥卯未巳）
 *   《深造講義》p.323：流魁鉞、流昌曲、流祿馬、流羊陀係「推斷大運或流年之十二宮」嗰套流曜；
 *   書冇寫安法，表跟通行做法，對照 iztro（liuyao.test.ts）。
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
import { kuiyueBranchIndex, lucunBranchIndex, tianmaBranchIndex } from './aux-stars';
import { monthForPalace } from './palaces';

export type FlowStars = {
  祿存: Branch;
  擎羊: Branch;
  陀羅: Branch;
  文昌: Branch;
  文曲: Branch;
  天魁: Branch;
  天鉞: Branch;
  天馬: Branch;
};

/** 流曲（流昌係流祿存順數三宮，唔使表） */
const LIUQU: Record<Stem, number> = { 甲: 9, 乙: 8, 丙: 6, 丁: 5, 戊: 6, 己: 5, 庚: 3, 辛: 2, 壬: 0, 癸: 11 };

const at = (i: number) => BRANCHES[((i % 12) + 12) % 12]!;

/**
 * 一套流曜：流祿存、流羊、流陀、流昌、流曲、流魁、流鉞由干定；流馬由支定。
 * 流年用太歲干支；大限用大限宮干同宮支。
 */
export function flowStars(stem: Stem, branch: Branch): FlowStars {
  const lu = lucunBranchIndex(stem);
  const [kui, yue] = kuiyueBranchIndex(stem);
  return {
    祿存: at(lu),
    擎羊: at(lu + 1),
    陀羅: at(lu - 1),
    文昌: at(lu + 3),
    文曲: at(LIUQU[stem]),
    天魁: at(kui),
    天鉞: at(yue),
    天馬: at(tianmaBranchIndex(branch)),
  };
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
