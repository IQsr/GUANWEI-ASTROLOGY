import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { createTestDb, seedReader, type TestDb } from '../src/testing';
import { TABLES, bookState } from '../src/schema';

let db: TestDb;
let reader: string;

beforeAll(async () => {
  db = await createTestDb();
  reader = await seedReader(db);
  await db.asOwner();
});

afterAll(async () => {
  await db?.close();
});

/** 起一個 subject，回 id。 */
async function subject(readerId = reader, birthTime: string | null = '07:40') {
  const [row] = await db.sql(
    `insert into subjects
       (reader_id, name, birth_date, birth_time, birth_tz, birth_place, lng, lat, sex)
     values ($1, '李文卿', '1998-03-12', $2, 'Asia/Hong_Kong', '香港', 114.1694, 22.3193, 'male')
     returning id`,
    [readerId, birthTime],
  );
  return String(row!.id);
}

async function chart(subjectId: string) {
  const [row] = await db.sql(
    `insert into charts (subject_id, engine_version, school_profile_id, payload)
     values ($1, 'ziwei-0.4.1', 'zhongzhou-v1@4cc1a11ce7d0b4f8', '{}'::jsonb)
     returning id`,
    [subjectId],
  );
  return String(row!.id);
}

/* ─────────────────────────────────────────────────────────── */

describe('⚠ 一本書可以喺未有盤之前存在', () => {
  /**
   * 呢條係 G1 第一條 AC，而且係新流程逼出嚟嘅。
   *
   * 舊模型：填生辰 → 排盤 → 造書。
   * 六幕流程：**喺書齋抽一本空白書落嚟 → 喺入面寫生辰 → 合上題名。**
   * 所以一本書要企得住嘅時候，subject 同 chart 都仲未存在。
   */
  it('空白書：冇 subject、冇 chart，一樣入得', async () => {
    const [row] = await db.sql('insert into books (reader_id) values ($1) returning *', [reader]);
    expect(row!.subject_id).toBeNull();
    expect(row!.chart_id).toBeNull();
    expect(bookState(row as never)).toBe('blank');
  });

  /**
   * ⚠ 呢個狀態係「唔知時辰」。
   *
   * 架構 §8：冇時辰定唔到命宮 = 冇書，**但唔好扮有** ——
   * 書架要留一條虛線書脊「此書待時辰而成」。
   * 即係話「寫咗生辰、排唔到盤」唔係一個錯誤狀態，係一個要存得住嘅狀態。
   */
  it('待時辰：有 subject、冇 chart，一樣入得', async () => {
    const s = await subject(reader, null);
    const [row] = await db.sql(
      'insert into books (reader_id, subject_id) values ($1, $2) returning *',
      [reader, s],
    );
    expect(row!.chart_id).toBeNull();
    expect(bookState(row as never)).toBe('awaiting');
  });

  it('題名：有盤就一定有名，有名就一定有盤', async () => {
    const s = await subject();
    const c = await chart(s);
    const [row] = await db.sql(
      `insert into books (reader_id, subject_id, chart_id, title, titled_at)
       values ($1, $2, $3, '李文卿', now()) returning *`,
      [reader, s, c],
    );
    expect(bookState(row as never)).toBe('titled');

    // 有盤冇名 → 擋
    await expect(
      db.sql('insert into books (reader_id, subject_id, chart_id) values ($1, $2, $3)', [
        reader,
        s,
        c,
      ]),
    ).rejects.toThrow(/books_titled_with_chart/);

    // 有名冇盤 → 一樣擋
    await expect(
      db.sql(`insert into books (reader_id, title, titled_at) values ($1, '李文卿', now())`, [
        reader,
      ]),
    ).rejects.toThrow(/books_titled_with_chart/);
  });

  it('有盤但冇 subject → 擋', async () => {
    const s = await subject();
    const c = await chart(s);
    await expect(
      db.sql(
        `insert into books (reader_id, chart_id, title, titled_at) values ($1, $2, 'x', now())`,
        [reader, c],
      ),
    ).rejects.toThrow(/books_chart_needs_subject/);
  });
});

