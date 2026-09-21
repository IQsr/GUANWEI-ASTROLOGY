import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { JuanDemo } from '@/components/JuanDemo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { demoJuan } from '@/lib/mingshu';
import { unexplainedPairs } from '@/lib/zhu';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 命書嘅活樣板（工單 F1）。內部參考，noindex 無 OG，唔入 sitemap。
 */
export const metadata: Metadata = {
  title: '命書',
  robots: { index: false, follow: false },
};

export default async function MingshuDemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const juan = demoJuan();

  if (!juan) {
    return (
      <main className="juan banxin">
        <p className="text-body text-cinnabar">樣板排盤失敗。</p>
      </main>
    );
  }

  /*
   * ⚠ 一句兩個未解釋術語 —— 渲染器修唔到。
   *
   * 呢個數印喺版面上，同「35 / 35 條詞條只靠一本書」一樣：
   * 一個睇得見嘅數，先會有人去郁佢。
   */
  const pairs = unexplainedPairs(
    juan.chapters.map((c) => ({
      palace: c.palace,
      segments: c.segments.map((s) => ({ slot: s.slot, text: s.text })),
    })),
  );

  return (
    <main className="mx-auto w-full max-w-page px-6 pb-dijiao pt-10">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b jielan pb-5">
        <div>
          <Link
            href="/tokens"
            className="font-sans text-cap tracking-[0.2em] text-ink-3 transition-colors duration-200 ease-ink hover:text-ink-2"
          >
            ← 視覺系統
          </Link>
          <h1 className="mt-3 text-h1 font-semibold tracking-[0.16em]">命書</h1>
        </div>
        <p className="max-w-[26rem] text-sm leading-[1.9] tracking-[0.06em] text-ink-2">
          工單 F1。十二章真文，由 C8 推理 ＋ C8b 組裝出嚟。
          術語旁邊一點墨，撳一下就喺原地展開一段註，註尾連去藏經閣。
        </p>
        <ThemeToggle dayLabel="日讀" nightLabel="夜讀" />
      </header>

      <JuanDemo marked={juan.marked} notes={juan.notes} />

      <section className="mt-tiantou border-t jielan pt-10">
        <h2 className="text-h3 tracking-[0.16em]">一句兩個未解釋術語</h2>
        <p className="mt-4 max-w-banxin text-sm leading-[1.9] text-ink-2">
          渲染器最多做到「一句只標一個」。但如果一句本身就塞咗兩個新術語，
          第二個就會冇解釋噉出現喺讀者眼前 —— 而嗰個係內容嘅問題，唔係版式嘅問題。
          所以唔靜靜咁揀一個標，而係數出嚟。
        </p>
        <p className="mt-6 font-sans text-sm tracking-[0.1em]" data-nums>
          全書 <span className={pairs.length ? 'text-cinnabar' : ''}>{pairs.length}</span> 句。
        </p>
        {pairs.length ? (
          <ul className="mt-5 flex max-w-banxin flex-col gap-3">
            {pairs.slice(0, 8).map((p, i) => (
              <li key={i} className="border-b jielan pb-2 text-sm leading-[1.9] text-ink-2">
                <span className="font-sans text-cap tracking-[0.16em] text-ink-3">{p.palace}</span>
                <span className="ms-3">{p.sentence}</span>
                <span className="ms-3 text-cinnabar">{p.terms.join(' · ')}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
