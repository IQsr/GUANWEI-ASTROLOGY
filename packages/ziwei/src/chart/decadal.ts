import { BRANCHES, STEMS, type Branch, type Decadal, type Stem, type WuxingJu } from '../types';

/**
 * 大限。
 *
 *   由命宮起，每宮十年；
 *   起運歲數 = 五行局數（水二局 2–11 歲，火六局 6–15 歲）；
 *   陽男、陰女順行；陰男、陽女逆行。
 *
 * 「陽」「陰」睇生年天干：甲丙戊庚壬為陽，乙丁己辛癸為陰。
 */
export function isYangStem(stem: Stem): boolean {
  return STEMS.indexOf(stem) % 2 === 0;
}

export function decadalForward(yearStem: Stem, sex: 'male' | 'female'): boolean {
  const yang = isYangStem(yearStem);
  return (yang && sex === 'male') || (!yang && sex === 'female');
}

export function buildDecadals(args: {
  mingGong: Branch;
  wuxingJu: WuxingJu;
  yearStem: Stem;
  sex: 'male' | 'female';
}): Decadal[] {
  const start = BRANCHES.indexOf(args.mingGong);
  const forward = decadalForward(args.yearStem, args.sex);
  const out: Decadal[] = [];
  for (let k = 0; k < 12; k++) {
    const i = (((start + (forward ? k : -k)) % 12) + 12) % 12;
    const from = args.wuxingJu.n + k * 10;
    out.push({
      index: k + 1,
      branch: BRANCHES[i]!,
      fromAge: from,
      toAge: from + 9,
    });
  }
  return out;
}