describe('⚠ 一本書唔可以指去第二個人嘅嘢', () => {
  /**
   * 呢條唔靠 RLS —— RLS 係「你睇唔到」，呢條係「就算你寫得出都唔成立」。
   * 兩層都要：一個 server action 行 service_role 嗰陣係冇 RLS 嘅。
   */
  it('用第二個讀者嘅 subject 開書 → 外鍵擋住', async () => {
    const other = await seedReader(db);
    await db.asOwner();
    const s = await subject(other);
    await expect(
      db.sql('insert into books (reader_id, subject_id) values ($1, $2)', [reader, s]),
    ).rejects.toThrow(/books_subject_id_reader_id_fkey/);
  });

  it('用第二個 subject 嘅盤 → 外鍵擋住', async () => {
    const mine = await subject();
    const theirs = await subject();
    const c = await chart(theirs);
    await expect(
      db.sql(
        `insert into books (reader_id, subject_id, chart_id, title, titled_at)
         values ($1, $2, $3, 'x', now())`,
        [reader, mine, c],
      ),
    ).rejects.toThrow(/books_chart_id_subject_id_fkey/);
  });
});

describe('兩條版本線分開', () => {
  /**
   * 第二條 AC：`charts` 有 engine_version，`chapters` 有 content_version。
   *
   * 「分開」唔係兩個欄名唔同 —— 係**兩張表**。
   * 改文案唔使重排盤，改引擎唔使重寫文案。
   */
  it('盤嗰張表冇 content_version，章嗰張表冇 engine_version', async () => {
    const cols = async (t: string) =>
      (
        await db.sql('select column_name from information_schema.columns where table_name = $1', [t])
      ).map((r) => r.column_name);
    expect(await cols('charts')).toContain('engine_version');
    expect(await cols('charts')).not.toContain('content_version');
    expect(await cols('chapters')).toContain('content_version');
    expect(await cols('chapters')).not.toContain('engine_version');
  });

  /** 規範 §17：唔准 latest。呢個唔靠人記得，寫落 CHECK。 */
  it("engine_version 同 content_version 都唔收 'latest'", async () => {
    const s = await subject();
    await expect(
      db.sql(
        `insert into charts (subject_id, engine_version, school_profile_id, payload)
         values ($1, 'latest', 'zhongzhou-v1@abc', '{}'::jsonb)`,
        [s],
      ),
    ).rejects.toThrow(/charts_engine_version_check/);

    const [b] = await db.sql('insert into books (reader_id) values ($1) returning id', [reader]);
    await expect(
      db.sql(
        `insert into chapters (book_id, slug, ord, tier, title, body, content_version)
         values ($1, 'ming', 1, 'free', '命宮', '…', 'latest')`,
        [String(b!.id)],
      ),
    ).rejects.toThrow(/chapters_content_version_check/);
  });

  it("school_profile_id 一樣唔收 'latest'（B13）", async () => {
    const s = await subject();
    await expect(
      db.sql(
        `insert into charts (subject_id, engine_version, school_profile_id, payload)
         values ($1, 'ziwei-0.4.1', 'latest', '{}'::jsonb)`,
        [s],
      ),
    ).rejects.toThrow(/charts_school_profile_id_check/);
  });
});

