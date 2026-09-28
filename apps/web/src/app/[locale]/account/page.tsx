import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ENGINE_VERSION, SCHOOL_PROFILE } from '@guanwei/ziwei';
import { RULE_REGISTRY } from '@guanwei/content';
import { Link } from '@/i18n/navigation';
import { Juanshou } from '@/components/Juanshou';
import { Chongpai } from '@/components/Chongpai';
import { DeleteForm, ExportButton } from '@/components/AccountForms';
import { recastHref, recastRows } from '@/lib/account';
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
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'account' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export const dynamic = 'force-dynamic';

const CURRENT: Pinned = {
  engine: ENGINE_VERSION,
  school: SCHOOL_PROFILE.ref,
  content: RULE_REGISTRY.ref,
};

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('account');
  const tShelf = await getTranslations('shelf');

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
      <main className="juan tai">
        <Juanshou back="shelf" title={t('title')} nav="account" />
        <p className="banxin text-body leading-[1.95] text-ink-2">
          {t('unreachable')}
        </p>
      </main>
    );
  }

  if (!account) {
    return (
      <main className="juan tai">
        <Juanshou back="shelf" title={t('title')} nav="account" />
        <p className="banxin text-body leading-[1.95]">
          {t('noBooks')}
        </p>
      </main>
    );
  }

  const rows = recastRows(books, CURRENT);

  return (
    <main className="juan tai">
      <Juanshou back="shelf" title={t('title')} nav="account" />
      <p className="banxin text-sm leading-[1.9] text-ink-2">
        {account.email ?? t('unclaimed')}
      </p>

      {/* 三件事，三張卡（重新設計第四期 · 參考稿閱讀卡） */}
      <div className="banxin mt-10 flex flex-col gap-6">
      {/* ── 一、匯出 ───────────────────────────────── */}
      <section className="ka p-6 sm:p-8">
        <h2 className="text-h3 font-medium tracking-[0.16em]">{t('exportTitle')}</h2>
        <div className="mt-6 flex flex-col gap-4 text-body leading-[1.95]">
          <p>{t('export1')}</p>
          <p className="text-ink-2">
            {t('export2')}
          </p>
        </div>
        <ExportButton />
      </section>

      {/* ── 二、重排（R-008） ──────────────────────── */}
      <section className="ka p-6 sm:p-8">
        <h2 className="text-h3 font-medium tracking-[0.16em]">{t('recastTitle')}</h2>
        <p className="mt-6 text-body leading-[1.95] text-ink-2">
          {t('recastIntro')}
        </p>

        {rows.length === 0 ? (
          <p className="mt-8 text-sm leading-[1.9] text-ink-3">{t('recastEmpty')}</p>
        ) : (
          <ul className="mt-8 flex flex-col gap-10">
            {rows.map((row) => (
              <li key={row.bookId}>
                <h3 className="font-sans text-cap tracking-[0.16em] text-ink-3">{row.title ?? tShelf('untitled')}</h3>

                {row.unknown ? (
                  /* ⚠ 「答唔到」唔係「冇差異」。 */
                  <p className="mt-4 text-sm leading-[1.9] text-cinnabar">{t('recast.unknown')}</p>
                ) : row.drift.length === 0 ? (
                  <p className="mt-4 text-sm leading-[1.9] text-ink-2">{t('recast.none')}</p>
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
                      {t('recastLink')}
                    </Link>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 三、刪除 ───────────────────────────────── */}
      <section className="ka border-cinnabar/40 p-6 sm:p-8">
        <h2 className="text-h3 font-medium tracking-[0.16em]">{t('deleteTitle')}</h2>
        <p className="mt-6 text-body leading-[1.95]">
          {t('deleteIntro')}
        </p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div>
            <h3 className="font-sans text-cap tracking-[0.16em] text-ink-3">{t('removes')}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {(t.raw('removeList') as string[]).map((line) => (
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
            <h3 className="font-sans text-cap tracking-[0.16em] text-ink-3">{t('keeps')}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {(t.raw('keepList') as string[]).map((line) => (
                <li key={line} className="text-sm leading-[1.9] text-ink-2">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DeleteForm />
      </section>
      </div>
    </main>
  );
}
