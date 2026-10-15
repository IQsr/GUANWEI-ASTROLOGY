import { En } from '@guanwei/content';
import { paragraphs } from '@/lib/suidu';
import { zhFor } from '@/lib/hans';
import { isJapanese, japaneseTitle } from '@/lib/japanese';

/**
 * 英文閱讀模式（2026-10-05）
 *
 * 書存喺 DB 嘅係中文（R-008：成書嗰陣鎖死）。英文唔另外存，讀嗰陣由中文逐句譯
 * （`@guanwei/content` 嘅 En）—— 同一本書永遠對得返同一份中文。
 *
 * ⚠ 要由第一章譯到而家呢章，用同一個 BookState：轉接語成本書輪流用，
 *   跳去第五章讀都要同由頭讀落嚟一樣。
 * 註層（2026-10-05 起）：段落交返去 `markBook(…, 'en')` 標英文術語，註用英文詞條。
 * ⚠ 譯唔到嘅句（例如好舊嘅書有已經改咗寫法嘅句）會以〔中文〕出現 —— 唔會靜靜雞消失。
 */
export function isEnglish(locale: string): boolean {
  return locale === 'en';
}

export function englishTitle(title: string): string {
  return En.chapterTitleEn(title) ?? title;
}

/** 章名點顯示：英文、日文（2026-10-15）譯、簡體轉（2026-10-08）、繁體照舊。slug 永遠係繁體，唔好用呢個。 */
export function displayTitle(title: string, locale: string): string {
  return isEnglish(locale) ? englishTitle(title) : isJapanese(locale) ? japaneseTitle(title) : zhFor(locale, title);
}

/** 由第一章到而家呢章（按次序），回每章嘅段落（同中文段一一對應，格名照用）。 */
export function englishChapters(chs: readonly { text: string; slots: readonly string[] }[]): { slot: string; text: string }[][] {
  const st = En.newBookState();
  return chs.map((c) => {
    const paras = paragraphs(c.text, c.slots);
    const en = En.renderParagraphs(
      paras.map((p) => p.text),
      st,
    ).paras;
    const out = paras.map((p, i) => ({ slot: p.slot ?? '正文', text: plainEn(en[i] ?? '') }));
    /* 序：英文讀者多一段閱讀說明，擺喺「體系」段後面（2026-10-14 · 審稿：術語冇交代） */
    const at = out.findIndex((p) => p.slot === '體系');
    if (at >= 0) out.splice(at + 1, 0, { slot: '閱讀', text: EN_READING_GUIDE });
    return out;
  });
}

/**
 * 英文版序章嘅閱讀說明。中文讀者對宮位、地支、四化有基本概念；英文讀者冇，
 * 而且去到這十年、這一年，同一個宮名會見到唔同嘅星，唔講清楚就似資料前後矛盾。
 */
export const EN_READING_GUIDE =
  'How to read this book: each chapter reads one of the twelve palaces, the areas of life such as work, money and relationships, through the stars that sit in it. ' +
  'Names such as Zi, Si or You are the twelve positions on the chart, taken from the Chinese earthly branches. ' +
  'Your Five-Element Bureau (for example, Water Two) sets the age at which your ten-year stages begin. ' +
  'Abundance, Authority, Recognition and Obstruction are the four transformations: your birth year, each ten-year stage and each year turn four stars in these ways, which colours the palaces they fall in. ' +
  'The chapters on these ten years and this year read the same chart again from a different starting palace, so a palace name there can hold different stars from your birth chart; that is how the method works, not a mistake.';

/**
 * 翻譯表入面書名用 Markdown 斜體（*Complete Book*）。網站正文係純文字 run，
 * 星號會照出 —— 顯示嗰陣拎走（書名本身已經大寫，唔會讀錯）。
 */
export const plainEn = (s: string) => s.replace(/\*([^*\n]+)\*/g, (_m: string, t: string) => t);
