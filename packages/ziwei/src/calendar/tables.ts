import raw from './tables.json';

/**
 * 曆法表（工單 B1）。
 *
 * 由 tools/gen-calendar/generate.py 離線生成，入 repo。
 * 唔好手改 —— 改咗 checksum 就會唔對，CI 會 fail。
 */

type Raw = {
  meta: Record<string, unknown>;
  termNames: string[];
  termsStartIndex: number;
  termsBase: number;
  termsDelta: number[];
  lunarYears: Record<string, [number, number, number, number]>;
  divergence: {
    note: string;
    publishedWins: Array<Record<string, unknown>>;
    computedTiebreak: Array<Record<string, unknown>>;
  };
};

const T = raw as unknown as Raw;

/**
 * 表嘅 sha256。測試會實算一次同呢個比對 ——
 * 表係整個系統嘅地基，唔可以靜靜雞變。
 * 重新生成表之後，用 `pnpm --filter @guanwei/ziwei run checksum` 攞新值。
 */
export const TABLES_CHECKSUM =
  '01496fe0cf9608360096c5abc74f8a7bbb6dc15edf259db6a8c395cb861c846e';

export const TABLES_META = T.meta;
export const TABLES_DIVERGENCE = T.divergence;

/** 中國曆法嘅時間基準：1929 年之前係北京地方平時。 */
const OLD_OFFSET_MIN = 7 * 60 + 45 + 40 / 60;
const NEW_OFFSET_MIN = 8 * 60;
/** 1929-01-01 00:00 (+08) 距離 1900-01-01T00:00Z 嘅分鐘數。 */
const SWITCH_UTC_MIN = Math.round((Date.UTC(1928, 11, 31, 16, 0, 0) - Date.UTC(1900, 0, 1)) / 60000);

export function chinaOffsetMinutes(utcMinutes: number): number {
  return utcMinutes >= SWITCH_UTC_MIN ? NEW_OFFSET_MIN : OLD_OFFSET_MIN;
}

/** 節氣時刻（UTC，由 1900-01-01T00:00Z 起計嘅分鐘）。 */
export const TERM_TIMES: number[] = (() => {
  const out = new Array<number>(T.termsDelta.length + 1);
  out[0] = T.termsBase;
  for (let i = 0; i < T.termsDelta.length; i++) {
    out[i + 1] = out[i]! + T.termsDelta[i]!;
  }
  return out;
})();

export const TERM_NAMES = T.termNames;
const TERM_START = T.termsStartIndex;

/** 第 i 個節氣嘅名。 */
export function termName(i: number): string {
  return TERM_NAMES[(TERM_START + i) % 24]!;
}

export type LunarYearRecord = {
  /** 正月初一嘅日序（由 1900-01-01 中國民用曆起計）。 */
  firstDay: number;
  /** 閏月月號，0 = 該年冇閏月。 */
  leapMonth: number;
  /** 每個月大小嘅 bitfield，第 i 位 = 1 代表大月（30 日）。 */
  lengthBits: number;
  /** 該年月數，12 或 13。 */
  monthCount: number;
};

export function lunarYearRecord(year: number): LunarYearRecord | null {
  const r = T.lunarYears[String(year)];
  if (!r) return null;
  return { firstDay: r[0], leapMonth: r[1], lengthBits: r[2], monthCount: r[3] };
}

export const LUNAR_YEAR_FROM = 1900;
export const LUNAR_YEAR_TO = 2100;
