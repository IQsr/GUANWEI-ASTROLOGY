import type { RuleOptions } from './types';

/**
 * 預設流派選項。
 *
 * 呢三個值唔係隨便揀 —— 每一個都係一個流派分歧點，
 * 完整理由同出處記喺 docs/rules.md（工單 B3）。
 * 改呢度嘅任何一個值，就係改變所有新排嘅盤：
 * 記得 bump engineVersion。
 */
export const DEFAULT_RULES: RuleOptions = {
  // 香港同英國經度差好遠，唔校正係系統性錯誤，唔係偶然錯。
  trueSolarTime: true,
  // 斗數傳統以農曆正月初一換年干支（八字先用立春）。
  yearBoundary: 'lunar-new-year',
  // 23:00 之後算翌日早子時。影響日干支同時辰宮位，約 4% 用戶。
  lateZiHour: 'next-day',
  // 庚干四化各家不一。中州派（王亭之）傳授為「陽武府同」：
  // 太陽化祿、武曲化權、天府化科、天同化忌。詳見 docs/rules.md R-003。
  sihuaSet: 'zhongzhou',
};

export function resolveRules(overrides?: Partial<RuleOptions>): RuleOptions {
  return { ...DEFAULT_RULES, ...overrides };
}
