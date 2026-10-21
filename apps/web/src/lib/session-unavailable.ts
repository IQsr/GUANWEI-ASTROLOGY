import type { NextRequest } from 'next/server';
import copy from '../../messages/session-unavailable.json';
import { routing } from '../i18n/routing';

export function sessionUnavailable(req: NextRequest): Response {
  const prefix = req.nextUrl.pathname.split('/')[1];
  const preferred = prefix && Object.hasOwn(copy, prefix) ? prefix : req.cookies.get('NEXT_LOCALE')?.value;
  const locale = preferred && Object.hasOwn(copy, preferred) ? preferred as keyof typeof copy : routing.defaultLocale;
  const text = copy[locale];
  // Query-only href keeps the same origin and path, even for unusual encoded
  // paths. Explicit navigation retries a GET; never automatically replay POSTs.
  const retry = `?${req.nextUrl.searchParams.toString()}`.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return new Response(`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${text.title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#16251f;color:#e5d6b7;font-family:Georgia,serif}main{max-width:32rem;padding:2rem;line-height:1.8}h1{font-size:1.7rem;font-weight:500}a{color:#e5d6b7;display:inline-block;padding:.6rem 1rem;border:1px solid #c9ad74;margin-top:1rem}</style></head><body><main><p>STELLOGUE</p><h1>${text.title}</h1><p>${text.body}</p><a href="${retry}">${text.retry}</a></main></body></html>`, {
    status: 503,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store', 'retry-after': '3', 'x-robots-tag': 'noindex', 'vary': 'Cookie, Accept-Language' },
  });
}
