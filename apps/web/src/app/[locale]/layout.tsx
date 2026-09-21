import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';
import { themeInitScript } from '@/lib/theme';
import { FONT_STYLESHEET_HREF } from '../fonts';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * ⚠ 唔准動態 locale —— 唔係為咗嚴謹，係為咗 `/sitemap.xml` serve 得到。
 *
 * `[locale]` 係根層嘅動態段，所以 `/robots.txt` 同 `/sitemap.xml`
 * 會被佢當成 `locale = "robots.txt"` 食咗，然後喺下面 `hasLocale` 度 404。
 * build 產出係啱嘅（`.next/server/app/sitemap.xml.body` 有齊 37 條 URL），
 * 但 server 行起上嚟永遠攞唔到 —— 即係 **sitemap 喺 production 都係 404**。
 *
 * `dynamicParams = false` 之後，`[locale]` 只認 `generateStaticParams`
 * 出嗰兩個值，其餘落返去真正嗰條 route handler。
 *
 * 呢個係 D2 影相之外第二個「build 過但 serve 唔到」嘅情況 ——
 * 所以 `check-lexicon-build.mjs` 而家除咗掃 build 產出，
 * 仲會**真係開個 server 撳一撳**（見 `scripts/check-routes.mjs`）。
 */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'brand' });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t('name'), template: `%s · ${t('name')}` },
    description: t('essence'),
    /**
     * 全站預設唔畀索引（架構 §9、§10）。
     *
     * 觀微唔分享命書，所以只有兩類頁應該入搜尋器：入齋（/）同藏經閣
     * （/lexicon，工單 D1）。嗰兩處各自覆寫 robots.index = true。
     * 預設拒絕，逐頁開放 —— 唔係逐頁記得去封。
     */
    robots: { index: false, follow: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONT_STYLESHEET_HREF} />
        {/* 喺第一次 paint 之前 stamp 主題，避免夜讀用戶見到一閃嘅紙白。 */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="relative">
        <NextIntlClientProvider>
          <div className="relative z-[1]">{children}</div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
