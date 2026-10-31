/**
 * 唔好畀 Supabase 免費版停 project（2026-10-31）
 *
 * 免費版連續 7 日冇乜活動就會自動暫停，停咗之後起盤、書齋、命書全部連唔到資料庫。
 * 所以 Vercel Cron 每日 call 一次 `/api/keepalive`，用 anon key 讀一次 `books`。
 *
 * ⚠ 用 anon key、冇 session：RLS 照 auth.uid() 篩，回嚟一定係 `[]`，一個讀者都讀唔到。
 *   要嘅只係「資料庫行過一條 query」，唔係資料。
 * ⚠ 開始收錢就應該升 Pro，到時呢個 cron 可以刪。
 */

/** Vercel 有設 `CRON_SECRET` 就會帶 `Authorization: Bearer <secret>`；冇設就唔驗。 */
export function cronAuthorized(authorization: string | null, secret: string | undefined): boolean {
  const s = secret?.trim();
  if (!s) return true;
  return authorization === `Bearer ${s}`;
}

export type PingResult = { ok: true } | { ok: false; status: number };

export async function pingSupabase(
  env: { url: string; anonKey: string },
  fetchImpl: typeof fetch = fetch,
): Promise<PingResult> {
  const res = await fetchImpl(`${env.url.replace(/\/$/, '')}/rest/v1/books?select=id&limit=1`, {
    headers: { apikey: env.anonKey, authorization: `Bearer ${env.anonKey}` },
    cache: 'no-store',
  });
  return res.ok ? { ok: true } : { ok: false, status: res.status };
}
