/**
 * 唔好畀 Supabase 免費版停 project（2026-10-31）
 *
 * 免費版連續 7 日冇乜活動就會自動暫停，停咗之後起盤、書齋、命書全部連唔到資料庫。
 * 所以 Vercel Cron 每日 call 一次 `/api/keepalive`，用 anon key call `public.keepalive()`。
 *
 * ⚠ 唔讀任何表：anon 冇表權限（migration 0004），直接讀 books 會回 401。
 *   `keepalive()`（migration 0011）淨係 `select true`，要嘅只係「資料庫行過一條 query」。
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
  const res = await fetchImpl(`${env.url.replace(/\/$/, '')}/rest/v1/rpc/keepalive`, {
    method: 'POST',
    headers: {
      apikey: env.anonKey,
      authorization: `Bearer ${env.anonKey}`,
      'content-type': 'application/json',
    },
    body: '{}',
    cache: 'no-store',
  });
  return res.ok ? { ok: true } : { ok: false, status: res.status };
}
