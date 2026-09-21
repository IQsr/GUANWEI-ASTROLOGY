import { dayOfYear } from './time';

/**
 * 均時差（equation of time），單位分鐘。
 *
 * 用 NOAA 嘅傅立葉近似式，誤差約 ±0.3 分鐘 —— 對 2 小時一個嘅時辰嚟講
 * 綽綽有餘。呢條式唔使查表、唔使天文庫，所以曆法表入面冇均時差表。
 *
 * 正值 = 真太陽時行先過平太陽時。
 */
export function equationOfTimeMinutes(
  y: number,
  m: number,
  d: number,
  hourUtc = 12,
): number {
  const n = dayOfYear(y, m, d);
  const gamma = ((2 * Math.PI) / 365) * (n - 1 + (hourUtc - 12) / 24);
  return (
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))
  );
}

export type SolarTimeCorrection = {
  /** 經度校正（分鐘）：出生地經度同時區標準經線嘅差。 */
  longitudeMinutes: number;
  /** 均時差（分鐘）。 */
  equationOfTimeMinutes: number;
  /** 兩者之和，加落鐘面時間就係真太陽時。 */
  totalMinutes: number;
};

/**
 * 真太陽時校正。
 *
 * 香港（114.17°E，用 +08:00 即標準經線 120°E）差 −23 分鐘；
 * 倫敦（0°，用 +00:00）差 0 分鐘，但夏令時嗰半年差 −60 分鐘。
 * 唔校正係**系統性**錯誤，唔係偶然錯 —— 同一個城市永遠錯同一個方向。
 */
export function solarTimeCorrection(
  longitude: number,
  tzOffsetMinutes: number,
  y: number,
  m: number,
  d: number,
  hourUtc = 12,
): SolarTimeCorrection {
  // 時區標準經線 = 時區偏移（小時）× 15°
  const standardMeridian = (tzOffsetMinutes / 60) * 15;
  const longitudeMinutes = (longitude - standardMeridian) * 4;
  const eot = equationOfTimeMinutes(y, m, d, hourUtc);
  return {
    longitudeMinutes,
    equationOfTimeMinutes: eot,
    totalMinutes: longitudeMinutes + eot,
  };
}
