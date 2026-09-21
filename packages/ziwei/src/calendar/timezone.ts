/**
 * IANA 時區 → 該時刻嘅偏移（分鐘）。
 *
 * 用平台嘅 Intl 時區資料庫。注意：呢個係整個曆法層唯一一個唔係純算術
 * 嘅地方 —— 唔同 Node／瀏覽器版本嘅 ICU 資料有機會唔同（主要係遠古年份
 * 同埋近期先改過夏令時規則嘅地區）。所以 chart 會連 tz 一齊存落 DB，
 * 之後要重現就有得對。
 */
export function tzOffsetMinutes(
  timeZone: string,
  y: number,
  m: number,
  d: number,
  h = 12,
  min = 0,
): number | null {
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return null;
  }
  // 由「當地鐘面時間」反推偏移：先當佢係 UTC，再睇個時區會顯示成點
  const guess = Date.UTC(y, m - 1, d, h, min);
  const shown = readParts(fmt, guess);
  if (shown === null) return null;
  let offset = (shown - guess) / 60000;
  // 夏令時交界要迭代一次
  const shown2 = readParts(fmt, guess - offset * 60000);
  if (shown2 !== null) offset = (shown2 - (guess - offset * 60000)) / 60000;
  return Math.round(offset);
}

function readParts(fmt: Intl.DateTimeFormat, ms: number): number | null {
  const parts = fmt.formatToParts(new Date(ms));
  const get = (t: string) => {
    const p = parts.find((x) => x.type === t);
    return p ? Number(p.value) : NaN;
  };
  const y = get('year');
  const mo = get('month');
  const d = get('day');
  let h = get('hour');
  const mi = get('minute');
  const s = get('second');
  if ([y, mo, d, h, mi, s].some((n) => Number.isNaN(n))) return null;
  if (h === 24) h = 0;
  return Date.UTC(y, mo - 1, d, h, mi, s);
}
