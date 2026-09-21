import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Luokuan } from '@/components/Luokuan';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 開卷落款（工單 E4 · 架構 §3）
 *
 * 落款／取書／題名合成一個 route，內部 step machine，
 * `?step=` 只為 back 掣行為 —— 直接開一個中段嘅 step 會落返第一步。
 *
 * ⚠ 呢一版換走咗 E1 嗰個臨時原型（`CastPrototype`）。
 * 嗰個係 client component，喺 `useMemo` 入面直接行 `cast()`，
 * 所以成個排盤引擎（60KB）跟咗落 client bundle —— 違反架構 §9。
 * 而家排盤行 server action，引擎留喺 server。
 *
 * ⚠ 頁頂嗰兩件工具（返書齋、日夜讀）唔喺呢度 —— 佢哋住喺
 * `<Luokuan>` 入面。題名幕要一件工具都冇（E5 AC 五），
 * 而一個由 server render 嘅 header 收唔起。
 *
 * noindex 無 OG：流程層（架構 §9）。
 */
export const metadata: Metadata = {
  title: '落款',
  robots: { index: false, follow: false },
};

export default async function CastPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto w-full max-w-page px-6 pb-dijiao pt-10">
      <Luokuan />
    </main>
  );
}
