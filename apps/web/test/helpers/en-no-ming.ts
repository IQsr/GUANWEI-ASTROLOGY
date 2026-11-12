import { englishChapters } from '@/lib/english';
import { PALACE_READER_SLUGS } from '@guanwei/content/ming-version';

/**
 * 2026-11-12 起，新版命宮、性格的骨架（reader-backed-v1）、十一宮（palace-reader-v1）、給你的話（epilogue-reader-v1）
 * 嘅英文直接由新中文譯（english.ts `freshEnglish`），唔再等於舊版快照。比較「其他層改動唔影響英文」嘅測試，
 * 用呢個按章名剔走呢啲章再比（舊版嗰邊嘅同名章 writer 可能唔同，所以唔可以按 writer 剔）；佢哋本身由 book-snapshot 快照睇。
 */
type Ch = { slug: string; text: string; slots: readonly string[]; reading?: unknown };
const FRESH = new Set<string>(['命宮', '性格的骨架', '給你的話', ...PALACE_READER_SLUGS]);
export function enNoMing(chs: readonly Ch[]) {
  return englishChapters(chs).filter((_, i) => !FRESH.has(chs[i]!.slug));
}
