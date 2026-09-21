import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createTestDb, seedReader, type TestDb } from '../src/testing';

/**
 * 認領（工單 G2 · 架構 §4）
 *
 * ── 第一條 AC 喺 G1 嗰陣已經贏咗 ──
 *
 * 「認領後所有書同已購章節自動跟住走」—— 呢句喺 G1 揀
 * `readers.id = auth.users.id` 嗰一刻就成立咗：`linkIdentity` 加一個
 * email 落同一個 auth user 度，`auth.uid()` 一個字都冇變，
 * 所以根本冇嘢好搬。
 *
 * 架構 §5 特登寫過：「**唔好自己捲 cookie 之後搬資料**。」
 * 一個要搬資料嘅認領流程，係一個會搬漏嘢嘅流程。
 *
 * 所以呢一份測試唔係測「搬得啱唔啱」，係測**真係冇搬過**。
 */

let db: TestDb;
let me: string;

/** 認領 = Supabase Auth 嗰邊加咗個 email。我哋呢邊淨係跟。 */
async function linkIdentity(uid: string, email: string) {
  await db.asOwner();
  await db.sql('update auth.users set email = $1, is_anonymous = false where id = $2', [
    email,
    uid,
  ]);
}

beforeEach(async () => {
  db = await createTestDb();
  me = await seedReader(db);
});

afterEach(async () => {
  await db?.close();
});

