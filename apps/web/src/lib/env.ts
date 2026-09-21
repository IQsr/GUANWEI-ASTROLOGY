/**
 * Supabase 環境變數嘅契約（工單 G1）
 *
 * ── 呢個檔守住一件事 ──
 *
 * **service role key 一旦入咗 `NEXT_PUBLIC_*`，就係 publish 咗畀全世界。**
 *
 * 嗰條 key 係 `bypassrls` 嘅。即係話 G1 寫嘅成套 RLS —— 一個讀者
 * 只見到自己嗰份、未買嘅章攞唔到正文、票唔可以自己寫 —— 全部一次過失效。
 * 而且冇任何錯誤訊息：個 app 會行得好地地，只係任何人開 devtools
 * 都攞得到所有人嘅生辰。
 *
 * 兩條 key 樣咁似，貼錯一次就係咁。所以唔靠人貼得啱 ——
 * 落 app 之前先睇吓入面寫住佢係邊隻。
 */

export type PublicEnv = { url: string; anonKey: string };

/** JWT 格式嘅 key（舊制）：中間嗰段解得出 `role`。 */
function jwtRole(key: string): string | null {
  const payload = key.split('.')[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      role?: unknown;
    };
    return typeof json.role === 'string' ? json.role : null;
  } catch {
    return null;
  }
}

/**
 * 呢條 key 係咪一條**唔應該出街**嘅 key？
 *
 * 兩種格式都要識：
 *   舊制　`eyJ…`　　　　　JWT，`role` 係 `service_role`
 *   新制　`sb_secret_…`　名自己講晒
 */
export function isSecretKey(key: string): boolean {
  return key.startsWith('sb_secret_') || jwtRole(key) === 'service_role';
}

export function parsePublicEnv(raw: {
  url?: string;
  anonKey?: string;
}): { ok: true; value: PublicEnv } | { ok: false; reason: string } {
  const url = raw.url?.trim();
  const anonKey = raw.anonKey?.trim();

  if (!url) return { ok: false, reason: '冇 NEXT_PUBLIC_SUPABASE_URL' };
  if (!anonKey) return { ok: false, reason: '冇 NEXT_PUBLIC_SUPABASE_ANON_KEY' };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: `NEXT_PUBLIC_SUPABASE_URL 唔係一條 URL：${url}` };
  }

  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !local) {
    return { ok: false, reason: `NEXT_PUBLIC_SUPABASE_URL 要 https：${url}` };
  }

  if (isSecretKey(anonKey)) {
    return {
      ok: false,
      reason:
        'NEXT_PUBLIC_SUPABASE_ANON_KEY 入面嗰條係 service role key。' +
        '佢 bypass RLS，而 NEXT_PUBLIC_ 係會出街嘅 —— 即刻換返 anon key，並且喺 Supabase 度轆咗嗰條。',
    };
  }

  return { ok: true, value: { url, anonKey } };
}

/** 瀏覽器同 server 都行得。唔啱就即刻死，唔好帶住一個壞 client 行落去。 */
export function publicEnv(): PublicEnv {
  const result = parsePublicEnv({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!result.ok) throw new Error(`Supabase 環境變數：${result.reason}`);
  return result.value;
}

/**
 * ⚠ 只可以喺 server 行。
 *
 * 呢個 function 唔會喺 client bundle 度出現 —— 但「唔會」係一個假設，
 * 而假設會變。所以佢自己再檢查一次：見到 `window` 就當係一個 bug，唔係一個 fallback。
 */
export function serviceKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error('service role key 唔可以喺瀏覽器攞 —— 呢條 key bypass 晒 RLS');
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error('冇 SUPABASE_SERVICE_ROLE_KEY');
  if (!isSecretKey(key)) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 入面嗰條唔係 service role key');
  }
  return key;
}
