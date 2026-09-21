'use server';

import { supabaseServer } from '@/lib/supabase.server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 記低讀到邊、幾時讀（工單 G5 · E3 第二條 AC）
 *
 * ── 點解要一個 action，唔喺個頁度做 ──
 *
 * 命書嗰兩版係 server component。喺 render 嗰陣叫 Supabase 會撞到
 * cookie 寫入 —— 而 Next 只准喺 server action 或者 route handler 度寫 cookie。
 * 所以呢件事由 client 揈一次 action 返嚟做。
 *
 * ⚠ 兩個欄一齊郁係 DB 嗰邊嘅事（`touch_book`，有 CHECK 睇住），
 * 唔係呢度兩句 update。
 *
 * ⚠ 錯咗**唔准出聲**。排序記唔到係一件細事；因為排序記唔到而
 * 喺一本讀緊嘅書上面彈一句錯誤，先係大件事。
 */
export async function markRead(bookId: string, slug: string): Promise<void> {
  if (!UUID.test(bookId) || !slug || slug.length > 40) return;
  try {
    await supabaseServer().rpc('touch_book', { p_book: bookId, p_chapter: slug });
  } catch {
    /* 靜靜地算數 —— 見上面。 */
  }
}
