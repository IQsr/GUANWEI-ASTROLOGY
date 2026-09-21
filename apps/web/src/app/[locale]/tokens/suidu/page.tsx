import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Juan } from '@/components/Juan';
import { Suidu } from '@/components/Suidu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { demoJuan } from '@/lib/mingshu';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 隨讀嘅活樣板（工單 F2）。內部參考，noindex 無 OG，唔入 sitemap。
 *
 * ⚠ 特登同 `/tokens/mingshu` 分開兩版。
 *
 * 第一版擺咗喺註層嗰版下面，結果同一章正文喺一版度出現咗兩次 ——
 * 而 F1 嗰條「一個術語全書只標一次」即刻紅（每個詞都數到兩次）。
 *
 * 個掃描係啱嘅：佢量嘅係「呢一版有冇標重複」，而嗰一版真係有。
 * 錯嘅係我將兩件唔同嘅嘢擺埋一版。
 */
export const metadata: Metadata = {
  title: '隨讀',
  robots: { index: false, follow: false },
};

export default async function SuiduDemoPage({ params }: { params: Promise<{ locale: string }> }) {
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

  const chapter = juan.marked[0]!;

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
          <h1 className="mt-4 text-h1 font-semibold tracking-[0.16em]">隨讀</h1>
        </div>
        <p className="max-w-banxin text-sm leading-[1.9] text-ink-2">
          工單 F2。捲落去，右邊個細盤跟住字行：講緊呢一宮嗰幾段亮本宮；
          「牽動」嗰段連三方四正一齊亮；留白句乜都唔亮 ——
          嗰一句係交返畀你嘅，唔應該仲指住個盤。
        </p>
        <ThemeToggle dayLabel="日讀" nightLabel="夜讀" />
      </header>

      <Suidu chart={juan.chart} palace={chapter.palace}>
        <Juan segments={chapter.segments} notes={juan.notes} />
      </Suidu>
    </main>
  );
}
