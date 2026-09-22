import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase.server';
import { publicEnv, serviceKey } from '@/lib/env';
import type { BookVersions, DeleteCounts, DeleteOutcome } from '@/lib/account';

/**
 * 設定嘅真 adapter（工單 G4）
 *
 * ⚠ 同 `identity.server.ts`、`shelf.server.ts`、`pay.server.ts` 一樣：
 * **冇跑過。** 所以佢一個判斷都冇 —— 攞數、叫 RPC、回值。
 * 所有判斷喺 `lib/account.ts`，嗰邊行得到測試。
 */

export type AccountReader = { id: string; email: string | null; isAnonymous: boolean };

export async function currentAccount(): Promise<AccountReader | null> {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await sb
    .from('readers')
    .select('is_anonymous, email')
    .eq('id', auth.user.id)
    .single();
  if (error) throw error;

  return { id: auth.user.id, email: data.email, isAnonymous: data.is_anonymous };
}

/** 逐本書嘅三個鎖死咗嘅版本值（R-008）。 */
export async function bookVersions(): Promise<BookVersions[]> {
  const { data, error } = await supabaseServer()
    .from('books')
    .select('id, title, chapters(content_version), charts(engine_version, school_profile_id)')
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row): BookVersions => {
    const chart = Array.isArray(row.charts) ? row.charts[0] : row.charts;
    const chapters = (Array.isArray(row.chapters) ? row.chapters : []) as {
      content_version: string;
    }[];
    /*
     * ⚠ 一本書入面每章都有自己嘅 content_version，而理論上佢哋應該一樣
     * （成書嗰陣一次過寫）。唔一樣就係一個要修嘅資料問題 ——
     * 所以唔揀第一個，揀「全部一樣先算數」，否則當佢答唔到。
     */
    const versions = new Set(chapters.map((c) => c.content_version));
    const content = versions.size === 1 ? [...versions][0]! : undefined;

    return {
      bookId: row.id,
      title: row.title,
      pinned: chart
        ? { engine: chart.engine_version, school: chart.school_profile_id, content: content ?? '' }
        : null,
    };
  });
}

/** 匯出。⚠ `export_reader()` 係 security invoker —— 未買嘅章回 null。 */
export async function exportData(): Promise<unknown> {
  const { data, error } = await supabaseServer().rpc('export_reader');
  if (error) throw error;
  return data;
}

/**
 * 真刪。**兩步**，而第二步可以仆街。
 *
 * ⚠ 次序唔係隨便揀嘅：生辰、盤、書行先。
 *
 * 兩步之間斷咗嘅話，剩低嘅係一個冇任何資料嘅 auth 帳戶 —— 即係得返
 * 個 email。反過嚟做（先刪 auth）雖然 cascade 一次過清晒，但如果
 * admin API 唔得，就係**一樣嘢都冇刪**而個人以為刪咗。
 *
 * 兩個壞結果之間揀「敏感嗰啲一定冇咗」嗰個，然後照實講。
 */
export async function deleteAccount(): Promise<DeleteOutcome> {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { state: 'failed' };

  const { data, error } = await sb.rpc('delete_reader');
  if (error) {
    console.error('[account] delete_reader', error);
    return { state: 'failed' };
  }
  const counts = data as DeleteCounts;

  try {
    const env = publicEnv();
    const admin = createClient(env.url, serviceKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: adminError } = await admin.auth.admin.deleteUser(auth.user.id);
    if (adminError) throw adminError;
  } catch (err) {
    /*
     * ⚠ 呢度唔可以扮成功。
     *
     * 資料真係冇咗，但個 email 仲喺 auth 度。報「已經全部刪除」
     * 嘅代價係佢以為自己個 email 冇咗，實情係仲喺度 ——
     * 而佢下次想用同一個 email 開過，會撞到「已經有人用」。
     */
    console.error('[account] ⚠ 資料刪咗但 auth 帳戶刪唔切', err);
    return { state: 'partial', counts };
  }

  return { state: 'gone', counts };
}
