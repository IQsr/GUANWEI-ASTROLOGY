'use server';

import { bookBirth, prepare, step, verdict } from '@/lib/dingshi.server';
import type { Asked, Step, Verdict } from '@/lib/dingshi-types';

/**
 * 書入面嘅時辰小實驗（2026-10-05）。
 *
 * 瀏覽器只交本書 id、時段同答案；生辰同真時辰由 server 喺本書讀（RLS：淨係主人讀得到），
 * 唔經瀏覽器。讀者剔咗同意先記錄（`consent`），記錄唔連書、唔連人（0003）。
 */
async function setup(bookId: string, band: number | null) {
  const b = await bookBirth(bookId).catch(() => null);
  if (!b) return null;
  const p = prepare(b.input, band);
  return p ? { p, truth: b.truth } : null;
}

/** `locale`：英文閱讀模式下題目用英文（2026-10-05） */
export async function shiyanStep(bookId: string, band: number | null, asked: Asked[], locale = 'zh-Hant'): Promise<({ ok: true } & Step) | { ok: false }> {
  const s = await setup(bookId, band);
  return s ? { ok: true, ...step(s.p, asked, locale === 'en' ? 'en' : 'zh') } : { ok: false };
}

export async function shiyanFinish(bookId: string, band: number | null, asked: Asked[], consent: boolean): Promise<Verdict | null> {
  const s = await setup(bookId, band);
  if (!s) return null;
  /* 真時辰喺時段之外（讀者揀錯時段）：照計，但真時辰唔喺候選入面 —— 記低都有用（量讀者揀時段準唔準） */
  return verdict(s.p, asked, s.truth, { record: consent, source: 'book' });
}
