import {
  BRANCHES,
  PALACE_NAMES,
  STEMS,
  type Branch,
  type Palace,
  type PalaceName,
  type Result,
  type ShichenIndex,
  type Stem,
  type WuxingJu,
} from '../types';
import { yinPalaceStemIndex } from '../ganzhi/wuhudun';
import { JU_BY_ELEMENT, nayinOfPillar } from '../ganzhi/nayin';

/** 寅宮喺十二地支入面嘅位置。十二宮由寅起排，唔係由子起。 */
const YIN = 2;

/**
 * 安命宮。
 *
 *   寅宮起正月，順數至生月；
 *   由該宮起子時，逆數至生時。
 *
 * 用農曆月（閏月點算見下面 monthForPalace）。
 */
export function mingGongBranchIndex(lunarMonth: number, shichen: ShichenIndex): number {
  return (((YIN + (lunarMonth - 1) - shichen) % 12) + 12) % 12;
}

/**
 * 安身宮。同安命宮一樣起手，但由生月宮起子時**順**數至生時。
 *
 * 命身兩宮相差 2 × 時辰，所以永遠相差偶數格 ——
 * 身宮因此只可能落命、夫妻、財帛、遷移、官祿、福德六宮之一（不變量 05）。
 * 呢個唔係我哋加嘅限制，係算式本身推出嚟嘅結果。
 */
export function shenGongBranchIndex(lunarMonth: number, shichen: ShichenIndex): number {
  return (((YIN + (lunarMonth - 1) + shichen) % 12) + 12) % 12;
}

/**
 * 閏月點算：閏月上半月算本月，下半月算下個月。
 *
 * 呢個係三合派通行做法之一，但唔係唯一 —— 亦有流派一律當本月、
 * 或者一律當下月。記喺 docs/rules.md R-006。
 */
export function monthForPalace(lunarMonth: number, lunarDay: number, isLeap: boolean): number {
  if (!isLeap) return lunarMonth;
  return lunarDay <= 15 ? lunarMonth : lunarMonth + 1;
}

/** 十二宮嘅天干：五虎遁定寅宮，之後由寅順排。 */
export function palaceStemIndex(yearStem: Stem, branchIndex: number): number {
  const yin = yinPalaceStemIndex(yearStem);
  if (yin < 0) return -1;
  const offset = ((branchIndex - YIN) % 12 + 12) % 12;
  return (yin + offset) % 10;
}

/** 由命宮逆佈十二宮名。 */
export function palaceNameAt(mingBranchIndex: number, branchIndex: number): PalaceName {
  const i = (((mingBranchIndex - branchIndex) % 12) + 12) % 12;
  return PALACE_NAMES[i]!;
}

export type PalaceLayout = {
  mingGong: Branch;
  shenGong: Branch;
  wuxingJu: WuxingJu;
  /** 命宮干支嘅納音，五行局就係由佢嚟。 */
  mingGongNayin: { name: string; element: string };
  palaces: Palace[];
};

export function buildPalaces(args: {
  yearStem: Stem;
  lunarMonth: number;
  lunarDay: number;
  isLeapMonth: boolean;
  shichen: ShichenIndex;
}): Result<PalaceLayout> {
  const month = monthForPalace(args.lunarMonth, args.lunarDay, args.isLeapMonth);
  const mingIdx = mingGongBranchIndex(month, args.shichen);
  const shenIdx = shenGongBranchIndex(month, args.shichen);

  const mingStemIdx = palaceStemIndex(args.yearStem, mingIdx);
  if (mingStemIdx < 0) {
    return { ok: false, code: 'NOT_IMPLEMENTED', message: `認唔到年干 ${args.yearStem}。` };
  }
  const mingStem = STEMS[mingStemIdx]!;
  const mingBranch = BRANCHES[mingIdx]!;

  const nayin = nayinOfPillar({ stem: mingStem, branch: mingBranch });
  if (!nayin) {
    return {
      ok: false,
      code: 'NOT_IMPLEMENTED',
      message: `命宮干支 ${mingStem}${mingBranch} 唔係有效組合。`,
    };
  }
  const ju = JU_BY_ELEMENT[nayin.element];

  const palaces: Palace[] = [];
  for (let b = 0; b < 12; b++) {
    palaces.push({
      branch: BRANCHES[b]!,
      stem: STEMS[palaceStemIndex(args.yearStem, b)]!,
      name: palaceNameAt(mingIdx, b),
      isShen: b === shenIdx,
      stars: [],
    });
  }

  return {
    ok: true,
    value: {
      mingGong: mingBranch,
      shenGong: BRANCHES[shenIdx]!,
      wuxingJu: ju,
      mingGongNayin: nayin,
      palaces,
    },
  };
}
