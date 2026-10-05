import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Juanshou, backToContents } from '@/components/Juanshou';
import { ShiyanTrial } from '@/components/ShiyanTrial';
import { bookBirth } from '@/lib/dingshi.server';

/**
 * 時辰小實驗（2026-10-05）：讀者知道自己時辰，我哋試吓淨係由佢嘅過去猜返出嚟。
 *
 * 入口：目錄頁底、一生十二步章尾（只係有出生時間嘅書先出）。
 * 數據（讀者同意先記）用嚟校準定時辰 —— 將來畀唔知時辰嘅人用嗰個收費功能（見 docs、rectify-sim）。
 * 私密層：noindex，同本書其他頁一樣要係本書主人先讀到生辰（RLS）。
 */
export const dynamicParams = true;
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'shiyan' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default async function ShiyanPage({ params }: { params: Promise<{ locale: string; bookId: string }> }) {
  const { locale, bookId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('shiyan');
  const birth = await bookBirth(bookId).catch(() => null);

  return (
    <main className="juan tai">
      <Juanshou back={backToContents(bookId)} title={t('title')} />
      {birth ? <ShiyanTrial bookId={bookId} /> : <p className="banxin text-body leading-[1.95] text-ink-2">{t('unavailable')}</p>}
    </main>
  );
}