describe('⚠ 認領同付款', () => {
  it('匿名讀者冇 email；認領咗就一定有', async () => {
    const [u] = await db.sql('insert into auth.users (is_anonymous) values (true) returning id');
    await expect(
      db.sql('insert into readers (id, is_anonymous, email) values ($1, true, $2)', [
        String(u!.id),
        'x@example.com',
      ]),
    ).rejects.toThrow(/readers_claim_shape/);
  });

  /**
   * ⚠ 架構 §4：付款前必須認領，而且係一個**硬閘**。
   *
   * 一個只喺 checkout 頁擋嘅硬閘，喺 webhook 呢條路上面根本冇經過。
   * 所以佢擺喺 DB。
   */
  it('匿名讀者寫唔到 entitlement', async () => {
    const [b] = await db.sql('insert into books (reader_id) values ($1) returning id', [reader]);
    await expect(
      db.sql(
        `insert into entitlements (reader_id, book_id, product, stripe_payment_id)
         values ($1, $2, 'deep', 'pi_1')`,
        [reader, String(b!.id)],
      ),
    ).rejects.toThrow(/未認領/);
  });

  /**
   * Stripe webhook 會重送。重送兩次唔可以出兩張票 ——
   * 由 DB 保證，唔靠 handler 自己記得 dedupe。
   */
  it('同一個 stripe payment id 入兩次 → 第二次擋住', async () => {
    const claimed = await seedReader(db, { anonymous: false, email: 'paid@example.com' });
    await db.asOwner();
    const [b] = await db.sql('insert into books (reader_id) values ($1) returning id', [claimed]);
    const row = [claimed, String(b!.id)];
    await db.sql(
      `insert into entitlements (reader_id, book_id, product, stripe_payment_id)
       values ($1, $2, 'deep', 'pi_dup')`,
      row,
    );
    await expect(
      db.sql(
        `insert into entitlements (reader_id, book_id, product, stripe_payment_id)
         values ($1, $2, 'deep-2', 'pi_dup')`,
        row,
      ),
    ).rejects.toThrow(/entitlements_stripe_payment_id_key/);
  });
});

describe('⚠ zod 同 SQL 唔准走音', () => {
  /**
   * `src/schema.ts` 唔係第二份 schema，佢係 app 嗰邊嘅型別。
   * 但兩份嘢一定會走音，所以逐個欄對返真表 ——
   * SQL 加咗欄而 zod 冇加，就會喺呢度爆。
   *
   * ⚠ 第一版係用 regex 掃 migration 檔嘅。掃出嚟 `books` 多咗兩個
   * 叫「references」嘅欄 —— 因為複合外鍵嗰兩行係換咗行嘅續行。
   *
   * 正確做法唔係喺 regex 度加多兩個例外字，係**唔好 parse SQL**：
   * migration 已經真係跑咗落去，張表自己知道佢有幾多欄。
   * 一個要靠 regex 估 SQL 嘅測試，量嘅係我個 regex，唔係張表。
   */
  for (const [table, schema] of Object.entries(TABLES)) {
    it(`${table}：欄名一個不多一個不少`, async () => {
      await db.asOwner();
      const cols = (
        await db.sql(
          `select column_name from information_schema.columns
            where table_schema = 'public' and table_name = $1`,
          [table],
        )
      ).map((r) => String(r.column_name));
      expect(cols.sort()).toEqual(Object.keys(schema.shape).sort());
    });
  }
});

describe('⚠ 書架排得到序（E3）', () => {
  /**
   * 「最近讀嗰本喺最左」排唔到，如果冇一個「幾時讀」。
   * G1 得 `last_read_chapter` —— 知道讀到邊度，唔等於知道幾時讀。
   */
  it('讀到邊同幾時讀，一係兩樣都有，一係兩樣都冇', async () => {
    await db.asOwner();
    const [b] = await db.sql('insert into books (reader_id) values ($1) returning id', [reader]);
    const id = String(b!.id);

    await expect(
      db.sql(`update books set last_read_chapter = 'ming' where id = $1`, [id]),
    ).rejects.toThrow(/books_last_read_together/);

    await expect(
      db.sql(`update books set last_read_at = now() where id = $1`, [id]),
    ).rejects.toThrow(/books_last_read_together/);

    await db.sql(`update books set last_read_chapter = 'ming', last_read_at = now() where id = $1`, [
      id,
    ]);
    const [row] = await db.sql('select last_read_chapter, last_read_at from books where id = $1', [
      id,
    ]);
    expect(row!.last_read_chapter).toBe('ming');
    expect(row!.last_read_at).not.toBeNull();
  });
});
