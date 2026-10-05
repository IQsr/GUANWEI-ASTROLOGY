import { En } from '@guanwei/content';
import { paragraphs } from '@/lib/suidu';
import type { MarkedSegment } from '@/lib/zhu';

/**
 * 英文閱讀模式（2026-10-05）
 *
 * 書存喺 DB 嘅係中文（R-008：成書嗰陣鎖死）。英文唔另外存，讀嗰陣由中文逐句譯
 * （`@guanwei/content` 嘅 En）—— 同一本書永遠對得返同一份中文。
 *
 * ⚠ 要由第一章譯到而家呢章，用同一個 BookState：轉接語成本書輪流用，
 *   跳去第五章讀都要同由頭讀落嚟一樣。
 * ⚠ 註層（術語墨點）只得中文詞條庫，英文版唔標。
 * ⚠ 譯唔到嘅句（例如好舊嘅書有已經改咗寫法嘅句）會以〔中文〕出現 —— 唔會靜靜雞消失。
 */
export function isEnglish(locale: string): boolean {
  return locale === 'en';
}

export function englishTitle(title: string): string {
  return En.chapterTitleEn(title) ?? title;
}

/** 由第一章到而家呢章（按次序），回每章嘅段落（同中文段一一對應，格名照用）。 */
export function englishChapters(chs: readonly { text: string; slots: readonly string[] }[]): MarkedSegment[][] {
  const st = En.newBookState();
  return chs.map((c) => {
    const paras = paragraphs(c.text, c.slots);
    const en = En.renderParagraphs(
      paras.map((p) => p.text),
      st,
    ).paras;
    return paras.map((p, i) => ({ slot: p.slot ?? '正文', runs: [{ text: en[i] ?? '' }] }));
  });
}
