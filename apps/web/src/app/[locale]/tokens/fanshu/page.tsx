import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { NightScene } from '@/components/NightScene';
import { FanshuDemo } from '@/components/FanshuDemo';

/**
 * 樣板：揭書（而家 vs 新版）
 *
 * 擺喺同落款一樣嘅夜景桌面上，睇到嘅就係真流程入面嘅光。
 * noindex：樣板唔係產品。
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: '樣板 · 揭書',
  robots: { index: false, follow: false },
};

export default async function FanshuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="juan tai ye-ink">
      <NightScene variant="desk" />
      <header className="banxin mb-10 border-b jielan pb-5">
        <h1 className="text-h1 font-semibold tracking-[0.16em]">揭書</h1>
        <p className="mt-3 text-sm leading-[1.9] text-ink-2">
          同一本書、同一張桌。上面係而家嘅做法，下面係新版。
        </p>
      </header>
      <FanshuDemo />
    </main>
  );
}
