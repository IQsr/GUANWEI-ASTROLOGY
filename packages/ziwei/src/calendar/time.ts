/** 曆法層共用嘅時間工具。全部係純算術，冇 Date 嘅時區行為。 */

/** 由 1900-01-01（UTC 或中國民用曆，睇語境）起計嘅日序。 */
export function daysFromEpoch(y: number, m: number, d: number): number {
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 1)) / 86400000);
}

export function dateFromEpochDays(days: number): { y: number; m: number; d: number } {
  const t = new Date(Date.UTC(1900, 0, 1) + days * 86400000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** 一年入面嘅第幾日（1 = 1月1日）。 */
export function dayOfYear(y: number, m: number, d: number): number {
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
}

export function isLeapGregorianYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
