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
/**
 * 未登入（連匿名 session 都冇）就當搵唔到。
 *
 * 0004（2026-10-08）收咗 anon 對表嘅權限：以前未登入讀表係 RLS 回空，
 * 依家係 permission denied —— 唔先問一句，打開人哋分享嘅書連結會變成「一時讀唔到」。
 */
async function signedIn(sb: ReturnType<typeof supabaseServer>): Promise<boolean> {
  const { data } = await sb.auth.getUser();
  return Boolean(data.user);
}

export function serverJuan(): JuanPort {
  return {
    async contents(bookId) {
      const sb = supabaseServer();
      if (!(await signedIn(sb))) return null;

      const { data: book, error } = await sb
        .from('books')
        .select('title, last_read_chapter')
        .eq('id', bookId)
        .maybeSingle();
      if (error) throw error;
      if (!book) return null;

      const { data: rows, error: chapterError } = await sb
        .from('chapters')
        .select('id, slug, title, ord, tier')
        .eq('book_id', bookId)
        .order('ord');
      if (chapterError) throw chapterError;

      /*
       * 裁開咗未（重新設計第三期）。之前目次淨係睇 `tier`，
       * 付完款之後深度章照樣寫住「未裁」。問同一個 `has_entitlement()`，
       * 同 `/pay` 嗰邊一樣 —— 唔喺前端自己估。
       */
      const { data: cut, error: cutError } = await sb.rpc('has_entitlement', { p_book: bookId });
      if (cutError) throw cutError;

      return {
        /* 未題名：畫面自己出「未題名」（messages `shelf.untitled`） */
        title: book.title ?? null,
        chapters: (rows ?? []) as ChapterMeta[],
        lastRead: book.last_read_chapter ?? null,
        cut: Boolean(cut),
      };
    },

    async body(bookId, slug) {
      const sb = supabaseServer();
      if (!(await signedIn(sb))) return null;
      const { data: row, error } = await sb
        .from('chapters')
        .select('id, slots, content_version')
        .eq('book_id', bookId)
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      if (!row) return null;

      /* ⚠ 正文一定要行 `chapter_body()`；`slots` 就直接 select 得到（0006）。 */
      const { data, error: bodyError } = await sb.rpc('chapter_body', { p_chapter: row.id });
      if (bodyError) throw bodyError;
      let reading: unknown;
      const savedReading = slug === '命宮' || (slug === '性格的骨架' && String(row.content_version).includes('+reader-backed-v1'));
      if (data !== null && String(row.content_version).includes('+ming-expanded-v1') && savedReading) {
        const result = await sb.rpc('chapter_reading', { p_chapter: row.id });
        if (result.error) throw result.error;
        reading = result.data;
      }
      return { text: (data as string | null) ?? null, slots: (row.slots as string[]) ?? [], ...(reading ? { reading } : {}) };
    },

    async chart(bookId) {
      const sb = supabaseServer();
      if (!(await signedIn(sb))) return null;
      const { data, error } = await sb
        .from('books')
        .select('created_at, charts(payload)')
        .eq('id', bookId)
        .maybeSingle();
      if (error) throw error;
      const chart = Array.isArray(data?.charts) ? data?.charts[0] : data?.charts;
      if (!chart?.payload) return null;
      /* 寫書嗰年：同成書嗰陣（server 時鐘，UTC）畀 `annual()` 嘅年一樣 */
      return { payload: chart.payload, year: new Date(data!.created_at as string).getUTCFullYear() };
    },

    async leads(bookId) {
      const sb = supabaseServer();
      if (!(await signedIn(sb))) return [];
      /* ⚠ 只開第一段同一句引文（0008）；全章正文照舊行 `chapter_body()` */
      const { data, error } = await sb.rpc('chapter_leads_v2', { p_book: bookId });
      if (error) throw error;
      return ((data ?? []) as { slug: string; lead: string | null; quote: string | null; international_lead: string | null; citations: string[] | null }[]).map((r) => ({
        slug: r.slug,
        lead: r.lead ?? '',
        quote: r.quote ?? null,
        ...(r.international_lead != null ? { internationalLead: r.international_lead } : {}),
        ...(r.citations != null ? { citations: r.citations } : {}),
      }));
    },
  };
}
