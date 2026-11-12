import { japaneseChapters } from '@/lib/japanese';

/**
 * 2026-11-12 日文第一批：新版命宮、性格的骨架（reader-backed-v1）嘅日文直接由新中文譯（japanese.ts `freshJapanese`），
 * 唔再等於舊版快照。比較「其他層改動唔影響日文」嘅測試，用呢個按章名剔走呢兩章再比（做法同 en-no-ming.ts）；
 * 佢哋本身由 japanese-fresh-ming.test.ts 睇。十一宮、給你的話切換時喺度加章名。
 */
type Ch = { slug: string; text: string; slots: readonly string[]; reading?: unknown };
const FRESH = new Set<string>(['命宮', '性格的骨架']);
export function jaNoMing(chs: readonly Ch[]) {
  return japaneseChapters(chs).filter((_, i) => !FRESH.has(chs[i]!.slug));
}
