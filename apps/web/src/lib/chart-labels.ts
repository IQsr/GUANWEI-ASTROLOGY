/**
 * 命盤英文標籤（2026-10-05 · 英文閱讀模式）
 *
 * ⚠ 呢個檔案會落 client（命盤係 client component），所以唔可以 import `@guanwei/content`
 *   —— 嗰度有成個翻譯表。星名、宮名同 content 嘅 `en/terms.ts` 一樣，
 *   `test/chart-labels.test.ts` 對住佢，兩邊一改唔同步就紅。
 *
 * 詞彙表（docs/en-glossary.md）：星名用拼音、命盤圖附漢字（放喺 title）；
 * 四化 Abundance／Authority／Recognition／Obstruction，格入面位窄，用兩個字母。
 */
export const STAR_PY: Record<string, string> = {
  紫微: 'Zi Wei', 天機: 'Tian Ji', 太陽: 'Tai Yang', 武曲: 'Wu Qu', 天同: 'Tian Tong', 廉貞: 'Lian Zhen', 天府: 'Tian Fu',
  太陰: 'Tai Yin', 貪狼: 'Tan Lang', 巨門: 'Ju Men', 天相: 'Tian Xiang', 天梁: 'Tian Liang', 七殺: 'Qi Sha', 破軍: 'Po Jun',
  左輔: 'Zuo Fu', 右弼: 'You Bi', 文昌: 'Wen Chang', 文曲: 'Wen Qu', 天魁: 'Tian Kui', 天鉞: 'Tian Yue', 祿存: 'Lu Cun',
  天馬: 'Tian Ma', 擎羊: 'Qing Yang', 陀羅: 'Tuo Luo', 火星: 'Huo Xing', 鈴星: 'Ling Xing', 地空: 'Di Kong', 地劫: 'Di Jie',
  天刑: 'Tian Xing',
};

/** 格入面嘅宮名（短）：Life、Partnership⋯ */
export const PALACE_SHORT: Record<string, string> = {
  命宮: 'Life', 兄弟: 'Siblings', 夫妻: 'Partnership', 子女: 'Children', 財帛: 'Wealth', 疾厄: 'Health',
  遷移: 'Travel', 僕役: 'Friends', 官祿: 'Career', 田宅: 'Property', 福德: 'Wellbeing', 父母: 'Parents',
};

export const BRANCH_PY: Record<string, string> = {
  子: 'Zi', 丑: 'Chou', 寅: 'Yin', 卯: 'Mao', 辰: 'Chen', 巳: 'Si', 午: 'Wu', 未: 'Wei', 申: 'Shen', 酉: 'You', 戌: 'Xu', 亥: 'Hai',
};
export const STEM_PY: Record<string, string> = {
  甲: 'Jia', 乙: 'Yi', 丙: 'Bing', 丁: 'Ding', 戊: 'Wu', 己: 'Ji', 庚: 'Geng', 辛: 'Xin', 壬: 'Ren', 癸: 'Gui',
};

export const HUA_EN: Record<string, { short: string; full: string }> = {
  祿: { short: 'Ab', full: 'Abundance' },
  權: { short: 'Au', full: 'Authority' },
  科: { short: 'Re', full: 'Recognition' },
  忌: { short: 'Ob', full: 'Obstruction' },
};

export const starPy = (zh: string) => STAR_PY[zh] ?? zh;
export const palaceShort = (zh: string) => PALACE_SHORT[zh.replace(/宮$/, '')] ?? PALACE_SHORT[zh] ?? zh;
export const branchPy = (zh: string) => BRANCH_PY[zh] ?? zh;

/** 「丙午」→「Bing Wu」 */
export const ganzhiPy = (zh: string) => [...zh].map((c) => STEM_PY[c] ?? BRANCH_PY[c] ?? c).join(' ');

/** 命盤中宮嗰行（章 slug → 英文）。宮位章用「Life Palace」，其餘章同章名一樣（content chapterTitleEn）。 */
const SLUG_EN: Record<string, string> = {
  序: 'Preface', 性格的骨架: 'The Shape of Your Character', 三方四正: 'The Four Directions',
  身宮與五行局: 'The Body Palace and the Five-Element Bureau', 一生十二步: 'Twelve Steps of a Life',
  這十年: 'These Ten Years', 這一年: 'This Year', 給你的話: 'For You',
};
export const slugEn = (slug: string) => SLUG_EN[slug] ?? (PALACE_SHORT[slug.replace(/宮$/, '')] || PALACE_SHORT[slug] ? `${palaceShort(slug)} Palace` : slug);
