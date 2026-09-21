import type { Result } from '../types';
import {
  LUNAR_YEAR_FROM,
  LUNAR_YEAR_TO,
  lunarYearRecord,
  type LunarYearRecord,
} from './tables';
import { daysFromEpoch, dateFromEpochDays } from './time';

export type LunarDate = {
  y: number;
  m: number;
  d: number;
  isLeapMonth: boolean;
};

export type LunarMonth = {
  month: number;
  isLeap: boolean;
  startDay: number;
  length: number;
};

/** 展開一個農曆年嘅所有月（按時序）。 */
export function monthsOf(year: number): LunarMonth[] | null {
  const r: LunarYearRecord | null = lunarYearRecord(year);
  if (!r) return null;
  const out: LunarMonth[] = [];
  let cur = r.firstDay;
  let m = 1;
  let usedLeap = false;
  for (let i = 0; i < r.monthCount; i++) {
    const length = (r.lengthBits >> i) & 1 ? 30 : 29;
    // 閏 X 月一定緊跟喺 X 月之後
    if (r.leapMonth && m === r.leapMonth + 1 && !usedLeap) {
      out.push({ month: r.leapMonth, isLeap: true, startDay: cur, length });
      usedLeap = true;
    } else {
      out.push({ month: m, isLeap: false, startDay: cur, length });
      m += 1;
    }
    cur += length;
  }
  return out;
}

/**
 * 中國民用曆日序 → 農曆日期。
 *
 * 「日序」係經過真太陽時同早／晚子時調整之後嗰一日 —— 呢一層唔負責
 * 嗰啲調整，只負責查表。
 */
export function lunarFromDayIndex(dayIndex: number): Result<LunarDate> {
  // 由 dayIndex 估個農曆年出嚟，再試前後一年
  const g = dateFromEpochDays(dayIndex);
  for (const y of [g.y, g.y - 1, g.y + 1]) {
    if (y < LUNAR_YEAR_FROM || y > LUNAR_YEAR_TO) continue;
    const ms = monthsOf(y);
    if (!ms) continue;
    for (const mo of ms) {
      if (dayIndex >= mo.startDay && dayIndex < mo.startDay + mo.length) {
        return {
          ok: true,
          value: {
            y,
            m: mo.month,
            d: dayIndex - mo.startDay + 1,
            isLeapMonth: mo.isLeap,
          },
        };
      }
    }
  }
  return {
    ok: false,
    code: 'OUT_OF_RANGE',
    message: `${g.y}-${g.m}-${g.d} 超出萬年曆範圍（${LUNAR_YEAR_FROM}–${LUNAR_YEAR_TO}）。`,
  };
}

/**
 * 農曆日期 → 國曆日期。
 *
 * 書本例盤多數只寫農曆生辰，所以呢個方向一樣要有。
 * 用戶自己記得農曆生日嗰陣（好常見）亦都用得著。
 */
export function solarFromLunar(
  y: number,
  m: number,
  d: number,
  isLeapMonth = false,
): Result<{ y: number; m: number; d: number }> {
  const ms = monthsOf(y);
  if (!ms) {
    return {
      ok: false,
      code: 'OUT_OF_RANGE',
      message: `農曆 ${y} 年超出萬年曆範圍（${LUNAR_YEAR_FROM}–${LUNAR_YEAR_TO}）。`,
    };
  }
  const mo = ms.find((x) => x.month === m && x.isLeap === isLeapMonth);
  if (!mo) {
    return {
      ok: false,
      code: 'OUT_OF_RANGE',
      message: `農曆 ${y} 年冇${isLeapMonth ? '閏' : ''}${m}月。`,
    };
  }
  if (!Number.isInteger(d) || d < 1 || d > mo.length) {
    return {
      ok: false,
      code: 'OUT_OF_RANGE',
      message: `農曆 ${y} 年${isLeapMonth ? '閏' : ''}${m}月只有 ${mo.length} 日，冇 ${d} 日。`,
    };
  }
  return { ok: true, value: dateFromEpochDays(mo.startDay + d - 1) };
}

/** 國曆日期 → 農曆日期。唔做任何時間調整。 */
export function lunarFromSolarDate(y: number, m: number, d: number): Result<LunarDate> {
  return lunarFromDayIndex(daysFromEpoch(y, m, d));
}
