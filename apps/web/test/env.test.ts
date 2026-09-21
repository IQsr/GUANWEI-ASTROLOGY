import { describe, expect, it } from 'vitest';
import { isSecretKey, parsePublicEnv } from '@/lib/env';

/**
 * 工單 G1：**service role key 一旦入咗 `NEXT_PUBLIC_*`，就係 publish 咗。**
 *
 * 嗰條 key bypass 晒 RLS，所以 `packages/db` 嗰 15 條 RLS 測試
 * 全部一次過失效 —— 而且個 app 仲會行得好地地。
 * 呢一份測試係嗰套 RLS 唯一嘅防線：貼錯咗，app 起唔到身。
 */

/** 砌一條假 JWT（只需要中間嗰段解得出 role）。 */
function jwt(role: string): string {
  const seg = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${seg({ alg: 'HS256', typ: 'JWT' })}.${seg({ iss: 'supabase', role })}.sig`;
}

const URL_OK = 'https://abcdefgh.supabase.co';

describe('⚠ 貼錯 key 就唔准開機', () => {
  it('舊制 service_role JWT → 擋', () => {
    const r = parsePublicEnv({ url: URL_OK, anonKey: jwt('service_role') });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('bypass RLS');
  });

  it('新制 sb_secret_ → 擋', () => {
    const r = parsePublicEnv({ url: URL_OK, anonKey: 'sb_secret_abc123' });
    expect(r.ok).toBe(false);
  });

  it('anon JWT → 收', () => {
    expect(parsePublicEnv({ url: URL_OK, anonKey: jwt('anon') }).ok).toBe(true);
  });

  it('新制 sb_publishable_ → 收', () => {
    expect(parsePublicEnv({ url: URL_OK, anonKey: 'sb_publishable_abc123' }).ok).toBe(true);
  });

  it('isSecretKey 分得清兩種格式', () => {
    expect(isSecretKey(jwt('service_role'))).toBe(true);
    expect(isSecretKey('sb_secret_x')).toBe(true);
    expect(isSecretKey(jwt('anon'))).toBe(false);
    expect(isSecretKey('sb_publishable_x')).toBe(false);
    expect(isSecretKey('')).toBe(false);
  });
});

describe('URL', () => {
  it('要 https', () => {
    const r = parsePublicEnv({ url: 'http://abcdefgh.supabase.co', anonKey: jwt('anon') });
    expect(r.ok).toBe(false);
  });

  it('localhost 例外 —— 本機開發行 http', () => {
    expect(parsePublicEnv({ url: 'http://localhost:54321', anonKey: jwt('anon') }).ok).toBe(true);
  });

  it('缺咗邊一個都講得出係缺咗邊個', () => {
    const a = parsePublicEnv({ anonKey: jwt('anon') });
    const b = parsePublicEnv({ url: URL_OK });
    expect(a.ok || b.ok).toBe(false);
    if (!a.ok) expect(a.reason).toContain('NEXT_PUBLIC_SUPABASE_URL');
    if (!b.ok) expect(b.reason).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });
});
