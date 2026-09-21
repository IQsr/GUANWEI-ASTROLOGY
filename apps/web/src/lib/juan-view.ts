import type { Note } from '@/components/Juan';
import type { MarkedChapter } from '@/lib/zhu';

/**
 * 命書一版睇到嘅嘢（工單 F1 · 架構 §2、§6）
 *
 * 同 `shelfView()`（E3）一樣嘅三分：**攞到 / 撈唔到 / 冇呢本**。
 * 三個狀態要分得清清楚楚 —— 一個喺 DB 撈唔到嗰陣顯示「冇呢本書」嘅版，
 * 等於同一個讀者講「你嗰本冇咗」，而佢嗰本其實好地地。
 */

export type ChapterMeta = {
  slug: string;
  title: string;
  ord: number;
  tier: 'free' | 'deep';
};

export type JuanPort = {
  /** 目錄：本書 ＋ 每一章嘅**行**（唔包正文）。 */
  contents(bookId: string): Promise<{ title: string; chapters: ChapterMeta[] } | null>;
  /**
   * 一章嘅正文同佢嘅段落結構。
   *
   * ⚠ 未買嘅深度章 `text` 會回 `null` —— 而且**唔係呢度決定嘅**，
   * 係 DB 嗰個 `chapter_body()` 決定（G1）。
   * 一個只靠前端唔 render 嘅 paywall，唔係 paywall。
   *
   * ⚠ `slots` 就算未買都攞得到（F2 · 0006）。**格嘅名唔係內容**：
   * 一個未裁開嘅讀者睇得到呢一版有幾多格、係乜嘢格 ——
   * 咁先至係毛邊本，你揸得到本書，只係未裁開。
   */
  body(bookId: string, slug: string): Promise<{ text: string | null; slots: string[] } | null>;
  /**
   * 呢本書嗰張盤（F2：右側細命盤要跟捲動高亮）。
   *
   * 撈唔到就回 null —— 冇盤就唔出個細盤，唔係出一個空格。
   */
  chart(bookId: string): Promise<unknown | null>;
};

export type ContentsView =
  | { kind: 'ok'; title: string; chapters: ChapterMeta[] }
  | { kind: 'missing' }
  | { kind: 'unavailable' };

export async function contentsView(port: JuanPort, bookId: string): Promise<ContentsView> {
  try {
    const found = await port.contents(bookId);
    if (!found) return { kind: 'missing' };
    return {
      kind: 'ok',
      title: found.title,
      chapters: [...found.chapters].sort((a, b) => a.ord - b.ord),
    };
  } catch {
    return { kind: 'unavailable' };
  }
}

export type ChapterView =
  | { kind: 'ok'; title: string; segments: MarkedChapter['segments']; notes: Record<string, Note> }
  /** 未裁之頁（架構 §6）。章名照樣列得出 —— 收埋嘅係正文。 */
  | { kind: 'uncut'; title: string }
  | { kind: 'missing' }
  | { kind: 'unavailable' };

/**
 * ⚠ 「未裁」同「冇呢一章」要分得開。
 *
 * 兩樣喺 DB 度都係「攞唔到正文」，但對讀者嚟講差好遠：
 * 一個係「呢頁未裁開，裁開就睇到」，另一個係「呢本書冇呢一章」。
 * 分唔開就會出現「我明明買咗」嗰種投訴，而我哋答唔到。
 */
export function chapterKind(meta: ChapterMeta | undefined, body: string | null) {
  if (!meta) return 'missing' as const;
  return body === null ? ('uncut' as const) : ('ok' as const);
}
