/**
 * 裁書：收費嘅判斷（工單 G3 · 架構 §4、§6、§8）
 *
 * ── 呢個檔冇 import 過 Stripe ──
 *
 * 同 `identity.ts` 一樣嘅分法：判斷同文案喺呢度，接 API 喺
 * `pay.server.ts`。Stripe 呢個環境接唔到（而且我亦都唔應該攞住
 * Issac 條 key），所以**接嗰半一個判斷都冇**，而判斷嗰半全部行得到測試。
 *
 * 邊幾行冇驗過，睇得一清二楚 —— 呢個就係分開嘅原因。
 */

/**
 * 賣乜（Issac 2026-09-22 決定）
 *
 * ⚠ **一次過買成本書**，唔係逐組章。
 *
 * 架構 §6 將深度章分咗六組（宮位三組 ／ 四化飛星 ／ 大限 ／ 流年），
 * 睇落好似應該逐組賣。但兩個理由否決咗：
 *
 * 一、**六組入面得三組生成到。** 四化飛星、大限、流年要等 C11，
 *     逐組賣即係賣緊三組空章。
 * 二、`chapter_body()` 由 G1 起就係噉寫：查「呢本書有冇票」，
 *     唔查 product。即係話揀一次過買，**DB 一個字都唔使改**。
 *
 * 逐組賣冇被否決永遠 —— `entitlements.product` 呢一欄仲喺度，
 * 而 `unique (reader_id, book_id, product)` 本來就容得落幾張票。
 * 改嘅日子要改嘅係 `chapter_body()`，同埋 chapters 加一個「屬邊組」嘅欄。
 */
export const PRODUCT = 'book';

/**
 * 價錢（⚠ 而家係 test mode 嘅假數）
 *
 * Issac 2026-09-22：**價錢未定，先行 test mode 通條路。**
 *
 * 所以呢度個數特登係一個**明顯假**嘅數：一蚊。
 * 一個似層似樣嘅假價錢（$29）會喺截圖同 demo 入面扮到自己係真嘅，
 * 然後有一日冇人記得佢係假 —— 一蚊唔會。
 *
 * `amount` 係**最細單位**（美分）。Stripe 收嘅係整數，
 * 而 `29.99` 呢種浮點數喺呢一層出現就係一個遲早出事嘅位。
 */
export const PRICE = {
  currency: 'usd',
  /** 美分。100 = US$1.00 —— 一個明顯假嘅數。 */
  amount: 100,
  /** ⚠ 真定假，寫喺資料度，唔靠人記得。 */
  placeholder: true,
} as const;

/** 印出嚟畀人睇嘅寫法。⚠ 全站只准喺 `/pay` 出現（架構 §6 硬規則）。 */
export function priceLabel(price: { amount: number } = PRICE): string {
  const major = (price.amount / 100).toFixed(2);
  return `US$${major}`;
}

/* ───────────────────────────────────────────────────────────
 * 開 checkout 之前嘅三道閘
 * ─────────────────────────────────────────────────────────── */

export type PayFacts = {
  /** 有冇 session。冇就連書都撈唔到。 */
  signedIn: boolean;
  /** 架構 §4：付款前必須認領。 */
  isAnonymous: boolean;
  /** 呢本書存唔存在、係咪佢本書。 */
  ownsBook: boolean;
  /** 已經買咗。 */
  hasEntitlement: boolean;
  /** 本書有冇題名（冇盤就冇書，架構 §8「唔好扮有」）。 */
  titled: boolean;
};

export type PayGate =
  | { can: 'checkout' }
  | { can: 'no'; why: 'signed-out' | 'anonymous' | 'not-yours' | 'already-paid' | 'untitled' };

/**
 * ⚠ 呢道閘喺開 checkout **之前**行，唔係喺 webhook 度行。
 *
 * DB 嗰邊有 trigger 擋住「未認領嘅讀者唔可以有票」。但嗰度爆嘅時候，
 * 個人**已經畀咗錢** —— 佢俾完錢，然後我哋話佢知佢冇資格。
 * 嗰個係最後一道網，唔係第一道。
 *
 * 次序有講究：`signed-out` 行先，因為冇 session 嗰陣
 * 其餘四樣嘢全部都係估。
 */
export function payGate(facts: PayFacts): PayGate {
  if (!facts.signedIn) return { can: 'no', why: 'signed-out' };
  if (!facts.ownsBook) return { can: 'no', why: 'not-yours' };
  if (!facts.titled) return { can: 'no', why: 'untitled' };
  if (facts.hasEntitlement) return { can: 'no', why: 'already-paid' };
  if (facts.isAnonymous) return { can: 'no', why: 'anonymous' };
  return { can: 'checkout' };
}

/**
 * 每個擋住嘅理由，對住一句人話同一個去處。
 *
 * ⚠ `not-yours` 同「冇呢本書」講同一句。
 * 分開講就係話畀人知「呢本書存在，但唔係你嘅」——
 * 而一個唔屬於你嘅 bookId，你唔應該知佢存唔存在。
 */
export const PAY_BLOCKED: Record<
  Exclude<PayGate, { can: 'checkout' }>['why'],
  { message: string; href: string | null; label: string | null }
