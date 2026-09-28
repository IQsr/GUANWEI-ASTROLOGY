import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Seal } from '@/components/Seal';
import { NightScene } from '@/components/NightScene';
import { ResumeLink } from '@/components/ResumeLink';
import { MARK, OG_IMAGE } from '@/lib/site';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 入齋（工單 E1 → 重新設計第一期）
 *
 * 一幅書房夜景，窗外嘅星會郁。左邊三行字、一粒「起盤」；底下四步
 * 講清楚成件事係點：落款 → 取書 → 閱讀 → 深讀。
 *
 * ── 同 E1 唔同咗嘅地方 ──
 *
 * E1 係「全紙、三行字、一枚印、唯一出口」。Issac 2026-09 揀咗：
 *   一、全站有頁頂導覽（首頁都有）—— 唯一出口唔再成立
 *   二、參考稿嘅夜景做首頁
 *   三、加四步 —— 之前全站冇一處講清「一個生辰一本書、有免費章同
 *       未裁章」，每樣概念都係撞到先講。四步就係嗰一處。
 *
 * ── 保留咗嘅 ──
 *
 * 冇價錢、冇「立即開始」式催促（架構 §6：題名之前唔准出現價錢）。
 * 第四步講「未裁之頁」，唔講錢。
 * 唔會因為你有書就 redirect 去 /shelf。
 */

const SEQ = {
  line1: 500,
  line2: 700,
  line3: 850,
  button: 1100,
  steps: 1400,
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
  const steps = t.raw('steps') as { name: string; desc: string }[];
  const vertical = t.raw('vertical') as string[];

  return (
    <main className="ye">
      <NightScene variant="home" />

      <div className="relative mx-auto flex min-h-svh w-full max-w-[1280px] flex-col px-6 pb-10 pt-[calc(var(--header)+40px)] md:px-10">
        <div className="flex flex-1 flex-col justify-end pb-14 md:justify-center md:pb-10">
          <h1 className="moshen font-serif text-[clamp(2.5rem,6.2vw,4.75rem)] font-medium leading-[1.2] tracking-[0.14em]">
            {brand('essence')}
          </h1>

          <span aria-hidden="true" className="mu-in mt-8 block h-px w-10 bg-night-ink-3" style={{ animationDelay: `${SEQ.line1}ms` }} />

          <div className="mt-7 flex flex-col gap-2">
            <p className="mu-in font-serif text-[clamp(1.125rem,1.9vw,1.4rem)] leading-[1.9] tracking-[0.22em]" style={{ animationDelay: `${SEQ.line1}ms` }}>
              {brand('philosophy')}
            </p>
            <p className="mu-in font-serif text-[clamp(1.125rem,1.9vw,1.4rem)] leading-[1.9] tracking-[0.22em]" style={{ animationDelay: `${SEQ.line2}ms` }}>
              {t('proposition')}
            </p>
          </div>

          <p
            className="mu-in mt-7 max-w-72 font-latin text-[0.75rem] leading-[2] tracking-[0.42em] text-night-ink-2"
            style={{ animationDelay: `${SEQ.line3}ms` }}
          >
            {t('tagline')}
          </p>

          <div className="mu-in mt-10" style={{ animationDelay: `${SEQ.button}ms` }}>
            <Link href="/cast" className="btn-ye">
              {t('enter')}
              <span className="btn-jiantou" aria-hidden="true">→</span>
            </Link>
            <p className="mt-4 max-w-80 text-cap leading-[1.9] tracking-[0.1em] text-night-ink-3">{t('hint')}</p>
            {/* 有書先出一行（掛載之後先問 —— 首頁係靜態頁，server 唔知你有冇書） */}
            <ResumeLink template={t.raw('resumeNamed') as string} />
          </div>
        </div>

        {/* 四步：成件事係點（取代 E1 嘅「唯一出口」，講清楚之後會發生乜） */}
        <ol className="bu mu-in border-t border-night-rule pt-7" style={{ animationDelay: `${SEQ.steps}ms` }}>
          {steps.map((s, i) => (
            <li key={s.name} className="flex gap-4 md:block">
              <span className="font-latin text-[0.8125rem] tracking-[0.2em] text-night-ink-3" data-nums>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="md:mt-2 md:block">
                <span className="font-serif tracking-[0.2em]">{s.name}</span>
                <span className="ms-3 text-cap tracking-[0.08em] text-night-ink-3 md:ms-0 md:mt-1 md:block">{s.desc}</span>
              </span>
            </li>
          ))}
        </ol>

        {/* 右邊直排兩行 ＋ 一枚印（桌面先出） */}
        <div
          aria-hidden="true"
          className="mu-in pointer-events-none absolute end-10 top-[calc(var(--header)+72px)] hidden flex-col items-center gap-6 xl:flex"
          style={{ animationDelay: `${SEQ.line3}ms` }}
        >
          <div className="zhi-pai font-serif text-[0.95rem] tracking-normal text-night-ink-2">
            {vertical.map((line) => (
              <span key={line}>
                {[...line].map((ch, i) => (
                  <span key={i}>{ch}</span>
                ))}
              </span>
            ))}
          </div>
          <span className="block h-px w-7 bg-night-rule" />
          <Seal text={MARK} label={t('sealLabel')} className="yin-luo" />
        </div>
      </div>
    </main>
  );
}
