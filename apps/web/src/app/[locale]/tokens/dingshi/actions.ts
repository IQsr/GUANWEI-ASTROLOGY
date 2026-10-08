'use server';

import type { ShichenIndex } from '@guanwei/ziwei';
import { PLACES } from '@/lib/luokuan';
import { cleanAsked, prepare, step, verdict } from '@/lib/dingshi.server';
import type { Asked, Step, Verdict } from '@/lib/dingshi-types';
import { tokensEnabled } from '@/lib/tokens-gate';

/**
 * 定時辰驗證頁（內部）嘅 server action。計法喺 `lib/dingshi.server.ts`，同書入面嘅小實驗共用。
 * 呢頁要試用者自己入生日（佢未必有書）。
 */

export type Birth = { date: string; placeIndex: number; sex: 'male' | 'female'; band: number | null };

function setup(b: Birth) {
  /* 頁面 404 都 call 得到個 action：呢度自己再擋 */
  if (!tokensEnabled()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b.date);
  const place = PLACES[b.placeIndex];
  if (!m || !place) return null;
  return prepare(
    {
      solar: { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) },
      tz: place.tz,
      place: { lng: place.lng, lat: place.lat, label: place.label },
      sex: b.sex,
    },
    b.band,
  );
}

export async function nextStep(b: Birth, asked: Asked[]): Promise<({ ok: true } & Step) | { ok: false }> {
  const p = setup(b);
  return p ? { ok: true, ...step(p, cleanAsked(asked)) } : { ok: false };
}

export async function finish(b: Birth, asked: Asked[], trueShichen: number | null): Promise<Verdict | null> {
  const p = setup(b);
  if (!p) return null;
  const truth = trueShichen !== null && trueShichen >= 0 && trueShichen <= 11 ? (trueShichen as ShichenIndex) : null;
  /* 0005：冇書唔記（真時辰係自己講，信唔過） */
  return verdict(p, cleanAsked(asked), truth, { record: false, source: 'tokens' });
}
