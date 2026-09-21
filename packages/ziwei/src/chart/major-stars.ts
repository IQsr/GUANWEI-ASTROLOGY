import { BRANCHES, type Branch, type Result, type WuxingJu } from '../types';

/** 寅宮位置。安紫微由寅起算。 */
const YIN = 2;

export const ZIWEI_SERIES = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞'] as const;
export const TIANFU_SERIES = [
  '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
] as const;

export type MajorStarName = (typeof ZIWEI_SERIES)[number] | (typeof TIANFU_SERIES)[number];

export const MAJOR_STARS: readonly MajorStarName[] = [...ZIWEI_SERIES, ...TIANFU_SERIES];

/**
 * 紫微系六星，相對紫微嘅位移（逆行）。
 *
 *   紫微天機逆行旁，隔一陽武天同當，
 *   又隔二位廉貞位，空三復見紫微郎。
 */
const ZIWEI_OFFSETS: Record<(typeof ZIWEI_SERIES)[number], number> = {
  紫微: 0,
  天機: -1,
  太陽: -3,
  武曲: -4,
  天同: -5,
  廉貞: -8,
};

/**
 * 天府系八星，相對天府嘅位移（順行）。
 *
 *   天府太陰與貪狼，巨門天相及天梁，
 *   七殺空三是破軍，空二便是天府鄉。
 */
const TIANFU_OFFSETS: Record<(typeof TIANFU_SERIES)[number], number> = {
  天府: 0,
  太陰: 1,
  貪狼: 2,
  巨門: 3,
  天相: 4,
  天梁: 5,
  七殺: 6,
  破軍: 10,
};

/**
 * 定紫微星 —— 整個斗數層嘅樞紐。紫微一錯，十四主星全部錯位。
 *
 * 例：金四局、農曆廿三日生
 *   1. 局數 n = 4，生日 d = 23
 *   2. 倍數 q = 最小嘅整數使 n × q ≥ d → 4 × 6 = 24 ≥ 23，q = 6
 *   3. 差數 x = n × q − d = 1
 *   4. x 係奇數 → q − x = 5；（x 係偶數 → q + x）
 *   5. 由寅宮起算為 1，順時針數到 5：寅 卯 辰 巳 **午**
 *
 * 回傳嘅係「由寅起數第幾格」（1 起），方便天府用同一個數逆數。
 */
export function ziweiStepFromYin(ju: WuxingJu, lunarDay: number): number {
  const n = ju.n;
  const q = Math.ceil(lunarDay / n);
  const x = n * q - lunarDay;
  return x % 2 === 1 ? q - x : q + x;
}

export function ziweiBranchIndex(ju: WuxingJu, lunarDay: number): number {
  const step = ziweiStepFromYin(ju, lunarDay);
  return (((YIN + step - 1) % 12) + 12) % 12;
}

/** 天府：由寅宮用同一個數**逆**數。 */
export function tianfuBranchIndex(ju: WuxingJu, lunarDay: number): number {
  const step = ziweiStepFromYin(ju, lunarDay);
  return (((YIN - (step - 1)) % 12) + 12) % 12;
}

/**
 * 紫微同天府必定關於寅—申軸對稱。
 *
 * 呢個唔係巧合，係兩者由同一個 step 一順一逆數出嚟嘅必然結果。
 * 亦都因為咁，佢係最抵用嘅測試（不變量 03）：任何生辰任何局數都成立，
 * 而且唔使識睇盤都驗得到。
 */
export function mirrorAboutYinShen(branchIndex: number): number {
  return (((2 * YIN - branchIndex) % 12) + 12) % 12;
}

export type MajorStarPlacement = {
  name: MajorStarName;
  branch: Branch;
  branchIndex: number;
};

export function placeMajorStars(ju: WuxingJu, lunarDay: number): Result<MajorStarPlacement[]> {
  if (!Number.isInteger(lunarDay) || lunarDay < 1 || lunarDay > 30) {
    return { ok: false, code: 'OUT_OF_RANGE', message: `農曆日 ${lunarDay} 唔合法。` };
  }

  const zi = ziweiBranchIndex(ju, lunarDay);
  const fu = tianfuBranchIndex(ju, lunarDay);

  const out: MajorStarPlacement[] = [];
  for (const name of ZIWEI_SERIES) {
    const i = (((zi + ZIWEI_OFFSETS[name]) % 12) + 12) % 12;
    out.push({ name, branch: BRANCHES[i]!, branchIndex: i });
  }
  for (const name of TIANFU_SERIES) {
    const i = (((fu + TIANFU_OFFSETS[name]) % 12) + 12) % 12;
    out.push({ name, branch: BRANCHES[i]!, branchIndex: i });
  }
  return { ok: true, value: out };
}
