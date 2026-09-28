import 'server-only';
import { supabaseServer } from '@/lib/supabase.server';
import { sessionPlan, type ChengshuPort } from '@/lib/chengshu';

/**
 * 成書嘅真 adapter（工單 G5）
 *
 * ⚠ 呢個檔一如 `identity/shelf/juan` 三個 adapter：**冇接過真 instance**。
 * 但同佢哋有一個分別 —— 佢做嘅嘢細好多。
 *
 * 寫入本身（四張表、原子性、防重送、RLS）全部喺 `create_book()` 入面，
 * 而嗰句 SQL 喺 PGlite 連 RLS 一齊跑過 18 條測試。
 * 所以呢度剩返嘅係：攞 session、叫一次 rpc。
 *
 * ⚠ 匿名登入喺呢度發生 —— 全個 app 第一次。
 *
 * G1 寫低咗「匿名做法：Supabase anonymous sign-in」，`readers` 嗰條
 * trigger 亦都等緊佢，但到今日為止**冇一行 code 叫過佢**。
 * 成書係第一件需要一個身分嘅事，所以擺喺呢度：
 * 冇 session 就開一個匿名 session，然後寫書。
 *
 * 「匿名登入行唔行得通」係 PGlite 證明唔到嗰一半（`src/testing.ts` 講過）。
 * 呢兩行仲係未驗過。
 */
export function serverChengshu(): ChengshuPort {
  return {
    async create(draft) {
      const sb = supabaseServer();

      const { data: auth } = await sb.auth.getUser();
      let hasReader = false;
      if (auth.user) {
        const { data: reader, error } = await sb.from('readers').select('id').eq('id', auth.user.id).maybeSingle();
        if (error) throw error;
        hasReader = reader !== null;
      }

      /* 有 session 但冇 readers 行：換一個新匿名 session（見 lib/chengshu.ts `sessionPlan`） */
      const plan = sessionPlan(Boolean(auth.user), hasReader);
      if (plan === 'replace') {
        console.warn('[chengshu] session 冇 readers 行，換一個新匿名 session');
        const { error } = await sb.auth.signOut({ scope: 'local' });
        if (error) throw error;
      }
      if (plan !== 'use') {
        const { error } = await sb.auth.signInAnonymously();
        if (error) throw error;
      }

      const { data, error } = await sb.rpc('create_book', {
        p_token: draft.token,
        p_subject: draft.subject,
        p_chart: draft.chart,
        p_title: draft.title,
        p_seal: draft.seal,
        p_chapters: draft.chapters,
      });
      if (error) throw error;
      if (!data) throw new Error('create_book 冇回一個 book id');
      return String(data);
    },
  };
}
