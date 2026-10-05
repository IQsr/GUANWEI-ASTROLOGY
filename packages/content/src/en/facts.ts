import { BRANCH_EN, ELEMENT_EN, HOUR_RANGE, MONTH_EN, PALACE_EN, STEM_EN, cnNum, listEn, numWord, ordinal, ordinalWord, placeEn, star } from './terms';

/* ───────────────────────────────────────────────────────────
 * 英文版：宮位章以外嘅程式句（2026-10-05 起）
 *
 * 序、身宮與五行局、時間章入面有好多句係程式填數字、干支、日子砌出嚟
 * （free.ts、timeline 嗰邊）。呢度逐款對返中文嘅寫法，譯唔到就回 null，
 * 交返 render.ts 繼續試翻譯表。
 * ─────────────────────────────────────────────────────────── */

const ganzhi = (g: string, b: string) => (STEM_EN[g] && BRANCH_EN[b] ? `${STEM_EN[g]} ${BRANCH_EN[b]}` : null);

/*
 * 虛歲（詞彙表第一節，2026-10-05 定）：英文讀者唔識虛歲，直寫會以為係實歲。
 * 寫實歲，括號註虛歲。一個時間點：虛歲 N ＝ 實歲 N−2 或 N−1（睇生日過咗未）；
 * 一段範圍就寫「roughly」。
 */
export const agePoint = (n: number) => (n >= 3 ? `${n - 2} or ${n - 1}` : `${Math.max(0, n - 1)}`);
export const ageStart = (n: number) => `around age ${Math.max(0, n - 1)} (${n} by Chinese reckoning)`;
export const ageRange = (a: number, b: number) => `roughly ages ${Math.max(0, a - 1)} to ${b - 1}; ${a}–${b} by Chinese reckoning`;

/** 「福德宮」「財帛」→ Wellbeing Palace */
export const palaceEn = (zh: string) => PALACE_EN[zh.replace(/宮$/, '')] ?? PALACE_EN[zh] ?? null;

function starsEn(zh: string, missing: string[]): string {
  return listEn(
    zh.split('、').map((x) => {
      const en = star(x);
      if (!en) missing.push(x);
      return en ?? `〔${x}〕`;
    }),
  );
}

/** 「，坐天相」「，宮內沒有主星」「，宮內沒有主星，借對宮的天機、巨門來看」→ 英文尾巴 */
function seatEn(rest: string, missing: string[]): string | null {
  if (rest === '') return '';
  let m = /^，坐(.+)$/.exec(rest);
  if (m) return `, shaped by ${starsEn(m[1]!, missing)}`;
  if (rest === '，宮內沒有主星') return ', which holds no major star';
  m = /^，宮內沒有主星，借對宮的(.+)來看$/.exec(rest);
  if (m) return `, which holds no major star, so it is read through ${starsEn(m[1]!, missing)} in the opposite palace`;
  return null;
}

