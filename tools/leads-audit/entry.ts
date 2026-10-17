import { cast } from '@guanwei/ziwei';
import { bookChapters } from '../../apps/web/src/lib/mingshu';
import { tierOf } from '../../apps/web/src/lib/chengshu';
export function book(y: number, m: number, d: number, h: number, sex: 'male' | 'female', seed: string) {
  const r = cast({ solar: { y, m, d }, time: { h, min: 15 }, tz: 'Asia/Hong_Kong', place: { lat: 22.3193, lng: 114.1694 }, sex });
  if (!r.ok) return null;
  const ch = bookChapters(r.value, { seed, year: 2026, solar: { y, m, d }, place: '香港' });
  return ch?.map((c) => ({ slug: c.slug, tier: tierOf(c.slug), text: c.text, slots: c.slots })) ?? null;
}
