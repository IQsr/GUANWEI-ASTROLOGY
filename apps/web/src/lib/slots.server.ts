import 'server-only';
import { resolveBirthMoment } from '@guanwei/ziwei';
import { PLACES } from '@/lib/luokuan';
import { slotsOfDay, type Slot } from '@/lib/slots';

/**
 * 呢一日、呢個出生地，每個時辰對應鐘面幾點到幾點（落款第四步）。
 *
 * ⚠ 喺 server 行：要用引擎，而引擎唔准落 client bundle（架構 §9）。
 * 由 `/api/slots` 叫（POST，唔用 server action —— 落款換步嗰陣會
 * `history.replaceState`，server action 排緊隊嗰次會冇咗）。
 * 用同 `cast()` 一樣嘅 `resolveBirthMoment`、一樣嘅預設規則 ——
 * 所以呢度話「未時 = 13:36–15:35」，排盤就一定落未時。
 *
 * ⚠ 呢個係公開 endpoint 後面嘅嘢：收到乜都驗過先用，唔啱就回 null
 * （畫面照樣可以填準確時間）。
 */
export function slotsFor(date: unknown, placeIndex: unknown, timeBasis: unknown = 'birthplace'): Slot[] | null {
  if (typeof date !== 'string') return null;
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m || typeof placeIndex !== 'number' || !Number.isInteger(placeIndex)) return null;
  const place = PLACES[placeIndex];
  if (!place) return null;
  /* 洛陽時間（R-004）：時辰分界跟洛陽時間計，同排盤一樣 */
  if (timeBasis !== 'birthplace' && timeBasis !== 'luoyang') return null;
  const basis: 'birthplace' | 'luoyang' = timeBasis;

  const solar = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  const base = {
    solar,
    tz: place.tz,
    place: { lng: place.lng, lat: place.lat, label: place.label },
    /* 性別唔影響時辰；型別要一個值 */
    sex: 'male' as const,
    options: { timeBasis: basis },
  };

  return slotsOfDay((minute) => {
    const r = resolveBirthMoment({ ...base, time: { h: Math.floor(minute / 60), min: minute % 60 } });
    return r.ok ? { shichen: r.value.moment.shichen, dayIndex: r.value.moment.dayIndex } : null;
  });
}
