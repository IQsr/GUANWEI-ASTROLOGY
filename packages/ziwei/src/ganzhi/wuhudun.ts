import { STEMS, type Stem } from '../types';

/**
 * 五虎遁：由年干推寅月（或寅宮）嘅天干。
 *
 *   甲己之年丙作首
 *   乙庚之歲戊為頭
 *   丙辛必定尋庚起
 *   丁壬壬位順行流
 *   戊癸何方發，甲寅之上好追求
 *
 * 斗數用佢嚟定十二宮嘅天干（由寅宮起順排），八字用佢嚟定月干。
 */
export function yinPalaceStemIndex(yearStem: Stem): number {
  const y = STEMS.indexOf(yearStem);
  if (y < 0) return -1;
  return ((y % 5) * 2 + 2) % 10;
}

export function yinPalaceStem(yearStem: Stem): Stem {
  return STEMS[yinPalaceStemIndex(yearStem)]!;
}

/**
 * 五鼠遁：由日干推子時嘅天干。
 *
 *   甲己還加甲　乙庚丙作初　丙辛從戊起
 *   丁壬庚子居　戊癸何方發　壬子是真途
 */
export function ziHourStemIndex(dayStem: Stem): number {
  const d = STEMS.indexOf(dayStem);
  if (d < 0) return -1;
  return ((d % 5) * 2) % 10;
}
