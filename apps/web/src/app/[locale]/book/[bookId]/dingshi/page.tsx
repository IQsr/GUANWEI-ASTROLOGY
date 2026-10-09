import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Juanshou, backToContents } from '@/components/Juanshou';
import { DingshiFind } from '@/components/DingshiFind';
import { pendingBirth } from '@/lib/dingshi.server';

/**
 * 推算時辰（2026-10-09 · 測試中）：待時辰嘅書，由讀者嘅過去反推可能嘅時辰。
 *
 * 入口：待時辰書嘅目次頂、落款揀「不知道時辰」之後嗰版。
 * 私密層：noindex，本書主人先讀到生辰（RLS）。有時辰嘅書行「溯時」（/shiyan）。
 */
export const dynamicParams = true;
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dingshi' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default async function DingshiPage({ params }: { params: Promise<{ locale: string; bookId: string }> }) {
  const { locale, bookId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dingshi');
  const birth = await pendingBirth(bookId).catch(() => null);

  return (
    <main className="juan tai">
      <Juanshou back={backToContents(bookId)} title={t('title')} />
      {birth ? <DingshiFind bookId={bookId} /> : <p className="banxin text-body leading-[1.95] text-ink-2">{t('unavailable')}</p>}
    </main>
  );
}
