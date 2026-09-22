import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  PAY_BLOCKED,
  PRICE,
  PRODUCT,
  RETURN_COPY,
  payGate,
  priceLabel,
  returnState,
  webhookVerdict,
  type PayFacts,
} from '@/lib/pay';

/**
 * 裁書（工單 G3 · 架構 §4、§6、§8）
 */

const SRC = fileURLToPath(new URL('../src', import.meta.url));

function walk(d: string): string[] {
  return readdirSync(d).flatMap((n) => {
    const full = join(d, n);
    return statSync(full).isDirectory() ? walk(full) : /\.tsx?$/.test(n) ? [full] : [];
  });
}

/** 剷註釋先掃 —— 掃描器要量宣告，唔係量散文。 */
function bare(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const OK: PayFacts = {
  signedIn: true,
  isAnonymous: false,
  ownsBook: true,
  hasEntitlement: false,
  titled: true,
};

describe('⚠ 開 checkout 之前嘅閘', () => {
  it('齊晒就開得', () => {
    expect(payGate(OK)).toEqual({ can: 'checkout' });
  });

  /**
   * ⚠ 架構 §4：付款前必須認領，而且呢道閘要喺**畀錢之前**。
   *
   * DB 嗰個 trigger 一樣擋，但嗰度爆嗰陣個人已經畀咗錢 ——
   * 佢俾完錢，然後我哋話佢知佢冇資格。嗰個係最後一道網。
   */
  it('匿名讀者入唔到 checkout', () => {
    expect(payGate({ ...OK, isAnonymous: true })).toEqual({ can: 'no', why: 'anonymous' });
  });

  it('冇 session、唔係佢本書、未題名、買咗，全部擋', () => {
    expect(payGate({ ...OK, signedIn: false }).can).toBe('no');
    expect(payGate({ ...OK, ownsBook: false })).toEqual({ can: 'no', why: 'not-yours' });
    expect(payGate({ ...OK, titled: false })).toEqual({ can: 'no', why: 'untitled' });
    expect(payGate({ ...OK, hasEntitlement: true })).toEqual({ can: 'no', why: 'already-paid' });
  });

  /**
   * ⚠ 次序有講究：冇 session 嗰陣，其餘四樣嘢全部都係估。
   * 一個未登入嘅人唔應該收到「呢本書唔係你嘅」。
   */
  it('冇 session 行先，唔會漏口風講本書嘅事', () => {
    expect(payGate({ signedIn: false, isAnonymous: true, ownsBook: false, hasEntitlement: false, titled: false }))
      .toEqual({ can: 'no', why: 'signed-out' });
  });

  /**
   * ⚠ 「唔係你本書」同「冇呢本書」要講同一句。
   * 分開講就係話畀人知呢本書存在 —— 而一個唔屬於你嘅 bookId，
   * 你唔應該知佢存唔存在。
   */
  it('搵唔到本書嗰句唔會泄露本書存唔存在', () => {
    expect(PAY_BLOCKED['not-yours'].message).not.toMatch(/不是你|別人|他人|無權/);
    expect(PAY_BLOCKED['not-yours'].message).toContain('找不到');
  });

  it('每個擋住嘅理由都有一句人話同一個去處', () => {
    for (const [why, copy] of Object.entries(PAY_BLOCKED)) {
      expect(copy.message.length, why).toBeGreaterThan(5);
      expect(copy.href, why).toBeTruthy();
      expect(copy.label, why).toBeTruthy();
    }
  });
});

describe('⚠ Webhook：邊個事件先算數', () => {
  const paid = {
    type: 'checkout.session.completed',
    paymentStatus: 'paid',
    paymentId: 'pi_1',
    bookId: 'b1',
    readerId: 'r1',
  };

  it('齊晒就發票', () => {
    expect(webhookVerdict(paid)).toEqual({
      act: 'grant',
      bookId: 'b1',
      readerId: 'r1',
      paymentId: 'pi_1',
    });
  });

  /**
   * ⚠ `checkout.session.completed` 自己唔等於畀咗錢。
   *
   * 延遲付款方式（銀行過數嗰類）會喺 `payment_status: unpaid`
   * 之下都送呢個事件出嚟。淨係睇事件名，就係一張未收到錢嘅票。
   */
  it('事件啱但 payment_status 唔係 paid —— 唔發票', () => {
    expect(webhookVerdict({ ...paid, paymentStatus: 'unpaid' }).act).toBe('ignore');
    expect(webhookVerdict({ ...paid, paymentStatus: undefined }).act).toBe('ignore');
  });

  it('唔關事嘅事件照過', () => {
    expect(webhookVerdict({ type: 'invoice.paid' }).act).toBe('ignore');
  });

  /**
   * ⚠ metadata 唔齊 = broken，唔係 ignore。
   *
   * 兩個字串係我哋自己塞落去嘅。唔見咗即係我哋自己有 bug，
   * 而個人已經畀咗錢。當佢「唔關事」靜靜雞過咗去，
   * 就係收咗錢冇畀嘢 —— 而且冇人知。
   */
  it('畀咗錢但 metadata 唔齊，係 broken 唔係 ignore', () => {
    expect(webhookVerdict({ ...paid, bookId: undefined }).act).toBe('broken');
    expect(webhookVerdict({ ...paid, readerId: undefined }).act).toBe('broken');
    expect(webhookVerdict({ ...paid, paymentId: undefined }).act).toBe('broken');
  });
});

describe('⚠ 成功頁只准照實講', () => {
  it('票到咗先講裁開咗', () => {
    expect(returnState({ cancelled: false, hasEntitlement: true })).toBe('paid');
  });

  it('畀咗錢票未到 = pending，唔係錯', () => {
    expect(returnState({ cancelled: false, hasEntitlement: false })).toBe('pending');
  });

  it('撳咗返轉頭 = cancelled', () => {
    expect(returnState({ cancelled: true, hasEntitlement: false })).toBe('cancelled');
  });

  /** ⚠ 已經有票嘅話，就算條 URL 話 cancelled 都好，佢真係有票。 */
  it('有票嘅話，cancelled 都係 paid', () => {
    expect(returnState({ cancelled: true, hasEntitlement: true })).toBe('paid');
  });

  /**
   * ⚠ pending 嗰句唔准寫成「請稍候」再自動 refresh。
   *
   * 自動 refresh 係喺度扮緊「你等一等就會好」，而我哋唔知。
   */
  it('pending 嗰句唔叫人留喺度等', () => {
    expect(RETURN_COPY.pending.body).toContain('不用留在這一頁等');
    expect(RETURN_COPY.pending.body).not.toMatch(/請稍候|稍後刷新|重新整理/);
  });

  it('三個狀態都有字', () => {
    for (const [state, copy] of Object.entries(RETURN_COPY)) {
      expect(copy.title.length, state).toBeGreaterThan(1);
      expect(copy.body.length, state).toBeGreaterThan(10);
    }
  });
});

describe('價錢', () => {
  /** ⚠ 而家係 test mode 嘅假數，而「假」寫咗喺資料度，唔靠人記得。 */
  it('價錢標住自己係假嘅', () => {
    expect(PRICE.placeholder).toBe(true);
  });

  it('金額係最細單位嘅整數 —— 唔係浮點數', () => {
    expect(Number.isInteger(PRICE.amount)).toBe(true);
    expect(PRICE.amount).toBeGreaterThan(0);
  });

  it('印出嚟係 US$', () => {
    expect(priceLabel()).toBe('US$1.00');
    expect(priceLabel({ amount: 2900 })).toBe('US$29.00');
  });

  it('一次過買成本書 —— 一個 product', () => {
    expect(PRODUCT).toBe('book');
  });
});

describe('⚠ 題名之前唔准出現價錢（架構 §6 硬規則）', () => {
  /**
   * 六幕嘅次序係：入齋 → 書齋 → 取書 → 落款 → 題名 → 展卷。
   * 價錢只准喺題名之後出現，而實際上只准喺 `/pay`。
   *
   * ⚠ `check-routes.mjs` 已經喺 runtime 掃 `/cast` 同 `/claim`，
   * 但嗰個掃嘅係**畫出嚟嗰版**。呢條掃嘅係 source ——
   * 一個未接線嘅常數、一句註釋以外嘅 `US$`，喺呢度就捉到。
   */
  const ALLOWED = [join('lib', 'pay.ts'), join('pay', '[bookId]')];

  it('價錢字眼只喺 pay 嗰幾個檔出現', () => {
    const offenders = walk(SRC)
      .filter((f) => !ALLOWED.some((a) => f.includes(a)))
      .filter((f) => /US\$|\$\d|£\d|價錢|升級|訂閱/.test(bare(f)));
    expect(offenders).toEqual([]);
  });

  /** 先證明佢掃到嘢 —— 一個掃到零個檔嘅掃描會靜靜雞全綠。 */
  it('掃得到嘢', () => {
    expect(walk(SRC).length).toBeGreaterThan(30);
  });
});

describe('⚠ Stripe 嘅 key 唔准離開 server', () => {
  /**
   * `check-bundle.mjs` 喺 build 之後掃 client chunk，呢條喺 source 掃。
   * 兩層都要，因為 build 掃描量嘅係「漏咗出去未」，
   * 而呢條量嘅係「有冇人喺一個 client component 度攞佢」。
   */
  it('冇人用 NEXT_PUBLIC_ 開頭嘅 Stripe key', () => {
    const offenders = walk(SRC).filter((f) =>
      /NEXT_PUBLIC_STRIPE|NEXT_PUBLIC_.*SECRET/i.test(bare(f)),
    );
    expect(offenders).toEqual([]);
  });

  it("掂 Stripe 嘅檔全部有 'server-only'", () => {
    const offenders = walk(SRC)
      .filter((f) => /from ['"]stripe['"]|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET/.test(bare(f)))
      .filter((f) => !/['"]server-only['"]/.test(readFileSync(f, 'utf8')))
      /* route handler 天生只喺 server 行，但要喺名度睇得出。 */
      .filter((f) => !f.includes(join('api', 'stripe')));
    expect(offenders).toEqual([]);
  });
});
