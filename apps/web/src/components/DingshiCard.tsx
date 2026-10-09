import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * 推算時辰嘅入口卡（2026-10-09 · 測試中）：待時辰嘅書（冇時辰、冇盤）先出，擺喺目次最頂 ——
 * 嗰本書冇章可讀，呢張卡就係佢唯一可以做嘅嘢。
 */
export function DingshiCard({ bookId }: { bookId: string }) {
  const t = useTranslations('dingshi');
  return (
    <aside className="ka mb-10 flex flex-col gap-3 p-6">
      <h2 className="flex flex-wrap items-center gap-3 font-serif text-h3 tracking-[0.2em]">
        {t('cardTitle')}
        <span className="rounded-sm border border-cinnabar px-2 py-0.5 font-sans text-cap tracking-[0.08em] text-cinnabar">{t('badge')}</span>
      </h2>
      <p className="font-serif text-body leading-[1.9] text-ink-2">{t('cardBody')}</p>
      <Link href={`/book/${bookId}/dingshi`} className="btn-mo self-start">
        {t('cardCta')}
        <span className="btn-jiantou" aria-hidden="true">→</span>
      </Link>
    </aside>
  );
}
