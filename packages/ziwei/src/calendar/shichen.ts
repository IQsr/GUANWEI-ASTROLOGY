import type { Result, ShichenIndex } from '../types';
import { LUNAR_YEAR_FROM, LUNAR_YEAR_TO } from './tables';
import { daysFromEpoch, dateFromEpochDays } from './time';
import { solarTimeCorrection, type SolarTimeCorrection } from './true-solar-time';

export const SHICHEN_NAMES = [
  '子', '丑', '寅', '卯', '辰', '巳',
  '午', '未', '申', '酉', '戌', '亥',
] as const;

export type ResolvedMoment = {
  /** 經調整之後用嚟查農曆嘅日序（中國民用曆日序）。 */
  dayIndex: number;
  /** 經調整之後嘅國曆日期。 */
  solarDate: { y: number; m: number; d: number };
  /** 時辰。0 = 子時。 */
  shichen: ShichenIndex;
  /** 真太陽時嘅當日分鐘數（0–1439）。 */
  apparentMinutes: number;
  /** 因為 23:00 之後歸入翌日子時而進位咗幾多日（0 或 1）。 */
  dayShift: number;
  correction: SolarTimeCorrection;
};

export type ResolveOptions = {
  trueSolarTime: boolean;
  lateZiHour: 'next-day' | 'same-day';
};

/**
 * 由鐘面時間解出「排盤用嘅日 + 時辰」。
 *
 * 兩個調整，次序唔可以掉轉：
 *   1. 真太陽時 —— 鐘面時間加經度校正同均時差
 *   2. 早／晚子時 —— 23:00 之後歸入翌日子時（預設），日進位
 *
 * 日期基準用**出生地當地日期**，唔係中國時間。一個喺倫敦朝早出生嘅人，
 * 佢嘅生日係倫敦嗰日；用中國時間會將佢推去第二日。
 */
export function resolveMoment(
  solar: { y: number; m: number; d: number },
  clock: { h: number; min: number },
  longitude: number,
  tzOffsetMinutes: number,
  options: ResolveOptions,
): Result<ResolvedMoment> {
  if (solar.y < LUNAR_YEAR_FROM || solar.y > LUNAR_YEAR_TO) {
    return {
      ok: false,
      code: 'OUT_OF_RANGE',
      message: `${solar.y} 年超出萬年曆範圍（${LUNAR_YEAR_FROM}–${LUNAR_YEAR_TO}）。`,
    };
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { ok: false, code: 'BAD_PLACE', message: `經度 ${longitude} 唔合法。` };
  }
  if (clock.h < 0 || clock.h > 23 || clock.min < 0 || clock.min > 59) {
    return { ok: false, code: 'UNKNOWN_HOUR', message: '時間唔合法。' };
  }

  const hourUtc = clock.h - tzOffsetMinutes / 60;
  const correction = solarTimeCorrection(
    longitude,
    tzOffsetMinutes,
    solar.y,
    solar.m,
    solar.d,
    hourUtc,
  );

  const clockMinutes = clock.h * 60 + clock.min;
  const shifted = options.trueSolarTime
    ? clockMinutes + correction.totalMinutes
    : clockMinutes;

  // 校正可能推過午夜（兩邊都有可能）
  let dayIndex = daysFromEpoch(solar.y, solar.m, solar.d);
  let apparent = shifted;
  while (apparent < 0) {
    apparent += 1440;
    dayIndex -= 1;
  }
  while (apparent >= 1440) {
    apparent -= 1440;
    dayIndex += 1;
  }

  // 時辰：子時橫跨 23:00–01:00，所以先推前一個鐘再除 120 分鐘
  const shichen = (Math.floor((apparent + 60) / 120) % 12) as ShichenIndex;

  let dayShift = 0;
  if (options.lateZiHour === 'next-day' && apparent >= 23 * 60) {
    dayIndex += 1;
    dayShift = 1;
  }

  return {
    ok: true,
    value: {
      dayIndex,
      solarDate: dateFromEpochDays(dayIndex),
      shichen,
      apparentMinutes: Math.round(apparent),
      dayShift,
      correction,
    },
  };
}
