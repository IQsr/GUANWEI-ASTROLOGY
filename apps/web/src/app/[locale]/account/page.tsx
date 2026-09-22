import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { ENGINE_VERSION, SCHOOL_PROFILE } from '@guanwei/ziwei';
import { RULE_REGISTRY } from '@guanwei/content';
import { Link } from '@/i18n/navigation';
import { Chongpai } from '@/components/Chongpai';
import { DeleteForm, ExportButton } from '@/components/AccountForms';
import { DELETE_KEEPS, DELETE_REMOVES, RECAST_COPY, recastHref, recastRows } from '@/lib/account';
import { bookVersions, currentAccount } from '@/lib/account.server';
import type { Pinned } from '@/lib/chongpai';

/**
 * 設定（工單 G4 · 架構 §10 · docs/rules.md R-008）
 *
 * 三節，而三節都係承諾，唔係功能：
 *
 *   匯出　你攞得返你嘅嘢（Art. 15、20）
 *   重排　你本書唔會自己變，想要新版就另外排一本（R-008）
 *   刪除　真刪，唔係標記（Art. 17 · 架構 §10）
 *
 * ⚠ B16 第三條 AC 喺呢度落地：「`/account` 嘅『以新版引擎重排』
 * 並列新舊差異，由用戶揀 —— 唔自動改」。
 *
 * noindex 無 OG：私密層（架構 §9）。
 */
export const metadata: Metadata = {
  title: '設定',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const CURRENT: Pinned = {
  engine: ENGINE_VERSION,
  school: SCHOOL_PROFILE.ref,
  content: RULE_REGISTRY.ref,
};

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  /*
   * ⚠ 撈唔到 ≠ 你冇嘢（E3 嗰課）。
   * 呢一版尤其唔可以扮空 —— 一個出住「你冇書」嘅設定頁，
   * 會令一個想匯出自己資料嘅人以為佢啲嘢冇咗。
   */
  let account;
  let books;
  try {
    account = await currentAccount();
    books = account ? await bookVersions() : [];
  } catch (error) {
    console.error('[account] ', error);
    return (
      <main className="juan banxin">
        <h1 className="text-h1 font-semibold tracking-[0.16em]">設定</h1>
        <p className="mt-8 text-body leading-[1.95] text-ink-2">
          現在連不上。你的書和資料都沒有事 —— 待會再開這一頁就可以。
        </p>
      </main>
    );
  }

  if (!account) {
    return (
      <main className="juan banxin">
        <h1 className="text-h1 font-semibold tracking-[0.16em]">設定</h1>
        <p className="mt-8 text-body leading-[1.95]">
          這個瀏覽器沒有書。如果書在另一部裝置上，請在那邊開啟。
        </p>
        <Link href="/shelf" className="btn-mo mt-10 inline-block">
          書齋
        </Link>
      </main>
    );
  }

  const rows = recastRows(books, CURRENT);

  return (
    <main className="mx-auto w-full max-w-page px-6 pb-dijiao pt-10">
      <Link
        href="/shelf"
        className="font-sans text-cap tracking-[0.2em] text-ink-3 transition-colors duration-200 ease-ink hover:text-ink-2"
      >
        ← 書齋
      </Link>

      <h1 className="mt-6 text-h1 font-semibold tracking-[0.16em]">設定</h1>
      <p className="mt-4 max-w-banxin text-sm leading-[1.9] text-ink-2">
        {account.email ?? '這些書還沒有認領 —— 只有這一部瀏覽器認得它們。'}
      </p>

      {/* ── 一、匯出 ───────────────────────────────── */}
      <section className="mt-tiantou max-w-banxin border-t jielan pt-8">
        <h2 className="text-h2 font-semibold tracking-[0.16em]">帶走</h2>
        <div className="mt-6 flex flex-col gap-4 text-body leading-[1.95]">
          <p>一個 JSON 檔，裡面是你寫過的每一個生辰、每一張盤、每一本書。</p>
          <p className="text-ink-2">
            已經裁開的章連正文一起；未裁的章只有章名和格 —— 那幾章還沒有購買，
            檔案裡會寫明。
          </p>
        </div>
        <ExportButton />
      </section>

      {/* ── 二、重排（R-008） ──────────────────────── */}
      <section className="mt-tiantou max-w-banxin border-t jielan pt-8">
        <h2 className="text-h2 font-semibold tracking-[0.16em]">新版本</h2>
        <p className="mt-6 text-body leading-[1.95] text-ink-2">
          算法和文字都會改版。你手上這些書不會跟著改 —— 它們記著自己成書當時的設定。
        </p>

        {rows.length === 0 ? (
          <p className="mt-8 text-sm leading-[1.9] text-ink-3">書齋裡還沒有書。</p>
        ) : (
          <ul className="mt-8 flex flex-col gap-10">
            {rows.map((row) => (
              <li key={row.bookId}>
                <h3 className="font-sans text-cap tracking-[0.16em] text-ink-3">{row.title}</h3>

                {row.unknown ? (
                  /* ⚠ 「答唔到」唔係「冇差異」。 */
                  <p className="mt-4 text-sm leading-[1.9] text-cinnabar">{RECAST_COPY.unknown}</p>
                ) : row.drift.length === 0 ? (
                  <p className="mt-4 text-sm leading-[1.9] text-ink-2">{RECAST_COPY.none}</p>
                ) : (
                  <div className="mt-4">
                    <Chongpai pinned={row.pinned!} current={CURRENT} />
                    {/*
                      ⚠ 呢度冇「更新」掣，得一條去落款嘅連結。
                      重排係造一本新書，唔係改舊嗰本（R-008 第三條配套）。
                    */}
                    <Link
                      href={recastHref(row.bookId)}
                      className="mt-6 inline-block font-sans text-cap tracking-[0.16em] text-indigo underline-offset-4 hover:underline"
                    >
                      照同一個生辰再排一本 →
                    </Link>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 三、刪除 ───────────────────────────────── */}
      <section className="mt-tiantou max-w-banxin border-t jielan pt-8">
        <h2 className="text-h2 font-semibold tracking-[0.16em]">刪除</h2>
        <p className="mt-6 text-body leading-[1.95]">
          這是真的刪除，不是隱藏。刪了就沒有了，我們這邊也沒有備份可以還原。
        </p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div>
            <h3 className="font-sans text-cap tracking-[0.16em] text-ink-3">會消失</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {DELETE_REMOVES.map((line) => (
                <li key={line} className="text-sm leading-[1.9] text-ink-2">
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div>
            {/*
              ⚠ 呢一欄唔可以省。
              一句「我哋會刪除你所有資料」而實際上留咗一行，就係一句大話。
            */}
            <h3 className="font-sans text-cap tracking-[0.16em] text-ink-3">會留下</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {DELETE_KEEPS.map((line) => (
                <li key={line} className="text-sm leading-[1.9] text-ink-2">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DeleteForm />
      </section>
    </main>
  );
}