> = {
  'signed-out': {
    message: '這個瀏覽器沒有書。如果書在另一部裝置上，請在那邊開啟。',
    href: '/shelf',
    label: '書齋',
  },
  anonymous: {
    message: '裁書之前要先認領這本書 —— 否則清掉瀏覽器資料，書和已裁的頁都會一起消失。',
    href: '/claim',
    label: '認領',
  },
  'not-yours': {
    message: '找不到這本書。',
    href: '/shelf',
    label: '書齋',
  },
  'already-paid': {
    message: '這本書已經裁開了。',
    href: '/shelf',
    label: '回書齋',
  },
  untitled: {
    message: '這本書還在等時辰，未成書。補回出生時辰，它才會有名字。',
    href: '/cast',
    label: '補時辰',
  },
};

/* ───────────────────────────────────────────────────────────
 * Webhook：邊個事件先算數
 * ─────────────────────────────────────────────────────────── */

/**
 * ⚠ 得一個事件算數：`checkout.session.completed` 而且 `payment_status: paid`。
 *
 * 兩個位都要查。`checkout.session.completed` 自己**唔等於畀咗錢** ——
 * 延遲付款方式（銀行過數嗰類）會喺 `payment_status: unpaid` 之下
 * 都送呢個事件出嚟。淨係睇事件名，就係一張未收到錢嘅票。
 */
export type WebhookEvent = {
  type: string;
  paymentStatus?: string;
  paymentId?: string;
  bookId?: string;
  readerId?: string;
};

export type WebhookVerdict =
  | { act: 'grant'; bookId: string; readerId: string; paymentId: string }
  | { act: 'ignore'; why: string }
  | { act: 'broken'; why: string };

export function webhookVerdict(event: WebhookEvent): WebhookVerdict {
  if (event.type !== 'checkout.session.completed') {
    return { act: 'ignore', why: `唔關事嘅事件 ${event.type}` };
  }

  /* ⚠ 見上面 —— 事件名唔等於畀咗錢。 */
  if (event.paymentStatus !== 'paid') {
    return { act: 'ignore', why: `payment_status 係 ${event.paymentStatus ?? '(冇)'}，唔係 paid` };
  }

  const { paymentId, bookId, readerId } = event;

  /*
   * ⚠ metadata 唔齊 = `broken`，唔係 `ignore`。
   *
   * 兩個字串係我哋自己喺開 checkout 嗰陣塞落去嘅。唔見咗即係
   * 我哋自己嗰邊有 bug，而個人已經畀咗錢。
   * 當佢係「唔關事」靜靜雞過咗去，就係收咗錢冇畀嘢 —— 而且冇人知。
   */
  if (!paymentId) return { act: 'broken', why: '冇 payment id' };
  if (!bookId || !readerId) {
    return { act: 'broken', why: `metadata 唔齊（book=${bookId ?? '-'} reader=${readerId ?? '-'}）` };
  }

  return { act: 'grant', bookId, readerId, paymentId };
}

/* ───────────────────────────────────────────────────────────
 * 由 Stripe 返嚟嗰版：成功頁
 * ─────────────────────────────────────────────────────────── */

export type ReturnState = 'paid' | 'pending' | 'cancelled';

/**
 * ⚠ 成功頁**唔准發票**（驗收第一條）。
 *
 * Stripe 送返嚟嗰陣，webhook 可能未到 —— 兩條路係並行嘅，
 * 冇邊條保證行先。順手嘅做法係喺呢度查一次 session 然後發票，
 * 而嗰樣正正係驗收禁止嘅：**「用戶關咗頁都收到」**，
 * 即係話發票唔可以靠一版頁被打開。
 *
 * 所以呢度只有三個狀態，而三個都係**照實講**：
 *
 *   paid      票到咗
 *   pending   畀咗錢，票未到 —— 唔係錯，係兩條路嘅時差
 *   cancelled 佢喺 Stripe 嗰邊撳咗返轉頭
 */
export function returnState(input: {
  cancelled: boolean;
  hasEntitlement: boolean;
}): ReturnState {
  if (input.hasEntitlement) return 'paid';
  return input.cancelled ? 'cancelled' : 'pending';
}

export const RETURN_COPY: Record<ReturnState, { title: string; body: string }> = {
  paid: {
    title: '裁開了',
    body: '整本書的深度章都可以讀了。回書齋，或者直接翻到下一章。',
  },
  /*
   * ⚠ 呢一句唔准寫成「處理中，請稍候」再自動 refresh。
   *
   * 自動 refresh 係喺度扮緊「你等一等就會好」，而我哋唔知 ——
   * webhook 可能一秒到，可能因為我哋部 server 有事而唔到。
   * 講得出嘅係：錢收到咗，票未到，而且唔使佢做嘢。
   */
  pending: {
    title: '收到了',
    body: '付款已經收到。開通需要一點時間，完成之後這本書就會自己裁開 —— 不用留在這一頁等。',
  },
  cancelled: {
    title: '沒有裁',
    body: '這一次沒有付款，書還是原來那本。想好了再回來，未裁的頁一直在。',
  },
};
