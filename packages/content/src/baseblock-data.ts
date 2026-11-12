/**
 * 基塊實例（工單 C4 / C5）
 *
 * C4 = 前六星 × 十二宮 = 72 條。C5 = 後八星 × 十二宮 = 96 條。
 * 加埋 168 格 —— 十四主星 × 十二宮，一格不缺。
 */
import c4 from './lexicon/base-c4.json';
import c5 from './lexicon/base-c5.json';
import { buildBaseBlocks, mostSimilar, PALACE_TOPIC, type BaseBlock } from './baseblock';

export const BASE_BLOCKS: BaseBlock[] = buildBaseBlocks([
  ...(c4 as unknown[]),
  ...(c5 as unknown[]),
]);

export const C4_STARS = ['紫微', '天府', '太陽', '太陰', '武曲', '天機'] as const;
export const C5_STARS = ['天同', '廉貞', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'] as const;

export function baseBlockOf(star: string, palace: string): BaseBlock | null {
  return BASE_BLOCKS.find((b) => b.star === star && b.palace === palace) ?? null;
}

/** 168 格入面填咗幾多。呢個數應該公開。 */
export function baseCoverage() {
  const target = (C4_STARS.length + C5_STARS.length) * 12;
  const inSet = (set: readonly string[]) => BASE_BLOCKS.filter((b) => set.includes(b.star)).length;
  return { done: BASE_BLOCKS.length, target, c4: inSet(C4_STARS), c5: inSet(C5_STARS) };
}

export { mostSimilar, PALACE_TOPIC };
