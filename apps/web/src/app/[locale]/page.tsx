import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Seal } from '@/components/Seal';
import { MARK, OG_IMAGE } from '@/lib/site';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 工單 E1 —— 入齋
 *
 * 全紙。三行字。一枚印。唯一出口一粒墨按鈕。（視覺系統 §9、架構 §4）
 *
 * 呢一版刻意乜都冇：冇導覽列、冇 footer 連結、冇夜讀開關、冇價錢、
 * 冇「立即開始」式催促。唔係做少咗，係「唯一出口」呢句要真。
 * 夜讀開關放咗喺之後嘅頁；呢度照跟系統 prefers-color-scheme。
 *
 * 亦都唔會因為你有書就 redirect 去 /shelf —— 一版之中最貴嗰樣係
 * 第一眼，唔可以因為 session 入面有嘢就偷走咗佢。有書只係喺底部
 * 多一行細字（見下面 hasBook）。
 */

const SEQ = {
  /** 「觀微」墨滲，0 → 1600ms 後靜止。 */
  line1: 760,
  line2: 850,
  line3: 940,
  seal: 1500,
  button: 1700,
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const brand = await getTranslations({ locale, namespace: 'brand' });
  const t = await getTranslations({ locale, namespace: 'ruzhai' });

  /**
   * 全站唯一一版可索引、唯一一版有 OG 圖（架構 §9）。
   *
   * 刻意唔用 opengraph-image 檔名慣例 —— 嗰個會連 /cast、/tokens
   * 等所有子路由一齊繼承，就唔係「唯一」。呢度明寫一個 public/og.png，
   * 邊一版要就邊一版寫，繼承唔到。
   */
  const title = `${MARK} ${brand('latin')}`;
  return {
    title: { absolute: title },
    description: t('meta'),
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description: t('meta'),
      type: 'website',
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: t('sealLabel') }],
    },
  };
}

export default async function RuZhai({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const brand = await getTranslations('brand');
  const t = await getTranslations('ruzhai');

  // G1（匿名 auth + DB）之後先接得通。而家冇書，所以底下嗰行唔會出。
  // 唔好用 localStorage 扮有書 —— 書係 server 上面嘅嘢。
  const hasBook = false;

  return (
    <main className="juan mx-auto grid min-h-svh w-full max-w-page grid-rows-[1fr_auto] px-6">
      <div className="flex flex-col items-start justify-center">
        {/* 「觀微」墨滲 1600ms 後靜止 */}
        <h1 className="moshen">
          <span className="block text-display font-black leading-[1.12] tracking-[0.16em]">
            {MARK}
          </span>
          <span className="mt-5 block font-latin text-cap uppercase tracking-[0.5em] text-ink-2">
            {brand('latin')}
          </span>
        </h1>

        {/* 三行字 */}
        <div className="mt-16 flex max-w-banxin flex-col gap-3">
          <p className="mu-in text-h3 leading-[1.85] tracking-[0.12em]" style={{ animationDelay: `${SEQ.line1}ms` }}>
            {brand('essence')}
          </p>
          <p className="mu-in text-h3 leading-[1.85] tracking-[0.12em]" style={{ animationDelay: `${SEQ.line2}ms` }}>
            {brand('philosophy')}
          </p>
          <p
            className="mu-in text-h3 leading-[1.85] tracking-[0.12em] text-ink-2"
            style={{ animationDelay: `${SEQ.line3}ms` }}
          >
            {t('proposition')}
          </p>
        </div>

        {/* 一枚印 */}
        <Seal
          text={MARK}
          label={t('sealLabel')}
          className="yin-luo mt-10"
          style={{ animationDelay: `${SEQ.seal}ms` }}
        />

        {/* 唯一出口 */}
        <div className="mu-in mt-16" style={{ animationDelay: `${SEQ.button}ms` }}>
          <Link href="/cast" className="btn-mo">
            {t('enter')}
          </Link>
          <p className="mt-5 max-w-80 font-sans text-cap leading-[1.9] tracking-[0.1em] text-ink-3">
            {t('hint')}
          </p>
        </div>
      </div>

      {/* 有書先出。而家恆常係 false —— 等 G1。 */}
      {hasBook ? (
        <p className="pt-10 text-sm tracking-[0.08em] text-ink-3">
          <Link href="/shelf" className="border-b border-rule pb-0.5 hover:text-ink-2">
            {t('resume')}
          </Link>
        </p>
      ) : (
        <div aria-hidden="true" />
      )}
    </main>
  );
}
