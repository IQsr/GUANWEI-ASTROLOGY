'use server';

import { cleanAsked, pendingBirth, prepare, step, verdict } from '@/lib/dingshi.server';
import type { Asked, Step, Verdict } from '@/lib/dingshi-types';
import { zhFor } from '@/lib/hans';

/**
 * 推算時辰（2026-10-09 · 測試中）：唔知時辰嘅讀者，由過去經歷反推。
 * 生辰由 server 喺本書讀（RLS：淨係本書主人）；冇真時辰，唔記錄。
 */
async function setup(bookId: string, band: number | null) {
  const input = await pendingBirth(bookId).catch(() => null);
  return input ? prepare(input, band) : null;
}

export async function dingshiStep(bookId: string, band: number | null, asked: Asked[], locale = 'zh-Hant'): Promise<({ ok: true } & Step) | { ok: false }> {
  const p = await setup(bookId, band);
  if (!p) return { ok: false };
  const r = step(p, cleanAsked(asked), locale === 'en' ? 'en' : 'zh');
  return { ok: true, ...(r.done ? r : { ...r, text: zhFor(locale, r.text) }) };
}

export async function dingshiFinish(bookId: string, band: number | null, asked: Asked[]): Promise<Verdict | null> {
  const p = await setup(bookId, band);
  if (!p) return null;
  return verdict(p, cleanAsked(asked), null, { record: false, source: 'book' });
}
