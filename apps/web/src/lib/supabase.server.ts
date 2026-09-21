import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';

/**
 * Server 上面嘅 Supabase client（工單 G2 起、E3 抽咗出嚟共用）
 *
 * ⚠ 呢個檔冇跑過 —— 呢個環境接唔到一個真 instance。
 * 所以佢淨係做一件事：攞環境變數、駁 cookie。冇任何判斷。
 *
 * `publicEnv()` 冇嘢就即刻 throw ——**唔好帶住一個壞 client 行落去**。
 * 上面嗰層（`shelfView`、`claimAction`）會接住，然後出一句人話。
 */
export function supabaseServer() {
  const env = publicEnv();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      async getAll() {
        return (await cookies()).getAll();
      },
      async setAll(list) {
        const store = await cookies();
        for (const { name, value, options } of list) store.set(name, value, options);
      },
    },
  });
}