export function factTemplate(s: string, missing: string[]): string | null {
  /* 序 · 生辰：國曆一九九九年十二月二十二日，戌時，生於香港。 */
  let m = /^國曆(\S+?)年(\S+?)月(\S+?)日，(\S)時，生於(.+)。$/.exec(s);
  if (m) {
    const [y, mo, d] = [cnNum(m[1]!), cnNum(m[2]!), cnNum(m[3]!)];
    const place = placeEn(m[5]!);
    if (!place) missing.push(m[5]!);
    if (!y || !mo || !d || !BRANCH_EN[m[4]!]) return null;
    return `Born ${d} ${MONTH_EN[mo]} ${y}, in the ${BRANCH_EN[m[4]!]} hour (${HOUR_RANGE[m[4]!]}), in ${place ?? `〔${m[5]}〕`}.`;
  }

  /* 序 · 農曆：農曆己丑年正月廿六。／農曆壬申年閏六月初四。 */
  m = /^農曆(\S)(\S)年(閏)?(正|\S{1,2}?)月(\S{2})。$/.exec(s);
  if (m) {
    const gz = ganzhi(m[1]!, m[2]!);
    const mo = m[4] === '正' ? 1 : cnNum(m[4]!);
    const d = cnNum(m[5]!);
    if (!gz || !mo || !d) return null;
    return `By the lunar calendar: the ${ordinal(d)} day of the ${m[3] ? 'leap ' : ''}${ordinal(mo)} month, in the ${gz} year.`;
  }

  /* 序 · 盤面：五行局是水二局。 */
  m = /^五行局是(\S)(\S)局。$/.exec(s);
  if (m && ELEMENT_EN[m[1]!] && cnNum(m[2]!)) {
    return `Your Five-Element Bureau is the ${ELEMENT_EN[m[1]!]} ${cap1(numWord(cnNum(m[2]!)!))} Bureau.`;
  }

  /* 序 · 盤面：命宮在子，身宮在午。 */
  m = /^命宮在(\S)，身宮在(\S)。$/.exec(s);
  if (m && BRANCH_EN[m[1]!] && BRANCH_EN[m[2]!]) {
    return m[1] === m[2]
      ? `Your ${PALACE_EN.命宮} and Body Palace both sit in ${BRANCH_EN[m[1]!]}.`
      : `Your ${PALACE_EN.命宮} sits in ${BRANCH_EN[m[1]!]}, and your Body Palace in ${BRANCH_EN[m[2]!]}.`;
  }

  /* 身宮與五行局 · 你是水二局。 */
  m = /^你是(\S)(\S)局。$/.exec(s);
  if (m && ELEMENT_EN[m[1]!] && cnNum(m[2]!)) {
    return `You belong to the ${ELEMENT_EN[m[1]!]} ${cap1(numWord(cnNum(m[2]!)!))} Bureau.`;
  }

  /* 大限由虛歲二歲起，每十年一步。 */
  m = /^大限由虛歲(\S+?)歲起，每十年一步。$/.exec(s);
  if (m && cnNum(m[1]!)) return `Your ten-year stages begin at ${ageStart(cnNum(m[1]!)!)}, and move on every ten years.`;

  /* 寫這本書時（二〇二六年），你虛歲四十八，正行第五個大限（四十六至五十五歲），落在財帛宮，坐天機。 */
  m = /^寫這本書時（(\S+?)年），你虛歲(\S+?)，正行第(\S+?)個大限（(\S+?)至(\S+?)歲），落在(\S+?宮)(，.+)?。$/.exec(s);
  if (m) {
    const [y, age, k, a, b] = [m[1], m[2], m[3], m[4], m[5]].map((x) => cnNum(x!));
    const pal = palaceEn(m[6]!);
    const seat = seatEn(m[7] ?? '', missing);
    if (!y || !age || !k || !a || !b || !pal || seat === null) return null;
    return `When this book was written (${y}), you were ${agePoint(age)} (${age} by Chinese reckoning), in your ${ordinalWord(k)} ten-year stage (${ageRange(a, b)}). It falls in your ${pal}${seat}.`;
  }

  /* 寫這本書時（⋯年），你虛歲十，第一個大限從虛歲十二歲開始，落在兄弟宮，坐太陽。 */
  m = /^寫這本書時（(\S+?)年），你虛歲(\S+?)，第一個大限從虛歲(\S+?)歲開始，落在(\S+?宮)(，.+)?。$/.exec(s);
  if (m) {
    const [y, age, a] = [m[1], m[2], m[3]].map((x) => cnNum(x!));
    const pal = palaceEn(m[4]!);
    const seat = seatEn(m[5] ?? '', missing);
    if (!y || !age || !a || !pal || seat === null) return null;
    return `When this book was written (${y}), you were ${agePoint(age)} (${age} by Chinese reckoning). Your first ten-year stage begins at ${ageStart(a)}, in your ${pal}${seat}.`;
  }

  /* 下一個大限從虛歲八十二歲開始，轉到財帛宮。 */
  m = /^下一個大限從虛歲(\S+?)歲開始，轉到(\S+?宮)。$/.exec(s);
  if (m && cnNum(m[1]!) && palaceEn(m[2]!)) {
    return `The next one begins at ${ageStart(cnNum(m[1]!)!)} and moves to your ${palaceEn(m[2]!)}.`;
  }

  /* 你的身宮落在福德宮，坐天相。／你的身宮和命宮在同一宮，坐巨門。 */
  m = /^你的身宮落在(\S+?宮)(，.+)?。$/.exec(s);
  if (m && palaceEn(m[1]!)) {
    const seat = seatEn(m[2] ?? '', missing);
    if (seat !== null) return `Your Body Palace falls in your ${palaceEn(m[1]!)}${seat}.`;
  }
  m = /^你的身宮和命宮在同一宮(，.+)?。$/.exec(s);
  if (m) {
    const seat = seatEn(m[1] ?? '', missing);
    if (seat !== null) return `Your Body Palace sits in the same palace as your Life Palace${seat}.`;
  }

  /* 身宮組合：你命宮坐貪狼，身宮又見七殺、破軍，再會煞星：⋯。 */
  m = /^你命宮坐貪狼，身宮又見(.+?)，再會煞星：你的欲望和衝勁都重，最好給它們找一個正當的出口。$/.exec(s);
  if (m) {
    return `With Tan Lang in your Life Palace, ${starsEn(m[1]!, missing)} in your Body Palace, and malefic stars around them, your desires and drive both run strong; it's best to give them a proper outlet.`;
  }

  /* 性格的骨架 · 你的命宮在子，坐巨門。／宮內沒有主星，借對宮的太陰、太陽來讀。 */
  m = /^你的命宮在(\S)，坐(.+)。$/.exec(s);
  if (m && BRANCH_EN[m[1]!]) return `Your Life Palace sits in ${BRANCH_EN[m[1]!]}, shaped by ${starsEn(m[2]!, missing)}.`;
  m = /^你的命宮在(\S)，宮內沒有主星，借對宮的(.+)來讀。$/.exec(s);
  if (m && BRANCH_EN[m[1]!]) {
    return `Your Life Palace sits in ${BRANCH_EN[m[1]!]} and holds no major star, so it is read through ${starsEn(m[2]!, missing)} in the opposite palace.`;
  }

  /* 三方四正 · 推力（xingxi-chapters.ts reason()） */
  m = /^這樣看，是因為你的盤上兩邊都有：(.+?)，推你偏向(\S+?)；(.+?)，推你偏向(\S+?)。$/.exec(s);
  if (m) {
    return `This is because your chart has both: ${evEn(m[1]!, missing)}, pushing you towards ${poleEn(m[2]!, missing)}; and ${evEn(m[3]!, missing)}, pushing you towards ${poleEn(m[4]!, missing)}.`;
  }
  m = /^這樣看，是因為你的盤上有(.+?)，推你偏向(\S+?)；也有(.+?)，推你偏向(\S+?)，只是力量較小。$/.exec(s);
  if (m) {
    return `This is because your chart has ${evEn(m[1]!, missing)}, pushing you towards ${poleEn(m[2]!, missing)}; there is also ${evEn(m[3]!, missing)}, pushing you towards ${poleEn(m[4]!, missing)}, but with less force.`;
  }
  m = /^這樣看，是因為你的盤上有(.+?)，推你偏向(\S+?)；推你偏向(\S+?)的，一樣也沒有。$/.exec(s);
  if (m) {
    return `This is because your chart has ${evEn(m[1]!, missing)}, pushing you towards ${poleEn(m[2]!, missing)}; nothing in it pushes you towards ${poleEn(m[3]!, missing)}.`;
  }

  return null;
}

