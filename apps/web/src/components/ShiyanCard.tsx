import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * 溯時嘅入口卡（2026-10-05，Issac 定名：「溯時」＋一行細字）：目錄頁底、一生十二步章尾。
 * 只畀有出生時間嘅書（有盤）出 —— 唔知真時辰就冇得對答案。
 */
export function ShiyanCard({ bookId }: { bookId: string }) {
  const t = useTranslations('shiyan');
  return (
    <aside className="ka mt-10 flex flex-col gap-3 p-6">
      <h2 className="font-serif text-h3 tracking-[0.2em]">{t('cardTitle')}</h2>
      <p className="font-serif text-body leading-[1.9] text-ink-2">{t('cardSub')}</p>
      <p className="text-cap tracking-[0.08em] text-ink-3">{t('cardBody')}</p>
      <Link href={`/book/${bookId}/shiyan`} className="lian self-start text-sm">
        {t('cardCta')} →
      </Link>
    </aside>
  );
}
