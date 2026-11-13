import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, seedReader, type TestDb } from '../src/testing';

/**
 * 限時全開（0013）
 *
 * 守住三句：
 *   一、冇開嗰陣，同以前一模一樣（深度章攞唔到）。
 *   二、開咗，匿名讀者都睇到**自己本書**嘅深度章 —— 但睇唔到人哋嘅。
 *   三、時間一過自動鎖返；由頭到尾冇寫過一張票。
 */

let db: TestDb;
let anon: string;
let stranger: string;
let book: string;
let deep: string;

beforeEach(async () => {
  db = await createTestDb();
  anon = await seedReader(db);
  stranger = await seedReader(db);
  await db.asOwner();
  const [b] = await db.sql('insert into books (reader_id) values ($1) returning id', [anon]);
  book = String(b!.id);
  const [c] = await db.sql(
    `insert into chapters (book_id, slug, ord, tier, title, body, content_version, slots)
     values ($1, '財帛', 1, 'deep', '財帛', '財帛嘅正文', 'r1@x', $2) returning id`,
    [book, ['開場']],
  );
  deep = String(c!.id);
});

afterEach(() => db.close());

const open = async (until: string | null) => {
  await db.asOwner();
  await db.sql('update open_house set until = $1::timestamptz', [until]);
};
const body = async () => (await db.sql('select chapter_body($1) as body', [deep]))[0]!.body;
const bookOpen = async () => (await db.sql('select book_open($1) as ok', [book]))[0]!.ok;

describe('限時全開', () => {
  it('migration 本身唔開任何嘢', async () => {
    await db.asReader(anon);
    expect(await body()).toBeNull();
    expect(await bookOpen()).toBe(false);
  });

  it('開咗：匿名讀者睇到自己本書嘅深度章，亦裁得開', async () => {
    await open('2999-01-01');
    await db.asReader(anon);
    expect(await body()).toBe('財帛嘅正文');
    expect(await bookOpen()).toBe(true);
    expect((await db.sql('select cut_page($1) as ok', [deep]))[0]!.ok).toBe(true);
  });

  it('⚠ 開咗都睇唔到人哋本書', async () => {
    await open('2999-01-01');
    await db.asReader(stranger);
    expect(await body()).toBeNull();
    expect(await bookOpen()).toBe(false);
    expect((await db.sql('select cut_page($1) as ok', [deep]))[0]!.ok).toBe(false);
  });

  it('時間過咗自動鎖返；null 亦係關', async () => {
    await open('2000-01-01');
    await db.asReader(anon);
    expect(await body()).toBeNull();
    expect(await bookOpen()).toBe(false);
    await open(null);
    await db.asReader(anon);
    expect(await body()).toBeNull();
  });

  it('⚠ 唔寫票：has_entitlement 照樣答「未畀錢」', async () => {
    await open('2999-01-01');
    await db.asReader(anon);
    expect((await db.sql('select has_entitlement($1) as ok', [book]))[0]!.ok).toBe(false);
    await db.asOwner();
    expect(await db.sql('select 1 from entitlements')).toEqual([]);
  });

  it('⚠ 讀者自己改唔到日期、讀唔到張表；anon 連問都問唔到', async () => {
    await db.asReader(anon);
    await expect(db.sql("update open_house set until = '2999-01-01'")).rejects.toThrow(/permission denied/);
    await expect(db.sql('select * from open_house')).rejects.toThrow(/permission denied/);
    await db.asAnon();
    await expect(db.sql('select open_house()')).rejects.toThrow(/permission denied/);
    await expect(db.sql('select book_open($1)', [book])).rejects.toThrow(/permission denied/);
  });
});
