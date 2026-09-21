import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createTestDb, seedReader, type TestDb } from '../src/testing';

/**
 * 裁開（工單 F4 · 架構 §6）
 *
 * ⚠ 呢一份測試守住嘅係一句話：**一版裁咗就係裁咗。**
 *
 * 「一生只播一次」如果記喺 localStorage，清 cookie 或者換部機就會
 * 再裂一次 —— 而一本已經裁開咗嘅書唔會自己癒合。
 */

let db: TestDb;
let me: string;
let other: string;

beforeEach(async () => {
  db = await createTestDb();
  me = await seedReader(db);
  other = await seedReader(db);
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

describe('⚠ 裁開只裁得一次', () => {
  it('第一次回 true，第二次回 false', async () => {
    const { free } = await seedBook(me);
    await db.asReader(me);
    const [a] = await db.sql('select cut_page($1) as ok', [free]);
    const [b] = await db.sql('select cut_page($1) as ok', [free]);
    expect(a!.ok).toBe(true);
    expect(b!.ok).toBe(false);
  });

  it('裁開之後 cut_at 有時間，而且唔會再變', async () => {
    const { free } = await seedBook(me);
    await db.asReader(me);
    await db.sql('select cut_page($1)', [free]);
    const [first] = await db.sql('select cut_at from chapters where id = $1', [free]);
    await db.sql('select cut_page($1)', [free]);
    const [again] = await db.sql('select cut_at from chapters where id = $1', [free]);
    expect(first!.cut_at).not.toBeNull();
    expect(again!.cut_at).toEqual(first!.cut_at);
  });
});

describe('⚠ 未買就裁唔開', () => {
  /** 一個前端唔 render 嘅 paywall 唔係 paywall —— 裁開呢個動作一樣。 */
  it('未買嘅深度章裁唔開', async () => {
    const { deep } = await seedBook(me);
    await db.asReader(me);
    const [r] = await db.sql('select cut_page($1) as ok', [deep]);
    expect(r!.ok).toBe(false);
    const [row] = await db.sql('select cut_at from chapters where id = $1', [deep]);
    expect(row!.cut_at).toBeNull();
  });

  it('買咗就裁得開', async () => {
    const { book, deep } = await seedBook(me);
    await db.asOwner();
    await db.sql('update readers set is_anonymous = false, email = $2 where id = $1', [
      me,
      'a@example.com',
    ]);
    await db.sql(
      `insert into entitlements (reader_id, book_id, product, stripe_payment_id)
       values ($1, $2, 'deep', 'pi_1')`,
      [me, book],
    );
    await db.asReader(me);
    const [r] = await db.sql('select cut_page($1) as ok', [deep]);
    expect(r!.ok).toBe(true);
  });

  it('裁唔到第二個人本書', async () => {
    const { free } = await seedBook(other);
    await db.asReader(me);
    const [r] = await db.sql('select cut_page($1) as ok', [free]);
    expect(r!.ok).toBe(false);
  });
});

describe('段落結構係結構，唔係內容（工單 F2）', () => {
  /**
   * ⚠ `slots` 同 `body` 分開兩欄。
   *
   * body 係收費嘅（欄級權限收住）；**格嘅名唔係內容**。
   * 一個未裁開嘅讀者睇得到呢一版有幾多格、係乜嘢格 ——
   * 咁先至係毛邊本：你揸得到本書，只係未裁開。
   */
  it('未買都讀得到 slots，但仍然讀唔到 body', async () => {
    const { deep } = await seedBook(me);
    await db.asReader(me);
    const [row] = await db.sql('select slots, cut_at from chapters where id = $1', [deep]);
    expect(row!.slots).toEqual(['開場', '結構', '留白']);
    await expect(db.sql('select body from chapters where id = $1', [deep])).rejects.toThrow();
    const [body] = await db.sql('select chapter_body($1) as body', [deep]);
    expect(body!.body).toBeNull();
  });
});

describe('⚠ 成書要連 slots 一齊寫（0006 重貼咗 create_book）', () => {
  /**
   * `create or replace` 要成個 function 重貼，所以 0005 同 0006 兩邊
   * 都有一份 `create_book`。漏咗重貼嘅話，成書會照成功，
   * 但每一章嘅 `slots` 都係空 —— 而 F2 個跟捲動高亮就靜靜雞冇咗。
   */
  it('create_book 寫入嘅章帶住 slots', async () => {
    await db.asReader(me);
    const [row] = await db.sql('select create_book($1, $2, $3, $4, $5, $6) as id', [
      '11111111-1111-4111-8111-111111111111',
      JSON.stringify({
        name: '測試',
        birth_date: '1996-06-16',
        birth_time: '08:30',
        birth_tz: 'Asia/Hong_Kong',
        birth_place: '香港',
        lng: 114.17,
        lat: 22.32,
        sex: 'male',
      }),
      JSON.stringify({ engine_version: '0.3.0', school_profile_id: 'zhongzhou-v1@x', payload: {} }),
      '測試命書',
      '觀微',
      JSON.stringify([
        {
          slug: '序',
          ord: 1,
          tier: 'free',
          title: '序',
          body: 'a\n\nb',
          content_version: 'r1@x',
          slots: ['章首', '生辰'],
        },
      ]),
    ]);
    const [ch] = await db.sql('select slots from chapters where book_id = $1', [row!.id]);
    expect(ch!.slots).toEqual(['章首', '生辰']);
  });
});
