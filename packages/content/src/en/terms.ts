/**
 * 英文術語（2026-10-05 · 跟 docs/en-glossary.md，Issac 定：全部跟建議）。
 * 改術語改呢度，唔好喺翻譯表入面散寫。
 */
export const PALACE_EN: Record<string, string> = {
  命宮: 'Life Palace',
  兄弟: 'Siblings Palace',
  夫妻: 'Partnership Palace',
  子女: 'Children Palace',
  財帛: 'Wealth Palace',
  疾厄: 'Health Palace',
  遷移: 'Travel Palace',
  僕役: 'Friends Palace',
  官祿: 'Career Palace',
  田宅: 'Property Palace',
  福德: 'Wellbeing Palace',
  父母: 'Parents Palace',
  身宮: 'Body Palace',
};

/** 星名：拼音（正文、依據都用呢個）；括號意思只喺輔星煞星第一次出現加（見 `starFirst`）。 */
export const STAR_EN: Record<string, { pinyin: string; gloss: string }> = {
  紫微: { pinyin: 'Zi Wei', gloss: 'the Emperor' },
  天機: { pinyin: 'Tian Ji', gloss: 'the Strategist' },
  太陽: { pinyin: 'Tai Yang', gloss: 'the Sun' },
  武曲: { pinyin: 'Wu Qu', gloss: 'the General' },
  天同: { pinyin: 'Tian Tong', gloss: 'the Contented' },
  廉貞: { pinyin: 'Lian Zhen', gloss: 'the Upright' },
  天府: { pinyin: 'Tian Fu', gloss: 'the Treasury' },
  太陰: { pinyin: 'Tai Yin', gloss: 'the Moon' },
  貪狼: { pinyin: 'Tan Lang', gloss: 'the Wolf' },
  巨門: { pinyin: 'Ju Men', gloss: 'the Great Gate' },
  天相: { pinyin: 'Tian Xiang', gloss: 'the Minister' },
  天梁: { pinyin: 'Tian Liang', gloss: 'the Sage' },
  七殺: { pinyin: 'Qi Sha', gloss: 'the Warrior' },
  破軍: { pinyin: 'Po Jun', gloss: 'the Vanguard' },
  左輔: { pinyin: 'Zuo Fu', gloss: 'the Left Aide' },
  右弼: { pinyin: 'You Bi', gloss: 'the Right Aide' },
  文昌: { pinyin: 'Wen Chang', gloss: 'a Scholar star' },
  文曲: { pinyin: 'Wen Qu', gloss: 'a Scholar star' },
  天魁: { pinyin: 'Tian Kui', gloss: 'a Noble Helper' },
  天鉞: { pinyin: 'Tian Yue', gloss: 'a Noble Helper' },
  祿存: { pinyin: 'Lu Cun', gloss: 'the Keeper of Abundance' },
  天馬: { pinyin: 'Tian Ma', gloss: 'the Horse' },
  擎羊: { pinyin: 'Qing Yang', gloss: 'the Blade' },
  陀羅: { pinyin: 'Tuo Luo', gloss: 'the Weight' },
  火星: { pinyin: 'Huo Xing', gloss: 'Fire' },
  鈴星: { pinyin: 'Ling Xing', gloss: 'Bell' },
  地空: { pinyin: 'Di Kong', gloss: 'Void' },
  地劫: { pinyin: 'Di Jie', gloss: 'Loss' },
  天刑: { pinyin: 'Tian Xing', gloss: 'the Judge' },
};

export const star = (zh: string) => STAR_EN[zh]?.pinyin ?? null;
/** 輔星煞星：拼音加意思（「Huo Xing (Fire)」）；主星淨係拼音 */
export const starFirst = (zh: string) => {
  const s = STAR_EN[zh];
  if (!s) return null;
  return MAJOR.has(zh) ? s.pinyin : `${s.pinyin} (${s.gloss})`;
};
const MAJOR = new Set(['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍']);

/** 方面（對應中文 `AREA`）：[名詞, 句首講法] */
export const AREA_EN: Record<string, [string, string]> = {
  性格: ['your character', 'In your character'],
  朋輩: ['your peers', 'Among your peers'],
  感情: ['your love life', 'In love'],
  後輩: ['the next generation', 'With those you bring up'],
  錢: ['your finances', 'With money'],
  身心負荷: ['the load on your body and mind', 'In body and mind'],
  在外表現: ['the way you engage with the wider world', 'Out in the world'],
  朋友圈: ['your circle', 'In your circle'],
  工作: ['your work', 'At work'],
  家: ['your home', 'At home'],
  心境: ['your inner life', 'In your inner life'],
  長輩關係: ['your ties with elders', 'With elders and seniors'],
};
/** 中文句首講法 → 英文（「在外時」→「Out in the world」） */
export const AREA_ON_EN: Record<string, string> = {
  性格上: 'In your character',
  朋輩之間: 'Among your peers',
  感情上: 'In love',
  帶後輩時: 'With those you bring up',
  錢方面: 'With money',
  身心上: 'In body and mind',
  在外時: 'Out in the world',
  朋友圈裡: 'In your circle',
  工作上: 'At work',
  家裡: 'At home',
  心境上: 'In your inner life',
  對長輩時: 'With elders and seniors',
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

/** 章名：「一 · 命宮」→「I · The Life Palace」 */
export function chapterTitleEn(title: string): string | null {
  const m = /^(\S+) · (\S+)$/.exec(title);
  if (m) {
    const n = CN_NUM.indexOf(m[1]!);
    const p = PALACE_EN[m[2]!];
    if (n > 0 && p) return `${ROMAN[n]} · The ${p}`;
  }
  return null;
}

/** 英文清單：a、b、c → 「a, b and c」（英式，冇 Oxford comma） */
export const listEn = (xs: readonly string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : (xs[0] ?? ''));
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
