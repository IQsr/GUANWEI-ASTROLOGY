import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { NightScene } from '@/components/NightScene';
import { JuanzhouDemo } from '@/components/JuanzhouDemo';

/**
 * 樣板：落款卷軸（落款一版過寫晒）
 *
 * 擺喺同落款一樣嘅夜景桌面上。noindex：樣板唔係產品。
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: '樣板 · 落款卷軸',
  robots: { index: false, follow: false },
};

export default async function JuanzhouPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="juan tai ye-ink">
      <NightScene variant="desk" />
      <header className="banxin mb-10 border-b jielan pb-5">
        <h1 className="text-h1 font-semibold tracking-[0.16em]">落款卷軸</h1>
        <p className="mt-3 text-sm leading-[1.9] text-ink-2">落款改做一幅卷軸：五樣一版過寫晒，落印就成書。</p>
      </header>
      <JuanzhouDemo />
    </main>
  );
}
