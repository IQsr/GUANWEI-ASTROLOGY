'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { payGate } from '@/lib/pay';
import { safeSlug } from '@/lib/journey';
import { createCheckout, currentReaderId, payFacts } from '@/lib/pay.server';

export type CheckoutState = { message: string } | null;

/**
 * 開 checkout（工單 G3）
 *
 * ⚠ **道閘喺呢度再行一次，唔係淨係喺版面度行。**
 *
 * server action 係一個公開 HTTP endpoint（E4 嗰課）。
 * 一個匿名讀者用 curl 直接 POST 呢個 action，係入得到 checkout 嘅 ——
 * 除非呢度自己查。版面嗰次係畀人睇，呢次先係閘。
 *
 * （DB 嗰個 trigger 仲喺後面守尾門，但嗰度爆嗰陣個人已經畀咗錢。）
 */
export async function checkoutAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const t = await getTranslations('pay');
  const bookId = String(formData.get('bookId') ?? '');
  if (!bookId) return { message: t('errors.noBook') };
  /* 由邊一章嚟。公開 endpoint 收到乜都得，所以驗過先用；唔啱就當冇。 */
  const chapter = safeSlug(formData.get('ch'));

  let url: string;
  try {
    const facts = await payFacts(bookId);
    const gate = payGate(facts);

    /*
     * ⚠ 擋住就唔好喺呢度出理由。
     *
     * 呢個 action 係公開 endpoint，而「呢本書唔係你嘅」同
     * 「呢本書唔存在」分開講，就係一個查得出邊啲 bookId 存在嘅工具。
     * 版面嗰邊先分得細 —— 嗰邊已經知道係邊個喺度睇。
     */
    if (gate.can !== 'checkout') return { message: t('errors.blocked') };

    const readerId = await currentReaderId();
    if (!readerId) return { message: t('errors.blocked') };

    /* ⚠ origin 由 request header 攞 —— 唔好用 NEXT_PUBLIC_SITE_URL，
       嗰條係畀 canonical／sitemap 用嘅，preview 部署上面同真 origin 唔同。 */
    const h = await headers();
    const host = h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'https';
    if (!host) return { message: t('errors.blocked') };

    url = await createCheckout({
      bookId,
      readerId,
      /* Stripe 付款頁上面讀者見到嘅產品名，跟讀者語言 */
      bookTitle: t('product'),
      origin: `${proto}://${host}`,
      chapter,
    });
  } catch (error) {
    /* 行到呢度即係我哋自己壞咗（多數係環境變數）。真錯誤記落 server log。 */
    console.error('[pay] ', error);
    return { message: t('errors.failed') };
  }

  /* ⚠ redirect() 要喺 try 外面 —— 佢係掟一個特別 error 出嚟行嘅。 */
  redirect(url);
}
