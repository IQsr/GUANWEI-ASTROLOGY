import { englishChapters } from '@/lib/english';

/**
 * 2026-11-12 起，新版命宮、性格的骨架（reader-backed-v1）嘅英文直接由新中文譯（english.ts `freshEnglish`），
 * 唔再等於舊版快照；十一宮（palace-reader-v1）第二批起亦一樣。比較「其他層改動唔影響英文」嘅測試，用呢個剔走呢啲章再比；佢哋本身由 book-snapshot 快照睇。
 */
type Ch = { slug: string; text: string; slots: readonly string[]; reading?: unknown };
export function enNoMing(chs: readonly Ch[]) {
  const fresh = (c: Ch) => { const w = (c.reading as { writer?: string } | undefined)?.writer; return w === 'reader-backed-v1' || w === 'palace-reader-v1'; };
  return englishChapters(chs).filter((_, i) => !fresh(chs[i]!));
}
