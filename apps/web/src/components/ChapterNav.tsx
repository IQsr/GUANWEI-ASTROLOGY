import { Link } from '@/i18n/navigation';
import { chapterHref, contentsHref, type ChapterLink } from '@/lib/journey';

/**
 * 章尾：上一章 · 目次 · 下一章（重新設計第二期）
 *
 * 之前讀完一章，唯一出路係返目次再揀 —— 一本書唔係噉讀嘅。
 *
 * ⚠ 下一章係未裁章都照出，而且標明「未裁」。撳入去見到一版未裁嘅紙，
 * 係一本書本來嘅樣；收埋佢反而令人唔知後面仲有嘢。
 */
export function ChapterNav({
  bookId,
  prev,
  next,
}: {
  bookId: string;
  prev: ChapterLink | null;
  next: ChapterLink | null;
}) {
  return (
    <nav aria-label="章節" className="banxin mt-16 grid grid-cols-[1fr_auto_1fr] items-stretch gap-4 border-t jielan pt-8">
      {prev ? (
        <Link href={chapterHref(bookId, prev.slug)} className="ka group flex flex-col gap-1 px-5 py-4">
          <span className="text-cap tracking-[0.16em] text-ink-3">← 上一章</span>
          <span className="font-serif tracking-[0.08em] text-ink">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}

      <Link
        href={contentsHref(bookId)}
        className="self-center px-2 text-cap tracking-[0.2em] text-ink-3 transition-colors duration-200 hover:text-ink"
      >
        目次
      </Link>

      {next ? (
        <Link href={chapterHref(bookId, next.slug)} className="ka group flex flex-col items-end gap-1 px-5 py-4 text-end">
          <span className="text-cap tracking-[0.16em] text-ink-3">下一章 →</span>
          <span className="font-serif tracking-[0.08em] text-ink">
            {next.title}
            {next.tier === 'deep' ? (
              <span className="ms-3 text-cap tracking-[0.14em] text-gold-ink">未裁</span>
            ) : null}
          </span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
