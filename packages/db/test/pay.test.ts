import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createTestDb, seedReader, type TestDb } from '../src/testing';

/**
 * 寫票（工單 G3 · 架構 §4、§6、§8）
 *
 * ⚠ 呢一份測試守住嘅係一句話：**一張票係「畀咗錢」嘅憑據。**
 *
 * 憑據嘅意思係：除咗 Stripe webhook 嗰條路，冇第二個方法整得出。
 * 所以下面大部分測試量嘅唔係「寫得入」，係「邊啲人寫唔入」。
 */

let db: TestDb;
let paid: string;
let anon: string;
let stranger: string;

beforeEach(async () => {
  db = await createTestDb();
  paid = await seedReader(db, { anonymous: false, email: 'paid@example.com' });
  anon = await seedReader(db);
  stranger = await seedReader(db, { anonymous: false, email: 'stranger@example.com' });
});

afterEach(() => db.close());

async function seedBook(reader: string) {
  await db.asOwner();
  const [b] = await db.sql('insert into books (reader_id) values ($1) returning id', [reader]);
  const book = String(b!.id);
  const mk = async (slug: string, ord: number, tier: string) => {
    const [c] = await db.sql(
      `insert into chapters (book_id, slug, ord, tier, title, body, content_version, slots)
       values ($1, $2, $3, $4, $5, $6, 'r1@x', $7) returning id`,
      [book, slug, ord, tier, slug, `${slug} 嘅正文`, ['開場', '結構', '留白']],
    );
    return String(c!.id);
  };
  return { book, free: await mk('序', 1, 'free'), deep: await mk('兄弟', 2, 'deep') };
}

const grant = (book: string, reader: string, payment: string) =>
  db.sql('select grant_entitlement($1, $2, $3, $4, $5, $6) as ok', [
    book,
    reader,
    'book',
    payment,
    100,
    'usd',
  ]);

describe('⚠ Stripe 重送唔可以出兩張票', () => {
  /**
   * Stripe 明文講會重送 —— 網絡斷、我哋回得慢、佢自己重試。
   * 「先 select 睇吓有冇，冇就 insert」係一條 race：
   * 兩個 request 可以同時 select 到「冇」。
   */
  it('同一個 payment id 送兩次，第二次回 false', async () => {
    const { book } = await seedBook(paid);
    await db.asService();
    const [a] = await grant(book, paid, 'pi_1');
    const [b] = await grant(book, paid, 'pi_1');
    expect(a!.ok).toBe(true);
    expect(b!.ok).toBe(false);
  });

  it('兩次之後都係得一張票', async () => {
    const { book } = await seedBook(paid);
    await db.asService();
    await grant(book, paid, 'pi_1');
    await grant(book, paid, 'pi_1');
    const [row] = await db.sql('select count(*)::int as n from entitlements where book_id = $1', [
      book,
    ]);
    expect(row!.n).toBe(1);
  });

  /**
   * ⚠ 呢條同上面唔同：**唔同 payment id，同一本書。**
   *
   * 用戶撳咗兩次 checkout、兩邊都畀咗錢 —— 呢個係一個真嘅可能。
   * DB 嗰條 `unique (reader_id, book_id, product)` 擋住第二張，
   * 所以佢唔會有兩張票。退返錢係人手嘅事，但**數據唔可以亂**。
   */
  it('同一本書畀咗兩次錢，都係得一張票', async () => {
    const { book } = await seedBook(paid);
    await db.asService();
    const [a] = await grant(book, paid, 'pi_1');
    const [b] = await grant(book, paid, 'pi_2');
    expect(a!.ok).toBe(true);
    expect(b!.ok).toBe(false);
  });
});

describe('⚠ 票唔可以跨人寫', () => {
  /**
   * service_role bypass 晒 RLS，所以「呢本書係咪佢本書」冇人查 ——
   * 除咗呢個 function 自己查。
   *
   * 冇人會有心噉做，但 webhook 收到嘅係我哋自己塞落 Stripe metadata
   * 嗰兩個字串。一個字串打錯，就係一張錯票。
   */
  it('攞第二個人本書嚟寫，即刻掟', async () => {
    const { book } = await seedBook(paid);
    await db.asService();
    await expect(grant(book, stranger, 'pi_1')).rejects.toThrow(/唔屬於呢個讀者/);
  });

  it('冇呢本書就掟，唔會靜靜雞寫一張孤兒票', async () => {
    await db.asService();
    await expect(
      grant('00000000-0000-0000-0000-000000000000', paid, 'pi_1'),
    ).rejects.toThrow(/冇呢本書/);
  });
});

