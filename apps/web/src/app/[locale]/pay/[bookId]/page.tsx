import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Juanshou } from '@/components/Juanshou';
import { CaishuForm } from '@/components/CaishuForm';
import { PAY_BLOCKED, RETURN_COPY, payGate, priceLabel, returnState } from '@/lib/pay';
import { payFacts } from '@/lib/pay.server';

/**
 * 裁書（工單 G3 · 架構 §4、§6）
 *
 * ── 呢一版係 F4 嗰下「裁開」之後落嘅地方 ──
 *
 * 而且**佢係全站唯一准出現價錢嘅一版**（架構 §6 硬規則：
 * 「『題名』之前唔准出現任何價錢或者『升級』字眼」）。
 * `test/pay.test.ts` 掃住 source，`check-routes.mjs` 掃住畫出嚟嗰版。
 *
 * ── ⚠ 由 Stripe 返嚟嗰陣，呢一版唔准發票 ──
 *
 * 佢淨係問得一句 `has_entitlement()`，然後照實講三句之一：
 * 票到咗（paid）／畀咗錢票未到（pending）／冇畀錢（cancelled）。
 *
 * `pending` 唔係一個錯誤狀態，係兩條路嘅時差：webhook 同個人返嚟
 * 呢一版，冇邊條保證行先。而嗰句嘢唔准寫成「請稍候」再自動 refresh ——
 * 自動 refresh 係喺度扮緊「你等一等就會好」，而我哋唔知。
 *
 * noindex 無 OG：私密層（架構 §9）。
 */
export const metadata: Metadata = {
  title: '裁書',
  robots: { index: false, follow: false },
};

/** ⚠ 一定要 dynamic：呢一版嘅答案逐個讀者唔同，而且會變。 */
export const dynamic = 'force-dynamic';

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; bookId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, bookId } = await params;
  setRequestLocale(locale);
  const query = await searchParams;

  /*
   * ⚠ 撈唔到 ≠ 你冇資格（E3 嗰課）。
   *
   * Supabase 接唔上嗰陣，最順手係當佢冇票然後出個付款掣 ——
   * 咁就係請一個可能已經畀咗錢嘅人再畀一次。
   */
  let facts;
  try {
    facts = await payFacts(bookId);
  } catch (error) {
    console.error('[pay] ', error);
    return (
      <main className="juan tai">
        <Juanshou back="shelf" title="一時裁不開" theme />
        <p className="banxin text-body leading-[1.95] text-ink-2">
          現在連不上。這不是你的問題，書和已經付過的款都沒有事 —— 待會再開這一頁就可以。
        </p>
        <div className="banxin mt-10">
          <Link href="/shelf" className="btn-mo inline-block">
            回書齋
          </Link>
        </div>
      </main>
    );
  }

  const done = query.done === '1';
  const cancelled = query.cancelled === '1';

  /* 由 Stripe 返嚟：三句之一，照實講。 */
  if (done || cancelled) {
    const state = returnState({ cancelled, hasEntitlement: facts.hasEntitlement });
    const copy = RETURN_COPY[state];
    return (
      <main className="juan tai">
        <Juanshou back="shelf" title={copy.title} theme />
        <p className="banxin text-body leading-[1.95]">{copy.body}</p>
        <div className="banxin mt-10">
          <Link href="/shelf" className="btn-mo inline-block">
            回書齋
          </Link>
        </div>
      </main>
    );
  }

  const gate = payGate(facts);

  if (gate.can !== 'checkout') {
    const blocked = PAY_BLOCKED[gate.why];
    return (
      <main className="juan tai">
        <Juanshou back="shelf" title="裁書" theme />
        <p className="banxin text-body leading-[1.95]">{blocked.message}</p>
        {blocked.href ? (
          <div className="banxin mt-10">
            <Link href={blocked.href} className="btn-mo inline-block">
              {blocked.label}
            </Link>
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <main className="juan tai">
      <Juanshou back="shelf" title="裁書" theme />

      <div className="banxin flex flex-col gap-4 text-body leading-[1.95]">
        <p>線裝書的毛邊本，頁邊未裁開，要讀的人自己裁。這本書的深度章就是未裁的頁。</p>
        <p className="text-ink-2">
          裁一次，整本書的深度章都開了 —— 不是逐章買，也沒有續期。
          已經在讀的免費章不會有任何改變。
        </p>
      </div>

      <div className="banxin">
        <CaishuForm bookId={bookId} priceLabel={priceLabel()} />
      </div>

      {/*
        ⚠ 呢句唔係細則，係承諾。
        卡號唔會掂到我哋部 server —— 用 Stripe 嘅 hosted checkout，
        所以連一段第三方 script 都唔會喺呢一版度載（見 docs/privacy.md）。
      */}
      <p className="banxin mt-16 border-t jielan pt-6 font-sans text-cap leading-[1.9] tracking-[0.1em] text-ink-3">
        付款在 Stripe 上完成，卡號不會經過我們。
        <br />
        我們只會知道這本書付過款，不會知道你用的是哪一張卡。
      </p>
    </main>
  );
}
