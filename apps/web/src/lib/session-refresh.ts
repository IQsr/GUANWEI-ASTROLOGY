import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { parsePublicEnv } from './env';

// Vercel middleware must respond within 25s. Bound the entire SDK operation,
// including initialization/refresh waits that a fetch-only timeout cannot cover.
export const SESSION_REFRESH_TIMEOUT_MS = 5000;
type ChangedCookie = { name: string; value: string; options: CookieOptions };
type RefreshResult = { ok: true; cookies: ChangedCookie[] } | { ok: false; reason: 'timeout' | 'unavailable' };

export async function refreshSession(req: NextRequest): Promise<RefreshResult> {
  const env = parsePublicEnv({ url: process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });
  if (!env.ok) return { ok: true, cookies: [] };

  const started = Date.now();
  const controller = new AbortController();
  const changed = new Map<string, ChangedCookie>();
  const staged = new Map(req.cookies.getAll().map((c) => [c.name, c.value]));
  let active = true;
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      active = false;
      controller.abort();
      reject(new Error('session_refresh_timeout'));
    }, SESSION_REFRESH_TIMEOUT_MS);
  });
  try {
    const operation = async () => {
      const supabase = createServerClient(env.value.url, env.value.anonKey, {
        global: {
          fetch: (input, init) => {
            const incoming = init?.signal ?? (input instanceof Request ? input.signal : undefined);
            return fetch(input, { ...init, signal: incoming ? AbortSignal.any([controller.signal, incoming]) : controller.signal });
          },
        },
        cookies: {
          getAll: () => [...staged].map(([name, value]) => ({ name, value })),
          setAll: (list) => {
            // Never mutate an already-failed request or a returned response.
            if (!active) return;
            for (const { name, value, options } of list) {
              staged.set(name, value);
              changed.set(name, { name, value, options: options ?? {} });
            }
          },
        },
      });
      // Preserve the existing server-confirmed validation. A missing/invalid
      // session still reaches the page's usual auth/RLS checks; outages do not.
      const { error } = await supabase.auth.getUser();
      if (error && (error.name === 'AuthRetryableFetchError' || error.status === 429 || (error.status ?? 0) >= 500)) throw error;
    };
    await Promise.race([operation(), deadline]);
    const cookies = [...changed.values()];
    // next-intl must see the refreshed cookie in this very request, and the
    // browser must receive the same cookie on the response.
    for (const { name, value } of cookies) req.cookies.set(name, value);
    return { ok: true, cookies };
  } catch {
    const reason = timedOut ? 'timeout' : 'unavailable';
    console.warn('session_refresh_unavailable', { reason, elapsedMs: Date.now() - started });
    return { ok: false, reason };
  } finally {
    active = false;
    clearTimeout(timer);
    controller.abort();
  }
}
