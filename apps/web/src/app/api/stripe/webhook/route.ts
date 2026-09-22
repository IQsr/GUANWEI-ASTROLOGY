import type Stripe from 'stripe';
import { grantEntitlement, verifyEvent } from '@/lib/pay.server';
import { webhookVerdict, type WebhookEvent } from '@/lib/pay';

/**
 * Stripe webhook（工單 G3 · 架構 §8）
 *
 * ── ⚠ 點解票由呢度發，唔由 return URL 發 ──
 *
 * 驗收標準兩條，而佢哋其實係同一條：
 *
 *   「webhook 先寫 entitlement，唔靠 return URL」
 *   「用戶關咗頁都收到」
 *
 * 一個人撳完「畀錢」之後，會唔會返到我哋版頁，我哋控制唔到 ——
 * 佢可以熄咗個 tab、可以斷線、可以撳咗返上一頁。
 * 如果票係由嗰版頁發嘅，噉佢就係**收咗錢冇畀嘢**。
 *
 * 所以呢條路係唯一發票嘅路，而 `/pay` 嗰版成功頁**淨係問得一句**
 * 「票到咗未」（`has_entitlement()`），問完照實講。
 *
 * ── 呢個 route 唔經 middleware ──
 *
 * `middleware.ts` 個 matcher 係 `/((?!api|_next|_vercel|.*\..*).*)` ——
 * `api` 排咗出去。呢個係啱嘅：Stripe 唔帶 cookie、唔識語言協商，
 * 一個 next-intl 嘅轉向就會令佢收到 307 然後當我哋死咗。
 */

/** ⚠ 一定要 Node runtime：驗簽名要 crypto，edge 嗰邊唔一定得。 */
export const runtime = 'nodejs';
/** 唔准快取 —— 呢條係寫入。 */
export const dynamic = 'force-dynamic';

function flatten(event: Stripe.Event): WebhookEvent {
  const object = event.data.object as Partial<Stripe.Checkout.Session>;
  const metadata = object.metadata ?? {};
  return {
    type: event.type,
    paymentStatus: object.payment_status,
    /*
     * ⚠ 用 session id 做 payment id，唔用 payment_intent。
     *
     * `unique (stripe_payment_id)` 係防重送嗰道閘，而 Stripe 重送
     * 嘅係**同一個事件**（同一個 session）。`payment_intent` 喺
     * 某啲付款方式之下可以係 null，而一個 null 過唔到 not null。
     */
    paymentId: object.id,
    bookId: metadata.book_id,
    readerId: metadata.reader_id,
  };
}

export async function POST(req: Request): Promise<Response> {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('冇簽名', { status: 400 });

  /* ⚠ raw body。`req.json()` 再 stringify 返轉頭係驗唔到簽名嘅。 */
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = verifyEvent(raw, signature);
  } catch (err) {
    /*
     * ⚠ 驗唔到就 400，而且唔好講點解。
     *
     * 一個講清楚「你條簽名錯喺邊」嘅錯誤訊息，係寫畀攻擊者睇嘅。
     * 真 Stripe 唔需要呢個訊息 —— 佢唔會簽錯。
     */
    console.error('[stripe] 簽名驗唔過：' + (err instanceof Error ? err.message : String(err)));
    return new Response('簽名唔啱', { status: 400 });
  }

  const verdict = webhookVerdict(flatten(event));

  if (verdict.act === 'ignore') {
    /* 唔關事嘅事件要回 200，否則 Stripe 會一路重送落去。 */
    return Response.json({ ok: true, skipped: verdict.why });
  }

  if (verdict.act === 'broken') {
    /*
     * ⚠ 畀咗錢但我哋自己唔知係邊本書 —— 呢個一定要嘈。
     *
     * 回 500 令 Stripe 重送（可能係一時嘅），而且喺 dashboard 度
     * 留低一條紅色紀錄。靜靜雞回 200 就係收咗錢冇畀嘢，
     * 而且冇人知 —— 連我哋自己都唔知。
     */
    console.error(`[stripe] ⚠ 收到錢但發唔到票：${verdict.why}（event ${event.id}）`);
    return new Response('metadata 唔齊', { status: 500 });
  }

  try {
    const fresh = await grantEntitlement(verdict);
    /*
     * ⚠ `fresh === false` 係**成功**，唔係錯。
     *
     * 本來就有票 = Stripe 重送，或者個人撳咗兩次 checkout。
     * 回錯嘅話 Stripe 會再送，而再送一樣係 false —— 永遠重試落去。
     */
    return Response.json({ ok: true, fresh });
  } catch (err) {
    /*
     * 寫唔入（DB 有事、未認領嘅讀者撞到 trigger、書唔夾人）。
     * 回 500 等 Stripe 重送 —— 如果係一時嘅，下一次就掂。
     * 如果唔係一時嘅，dashboard 會見到一條一直紅嘅紀錄，
     * 而嗰個正正係我哋想見到嘅嘢。
     */
    console.error(`[stripe] ⚠ 寫票失敗（event ${event.id}）：` + String(err));
    return new Response('寫唔到票', { status: 500 });
  }
}
