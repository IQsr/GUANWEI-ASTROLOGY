import { useTranslations } from 'next-intl';
import { PageTurnLink } from '@/components/PageTurnLink';
import { chapterHref } from '@/lib/journey';
import type { AskItem } from '@/lib/wenmu';

/**
 * 目次問目「你想知甚麼」（2026-10-14 · 樣板 `/tokens/zhuti` 揀咗詳細版）
 *
 * 問題（讀者講法）→ 宮名 ＋ 白話副題 → 該章第一段 → 《…》一句 → 第一段出處 → 讀全章。
 * 書嘅樣：細線分題，冇圓角卡、冇陰影、冇分數（試讀回饋：唔要 app 嘅樣）。
 * 純 props；資料由 `buildAsks()` 砌好先傳入嚟。
 */
export function Wenmu({
  bookId,
  items,
  titles,
}: {
  bookId: string;
  items: readonly AskItem[];
  /** slug → 已按 locale 顯示嘅章名 */
  titles: Readonly<Record<string, string>>;
}) {
  const t = useTranslations('book.asks');
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="xiang-zhi" className="shu-jie">
      <h2 id="xiang-zhi" className="shu-xiao-biao">
        {t('title')}
      </h2>
      <p className="text-sm">{t('lead')}</p>
      <ol className="mt-4 list-none p-0">
        {items.map((it) => (
          <li key={it.key} className="border-t jielan py-6 first:border-t-0 first:pt-2">
            <PageTurnLink href={chapterHref(bookId, it.slug)} className="group block">
              <h3 className="font-serif text-lead tracking-[0.1em] text-ink group-hover:text-cinnabar">
                {t(`q.${it.key}.ask`)}
              </h3>
              <span className="mt-1 block text-cap tracking-[0.16em] text-ink-3">{t(`q.${it.key}.sub`)}</span>
              <span className="mt-3 block font-serif text-body leading-[1.95] text-ink-2">{it.answer}</span>
              {it.quote ? (
                <span className="mt-2 block font-serif text-sm leading-[1.9] text-ink-3">
                  <span className="me-2 text-cinnabar" aria-hidden="true">
                    ｜
                  </span>
                  {it.quote}
                </span>
              ) : null}
              {/* 第一段嘅出處（2026-10-18 · A2）：同閱讀頁「據」一樣，書名、頁、節 */}
              {it.sources.map((s) => (
                <span key={s.id} className="mt-1 block text-cap leading-[1.8] tracking-[0.06em] text-ink-3">
                  <span className="me-2 text-cinnabar">{t('sourceMark')}</span>
                  {t(s.pageConvention === 'pdf' ? 'sourcePdf' : 'source', { book: s.book, page: s.page, section: s.section })}
                </span>
              ))}
              <span className="mt-3 block text-cap tracking-[0.16em] text-ink-3 group-hover:text-cinnabar">
                {t('readAll', { title: titles[it.slug] ?? it.slug })} <span aria-hidden="true">→</span>
              </span>
            </PageTurnLink>
          </li>
        ))}
      </ol>
    </section>
  );
}
