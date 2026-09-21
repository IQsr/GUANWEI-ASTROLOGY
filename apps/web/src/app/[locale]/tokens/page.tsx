import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ENGINE_VERSION, cast } from '@guanwei/ziwei';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Reveal } from '@/components/Reveal';
import { ThemeToggle } from '@/components/ThemeToggle';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 工單 A2 嘅交付物：設計系統落地嘅活樣板。
 *
 * E1 嗰陣由 / 搬咗落嚟。佢係內部參考，唔係產品頁 ——
 * 所以 noindex 無 OG（全站得 / 有 OG 圖，見架構 §9）。
 */
export const metadata = {
  robots: { index: false, follow: false },
};

/** 色票：名、CSS 變數、用途。全部由 token 出，冇一個 hex 寫喺呢度。 */
const SWATCHES = [
  { label: '紙', varName: '--paper' },
  { label: '素', varName: '--paper-2' },
  { label: '墨', varName: '--ink' },
  { label: '淡墨', varName: '--ink-2' },
  { label: '界', varName: '--rule' },
  { label: '靛', varName: '--indigo' },
  { label: '朱砂', varName: '--cinnabar' },
] as const;

/** 用量配比：紙 78 · 墨 15 · 素 5 · 靛 1.2 · 朱砂 0.8（視覺系統 §3） */
const RATIO = [
  { varName: '--paper', pct: 78, label: '紙' },
  { varName: '--ink', pct: 15, label: '墨' },
  { varName: '--paper-2', pct: 5, label: '素' },
  { varName: '--indigo', pct: 1.2, label: '靛' },
  { varName: '--cinnabar', pct: 0.8, label: '朱砂' },
] as const;

