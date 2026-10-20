import { Ja } from '@guanwei/content';
import { paragraphs } from '@/lib/suidu';
import { zhFor } from '@/lib/hans';
import { internationalBodies } from '@/lib/chapter-reading';
import { internationalMing } from '@/lib/ming-international';
import type { ChapterReading } from '@/lib/chapter-reading';

/**
 * 日文閱讀模式（2026-10-15）
 *
 * 同英文（lib/english.ts）一樣：書存喺 DB 嘅係中文（R-008），日文讀嗰陣由中文逐句譯
 * （`@guanwei/content` 嘅 Ja）；逐句命宮另保存英日快照。
 *
 * 同英文唔同：
 *   - 冇轉接語輪換狀態（中文本身已經輪換過，日文跟住中文嗰款譯），所以每章獨立譯
 *   - 藏經閣未有日文，不標術語；已核命宮的逐句來源由明確資料標註
 * ⚠ 譯唔到嘅句（例如好舊嘅書有已經改咗寫法嘅句）會以〔中文〕出現 —— 唔會靜靜雞消失。
 */
export function isJapanese(locale: string): boolean {
  return locale === 'ja';
}

export function japaneseTitle(title: string): string {
  return Ja.chapterTitleJa(title) ?? title;
}

/** 由第一章到而家呢章（按次序），回每章嘅段落（同中文段一一對應，格名照用）。 */
export function japaneseChapters(chs: readonly { text: string; slots: readonly string[]; reading?: unknown }[]): ChapterReading['segments'][] {
  return internationalBodies(chs).map((c, i) => {
    const ming = internationalMing(chs[i]!, 'ja');
    if (ming !== null) return ming;
    const paras = paragraphs(c.text, c.slots);
    const ja = Ja.renderParagraphs(paras.map((p) => p.text)).paras;
    return paras.map((p, i) => ({ slot: p.slot ?? '正文', text: ja[i] ?? '' }));
  });
}

/**
 * 書名：DB 存嘅係中文（「陳大文命書」「無名命書」）。日文寫「〜の命書」，人名照用（2026-10-15）。
 * 其他語言照 `zhFor`（簡體轉、繁體英文照舊）。
 */
export function bookTitleFor(locale: string, title: string): string {
  if (!isJapanese(locale)) return zhFor(locale, title);
  /* 介面文案本身已經係日文（「見本の命書」） */
  if (title.endsWith('の命書')) return title;
  const m = /^(.+?)命書$/.exec(title);
  return m ? `${m[1]}の命書` : title;
}