const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ── 三方四正嘅推力：星系兩頭（xingxi/systems.json poles）同盤上證據 ── */
const POLE_EN: Record<string, string> = {
  物質: 'the material', 精神: 'the inner life', 順從: 'going with the flow', 叛逆: 'rebellion', 理智: 'reason', 感情: 'feeling',
  收斂: 'restraint', 發揮: 'display', 欲望強: 'strong desire', 欲望淡: 'light desire', 明朗: 'brightness', 陰暗: 'the shadow',
  偏剛: 'hardness', 剛柔相濟: 'a balance of hard and soft', 祥和: 'peace', 孤獨: 'solitude', 理想: 'real ideals', 空想: 'daydreams',
  機變: 'quick wit', 機謀: 'strategy', 動盪: 'turbulence', 安定: 'settledness', 局面大: 'a wide scope', 謹慎: 'caution',
  有目標: 'a clear goal', 盲動: 'aimless movement', 物欲: 'material desire', 英華內斂: 'brilliance held within', 疑慮: 'suspicion',
  優雅: 'grace', 隨俗: 'conforming', 浪漫: 'romance', 原則: 'principle', 決斷: 'true decisiveness', 短慮: 'short-sightedness',
  從容: 'ease', 負擔重: 'a heavy load', 陽剛: 'boldness', 陰柔: 'softness', 主動: 'initiative', 被動: 'reacting',
  意志堅強: 'a strong will', 意志薄弱: 'a soft will', 堅忍: 'endurance', 躁進: 'rushing', 深沉: 'depth', 衝動: 'impulse',
  剛毅: 'firmness', 柔軟: 'softness', 正直: 'uprightness', 精明: 'shrewdness', 威權: 'authority', 孤高: 'aloofness',
  精神充實: 'a full inner life', 精神空虛: 'an empty inner life', 進取: 'ambition', 因循: 'staying in a rut', 積極: 'action',
  消極: 'passivity', 果敢: 'boldness', 莽撞: 'recklessness', 上進: 'rising', 停滯: 'stalling', 受激發: 'being spurred on',
  多阻: 'obstacles', 開創: 'enterprise', 因人成事: 'succeeding through others', 融和: 'harmony', 奮發: 'striving',
  多波折: 'setbacks', 豁達: 'broad-mindedness', 易半途: 'stopping halfway', 善於適應: 'adaptability', 反其道: 'going against the grain',
  沉穩: 'steadiness', 虛浮: 'hollowness', 謙和: 'modesty', 保守: 'caution', 情緒: 'emotion', 重情: 'warmth', 決絕: 'finality',
  穩定: 'stability', 浮蕩: 'restlessness', 多焦慮: 'anxiety', 敏感: 'sensitivity', 踏實: 'groundedness', 調和: 'balance',
  偏執: 'obstinacy', 統籌: 'overseeing the whole', 偏於一端: 'one end', 開朗: 'openness', 沉鬱: 'heaviness', 情感: 'feeling',
  穩重: 'steadiness', 浮動: 'restlessness', 權威: 'authority', 強勢: 'dominance', 為公: 'the public good', 為己: 'self-interest',
  多思慮: 'overthinking', 有度: 'restraint', 野心: 'ambition', 得助: 'finding help', 孤立: 'isolation', 有原則: 'principle',
  重情面: 'sentiment', 明斷: 'clear judgement', 尖銳: 'sharpness',
};
export const poleKeys = () => Object.keys(POLE_EN);

