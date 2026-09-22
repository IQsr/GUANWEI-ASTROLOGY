import 'server-only';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase.server';
import { publicEnv, serviceKey } from '@/lib/env';
import { PRICE, PRODUCT, type PayFacts } from '@/lib/pay';

/**
 * 裁書嘅真 adapter（工單 G3）
 *
 * ⚠ 同 `identity.server.ts`、`shelf.server.ts` 一樣：**冇跑過。**
 *
 * 呢個環境接唔到一個真 Stripe，亦都接唔到一個真 Supabase。
 * 而且我唔應該攞住 Issac 條 Stripe key —— 呢個唔係方便唔方便嘅問題。
 *
 * 所以呢個檔一個判斷都冇：攞環境變數、叫 API、回值。
 * 所有判斷喺 `lib/pay.ts`，嗰邊行得到測試。
 * **邊幾行冇驗過，睇得一清二楚。**
 */

/**
 * ⚠ 三條 key，三個唔同嘅危險級別：
 *
 *   STRIPE_SECRET_KEY      收錢同退錢都做得到
 *   STRIPE_WEBHOOK_SECRET  冇佢就分唔出邊個 request 真係 Stripe 送嘅
 *   SUPABASE_SERVICE_ROLE  bypass 晒 RLS（`lib/env.ts` 守住）
 *
 * 三條都**冇** `NEXT_PUBLIC_` 前綴，而 `test/pay.test.ts` 掃住
 * 冇人喺一個 client component 度攞佢哋。
 */
function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error('冇 STRIPE_SECRET_KEY');
  return new Stripe(key);
}

export function webhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error('冇 STRIPE_WEBHOOK_SECRET');
  return secret;
}

/**
 * ⚠ 驗簽名一定要用 **raw body**。
 *
 * `await req.json()` 再 `JSON.stringify()` 返轉頭係驗唔到嘅 ——
 * 鍵嘅次序、空格、Unicode escape 全部會變，而簽名簽嘅係原本嗰串 byte。
 * 呢個係 Stripe webhook 最經典嗰個 bug，而佢嘅症狀係
 * 「本機用 CLI 試就得，上到線就全部 400」。
 */
export function verifyEvent(raw: string, signature: string): Stripe.Event {
  return stripe().webhooks.constructEvent(raw, signature, webhookSecret());
}

/** ⚠ service role client：淨係 webhook 行得，而且唔帶 cookie（佢冇 session）。 */
function supabaseService() {
  const env = publicEnv();
  return createClient(env.url, serviceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** 攞齊 `payGate()` 要嘅五樣嘢。撈唔到就 throw，由上面嗰層出一句人話。 */
export async function payFacts(bookId: string): Promise<PayFacts> {
  const sb = supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) {
    return { signedIn: false, isAnonymous: true, ownsBook: false, hasEntitlement: false, titled: false };
  }

  const { data: reader, error: readerError } = await sb
    .from('readers')
    .select('is_anonymous')
    .eq('id', auth.user.id)
    .single();
  if (readerError) throw readerError;

  /* RLS 保證咗撈得到嘅一定係自己嗰本 —— 撈唔到就係「唔係你本書」。 */
  const { data: book } = await sb.from('books').select('id, chart_id').eq('id', bookId).maybeSingle();

  const { data: paidFor, error: paidError } = await sb.rpc('has_entitlement', { p_book: bookId });
  if (paidError) throw paidError;

  return {
    signedIn: true,
    isAnonymous: reader.is_anonymous,
    ownsBook: book !== null,
    hasEntitlement: Boolean(paidFor),
    titled: Boolean(book?.chart_id),
  };
}

/** 呢一刻邊個讀者。`/pay` 要佢嚟塞落 Stripe metadata。 */
export async function currentReaderId(): Promise<string | null> {
  const { data } = await supabaseServer().auth.getUser();
  return data.user?.id ?? null;
}

/**
 * 開一個 Stripe Checkout session，回條 URL。
 *
 * ⚠ 用 hosted Checkout，唔喺自己版度收卡。
 *
 * 兩個理由，而第二個先係重點：
 *
 * 一、卡號永遠唔會掂到我哋部 server。
 * 二、**唔使喺自己版度載 Stripe 嘅 JS** —— 即係話 `docs/privacy.md`
 *     嗰張第三方名單唔會多一個 host。個人係由我哋部 server
 *     被轉去 checkout.stripe.com，而唔係一入 `/pay` 就有一段
 *     第三方 script 喺度睇住佢。
 */
export async function createCheckout(input: {
  bookId: string;
  readerId: string;
  bookTitle: string;
  origin: string;
}): Promise<string> {
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: PRICE.currency,
          unit_amount: PRICE.amount,
          product_data: { name: input.bookTitle },
        },
      },
    ],
    /*
     * ⚠ 呢兩個字串就係 webhook 唯一知道「邊本書、邊個人」嘅途徑。
     * 佢哋唔齊嘅話，`webhookVerdict()` 會答 `broken` 而唔係 `ignore` ——
     * 因為嗰陣個人已經畀咗錢。
     */
    metadata: { book_id: input.bookId, reader_id: input.readerId },
    success_url: `${input.origin}/pay/${input.bookId}?done=1`,
    cancel_url: `${input.origin}/pay/${input.bookId}?cancelled=1`,
  });

  if (!session.url) throw new Error('Stripe 冇回一條 checkout URL');
  return session.url;
}

/**
 * 寫票。回 true = 今次先寫咗一張新嘅。
 *
 * ⚠ 唔喺呢度做冪等 —— 做喺 DB 嗰句 `on conflict do nothing`。
 * 「先查有冇，冇就寫」係一條 race：Stripe 同一個事件重送兩次，
 * 兩個 request 可以同時查到「冇」。
 */
export async function grantEntitlement(input: {
  bookId: string;
  readerId: string;
  paymentId: string;
}): Promise<boolean> {
  const { data, error } = await supabaseService().rpc('grant_entitlement', {
    p_book: input.bookId,
    p_reader: input.readerId,
    p_product: PRODUCT,
    p_payment_id: input.paymentId,
    /*
     * ⚠ 金額同貨幣要寫入會計紀錄（G4 嘅 `payment_records`）。
     *
     * 呢度傳嘅係**我哋自己嗰個 PRICE**，唔係 Stripe 回嘅 `amount_total` ——
     * 而嗰個分別將來會咬人：折扣碼、稅、退款差額都會令兩者唔同。
     * 真正收咗幾多錢，Stripe 先係權威。
     * ⚠ 而家兩者一定一樣（冇折扣冇稅），所以夠用；接稅嗰日要改呢度。
     */
    p_amount: PRICE.amount,
    p_currency: PRICE.currency,
  });
  if (error) throw error;
  return Boolean(data);
}
