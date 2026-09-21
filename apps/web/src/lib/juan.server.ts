import 'server-only';
import { supabaseServer } from '@/lib/supabase.server';
import type { ChapterMeta, JuanPort } from '@/lib/juan-view';

/**
 * 命書嘅真 adapter（工單 F1）
 *
 * ⚠ 同 `identity.server.ts`、`shelf.server.ts` 一樣：**冇跑過**，所以冇判斷。
 * 撈唔到就 `throw` —— 上面 `contentsView()` 接住，出「一時搵不到」。
 *
 * ⚠ 正文一定要行 `chapter_body()`，唔可以 `select body`：
 * G1 將 `body` 呢一欄嘅權限收咗，未買嘅深度章會回 `null`。
 * **一個只靠前端唔 render 嘅 paywall，唔係 paywall。**
 *
 * ⚠ 而家實際上撈唔到嘢：題名之後本書未寫落 DB（E5 留低嗰條 backlog）。
 * 所以呢條路而家一定行到 `unavailable` —— 呢個係一個已知狀態，
 * 唔係一個壞咗嘅頁。
 */
export function serverJuan(): JuanPort {
  return {
    async contents(bookId) {
      const sb = supabaseServer();

      const { data: book, error } = await sb
        .from('books')
        .select('title')
        .eq('id', bookId)
        .maybeSingle();
      if (error) throw error;
      if (!book) return null;

      const { data: rows, error: chapterError } = await sb
        .from('chapters')
        .select('slug, title, ord, tier')
        .eq('book_id', bookId)
        .order('ord');
      if (chapterError) throw chapterError;

      return {
        title: book.title ?? '未題名',
        chapters: (rows ?? []) as ChapterMeta[],
      };
    },

    async body(bookId, slug) {
      const sb = supabaseServer();
      const { data: row, error } = await sb
        .from('chapters')
        .select('id, slots')
        .eq('book_id', bookId)
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      if (!row) return null;

      /* ⚠ 正文一定要行 `chapter_body()`；`slots` 就直接 select 得到（0006）。 */
      const { data, error: bodyError } = await sb.rpc('chapter_body', { p_chapter: row.id });
      if (bodyError) throw bodyError;
      return { text: (data as string | null) ?? null, slots: (row.slots as string[]) ?? [] };
    },

    async chart(bookId) {
      const sb = supabaseServer();
      const { data, error } = await sb
        .from('books')
        .select('charts(payload)')
        .eq('id', bookId)
        .maybeSingle();
      if (error) throw error;
      const chart = Array.isArray(data?.charts) ? data?.charts[0] : data?.charts;
      return chart?.payload ?? null;
    },
  };
}