function poleEn(zh: string, missing: string[]): string {
  const en = POLE_EN[zh];
  if (!en) missing.push(zh);
  return en ?? `〔${zh}〕`;
}

const HUA_EN: Record<string, string> = { 祿: 'Abundance', 權: 'Authority', 科: 'Recognition', 忌: 'Obstruction' };

/**
 * 證據清單（xingxi.ts evidence()）：「武曲化祿、紫微同宮見左輔、右弼、命宮在丑」。
 * 證據之間同一條證據入面都用「、」，所以淨係星名嘅一截係上一條嘅延續。
 */
function evEn(zh: string, missing: string[]): string {
  const items: string[][] = [];
  for (const t of zh.split('、')) {
    if (star(t) && items.length && !/化.$/.test(items.at(-1)![0]!)) items.at(-1)!.push(t);
    else items.push([t]);
  }
  return listEn(
    items.map(([head, ...more]) => {
      const names = (first: string) => starsEn([first, ...more].join('、'), missing);
      let m = /^(\S{2})化(\S)$/.exec(head!);
      if (m && star(m[1]!) && HUA_EN[m[2]!]) return `${star(m[1]!)} turning to ${HUA_EN[m[2]!]}`;
      m = /^(\S{2})同宮見(\S{2})$/.exec(head!);
      if (m && star(m[1]!)) return `${star(m[1]!)} sharing a palace with ${names(m[2]!)}`;
      m = /^命宮見(\S{2})$/.exec(head!);
      if (m) return `${names(m[1]!)} in your Life Palace`;
      m = /^三方四正會(\S{2})$/.exec(head!);
      if (m) return `${names(m[1]!)} among your four directions`;
      m = /^命宮在(\S)$/.exec(head!);
      if (m && BRANCH_EN[m[1]!]) return `your Life Palace in the ${BRANCH_EN[m[1]!]} position`;
      m = /^主星在(\S)$/.exec(head!);
      if (m && BRANCH_EN[m[1]!]) return `your major star in the ${BRANCH_EN[m[1]!]} position`;
      missing.push(head!);
      return `〔${head}〕`;
    }),
  );
}
