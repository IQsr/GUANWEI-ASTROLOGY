import { BRANCHES, STEMS, type Branch, type Result, type ShichenIndex, type Stem } from '../types';

const idx = (n: number) => ((n % 12) + 12) % 12;

export const LUCKY_SIX = ['左輔', '右弼', '文昌', '文曲', '天魁', '天鉞'] as const;
export const SHA_SIX = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'] as const;
export const OTHER_AUX = ['祿存', '天馬'] as const;

export type AuxStarName =
  | (typeof LUCKY_SIX)[number]
  | (typeof SHA_SIX)[number]
  | (typeof OTHER_AUX)[number];

export const AUX_STARS: readonly AuxStarName[] = [...LUCKY_SIX, ...SHA_SIX, ...OTHER_AUX];

/**
 * 祿存：由年干定。
 *
 *   甲祿在寅，乙祿在卯，丙戊祿在巳，丁己祿在午，
 *   庚祿在申，辛祿在酉，壬祿在亥，癸祿在子。
 *
 * 留意：祿存永遠唔會落四墓宮（辰戌丑未）—— 呢個係上面八個位置
 * 本身嘅性質，唔係我哋加嘅限制（不變量 08）。
 */
const LUCUN_BY_STEM: Record<Stem, number> = {
  甲: 2, // 寅
  乙: 3, // 卯
  丙: 5, // 巳
  丁: 6, // 午
  戊: 5, // 巳
  己: 6, // 午
  庚: 8, // 申
  辛: 9, // 酉
  壬: 11, // 亥
  癸: 0, // 子
};

/**
 * 天魁天鉞：由年干定。
 *
 *   甲戊庚牛羊，乙己鼠猴鄉，丙丁豬雞位，
 *   壬癸兔蛇藏，六辛逢馬虎。
 */
const KUIYUE_BY_STEM: Record<Stem, [number, number]> = {
  甲: [1, 7], // 丑 未
  戊: [1, 7],
  庚: [1, 7],
  乙: [0, 8], // 子 申
  己: [0, 8],
  丙: [11, 9], // 亥 酉
  丁: [11, 9],
  壬: [3, 5], // 卯 巳
  癸: [3, 5],
  辛: [6, 2], // 午 寅
};

/**
 * 火星、鈴星：由年支三合局定起宮，再順數至生時。
 *
 *   申子辰人寅戌揚，寅午戌人丑卯方，
 *   巳酉丑人卯戌位，亥卯未人酉戌房。
 */
const HUOLING_START: Array<{ group: number[]; huo: number; ling: number }> = [
  { group: [8, 0, 4], huo: 2, ling: 10 }, // 申子辰：火寅 鈴戌
  { group: [2, 6, 10], huo: 1, ling: 3 }, // 寅午戌：火丑 鈴卯
  { group: [5, 9, 1], huo: 3, ling: 10 }, // 巳酉丑：火卯 鈴戌
  { group: [11, 3, 7], huo: 9, ling: 10 }, // 亥卯未：火酉 鈴戌
];

/** 天馬：年支三合局嘅驛馬位。寅午戌馬在申，申子辰馬在寅，巳酉丑馬在亥，亥卯未馬在巳。 */
const TIANMA_BY_GROUP: Array<{ group: number[]; ma: number }> = [
  { group: [2, 6, 10], ma: 8 }, // 寅午戌 → 申
  { group: [8, 0, 4], ma: 2 }, // 申子辰 → 寅
  { group: [5, 9, 1], ma: 11 }, // 巳酉丑 → 亥
  { group: [11, 3, 7], ma: 5 }, // 亥卯未 → 巳
];

export type AuxStarPlacement = { name: AuxStarName; branch: Branch; branchIndex: number };

export function lucunBranchIndex(yearStem: Stem): number {
  return LUCUN_BY_STEM[yearStem];
}

/** 擎羊在祿存前一宮，陀羅在祿存後一宮 —— 兩粒永遠夾住祿存（不變量 07）。 */
export function qingyangBranchIndex(yearStem: Stem): number {
  return idx(lucunBranchIndex(yearStem) + 1);
}
export function tuoluoBranchIndex(yearStem: Stem): number {
  return idx(lucunBranchIndex(yearStem) - 1);
}

export function placeAuxStars(args: {
  yearStem: Stem;
  yearBranch: Branch;
  /** 已經處理咗閏月嘅生月（同安命宮用同一個）。 */
  lunarMonth: number;
  shichen: ShichenIndex;
}): Result<AuxStarPlacement[]> {
  const ys = args.yearStem;
  const yb = BRANCHES.indexOf(args.yearBranch);
  if (yb < 0 || !(ys in LUCUN_BY_STEM)) {
    return { ok: false, code: 'NOT_IMPLEMENTED', message: `認唔到年干支 ${ys}${args.yearBranch}。` };
  }
  const m = args.lunarMonth;
  const s = args.shichen;

  const huoling = HUOLING_START.find((g) => g.group.includes(yb));
  const tianma = TIANMA_BY_GROUP.find((g) => g.group.includes(yb));
  if (!huoling || !tianma) {
    return { ok: false, code: 'NOT_IMPLEMENTED', message: `年支 ${args.yearBranch} 冇對應三合局。` };
  }
  const [kui, yue] = KUIYUE_BY_STEM[ys];

  const at: Array<[AuxStarName, number]> = [
    // 六吉
    ['左輔', idx(4 + (m - 1))], //  辰宮起正月，順數至生月
    ['右弼', idx(10 - (m - 1))], // 戌宮起正月，逆數至生月
    ['文昌', idx(10 - s)], //        戌宮起子時，逆數至生時
    ['文曲', idx(4 + s)], //         辰宮起子時，順數至生時
    ['天魁', kui],
    ['天鉞', yue],
    // 六煞
    ['擎羊', qingyangBranchIndex(ys)],
    ['陀羅', tuoluoBranchIndex(ys)],
    ['火星', idx(huoling.huo + s)],
    ['鈴星', idx(huoling.ling + s)],
    ['地空', idx(11 - s)], //        亥宮起子時，逆數至生時
    ['地劫', idx(11 + s)], //        亥宮起子時，順數至生時
    // 其他
    ['祿存', lucunBranchIndex(ys)],
    ['天馬', tianma.ma],
  ];

  return {
    ok: true,
    value: at.map(([name, i]) => ({ name, branch: BRANCHES[i]!, branchIndex: i })),
  };
}

/** 四墓宮（辰戌丑未）。祿存永遠唔會落呢四個。 */
export const TOMB_BRANCHES: readonly Branch[] = ['辰', '戌', '丑', '未'];
