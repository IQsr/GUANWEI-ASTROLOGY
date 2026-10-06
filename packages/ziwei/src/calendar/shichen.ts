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
  /** 預設 birthplace；luoyang 見下面 */
  timeBasis?: 'birthplace' | 'luoyang';
  /** 鐘面時間入面有幾多分鐘係夏令時（luoyang 要先還原做標準時，講義：夏令時「應改為」早一小時） */
  dstMinutes?: number;
};

/**
 * 洛陽經度（2026-10-06，R-004）。王亭之《初級講義》甲、安星法（一）：
 *   「本派起出生時是以『洛陽』地區作為絕對標準，每與洛陽相差十五度經線便有一個小時之時差。」
 *   「上海……在推算紫微斗數時，便有三十五分鐘的時差」（121.47 − 112.45 = 9.02° ≈ 36 分鐘，對得上）
 * 只做經度，冇均時差 —— 講義冇講均時差。
 *
 * ⚠ 點加減（2026-10-06 對過講義兩個數字）：講義係用「出生地經度同洛陽相差幾度」直接加減落
 *   **當地標準時間**，唔係換算做洛陽真正嘅地方時：
 *     上海　(121.47 − 112.45) × 4 ≈ 36 分鐘　講義「三十五分鐘」
 *     香港　(114.17 − 112.45) × 4 ≈  7 分鐘　講義「七分半鐘」
 *   如果換算做洛陽真地方時（UTC ＋ 7:30），香港會差 30 分鐘，對唔上講義。所以照講義：
 *     洛陽時間 ＝ 當地標準時間（夏令時先減走）−（出生地經度 − 112.45）× 4 分鐘
 *   倫敦（標準時≈UTC、經度≈0）兩種算法差唔多：朝早八點 → 下晝三點半。
 */
export const LUOYANG_LNG = 112.45;

/**
 * 由鐘面時間解出「排盤用嘅日 + 時辰」。
 *
 * 兩個調整，次序唔可以掉轉：
 *   1. 真太陽時 —— 鐘面時間加經度校正同均時差
 *   2. 早／晚子時 —— 23:00 之後歸入翌日子時（預設），日進位
 *
 * 日期基準用**出生地當地日期**，唔係中國時間。一個喺倫敦朝早出生嘅人，
 * 佢嘅生日係倫敦嗰日；用中國時間會將佢推去第二日。
 *
 * `timeBasis: 'luoyang'`（中州派講義，用戶揀）：唔用出生地太陽，按講義將時間換算成
 * 洛陽時間（見 `LUOYANG_LNG`），時辰同日子都由洛陽時間定。
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
  const shifted =
    options.timeBasis === 'luoyang'
      ? clockMinutes - (options.dstMinutes ?? 0) - (longitude - LUOYANG_LNG) * 4
      : options.trueSolarTime
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
