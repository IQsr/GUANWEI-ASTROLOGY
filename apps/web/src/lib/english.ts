import { En } from '@guanwei/content';
import { paragraphs } from '@/lib/suidu';
import { zhFor } from '@/lib/hans';
import { isJapanese, japaneseTitle } from '@/lib/japanese';
import { internationalBodies, readingOf } from '@/lib/chapter-reading';
import { internationalMing } from '@/lib/ming-international';
import type { ChapterReading } from '@/lib/chapter-reading';

/**
 * 英文閱讀模式（2026-10-05）
 *
 * 書存喺 DB 嘅中文鎖定（R-008）；逐句命宮另保存英日快照，舊章讀嗰陣由中文逐句譯
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
/** 存咗嘅英文快照（2026-11-11 前起嘅書）冇地支說明：讀出時喺第一個地支位置補返（一章一次）。 */
function withBranchNote(segs: ChapterReading['segments']): ChapterReading['segments'] {
  if (segs.some((s) => s.text.includes(En.BRANCH_NOTE))) return segs;
  const k = segs.findIndex((s) => En.glossBranch(s.text) !== s.text);
  if (k < 0) return segs;
  return segs.map((s, i) => {
    if (i !== k) return s;
    const j = s.statements?.findIndex((l) => En.glossBranch(l.text) !== l.text) ?? -1;
    if (j < 0) return { ...s, text: En.glossBranch(s.text) };
    const statements = s.statements!.map((l, n) => (n === j ? { ...l, text: En.glossBranch(l.text) } : l));
    return { ...s, text: s.text.replace(s.statements![j]!.text, () => statements[j]!.text), statements };
  });
}

/**
 * 新版命宮、性格的骨架（reader-backed-v1，2026-11-12 英文第一批）、十一宮（palace-reader-v1，第二批）同給你的話（epilogue-reader-v1，第三批）：英文直接由成書時嘅新中文逐條 statement 譯，
 * 唔再讀舊版快照。statement 一條對一段英文，出處記號照跟住 statement。
 * 有一句或者一個小標題譯唔到 → 回 null，成章照舊讀快照（唔出半中半英）。日文未切換。
 */
function freshEnglish(ch: { text: string; reading?: unknown }, st: En.BookState): ChapterReading['segments'] | null {
  const r = readingOf(ch.reading, ch.text);
  if (r?.writer !== 'reader-backed-v1' && r?.writer !== 'palace-reader-v1' && r?.writer !== 'epilogue-reader-v1') return null;
  const items = r.segments.flatMap((s) => (s.statements?.length ? s.statements.map((l) => l.text) : [s.text]));
  if (En.renderParagraphs(items).missing.length) return null;
  if (r.segments.some((s) => s.heading && !En.headingEn(s.heading))) return null;
  const en = En.renderParagraphs(items, st).paras.map(plainEn);
  let k = 0;
  return r.segments.map((s) => {
    const head = {
      slot: s.slot,
      ...(s.heading ? { heading: En.headingEn(s.heading)! } : {}),
      ...(s.referenceDisplay ? { referenceDisplay: s.referenceDisplay } : {}),
    };
    if (!s.statements?.length) return { ...head, text: en[k++]! };
    const statements = s.statements.map((l) => { const text = en[k++]!; return { ...l, text, en: text }; });
    return { ...head, text: statements.map((l) => l.text).join(' '), statements };
  });
}

export function englishChapters(chs: readonly { text: string; slots: readonly string[]; reading?: unknown }[]): ChapterReading['segments'][] {
  const st = En.newBookState();
  return internationalBodies(chs).map((c, i) => {
    const fresh = freshEnglish(chs[i]!, st);
    if (fresh) return fresh;
    const ming = internationalMing(chs[i]!, 'en');
    if (ming !== null) return withBranchNote(ming);
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
  'How to read this book: the chart is divided into twelve palaces, each standing for an area of life such as work, money or relationships, and most chapters look at one of them through the stars it holds. ' +
  'The chart also has twelve positions, named after the Chinese earthly branches; Zi, Si and You are three of these names. ' +
  'Your Five-Element Bureau (for example, Water Two) sets the age at which your ten-year stages begin. ' +
  'Abundance, Authority, Recognition and Obstruction are the four transformations. Your birth year, each ten-year stage and each year mark four stars with them, and that changes how those stars, and the palaces they sit in, are read. ' +
  'The chapters on these ten years and this year read the same chart again from a different starting palace, so a palace name there can hold different stars from your birth chart; that is how the method works, not a mistake.';

/**
 * 翻譯表入面書名用 Markdown 斜體（*Complete Book*）。網站正文係純文字 run，
 * 星號會照出 —— 顯示嗰陣拎走（書名本身已經大寫，唔會讀錯）。
 */
export const plainEn = (s: string) => s.replace(/\*([^*\n]+)\*/g, (_m: string, t: string) => t);
