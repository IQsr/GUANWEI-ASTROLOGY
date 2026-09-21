import 'server-only';
import { supabaseServer } from '@/lib/supabase.server';
import type { ShelfBook, ShelfPort } from '@/lib/shelf';

/**
 * 書架嘅真 adapter（工單 E3）
 *
 * ⚠ 同 `identity.server.ts` 一樣：**冇跑過**，所以冇判斷。
 * 撈唔到就 `throw` —— 上面 `shelfView()` 會接住，出「一時搵唔到」，
 * **唔會出一個空書架**。（一個掉咗你啲書嘅書架，比一個講明壞咗嘅差好多。）
 */
export function serverShelf(): ShelfPort {
  return {
    async reader() {
      const sb = supabaseServer();
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) return null;

      /* 記一次回訪。同一日行幾多次都只會加一次（G2 嘅 touch_visit）。 */
      const { data: visitDays, error: visitError } = await sb.rpc('touch_visit');
      if (visitError) throw visitError;

      const { data: row, error } = await sb
        .from('readers')
        .select('is_anonymous, claim_dismissed_at')
        .eq('id', auth.user.id)
        .single();
      if (error) throw error;

      return {
        isAnonymous: row.is_anonymous,
        visitDays: Number(visitDays ?? 1),
        dismissed: row.claim_dismissed_at !== null,
      };
    },

    async books() {
      const { data, error } = await supabaseServer()
        .from('books')
        .select('id, subject_id, chart_id, created_at, last_read_at, subjects(name)')
        .order('last_read_at', { ascending: false, nullsFirst: false });
      if (error) throw error;

      return (data ?? []).map((row): ShelfBook => {
        const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
        return {
          id: row.id,
          state: row.chart_id ? 'titled' : row.subject_id ? 'awaiting' : 'blank',
          name: subject?.name ?? null,
          lastReadAt: row.last_read_at,
          createdAt: row.created_at,
        };
      });
    },
  };
}
