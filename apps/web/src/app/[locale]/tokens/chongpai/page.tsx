import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { ENGINE_VERSION, SCHOOL_PROFILE } from '@guanwei/ziwei';
import { RULE_REGISTRY } from '@guanwei/content';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Chongpai } from '@/components/Chongpai';
import type { Pinned } from '@/lib/chongpai';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 並列新舊嘅活樣板（工單 B16 · docs/rules.md R-008）。內部參考，noindex。
 *
 * ⚠ 呢一版唔係 `/account`。
 *
 * 工單第三條 AC 要求嘅位置係 `/account`，而 `/account` 係工單 G4，未做。
 * 唔想講大話：**B16 交嘅係政策同並列嗰一版，唔係嗰個入口。**
 * 擺喺 `/tokens` 就係講明呢一點 —— 睇得到、驗得到、但仲未有人揀得到。
 *
 * ⚠ 而且佢唔會出現喺 `/book/[id]`。F4 嗰陣學過：
 * 喺人讀緊嘅時候插一個要佢做決定嘅 UI，包裝成乜都好，本質一樣。
 */
export const metadata: Metadata = {
  title: '並列新舊',
  robots: { index: false, follow: false },
};

/* 而家嘅三個值 —— 由引擎同規則庫自己出，唔係寫死。 */
const CURRENT: Pinned = {
  engine: ENGINE_VERSION,
  school: SCHOOL_PROFILE.ref,
  content: RULE_REGISTRY.ref,
};

/**
 * 一本「舊書」。三個值都係假嘅，而且特登唔似真 ref ——
 * 呢一版唔應該令人以為 `0.2.0` 真係出過一批書。
 */
const OLD: Pinned = {
  engine: '0.2.0',
  school: 'zhongzhou-v1@0000000000000000',
  content: 'r1@0000000000000000',
};

export default async function ChongpaiDemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

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
          <h1 className="mt-4 text-h1 font-semibold tracking-[0.16em]">並列新舊</h1>
        </div>
        <p className="max-w-banxin text-sm leading-[1.9] text-ink-2">
          工單 B16 · R-008。舊盤唔自動重算 —— 所以呢一版冇「更新」掣，
          只有一張對照表。三個版本號分開講，因為佢哋講緊三件唔同嘅事。
        </p>
        <ThemeToggle dayLabel="日讀" nightLabel="夜讀" />
      </header>

      <div className="max-w-banxin space-y-12">
        <section>
          <h2 className="font-sans text-cap tracking-[0.16em] text-ink-3">三樣都變咗</h2>
          <div className="mt-5">
            <Chongpai pinned={OLD} current={CURRENT} />
          </div>
        </section>

        <section>
          <h2 className="font-sans text-cap tracking-[0.16em] text-ink-3">只係文字改過，盤面冇變</h2>
          <div className="mt-5">
            <Chongpai pinned={{ ...CURRENT, content: OLD.content }} current={CURRENT} />
          </div>
        </section>

        <section>
          <h2 className="font-sans text-cap tracking-[0.16em] text-ink-3">一樣都冇變</h2>
          {/*
            ⚠ 呢一格係空嘅，而空係啱嘅。
            冇差異就唔出嘢 —— 唔係出一句「已是最新版本」。
            嗰句係工具嘅說話，佢預設咗最新就係最好；R-008 嘅立場相反。
          */}
          <div className="mt-5">
            <Chongpai pinned={CURRENT} current={CURRENT} />
          </div>
          <p className="mt-3 font-sans text-cap leading-[1.9] text-ink-3">
            （上面應該一個字都冇。）
          </p>
        </section>
      </div>
    </main>
  );
}