describe('readers 嗰行由 auth.users 自己生', () => {
  /**
   * 本來係 app 去 insert 一行。但咁樣佢就 insert 得出一行
   * `is_anonymous = false` —— 即係話一個從來未認領過嘅人
   * 可以喺出世嗰一刻就話自己認咗領。
   */
  it('開咗個 auth user，readers 就有一行，而且係匿名', async () => {
    await db.asOwner();
    const [row] = await db.sql('select is_anonymous, email, visit_days from readers where id = $1', [
      me,
    ]);
    expect(row!.is_anonymous).toBe(true);
    expect(row!.email).toBeNull();
    expect(row!.visit_days).toBe(1);
  });

  it('讀者自己 insert 一行 → 冇權', async () => {
    await db.asReader(me);
    await expect(
      db.sql(`insert into readers (id, is_anonymous, email) values (gen_random_uuid(), false, 'x@example.com')`),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('⚠ 認領狀態唔可以自己講', () => {
  /**
   * G1 留低咗呢個窿：當時 grant 咗 `update (email, is_anonymous)`。
   *
   * 而「認咗領」唔係一個形容詞，係**付款硬閘嘅條件**（架構 §4）。
   * 一個自己講自己認咗領嘅欄位，同用戶自己寫得入嘅 entitlement 一樣
   * —— 唔係憑據。
   */
  it('讀者改唔到自己 is_anonymous', async () => {
    await db.asReader(me);
    await expect(
      db.sql('update readers set is_anonymous = false where id = $1', [me]),
    ).rejects.toThrow(/permission denied/);
  });

  it('讀者改唔到自己 email', async () => {
    await db.asReader(me);
    await expect(
      db.sql(`update readers set email = 'x@example.com' where id = $1`, [me]),
    ).rejects.toThrow(/permission denied/);
  });

  it('auth 嗰邊一加 email，我哋呢邊即刻跟到', async () => {
    await linkIdentity(me, 'issac@example.com');
    const [row] = await db.sql('select is_anonymous, email from readers where id = $1', [me]);
    expect(row!.is_anonymous).toBe(false);
    expect(row!.email).toBe('issac@example.com');
  });
});

describe('⚠ 認領之後，一件嘢都冇搬過', () => {
  it('同一個 id、同一批書、同一啲章，全部原封不動', async () => {
    await db.asOwner();
    const [b] = await db.sql('insert into books (reader_id) values ($1) returning id', [me]);
    const bookId = String(b!.id);
    await db.sql(
      `insert into chapters (book_id, slug, ord, tier, title, body, content_version)
       values ($1, 'ming', 1, 'free', '命宮', '命宮嘅正文', 'c1@aec70cc1')`,
      [bookId],
    );

    /* 認領之前：匿名 session 睇得到自己本書。 */
    await db.asReader(me);
    const before = await db.sql('select id from books');
    expect(before.map((r) => String(r.id))).toEqual([bookId]);

    await linkIdentity(me, 'issac@example.com');

    /* 認領之後：**同一個 uid**，所以同一條 query 回同一行。 */
    await db.asReader(me);
    const after = await db.sql('select id, reader_id from books');
    expect(after.map((r) => String(r.id))).toEqual([bookId]);
    expect(String(after[0]!.reader_id)).toBe(me);

    const [ch] = await db.sql('select id from chapters');
    const [body] = await db.sql('select chapter_body($1) as body', [String(ch!.id)]);
    expect(body!.body).toBe('命宮嘅正文');
  });

  /**
   * 反面：認領之前買咗嘅嘢，認領之後一樣跟住。
   * （實際上買唔到 —— 見下面嗰條硬閘 —— 但票由 service_role 寫，
   *   所以呢度模擬一張「因為某個原因存在咗」嘅票，確認佢唔會唔見。）
   */
  it('票一樣跟住走', async () => {
    await linkIdentity(me, 'issac@example.com');
    await db.asOwner();
    const [b] = await db.sql('insert into books (reader_id) values ($1) returning id', [me]);
    await db.asService();
    await db.sql(
      `insert into entitlements (reader_id, book_id, product, stripe_payment_id)
       values ($1, $2, 'deep', 'pi_keep')`,
      [me, String(b!.id)],
    );
    await db.asReader(me);
    const rows = await db.sql('select product from entitlements');
    expect(rows.map((r) => r.product)).toEqual(['deep']);
  });
});

describe('⚠ 付款硬閘啱啱好喺認領嗰一刻開', () => {
  /**
   * 架構 §4：認領提示第三次係**付款前（硬閘）**。
   * 呢條閘喺 DB（G1 嗰個 trigger），所以佢係一條可以量嘅線：
   * 認領之前寫唔到票，認領之後寫得到。
   */
  it('認領之前寫唔到票，之後寫得到', async () => {
    await db.asOwner();
    const [b] = await db.sql('insert into books (reader_id) values ($1) returning id', [me]);
    const args = [me, String(b!.id)];

    await db.asService();
    await expect(
      db.sql(
        `insert into entitlements (reader_id, book_id, product, stripe_payment_id)
         values ($1, $2, 'deep', 'pi_before')`,
        args,
      ),
    ).rejects.toThrow(/未認領/);

    await linkIdentity(me, 'issac@example.com');

    await db.asService();
    await db.sql(
      `insert into entitlements (reader_id, book_id, product, stripe_payment_id)
       values ($1, $2, 'deep', 'pi_after')`,
      args,
    );
    const rows = await db.sql('select count(*)::int as n from entitlements');
    expect(rows[0]!.n).toBe(1);
  });
});

describe('回訪次數：一日一次', () => {
  /**
   * 「第二次回訪」係三個提示入面唯一一個要記低嘅 ——
   * 另外兩個（成書後、付款前）係時刻，唔使數。
   *
   * ⚠ 呢個數唔可以擺喺 localStorage：G1 定咗嗰度只准兩個 key，
   * 而且清 cookie 就會由頭數過 —— 即係每次都嘈。
   */
  it('同一日撳幾多次都係一次', async () => {
    await db.asReader(me);
    const [a] = await db.sql('select touch_visit() as n');
    const [b] = await db.sql('select touch_visit() as n');
    expect(a!.n).toBe(1);
    expect(b!.n).toBe(1);
  });

  it('第二日先加一', async () => {
    await db.asOwner();
    await db.sql(`update readers set last_visit_on = current_date - 1 where id = $1`, [me]);
    await db.asReader(me);
    const [row] = await db.sql('select touch_visit() as n');
    expect(row!.n).toBe(2);
  });

  it('數唔到第二個人嘅', async () => {
    const other = await seedReader(db);
    await db.asOwner();
    await db.sql(`update readers set last_visit_on = current_date - 1`);
    await db.asReader(me);
    await db.sql('select touch_visit()');
    await db.asOwner();
    const [row] = await db.sql('select visit_days from readers where id = $1', [other]);
    expect(row!.visit_days).toBe(1);
  });
});

describe('撳走咗就唔好再嘈', () => {
  it('撳一次之後有時間，再撳唔會改咗個時間', async () => {
    await db.asReader(me);
    await db.sql('select dismiss_claim_prompt()');
    await db.asOwner();
    const [first] = await db.sql('select claim_dismissed_at from readers where id = $1', [me]);
    expect(first!.claim_dismissed_at).not.toBeNull();

    await db.asReader(me);
    await db.sql('select dismiss_claim_prompt()');
    await db.asOwner();
    const [second] = await db.sql('select claim_dismissed_at from readers where id = $1', [me]);
    expect(second!.claim_dismissed_at).toEqual(first!.claim_dismissed_at);
  });
});