export default async function TokensPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('tokens');
  const brand = await getTranslations('brand');
  const theme = await getTranslations('theme');

  const result = cast({
    solar: { y: 1998, m: 3, d: 12 },
    time: { h: 7, min: 40 },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.1694, lat: 22.3193, label: '香港' },
    sex: 'male',
  });

  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  const specimens = [
    { key: 'display', cls: 'text-display font-black tracking-[0.14em] leading-[1.1]', meta: '60 / 900 / .14em' },
    { key: 'h1', cls: 'text-h1 font-semibold tracking-[0.16em] leading-[1.35]', meta: '38 / 600 / .16em' },
    { key: 'h2', cls: 'text-h2 font-semibold tracking-[0.16em] leading-[1.5]', meta: '27 / 600 / .16em' },
    { key: 'lead', cls: 'text-lead tracking-[0.08em] leading-[1.8]', meta: '19 / 400 / .08em' },
    { key: 'body', cls: 'text-body leading-[1.95]', meta: '16.5 / 300 / .02em' },
    { key: 'sm', cls: 'text-sm text-ink-2 leading-[1.9]', meta: '13.5 / 300 / .04em' },
    { key: 'cap', cls: 'font-sans text-cap tracking-[0.16em] text-ink-3', meta: '12 / 500 / .16em' },
  ] as const;

  return (
    <main className="mx-auto w-full max-w-page px-6 pb-dijiao">
      {/* ── 扉頁：天頭 8 : 地腳 5 ── */}
      <header className="flex flex-wrap items-end justify-between gap-10 border-b jielan border-b pt-tiantou pb-10">
        <div>
          <h1 className="text-display font-black leading-[1.15] tracking-[0.14em]">
            {brand('name')}
          </h1>
          <p className="mt-4 font-latin text-cap uppercase tracking-[0.5em] text-ink-2">
            {brand('latin')}
          </p>
          <p className="mt-6 text-lead tracking-[0.08em] text-ink-2">{brand('essence')}</p>
        </div>
        {/* 直排只用喺書脊、書籤、題名，而且只用喺中文 —— 英文逐個字母
            疊落去會拉到成版變形（視覺系統 §4）。 */}
        {locale === 'zh-Hant' ? (
          <div
            className="max-h-64 border-r jielan pr-4 text-h3 leading-[1.9] tracking-[0.3em]"
            style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
          >
            {brand('philosophy')}
          </div>
        ) : (
          <p className="max-w-64 border-l jielan pl-4 text-sm leading-[1.9] text-ink-2">
            {brand('philosophy')}
          </p>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-6 border-b border-rule-2 py-6 font-sans text-cap tracking-[0.12em] text-ink-3">
        <span>{t('subtitle')}</span>
        <span className="ml-auto">
          <ThemeToggle dayLabel={theme('day')} nightLabel={theme('night')} />
        </span>
      </div>

      <p className="max-w-banxin py-10 text-sm leading-[1.9] text-ink-2">{t('intro')}</p>

      {/* ── 色 ── */}
      <Section num="一" title={t('colorTitle')} note={t('colorNote')}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4">
          {SWATCHES.map((s) => (
            <div key={s.varName} className="flex flex-col gap-2">
              <div
                className="h-22 border border-rule-2"
                style={{ background: `var(${s.varName})` }}
              />
              <b className="text-sm font-semibold tracking-[0.12em]">{s.label}</b>
              <code className="font-sans text-[11.5px] tracking-[0.08em] text-ink-3">
                {s.varName}
              </code>
            </div>
          ))}
        </div>

        <h3 className="mt-10 text-h3 tracking-[0.14em]">{t('ratioTitle')}</h3>
        <p className="mt-4 max-w-banxin text-sm leading-[1.9] text-ink-2">{t('ratioNote')}</p>
        <div className="mt-4 flex h-6 border border-rule-2">
          {RATIO.map((r) => (
            <i
              key={r.varName}
              className="block"
              style={{ background: `var(${r.varName})`, width: `${r.pct}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-4 font-sans text-[11.5px] text-ink-3" data-nums>
          {RATIO.map((r) => (
            <span key={r.varName} className="flex items-center gap-1.5">
              <b
                className="inline-block size-2.5 border border-rule-2"
                style={{ background: `var(${r.varName})` }}
              />
              {r.label} {r.pct}%
            </span>
          ))}
        </div>
      </Section>

      {/* ── 字 ── */}
      <Section num="二" title={t('typeTitle')} note={t('typeNote')}>
        <div className="flex flex-col gap-6">
          {specimens.map((s) => (
            <div key={s.key} className="border-t border-rule-2 pt-4">
              <p className="font-sans text-[11px] tracking-[0.14em] text-ink-3" data-nums>
                {s.meta}
              </p>
              <p className={`mt-2 ${s.cls}`}>{t(`specimen.${s.key}`)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 版 ── */}
      <Section num="三" title={t('layoutTitle')} note={t('layoutNote')}>
        <div className="border border-rule-2 bg-paper-2 p-6">
          <div className="mx-auto max-w-banxin border border-indigo p-4">
            <p className="font-sans text-[11px] tracking-[0.14em] text-indigo" data-nums>
              {t('banxinLabel')}　690px
            </p>
            <p className="mt-3 text-body leading-[1.95]">{t('specimen.body')}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-6 font-sans text-[11px] text-ink-3" data-nums>
            <span>{t('tiantouLabel')}　104px</span>
            <span>{t('dijiaoLabel')}　64px</span>
            <span>8 : 5</span>
          </div>
        </div>
      </Section>

      {/* ── 動 ── */}
      <Section num="四" title={t('motionTitle')} note={t('motionNote')}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          {[
            { title: t('motionOne'), note: t('motionOneNote') },
            { title: t('motionTwo'), note: t('motionTwoNote') },
            { title: t('motionThree'), note: t('motionThreeNote') },
          ].map((m, i) => (
            <Reveal key={m.title} delay={i * 80}>
              <div className="h-full border border-rule-2 bg-paper-2 p-4">
                <b className="text-sm font-semibold tracking-[0.12em]">{m.title}</b>
                <p className="mt-2 text-[12.5px] leading-[1.7] text-ink-2">{m.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── 引擎 ── */}
      <Section num="五" title={t('engineTitle')} note={t('engineNote')}>
        <dl className="grid max-w-banxin grid-cols-[minmax(96px,auto)_1fr] gap-x-6">
          {[
            [t('engineLabel'), ENGINE_VERSION],
            [t('castLabel'), result.ok ? 'ok' : result.code],
            [t('localeLabel'), locale],
          ].map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="border-t border-rule-2 py-2 font-sans text-cap tracking-[0.16em] text-ink-3">
                {label}
              </dt>
              <dd className="border-t border-rule-2 py-2 font-sans text-sm" data-nums>
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 text-sm">
          <Link
            href="/"
            locale={other}
            className="text-indigo underline-offset-4 transition-colors duration-200 ease-ink hover:underline"
          >
            {other}
          </Link>
        </p>
      </Section>

      <p className="border-t border-rule-2 pt-6 font-sans text-cap tracking-[0.14em] text-ink-3">
        {t('nextUp')}
      </p>
    </main>
  );
}

function Section({
  num,
  title,
  note,
  children,
}: {
  num: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-rule-2 pt-tiantou pb-dijiao">
      <div className="mb-10 flex flex-wrap items-baseline gap-4">
        {/* 中文數字要用宋體 stack —— 用拉丁字體嘅話「一」「二」會變到似
            減號同等號。 */}
        <span className="font-serif text-sm tracking-[0.2em] text-cinnabar">{num}</span>
        <h2 className="text-h2 tracking-[0.16em]">{title}</h2>
      </div>
      <p className="mb-6 max-w-banxin text-sm leading-[1.9] text-ink-2">{note}</p>
      {children}
    </section>
  );
}
