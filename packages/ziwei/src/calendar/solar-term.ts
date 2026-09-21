import { TERM_TIMES, termName, chinaOffsetMinutes } from './tables';
import { dateFromEpochDays } from './time';

export type SolarTerm = {
  /** 節氣序號（0 = 表入面第一個）。 */
  index: number;
  name: string;
  /** UTC，由 1900-01-01T00:00Z 起計嘅分鐘。 */
  utcMinutes: number;
};

export function termAt(index: number): SolarTerm | null {
  const t = TERM_TIMES[index];
  if (t === undefined) return null;
  return { index, name: termName(index), utcMinutes: t };
}

export const TERM_COUNT = TERM_TIMES.length;

/** 喺 utcMinutes 之前（含）最近嘅節氣。二分搜尋。 */
export function termBefore(utcMinutes: number): SolarTerm | null {
  let lo = 0;
  let hi = TERM_TIMES.length - 1;
  if (utcMinutes < TERM_TIMES[0]!) return null;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (TERM_TIMES[mid]! <= utcMinutes) lo = mid;
    else hi = mid - 1;
  }
  return termAt(lo);
}

/** 節氣落喺中國民用曆嘅邊一日。 */
export function termLocalDate(index: number): { y: number; m: number; d: number } | null {
  const t = termAt(index);
  if (!t) return null;
  const localMin = t.utcMinutes + chinaOffsetMinutes(t.utcMinutes);
  return dateFromEpochDays(Math.floor(localMin / 1440));
}

/** 某個公曆年入面所有節氣。 */
export function termsInYear(year: number): SolarTerm[] {
  const out: SolarTerm[] = [];
  for (let i = 0; i < TERM_TIMES.length; i++) {
    const d = termLocalDate(i);
    if (!d) continue;
    if (d.y === year) out.push(termAt(i)!);
    if (d.y > year) break;
  }
  return out;
}
