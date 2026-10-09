import { useTranslations } from 'next-intl';
import { PageTurnLink } from '@/components/PageTurnLink';
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
  const t = useTranslations('chapter');
  const tb = useTranslations('book');
  return (
    /* 手機（2026-10-09）：兩張卡並排，「目次」落第二行置中 —— 英文章名長，夾喺三欄入面會逐個字一行 */
    <nav aria-label={t('nav')} className="banxin mt-16 grid grid-cols-2 items-stretch gap-3 border-t jielan pt-8 sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
      {prev ? (
        <PageTurnLink direction="prev" href={chapterHref(bookId, prev.slug)} className="ka group flex flex-col gap-1 px-4 py-4 sm:px-5">
          <span className="text-cap tracking-[0.16em] text-ink-3">{t('prev')}</span>
          <span className="font-serif tracking-[0.08em] text-ink">{prev.title}</span>
        </PageTurnLink>
      ) : (
        <span />
      )}

      <PageTurnLink
        direction="prev"
        href={contentsHref(bookId)}
        className="order-last col-span-2 self-center justify-self-center px-2 py-2 text-cap tracking-[0.2em] text-ink-3 transition-colors duration-200 hover:text-ink sm:order-none sm:col-span-1 sm:py-0"
      >
        {t('contents')}
      </PageTurnLink>

      {next ? (
        <PageTurnLink direction="next" href={chapterHref(bookId, next.slug)} className="ka group flex flex-col items-end gap-1 px-4 py-4 text-end sm:px-5">
          <span className="text-cap tracking-[0.16em] text-ink-3">{t('next')}</span>
          <span className="font-serif tracking-[0.08em] text-ink">
            {next.title}
            {next.tier === 'deep' ? (
              <span className="ms-3 text-cap tracking-[0.14em] text-gold-ink">{tb('uncutTag')}</span>
            ) : null}
          </span>
        </PageTurnLink>
      ) : (
        <span />
      )}
    </nav>
  );
}
