import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Juanshou } from '@/components/Juanshou';
import { ClaimForm } from '@/components/ClaimForm';
import { Link } from '@/i18n/navigation';
import { safeNext } from '@/lib/journey';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 認領（工單 G2 · 架構 §4）
 *
 * ── 呢一版講一次代價，然後收聲 ──
 *
 * 架構 §4：「匿名清 cookie = 永久失去命書，**老實講一次就唔好再嘈**。」
 *
 * 所以呢度冇「立即註冊」、冇好處清單、冇「唔好錯過」。
 * 得一句講清楚會發生乜事，同埋一句講清楚我哋攞個 email 嚟做乜。
 *
 * 認領本身唔會搬任何嘢：`auth.uid()` 唔變，所以啲書同票根本冇郁過
 * （G1 揀咗 `readers.id = auth.users.id`）。
 *
 * noindex 無 OG：私密層（架構 §9）。
 */
export const metadata: Metadata = {
  title: '認領',
  robots: { index: false, follow: false },
};

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  /*
   * 由邊度嚟、認領完去邊（重新設計第二期）。
   *
   * 由未裁章嚟：`from` = 嗰一章，`next` = 付款頁。返回去嗰一章，
   * 認領完（開咗驗證信）就落去付款頁，唔再係首頁。
   * 由書齋條提示嚟：兩個都冇，同之前一樣返書齋。
   */
  const query = await searchParams;
  const next = safeNext(query.next);
  const from = safeNext(query.from);
  const forCutting = Boolean(next?.startsWith('/pay/'));

  return (
    <main className="juan tai">
      {/* ⚠ 「書架」改咗做「書齋」—— 全站同一個地方，之前得呢一版叫錯。 */}
      <Juanshou
        back={from ? { href: from, label: '返回' } : 'shelf'}
        title="認領"
        step={forCutting ? 4 : undefined}
      />

      <div className="banxin flex flex-col gap-4 text-body leading-[1.95]">
        <p>
          現在這些書只認得這一部瀏覽器。清掉瀏覽器資料、換一部機、或者換一個瀏覽器，
          它們就找不回來了 —— 我們沒有別的方法認出你。
        </p>
        <p className="text-ink-2">
          留一個電郵，書就記在這個地址名下。我們會寄一封驗證信，開了信裡的連結就完成。
        </p>
        {forCutting ? (
          <p className="text-ink-2">認領之後，會直接帶你去裁開這本書。</p>
        ) : null}
      </div>

      <div className="banxin">
        <ClaimForm next={next} />
        {from ? (
          <p className="mt-8">
            <Link href={from} className="lian">
              先回去讀免費的章
            </Link>
          </p>
        ) : null}
      </div>

      {/* 攞個 email 嚟做乜，講清楚。呢句唔係細則，係承諾。 */}
      <p className="banxin mt-16 border-t jielan pt-6 font-sans text-cap leading-[1.9] tracking-[0.1em] text-ink-3">
        這個電郵只用來認出你的書。不會有推廣信。
        <br />
        立春前一年一封流年信，可以在設定裡關掉。
      </p>
    </main>
  );
}
