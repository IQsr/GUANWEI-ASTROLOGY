import { describe, expect, it } from 'vitest';
import { cronAuthorized, pingSupabase } from '@/lib/keepalive';

describe('Supabase keepalive', () => {
  it('冇設 CRON_SECRET 就唔驗', () => {
    expect(cronAuthorized(null, undefined)).toBe(true);
    expect(cronAuthorized(null, '  ')).toBe(true);
  });

  it('設咗 CRON_SECRET 就要啱嘅 Bearer', () => {
    expect(cronAuthorized('Bearer s3cret', 's3cret')).toBe(true);
    expect(cronAuthorized('Bearer wrong', 's3cret')).toBe(false);
    expect(cronAuthorized(null, 's3cret')).toBe(false);
  });

  it('用 anon key call keepalive()，唔讀任何表', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fake = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response('true', { status: 200 });
    }) as unknown as typeof fetch;
    const result = await pingSupabase({ url: 'https://x.supabase.co/', anonKey: 'anon' }, fake);
    expect(result).toEqual({ ok: true });
    expect(calls[0]!.url).toBe('https://x.supabase.co/rest/v1/rpc/keepalive');
    expect(calls[0]!.init?.method).toBe('POST');
    expect(calls[0]!.init?.headers).toEqual({
      apikey: 'anon',
      authorization: 'Bearer anon',
      'content-type': 'application/json',
    });
  });

  it('Supabase 回錯就報返個 status', async () => {
    const fake = (async () => new Response('', { status: 503 })) as unknown as typeof fetch;
    expect(await pingSupabase({ url: 'https://x.supabase.co', anonKey: 'anon' }, fake)).toEqual({ ok: false, status: 503 });
  });
});
