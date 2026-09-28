import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Juanshou, backToContents } from '@/components/Juanshou';
import { chapterHref, claimHref, contentsHref, payHref, safeSlug } from '@/lib/journey';
import { CaishuForm } from '@/components/CaishuForm';
import { PAY_BLOCKED, payGate, priceLabel, returnState } from '@/lib/pay';
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
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pay' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

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
  const t = await getTranslations('pay');

  /*
   * 由邊一章嚟（重新設計第二期）。
   *
   * 之前呢一版所有出口都係「回書齋」—— 行完未裁章 → 認領 → 付款 → Stripe
   * 成條路，返唔到你想開嗰一章。而家嗰一章跟住條路行，
   * 冇帶就退返目次（都係呢本書，唔係成個書齋）。
   */
  const ch = safeSlug(query.ch);
  const back = ch ? { href: chapterHref(bookId, ch), label: ch } : backToContents(bookId);
  const onward = ch
    ? { href: chapterHref(bookId, ch), label: t('readChapter', { title: ch }) }
    : { href: contentsHref(bookId), label: t('openContents') };

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
        <Juanshou back={back} title={t('unreachableTitle')} step={4} />
        <p className="banxin text-body leading-[1.95] text-ink-2">
          {t('unreachable')}
        </p>
        <div className="banxin mt-10">
          <Link href={back.href} className="btn-mo">
            {t('back')}
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
    const copy = { title: t(`return.${state}.title`), body: t(`return.${state}.body`) };
    return (
      <main className="juan tai">
        <Juanshou back={back} title={copy.title} step={4} />
        <p className="banxin text-body leading-[1.95]">{copy.body}</p>
        <div className="banxin mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          {/* 裁開咗就直接去嗰一章；未到／冇畀都係返去嗰一章 —— 免費嗰啲照讀得 */}
          <Link href={onward.href} className="btn-mo">
            {state === 'paid' ? onward.label : t('back')}
            <span className="btn-jiantou" aria-hidden="true">→</span>
          </Link>
          <Link href="/shelf" className="lian">
            {t('toShelf')}
          </Link>
        </div>
      </main>
    );
  }

  const gate = payGate(facts);

  /* 擋住嗰幾種情況，出口都帶住嗰一章：要認領就認領完返嚟付款；已經裁開就直接去讀。 */
  function blockedHref(why: string, fallback: string): string {
    if (why === 'anonymous') return claimHref({ next: payHref(bookId, ch), from: back.href });
    if (why === 'already-paid') return onward.href;
    return fallback;
  }

  if (gate.can !== 'checkout') {
    const blocked = PAY_BLOCKED[gate.why];
    return (
      <main className="juan tai">
        <Juanshou back={back} title={t('title')} step={4} />
        <p className="banxin text-body leading-[1.95]">{t(`blocked.${gate.why}.message`)}</p>
        {blocked.href ? (
          <div className="banxin mt-10">
            <Link href={blockedHref(gate.why, blocked.href)} className="btn-mo">
              {gate.why === 'already-paid' ? onward.label : t(`blocked.${gate.why}.label`)}
            </Link>
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <main className="juan tai">
      <Juanshou back={back} title={t('title')} step={4} />

      {/* 裁書：一張卡（重新設計第四期）。講清楚 → 價錢 → 一粒掣，全部喺同一格 */}
      <div className="banxin">
        <div className="ka p-6 sm:p-8">
          <div className="flex flex-col gap-4 text-body leading-[1.95]">
            <p>{t('explain1')}</p>
            <p className="text-ink-2">
              {t('explain2')}
            </p>
          </div>

          <CaishuForm bookId={bookId} chapter={ch} priceLabel={priceLabel()} />
        </div>
      </div>

      {/*
        ⚠ 呢句唔係細則，係承諾。
        卡號唔會掂到我哋部 server —— 用 Stripe 嘅 hosted checkout，
        所以連一段第三方 script 都唔會喺呢一版度載（見 docs/privacy.md）。
      */}
      <p className="banxin mt-16 border-t jielan pt-6 font-sans text-cap leading-[1.9] tracking-[0.1em] text-ink-3">
        {t('stripe1')}
        <br />
        {t('stripe2')}
      </p>
    </main>
  );
}
