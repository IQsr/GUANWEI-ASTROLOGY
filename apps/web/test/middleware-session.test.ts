import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';

type Options = { cookies: { getAll(): { name: string; value: string }[]; setAll(list: { name: string; value: string; options?: CookieOptions }[]): void }; global: { fetch: typeof fetch } };
const sdk = vi.hoisted(() => ({ getUser: vi.fn(), options: undefined as Options | undefined }));
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn((_url: string, _key: string, options: Options) => {
  sdk.options = options;
  return { auth: { getUser: sdk.getUser } };
}) }));
import middleware from '@/middleware';
import { SESSION_REFRESH_TIMEOUT_MS } from '@/lib/session-refresh';
import { sessionUnavailable } from '@/lib/session-unavailable';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_test');
  vi.stubEnv('MAINTENANCE_MODE', '0');
  sdk.options = undefined;
  sdk.getUser.mockReset().mockResolvedValue({ data: { user: null }, error: null });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('bounds even an SDK wait with no outgoing fetch; late cookie changes cannot corrupt the request', async () => {
  sdk.getUser.mockImplementation(() => {
    sdk.options!.cookies.setAll([{ name: 'session', value: 'staged-new-token' }]);
    return new Promise(() => {});
  });
  const req = new NextRequest('https://example.com/en/book/test', { headers: { cookie: 'session=original-token' } });
  const pending = middleware(req);
  await vi.advanceTimersByTimeAsync(SESSION_REFRESH_TIMEOUT_MS);
  const response = await pending;
  expect(response.status).toBe(503);
  expect(response.headers.get('x-middleware-rewrite')).toBeNull();
  expect(response.headers.get('set-cookie')).toBeNull();
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.headers.get('retry-after')).toBe('3');
  expect(await response.text()).toContain('Try again');
  sdk.options!.cookies.setAll([{ name: 'session', value: 'late-token' }]);
  expect(req.cookies.get('session')?.value).toBe('original-token');
  expect(console.warn).toHaveBeenCalledWith('session_refresh_unavailable', { reason: 'timeout', elapsedMs: SESSION_REFRESH_TIMEOUT_MS });
  expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('token');
  expect(vi.getTimerCount()).toBe(0);
});

it('aborts an in-flight auth fetch when the overall budget expires', async () => {
  let signal: AbortSignal | null | undefined;
  vi.stubGlobal('fetch', vi.fn((_input: unknown, init: RequestInit) => {
    signal = init.signal;
    return new Promise((_resolve, reject) => signal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  }));
  sdk.getUser.mockImplementation(() => sdk.options!.global.fetch('https://example.supabase.co/auth/v1/user'));
  const pending = middleware(new NextRequest('https://example.com/ja/book/test'));
  await vi.advanceTimersByTimeAsync(SESSION_REFRESH_TIMEOUT_MS);
  expect((await pending).status).toBe(503);
  expect(signal?.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

it('passes refreshed cookies to both the page and browser, with no cacheable authenticated response', async () => {
  sdk.getUser.mockImplementation(async () => {
    sdk.options!.cookies.setAll([{ name: 'session', value: 'refreshed', options: { httpOnly: true, secure: true } }]);
    expect(sdk.options!.cookies.getAll()).toContainEqual({ name: 'session', value: 'refreshed' });
    return { data: { user: { id: 'verified' } }, error: null };
  });
  const req = new NextRequest('https://example.com/en/book/test', { headers: { cookie: 'session=old' } });
  const response = await middleware(req);
  expect(response.status).toBe(200);
  expect(req.cookies.get('session')?.value).toBe('refreshed');
  expect(response.headers.get('x-middleware-request-cookie')).toContain('session=refreshed');
  expect(response.headers.get('set-cookie')).toContain('session=refreshed');
  expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(vi.getTimerCount()).toBe(0);
});

it.each([429, 503])('handles temporary auth status %s without deleting cookies or granting page access', async (status) => {
  sdk.getUser.mockResolvedValue({ data: { user: null }, error: { name: 'AuthApiError', status } });
  const response = await middleware(new NextRequest('https://example.com/book/test'));
  expect(response.status).toBe(503);
  expect(response.headers.get('set-cookie')).toBeNull();
  expect(response.headers.get('x-middleware-rewrite')).toBeNull();
});

it('keeps the normal missing-session path and invalid-token cleanup; public routes never wait for auth', async () => {
  sdk.getUser.mockResolvedValue({ data: { user: null }, error: { name: 'AuthSessionMissingError', status: 400 } });
  expect((await middleware(new NextRequest('https://example.com/en/book/test'))).status).toBe(200);
  sdk.getUser.mockImplementation(async () => {
    sdk.options!.cookies.setAll([{ name: 'session', value: '', options: { maxAge: 0 } }]);
    return { data: { user: null }, error: { name: 'AuthApiError', status: 401 } };
  });
  const invalid = await middleware(new NextRequest('https://example.com/en/book/test'));
  expect(invalid.headers.get('set-cookie')).toContain('Max-Age=0');
  sdk.getUser.mockClear();
  await middleware(new NextRequest('https://example.com/en/sample'));
  await middleware(new NextRequest('https://example.com/lexicon'));
  expect(sdk.getUser).not.toHaveBeenCalled();
});

it.each(['zh-Hant', 'zh-Hans', 'en', 'ja'])('provides a same-origin, uncached retry page in %s', async (locale) => {
  const response = sessionUnavailable(new NextRequest(`https://example.com/${locale}/book/test?next=%22%3E%3Cscript%3E&x=1`));
  const html = await response.text();
  expect(html).toContain(`lang="${locale}"`);
  expect(html).toContain('href="?next=');
  expect(html).toContain('&amp;x=1');
  expect(html).not.toContain('<script>');
  expect(response.headers.get('x-robots-tag')).toBe('noindex');
});
