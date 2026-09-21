import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { cast } from '@guanwei/ziwei';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { BookDemo } from '@/components/BookDemo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BOOK_STATES, GEOMETRY, SHAPE_OF } from '@/lib/book';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 「書」元件嘅活樣板（工單 E2）
 *
 * 同 `/tokens` 一樣係內部參考，唔係產品頁 —— 所以 noindex 無 OG
 * （架構 §9：全站得 `/` 同 `/lexicon/**` 可索引）。
 * 亦都冇入 sitemap：嗰張表係白名單，唔會自動收新 route（D2）。
 */
export const metadata: Metadata = {
  title: '書',
  robots: { index: false, follow: false },
};

export default async function ShuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  /* 樣板用嘅盤。同 /tokens 同一個生辰 —— 唔係任何人嘅真資料。 */
  const result = cast({
    solar: { y: 1998, m: 3, d: 12 },
    time: { h: 7, min: 40 },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.1694, lat: 22.3193, label: '香港' },
    sex: 'male',
  });

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
          <h1 className="mt-3 text-h1 font-semibold tracking-[0.16em]">書</h1>
        </div>
        <p className="max-w-[26rem] text-sm leading-[1.9] tracking-[0.06em] text-ink-2">
          工單 E2。五個狀態撳得到，睇下佢係咪真係只用闊度行 ——
          零 3D、零 scale、零 rotate。窄過 820px 就收成單頁。
        </p>
        <ThemeToggle dayLabel="日讀" nightLabel="夜讀" />
      </header>

      {result.ok ? (
        <BookDemo chart={result.value} />
      ) : (
        <p className="text-sm text-cinnabar">排盤失敗：{result.code}</p>
      )}

      <section className="mt-tiantou border-t jielan pt-10">
        <h2 className="text-h3 tracking-[0.16em]">五個狀態，三個形</h2>
        <p className="mt-4 max-w-banxin text-sm leading-[1.9] text-ink-2">
          「合上題名」同「封面」闊度一模一樣，「展開」同「跨頁」亦都一樣。
          分別唔喺幾何，喺入面塞咗乜 —— 呢個就係第四條驗收標準
          （狀態同內容分開）自己講出嚟嘅嘢。
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr>
                {['狀態', '形', '左頁', '書脊', '右頁'].map((h) => (
                  <th
                    key={h}
                    className="border-b border-rule py-2 pr-6 text-start font-sans text-cap font-medium tracking-[0.14em] text-ink-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BOOK_STATES.map((s) => {
                const g = GEOMETRY[SHAPE_OF[s]];
                return (
                  <tr key={s}>
                    <td className="border-b border-rule-2 py-2 pr-6 font-sans text-sm">{s}</td>
                    <td className="border-b border-rule-2 py-2 pr-6 font-sans text-sm text-ink-2">
                      {SHAPE_OF[s]}
                    </td>
                    {[g.verso, g.ji, g.recto].map((w, i) => (
                      <td
                        key={i}
                        className="border-b border-rule-2 py-2 pr-6 font-sans text-[12px] text-ink-3"
                      >
                        <code>{w}</code>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
