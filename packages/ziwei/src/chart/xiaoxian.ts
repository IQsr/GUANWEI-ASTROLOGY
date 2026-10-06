/**
 * 小限（2026-10-06）
 *
 * 出處：《紫微斗數全書》卷二〈安小限訣〉（維基文庫本，公有領域）——
 *
 *   「不論陰陽男俱順數，不論陰陽女俱逆數。
 *    寅午戌人起辰宮，申子辰人自戌宮，巳酉丑人起未宮，亥卯未人起丑宮。」
 *
 * 即係：按生年地支嘅三合局，虛歲一歲喺辰、戌、未、丑其中一宮；
 * 之後每年一宮，男順女逆（同大限唔同：唔睇陰陽，淨睇男女）。
 *
 * 中州派有用小限（《深造講義》p.323：「另一套〔流曜〕則為專斷小限之用」——博士十二神、將前、歲前），
 * 但書入面小限嘅例子多數講六親孝服、傷病（p.315、558、581、589），係內容禁區；
 * 所以引擎排出嚟，內容層暫時唔用。
 *
 * 對照 iztro（conformance-iztro-xiaoxian.test.ts）。
 *
 * ⚠ 呢度唔判吉凶，只答「喺邊個宮」。
 */
import { BRANCHES, STEMS, type Branch, type Chart } from '../types';

const at = (i: number) => BRANCHES[((i % 12) + 12) % 12]!;

/** 生年地支 → 一歲小限所在（寅午戌辰、申子辰戌、巳酉丑未、亥卯未丑）。 */
const START: Record<Branch, Branch> = {
  寅: '辰', 午: '辰', 戌: '辰',
  申: '戌', 子: '戌', 辰: '戌',
  巳: '未', 酉: '未', 丑: '未',
  亥: '丑', 卯: '丑', 未: '丑',
};

/**
 * 盤主男定女。`Chart` 冇直接存性別，但大限順逆係「陽男陰女順、陰男陽女逆」——
 * 由第一、二步大限嘅方向同生年天干陰陽，倒推得返。
 */
export function sexOf(chart: Chart): 'male' | 'female' {
  const [a, b] = chart.decadals;
  if (!a || !b) throw new Error('盤冇大限，推唔到男女');
  const forward = (BRANCHES.indexOf(b.branch) - BRANCHES.indexOf(a.branch) + 12) % 12 === 1;
  const yang = STEMS.indexOf(chart.ganzhi.year[0]) % 2 === 0;
  return forward === yang ? 'male' : 'female';
}

/** 某個虛歲嘅小限所在地支。 */
export function xiaoxian(chart: Chart, nominalAge: number): Branch {
  if (!Number.isInteger(nominalAge) || nominalAge < 1) throw new RangeError(`小限要由虛歲一歲起，收到 ${nominalAge}`);
  const start = BRANCHES.indexOf(START[chart.ganzhi.year[1]]);
  const step = sexOf(chart) === 'male' ? 1 : -1;
  return at(start + step * (nominalAge - 1));
}
