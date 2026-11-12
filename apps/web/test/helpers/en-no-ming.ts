import { englishChapters } from '@/lib/english';

/**
 * 2026-11-12 起，新版命宮、性格的骨架（reader-backed-v1）嘅英文直接由新中文譯（english.ts `freshEnglish`），
 * 唔再等於舊版快照。比較「其他層改動唔影響英文」嘅測試，用呢個剔走呢兩章再比；兩章本身由 book-snapshot 快照睇。
 */
type Ch = { slug: string; text: string; slots: readonly string[]; reading?: unknown };
export function enNoMing(chs: readonly Ch[]) {
  return englishChapters(chs).filter((_, i) => chs[i]!.slug !== '命宮' && chs[i]!.slug !== '性格的骨架');
}
