import 'server-only';
import { cache } from 'react';
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
/*
 * ⚠ 同一個 request 共用一個 client（2026-10-09，線上 log 見到書架 401）。
 *
 * 以前每次 call 都開一個新 client。登入 token 過咗期嗰陣，第一個 client 用 refresh token 換新 token，
 * 但 server component 寫唔到 cookie；第二個 client 由 cookie 攞返舊嘅 refresh token 再換一次 ——
 * Supabase 嘅 refresh token 只用得一次，換唔到就變咗 anon，`books` 彈 42501，書架出「一時搵唔到」。
 * 共用一個之後，成個 request 只換一次，之後嘅 query 都用住換返嚟嗰張。
 */
export const supabaseServer = cache(function supabaseServer() {
  const env = publicEnv();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      async getAll() {
        return (await cookies()).getAll();
      },
      async setAll(list) {
        /*
         * Server component 入面唔准寫 cookie（只有 server action、route handler 得）。
         * 寫唔到唔緊要：middleware 已經喺呢個 request 之前 refresh 過、寫咗落 response（Supabase 官方做法）。
         */
        try {
          const store = await cookies();
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          /* server component：交畀 middleware */
        }
      },
    },
  });
});
