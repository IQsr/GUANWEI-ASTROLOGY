/**
 * 命書主題分組（重新設計第三期）
 *
 * ── 點解要分 ──
 *
 * 十二宮係紫微斗數嘅結構，唔係讀者嘅問題。一個第一次打開命書嘅人
 * 問嘅係「我係點樣嘅人」「做咩工啱我」「我同人相處係點」——
 * 唔係「兄弟宮講乜」。所以目次外面加一層主題，入面照舊係宮位章。
 *
 * ⚠ 呢一層**只係睇法**：
 *   一、章本身、章序（`ord`）、內容引擎一樣都冇郁
 *   二、上一章／下一章照舊跟章序行（`neighbours()`），唔跟主題 ——
 *       一本書由頭讀到尾嘅次序唔應該因為目次點排而變
 *   三、認唔到嘅章唔會唔見：全部落「其餘各章」
 *
 * 分法（Issac 2026-09 揀「主題分組，宮位做章」）：
 *   性格與天賦 —— 命宮、性格的骨架、三方四正、身宮與五行局、福德、疾厄（你自己：性情、心、身）
 *   事業方向　 —— 官祿、財帛、遷移、田宅（你同世界：工作、錢、出外、家業）
 *   人際關係　 —— 夫妻、子女、兄弟、僕役、父母（你同人）
 *
 * ⚠ 「僕役」個名未定（交接文件：僕役／交友／奴僕三個名未決）。
 * 呢度三個都認，章名改咗唔使改呢張表。
 */

export type ThemeKey = 'xing' | 'shi' | 'ren';

/** 主題名同細字喺 messages：`book.themes.<key>.title`／`.lead`。 */
export type Theme = {
  key: ThemeKey;
  /** ⚠ 宮位名係內容資料（章嘅 slug），唔係介面文案 —— 唔搬。 */
  palaces: readonly string[];
};

export const THEMES: readonly Theme[] = [
  {
    key: 'xing',
    palaces: ['命宮', '性格的骨架', '三方四正', '身宮與五行局', '福德', '疾厄'],
  },
  {
    key: 'shi',
    palaces: ['官祿', '財帛', '遷移', '田宅'],
  },
  {
    key: 'ren',
    palaces: ['夫妻', '子女', '兄弟', '僕役', '交友', '奴僕', '父母'],
  },
];

/** 序自己一格，放喺主題之前 —— 佢係開卷，唔屬於任何一個主題。 */
export const PREFACE_SLUG = '序';

export type Grouped<T> = {
  preface: T | null;
  groups: { theme: Theme; chapters: T[] }[];
  /** 認唔到嘅章。正常係空；唔空就喺目次尾出一格「其餘各章」。 */
  rest: T[];
};

/**
 * 將章分落主題。每個主題入面按章序排；冇章嘅主題唔出。
 *
 * ⚠ 每一章**啱啱好**出現一次：唔會兩個主題都有，唔會唔見。
 * `test/themes.test.ts` 量住。
 */
export function groupChapters<T extends { slug: string; ord: number }>(chapters: readonly T[]): Grouped<T> {
  const sorted = [...chapters].sort((a, b) => a.ord - b.ord);
  const preface = sorted.find((c) => c.slug === PREFACE_SLUG) ?? null;
  const taken = new Set<string>(preface ? [preface.slug] : []);

  const groups = THEMES.map((theme) => {
    const inTheme = sorted.filter((c) => !taken.has(c.slug) && theme.palaces.includes(c.slug));
    for (const c of inTheme) taken.add(c.slug);
    return { theme, chapters: inTheme };
  }).filter((g) => g.chapters.length > 0);

  return { preface, groups, rest: sorted.filter((c) => !taken.has(c.slug)) };
}

/** 目次頂嗰行：幾多章、幾多免費、幾多未裁。 */
export function tally(chapters: readonly { tier: string }[], cut: boolean) {
  const deep = chapters.filter((c) => c.tier === 'deep').length;
  return { total: chapters.length, free: chapters.length - deep, uncut: cut ? 0 : deep };
}
