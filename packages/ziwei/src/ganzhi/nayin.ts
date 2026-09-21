import type { WuxingJu } from '../types';
import type { Pillar } from './sexagenary';
import { indexFromPillar } from './sexagenary';

/**
 * 六十甲子納音（三十對）。純資料 —— 兩個干支共用一個納音。
 *
 * 斗數用佢嚟定五行局：命宮干支嘅納音五行 → 水二／木三／金四／土五／火六。
 */
export const NAYIN = [
  '海中金', '爐中火', '大林木', '路旁土', '劍鋒金',
  '山頭火', '澗下水', '城頭土', '白蠟金', '楊柳木',
  '泉中水', '屋上土', '霹靂火', '松柏木', '長流水',
  '沙中金', '山下火', '平地木', '壁上土', '金箔金',
  '覆燈火', '天河水', '大驛土', '釵釧金', '桑柘木',
  '大溪水', '沙中土', '天上火', '石榴木', '大海水',
] as const;

export type NayinElement = '金' | '木' | '水' | '火' | '土';

/** 納音名嘅最後一個字就係五行。 */
export function nayinOfIndex(index: number): { name: string; element: NayinElement } {
  const i = ((index % 60) + 60) % 60;
  const name = NAYIN[Math.floor(i / 2)]!;
  return { name, element: name[name.length - 1] as NayinElement };
}

export function nayinOfPillar(p: Pillar): { name: string; element: NayinElement } | null {
  const i = indexFromPillar(p.stem, p.branch);
  return i === null ? null : nayinOfIndex(i);
}

/** 納音五行 → 五行局。局數同時係大限起運歲數。 */
export const JU_BY_ELEMENT: Record<NayinElement, WuxingJu> = {
  水: { name: '水二局', n: 2 },
  木: { name: '木三局', n: 3 },
  金: { name: '金四局', n: 4 },
  土: { name: '土五局', n: 5 },
  火: { name: '火六局', n: 6 },
};