describe('⚠ 未認領硬閘（架構 §4）', () => {
  /**
   * 「付款前必須認領」呢條閘喺 DB，唔喺 checkout 頁 ——
   * 一個只喺 UI 擋嘅硬閘，喺 webhook 呢條路上面根本冇經過。
   *
   * ⚠ 但要講清楚：呢道閘喺呢度爆，代表個人**已經畀咗錢**。
   * 所以真正嘅閘要喺開 checkout 之前（見 `lib/pay.ts`），
   * 呢度係最後一道網，唔係第一道。
   */
  it('匿名讀者寫唔到票', async () => {
    const { book } = await seedBook(anon);
    await db.asService();
    await expect(grant(book, anon, 'pi_1')).rejects.toThrow(/未認領/);
  });

  it('認領咗就寫得到', async () => {
    const { book } = await seedBook(paid);
    await db.asService();
    const [row] = await grant(book, paid, 'pi_1');
    expect(row!.ok).toBe(true);
  });
});

describe('⚠ 讀者自己寫唔到票', () => {
  /**
   * 兩層都要擋，唔靠其中一層：
   *   一、`authenticated` 冇 execute 權限
   *   二、就算叫得郁，個 function 係 invoker，入面句 insert 過唔到 RLS
   */
  it('讀者叫唔郁 grant_entitlement', async () => {
    const { book } = await seedBook(paid);
    await db.asReader(paid);
    await expect(grant(book, paid, 'pi_1')).rejects.toThrow(/permission denied|not exist/i);
  });

  it('讀者直接 insert entitlements 一樣寫唔入', async () => {
    const { book } = await seedBook(paid);
    await db.asReader(paid);
    await expect(
      db.sql(
        `insert into entitlements (reader_id, book_id, product, stripe_payment_id)
         values ($1, $2, 'book', 'pi_self')`,
        [paid, book],
      ),
    ).rejects.toThrow(/permission denied|violates row-level security/i);
  });
});

describe('票一到，深度章就開', () => {
  it('冇票：深度章攞唔到正文，免費章攞得到', async () => {
    const { free, deep } = await seedBook(paid);
    await db.asReader(paid);
    const [a] = await db.sql('select chapter_body($1) as body', [free]);
    const [b] = await db.sql('select chapter_body($1) as body', [deep]);
    expect(a!.body).toContain('序 嘅正文');
    expect(b!.body).toBeNull();
  });

  it('有票：深度章攞到正文', async () => {
    const { book, deep } = await seedBook(paid);
    await db.asService();
    await grant(book, paid, 'pi_1');
    await db.asReader(paid);
    const [row] = await db.sql('select chapter_body($1) as body', [deep]);
    expect(row!.body).toContain('兄弟 嘅正文');
  });

  /** ⚠ 一次過買成本書：一張票開晒全部深度章，唔使逐章查 product。 */
  it('一張票開晒全部深度章', async () => {
    const { book } = await seedBook(paid);
    await db.asOwner();
    const [c] = await db.sql(
      `insert into chapters (book_id, slug, ord, tier, title, body, content_version)
       values ($1, '夫妻', 3, 'deep', '夫妻', '夫妻 嘅正文', 'r1@x') returning id`,
      [book],
    );
    await db.asService();
    await grant(book, paid, 'pi_1');
    await db.asReader(paid);
    const [row] = await db.sql('select chapter_body($1) as body', [String(c!.id)]);
    expect(row!.body).toContain('夫妻 嘅正文');
  });

  /** F4：買咗先裁得開。 */
  it('有票先裁得開深度章', async () => {
    const { book, deep } = await seedBook(paid);
    await db.asReader(paid);
    const [before] = await db.sql('select cut_page($1) as ok', [deep]);
    expect(before!.ok).toBe(false);

    await db.asService();
    await grant(book, paid, 'pi_1');
    await db.asReader(paid);
    const [after] = await db.sql('select cut_page($1) as ok', [deep]);
    expect(after!.ok).toBe(true);
  });
});

describe('⚠ 成功頁只准問，唔准發', () => {
  /**
   * 驗收第一條：「webhook 先寫 entitlement，唔靠 return URL」。
   * Stripe 送返嚟嗰版頁淨係問得一句「票到咗未」，然後照實答。
   */
  it('has_entitlement 冇票答 false，有票答 true', async () => {
    const { book } = await seedBook(paid);
    await db.asReader(paid);
    const [before] = await db.sql('select has_entitlement($1) as ok', [book]);
    expect(before!.ok).toBe(false);

    await db.asService();
    await grant(book, paid, 'pi_1');
    await db.asReader(paid);
    const [after] = await db.sql('select has_entitlement($1) as ok', [book]);
    expect(after!.ok).toBe(true);
  });

  /** 問第二個人本書，答 false —— 唔係報錯，因為佢根本唔應該知呢本書存唔存在。 */
  it('問第二個人本書，答 false', async () => {
    const { book } = await seedBook(paid);
    await db.asService();
    await grant(book, paid, 'pi_1');
    await db.asReader(stranger);
    const [row] = await db.sql('select has_entitlement($1) as ok', [book]);
    expect(row!.ok).toBe(false);
  });
});
