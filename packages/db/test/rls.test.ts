import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { createTestDb, seedReader, type TestDb } from '../src/testing';

/**
 * 列級權限（工單 G1 · 架構 §10）
 *
 * 呢一份測試唔係測「query 寫得啱唔啱」，係測**寫錯咗都攞唔到嘢**。
 * 命書入面有生辰；一條唔記得加 `where reader_id` 嘅 query，
 * 喺呢個 schema 之下回嘅係零行，唔係第二個人本書。
 */

let db: TestDb;
let me: string;
let other: string;
let myBook: string;
let myFree: string;
let myDeep: string;
let otherBook: string;

beforeAll(async () => {
  db = await createTestDb();
  me = await seedReader(db);
  other = await seedReader(db);

  await db.asOwner();
  const mk = async (reader: string) => {
    const [b] = await db.sql('insert into books (reader_id) values ($1) returning id', [reader]);
    return String(b!.id);
  };
  myBook = await mk(me);
  otherBook = await mk(other);

  const chapter = async (book: string, slug: string, ord: number, tier: string) => {
    const [c] = await db.sql(
      `insert into chapters (book_id, slug, ord, tier, title, body, content_version)
       values ($1, $2, $3, $4, $5, $6, 'c1@aec70cc1') returning id`,
      [book, slug, ord, tier, slug, `${slug} 嘅正文`],
    );
    return String(c!.id);
  };
  myFree = await chapter(myBook, 'ming', 1, 'free');
  myDeep = await chapter(myBook, 'daxian', 2, 'deep');
  await chapter(otherBook, 'ming', 1, 'free');
});

afterAll(async () => {
  await db?.close();
});

describe('未登入乜都掂唔到', () => {
  it('anon 連 select 都冇權', async () => {
    await db.asAnon();
    for (const t of ['readers', 'subjects', 'charts', 'books', 'chapters', 'entitlements']) {
      await expect(db.sql(`select * from ${t}`), t).rejects.toThrow(/permission denied/);
    }
  });
});

describe('⚠ 一個讀者只見到自己嗰份', () => {
  /**
   * 呢條嘅重點係**冇 where**。
   *
   * `select * from books` 係一條寫得最求其嘅 query ——
   * 而佢就係將來某個 server action 會唔記得加條件嗰條。
   * 喺呢個 schema 之下，佢回嘅係我自己嗰一本。
   */
  it('select * from books 只回自己嗰本', async () => {
    await db.asReader(me);
    const rows = await db.sql('select id from books');
    expect(rows.map((r) => String(r.id))).toEqual([myBook]);
  });

  it('明明白白去攞第二個人本書，都係零行 —— 唔係 error', async () => {
    await db.asReader(me);
    const rows = await db.sql('select id from books where id = $1', [otherBook]);
    expect(rows).toHaveLength(0);
  });

  it('改唔到第二個人本書', async () => {
    await db.asReader(me);
    await db.sql(`update books set cover_seal = 'x' where id = $1`, [otherBook]);
    await db.asOwner();
    const [row] = await db.sql('select cover_seal from books where id = $1', [otherBook]);
    expect(row!.cover_seal).toBeNull();
  });

  it('開唔到一本寫住第二個人 reader_id 嘅書', async () => {
    await db.asReader(me);
    await expect(
      db.sql('insert into books (reader_id) values ($1)', [other]),
    ).rejects.toThrow(/row-level security/);
  });

  it('章跟書走：第二個人本書嘅章，一行都見唔到', async () => {
    await db.asReader(me);
    const rows = await db.sql('select id, book_id from chapters');
    expect(rows.every((r) => String(r.book_id) === myBook)).toBe(true);
  });
});

describe('⚠ 未裁之頁係一條權限規則，唔係一個 CSS 效果', () => {
  /**
   * 架構 §6：「未裁章喺目錄照樣列出章名，唔收埋。」
   *
   * 即係話行要見得到、正文要見唔到 —— 而 RLS 係**列級**，做唔到。
   * 所以正文用欄級權限收：`body` 唔 grant，要攞就行 `chapter_body()`。
   */
  it('目錄行係見到嘅，深度章一樣列得出章名', async () => {
    await db.asReader(me);
    const rows = await db.sql('select slug, tier, title from chapters order by ord');
    expect(rows.map((r) => r.slug)).toEqual(['ming', 'daxian']);
    expect(rows.map((r) => r.tier)).toEqual(['free', 'deep']);
  });

  it('⚠ 直接 select body → 冇權，連免費章都唔畀', async () => {
    await db.asReader(me);
    await expect(db.sql('select body from chapters')).rejects.toThrow(/permission denied/);
    await expect(db.sql('select * from chapters')).rejects.toThrow(/permission denied/);
  });

  it('免費章行 chapter_body() 攞得到', async () => {
    await db.asReader(me);
    const [row] = await db.sql('select chapter_body($1) as body', [myFree]);
    expect(row!.body).toBe('ming 嘅正文');
  });

  it('未買嘅深度章 → null，唔係正文', async () => {
    await db.asReader(me);
    const [row] = await db.sql('select chapter_body($1) as body', [myDeep]);
    expect(row!.body).toBeNull();
  });

  it('第二個人嘅章，就算知道個 id 都係 null', async () => {
    await db.asOwner();
    const [c] = await db.sql('select id from chapters where book_id = $1', [otherBook]);
    await db.asReader(me);
    const [row] = await db.sql('select chapter_body($1) as body', [String(c!.id)]);
    expect(row!.body).toBeNull();
  });

  it('買咗之後，深度章就攞得到', async () => {
    /* 認領 ＋ 出票：兩樣都係 server 做嘅事，所以行 service_role。 */
    await db.asOwner();
    await db.sql(`update auth.users set is_anonymous = false, email = $1 where id = $2`, [
      'paid@example.com',
      me,
    ]);
    await db.sql(`update readers set is_anonymous = false, email = $1 where id = $2`, [
      'paid@example.com',
      me,
    ]);
    await db.asService();
    await db.sql(
      `insert into entitlements (reader_id, book_id, product, stripe_payment_id)
       values ($1, $2, 'deep', 'pi_ok')`,
      [me, myBook],
    );

    await db.asReader(me);
    const [row] = await db.sql('select chapter_body($1) as body', [myDeep]);
    expect(row!.body).toBe('daxian 嘅正文');
  });
});

describe('⚠ 票唔可以自己寫', () => {
  /**
   * 一張票係「畀咗錢」嘅憑據。用戶自己寫得入，佢就唔係憑據。
   * 寫票係 Stripe webhook 嘅事（G3），而 webhook 行 service_role。
   */
  it('讀者自己 insert entitlement → 冇權', async () => {
    await db.asReader(me);
    await expect(
      db.sql(
        `insert into entitlements (reader_id, book_id, product, stripe_payment_id)
         values ($1, $2, 'deep', 'pi_self')`,
        [me, myBook],
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('自己張票睇得到 —— 要知道自己買咗乜', async () => {
    await db.asReader(me);
    const rows = await db.sql('select product from entitlements');
    expect(rows.map((r) => r.product)).toEqual(['deep']);
  });

  it('第二個人張票睇唔到', async () => {
    await db.asReader(other);
    const rows = await db.sql('select product from entitlements');
    expect(rows).toHaveLength(0);
  });
});
