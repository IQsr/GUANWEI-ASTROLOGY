import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createTestDb, seedReader, type TestDb } from '../src/testing';

/**
 * 設定：匯出同真刪（工單 G4 · 架構 §10）
 *
 * ⚠ 呢一份守住兩句話：
 *
 *   「刪除係真刪，唔係標記」
 *   「匯出唔係一道後門」
 *
 * 第二句唔喺工單度，係做嘅時候先見到：一個「畀我全部我嘅資料」
 * 嘅要求，最順手嘅實作會順手交埋未買嘅深度章正文出去。
 */

let db: TestDb;
let me: string;
let other: string;

beforeEach(async () => {
  db = await createTestDb();
  me = await seedReader(db, { anonymous: false, email: 'me@example.com' });
  other = await seedReader(db, { anonymous: false, email: 'other@example.com' });
});

afterEach(() => db.close());

async function seedBook(reader: string) {
  await db.asOwner();
  const [s] = await db.sql(
    `insert into subjects (reader_id, name, birth_date, birth_tz, birth_place, lng, lat, sex)
     values ($1, '思協', '1996-06-16', 'Asia/Hong_Kong', '香港', 114.17, 22.32, 'male')
     returning id`,
    [reader],
  );
  const [c] = await db.sql(
    `insert into charts (subject_id, engine_version, school_profile_id, payload)
     values ($1, '0.3.0', 'zhongzhou-v1@x', '{"ok":true}'::jsonb) returning id`,
    [String(s!.id)],
  );
  /* ⚠ 有盤就一定要有名（`books_titled_with_chart`）—— 題名同成盤係同一件事。 */
  const [b] = await db.sql(
    `insert into books (reader_id, subject_id, chart_id, title, titled_at)
     values ($1, $2, $3, '思協命書', now()) returning id`,
    [reader, String(s!.id), String(c!.id)],
  );
  const book = String(b!.id);
  const mk = async (slug: string, ord: number, tier: string) => {
    const [ch] = await db.sql(
      `insert into chapters (book_id, slug, ord, tier, title, body, content_version, slots)
       values ($1, $2, $3, $4, $5, $6, 'r1@x', $7) returning id`,
      [book, slug, ord, tier, slug, `${slug} 嘅正文`, ['開場', '留白']],
    );
    return String(ch!.id);
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

const exportOf = async (reader: string) => {
  await db.asReader(reader);
  const [row] = await db.sql('select export_reader() as data');
  return row!.data as Record<string, unknown>;
};

describe('⚠ 匯出唔係一道後門', () => {
  /**
   * 呢條係整份測試入面最重要嗰條。
   *
   * 一個 service_role 實作（「撈晒佢名下所有行」）會連未買嘅深度章
   * 正文一齊交出去 —— 即係 paywall 有一個叫「匯出」嘅繞路。
   * `export_reader()` 係 security invoker，所以佢行 `chapter_body()`，
   * 而嗰個會查票。
   */
  it('冇買：深度章正文係 null，免費章有字', async () => {
    await seedBook(me);
    const data = await exportOf(me);
    const books = data.books as { chapters: { slug: string; body: string | null }[] }[];
    const chapters = books[0]!.chapters;
    expect(chapters.find((c) => c.slug === '序')!.body).toContain('序 嘅正文');
    expect(chapters.find((c) => c.slug === '兄弟')!.body).toBeNull();
  });

  it('買咗：深度章正文先出現喺匯出檔入面', async () => {
    const { book } = await seedBook(me);
    await db.asService();
    await grant(book, me, 'pi_1');
    const data = await exportOf(me);
    const books = data.books as { chapters: { slug: string; body: string | null }[] }[];
    expect(books[0]!.chapters.find((c) => c.slug === '兄弟')!.body).toContain('兄弟 嘅正文');
  });

  /** 章名同格照樣出 —— 未裁嘅頁喺目錄度本來就見得到（架構 §6）。 */
  it('未買都見到章名同格，淨係冇正文', async () => {
    await seedBook(me);
    const data = await exportOf(me);
    const books = data.books as { chapters: { slug: string; slots: string[] }[] }[];
    const deep = books[0]!.chapters.find((c) => c.slug === '兄弟')!;
    expect(deep.slug).toBe('兄弟');
    expect(deep.slots).toEqual(['開場', '留白']);
  });
});

describe('匯出：齊，而且淨係自己嗰份', () => {
  it('五類嘢都喺入面', async () => {
    const { book } = await seedBook(me);
    await db.asService();
    await grant(book, me, 'pi_1');
    const data = await exportOf(me);
    for (const key of ['reader', 'subjects', 'charts', 'books', 'entitlements']) {
      expect(data[key], key).toBeTruthy();
    }
    expect((data.subjects as unknown[]).length).toBe(1);
    expect((data.entitlements as unknown[]).length).toBe(1);
  });

  it('生辰真係喺入面 —— 匯出唔可以淨係交個殼', async () => {
    await seedBook(me);
    const data = await exportOf(me);
    const subjects = data.subjects as { name: string; birth_date: string; birth_place: string }[];
    expect(subjects[0]!.name).toBe('思協');
    expect(String(subjects[0]!.birth_date)).toContain('1996');
    expect(subjects[0]!.birth_place).toBe('香港');
  });

  it('第二個人嘅嘢一樣都冇', async () => {
    await seedBook(other);
    const data = await exportOf(me);
    expect((data.subjects as unknown[]).length).toBe(0);
    expect((data.books as unknown[]).length).toBe(0);
  });
});

describe('⚠ 刪除係真刪，唔係標記（架構 §10）', () => {
  it('刪完 readers 一行都冇', async () => {
    await seedBook(me);
    await db.asReader(me);
    await db.sql('select delete_reader()');
    await db.asOwner();
    const [row] = await db.sql('select count(*)::int as n from readers where id = $1', [me]);
    expect(row!.n).toBe(0);
  });

  /** cascade 由 G1 第一日就鋪好 —— 真刪就係刪一行。 */
  it('subjects、charts、books、chapters 全部跟住走', async () => {
    await seedBook(me);
    await db.asReader(me);
    await db.sql('select delete_reader()');
    await db.asOwner();
    for (const table of ['subjects', 'charts', 'books', 'chapters']) {
      const [row] = await db.sql(`select count(*)::int as n from ${table}`);
      expect(row!.n, table).toBe(0);
    }
  });

  /**
   * ⚠ 反面：全個 schema 冇一個叫 deleted_at ／ is_deleted 嘅欄。
   *
   * 標記刪除係最容易滑落去嗰個做法 —— 佢一樣令個人見唔到自己啲嘢，
   * 而且「萬一佢想恢復呢」聽落好體貼。但一個標記咗刪除嘅生辰，
   * 仲係一個我哋揸住嘅生辰。
   */
  it('schema 入面冇 deleted_at 之類嘅欄', async () => {
    await db.asOwner();
    const rows = await db.sql(
      `select table_name, column_name from information_schema.columns
        where table_schema = 'public'
          and (column_name like '%deleted%' or column_name like '%is_active%'
               or column_name like '%archived%')`,
    );
    expect(rows).toEqual([]);
  });

  it('回一份「刪咗啲乜」嘅數', async () => {
    const { book } = await seedBook(me);
    await db.asService();
    await grant(book, me, 'pi_1');
    await db.asReader(me);
    const [row] = await db.sql('select delete_reader() as counts');
    const counts = row!.counts as Record<string, number>;
    expect(counts.subjects).toBe(1);
    expect(counts.books).toBe(1);
    expect(counts.chapters).toBe(2);
    expect(counts.entitlements).toBe(1);
  });

  /**
   * ⚠ 呢條本來寫成「刪唔到第二個人就掟」—— 而佢一跑就紅，
   * 因為前提本身錯：`me` 自己都係一個存在嘅讀者，佢梗係刪到自己。
   *
   * 真正要量嘅唔係「掟唔掟」，係**第二個人嗰份有冇被拖落水**：
   * policy `readers_self` 令 `delete from readers` 只影響得到自己嗰行。
   */
  it('我刪我自己，第二個人嗰份一條都冇少', async () => {
    await seedBook(me);
    await seedBook(other);
    await db.asReader(me);
    await db.sql('select delete_reader()');

    await db.asService();
    const [readers] = await db.sql('select count(*)::int as n from readers where id = $1', [other]);
    const [books] = await db.sql('select count(*)::int as n from books where reader_id = $1', [other]);
    const [subjects] = await db.sql('select count(*)::int as n from subjects where reader_id = $1', [other]);
    expect(readers!.n).toBe(1);
    expect(books!.n).toBe(1);
    expect(subjects!.n).toBe(1);
  });
});

describe('⚠ 付款紀錄唔跟住人走', () => {
  /**
   * `entitlements.reader_id` 係 on delete cascade，即係一撳刪除，
   * 「呢筆錢幾時收過」呢件事同張票一齊消失。
   *
   * 噉樣唔係保護私隱，係做唔到會計 —— 而做唔到會計就代表真刪
   * 遲早會被一句「不過我哋要留返紀錄」推翻，變成標記刪除。
   */
  it('人刪咗，會計紀錄仲喺度', async () => {
    const { book } = await seedBook(me);
    await db.asService();
    await grant(book, me, 'pi_1');

    await db.asReader(me);
    await db.sql('select delete_reader()');

    /* ⚠ 要用 service_role 讀 —— payment_records 係 force RLS 而且一條 policy 都冇，
       連表主人都攞唔到行。呢個正正係佢應有嘅樣。 */
    await db.asService();
    const [tickets] = await db.sql('select count(*)::int as n from entitlements');
    const [records] = await db.sql('select count(*)::int as n from payment_records');
    expect(tickets!.n).toBe(0);
    expect(records!.n).toBe(1);
  });

  /** ⚠ 而留低嗰行**唔再係關於任何人嘅資料** —— 冇 reader、冇 book。 */
  it('留低嗰行認唔返邊個畀嘅', async () => {
    await db.asService();
    const cols = (
      await db.sql(
        `select column_name from information_schema.columns
          where table_schema = 'public' and table_name = 'payment_records'`,
      )
    ).map((r) => String(r.column_name));
    expect(cols.sort()).toEqual(['amount', 'currency', 'paid_at', 'stripe_payment_id']);
  });

  it('讀者一行都睇唔到 —— 呢張表畀會計睇，唔係畀讀者睇', async () => {
    const { book } = await seedBook(me);
    await db.asService();
    await grant(book, me, 'pi_1');
    await db.asReader(me);
    await expect(db.sql('select count(*) from payment_records')).rejects.toThrow(
      /permission denied/i,
    );
  });

  /**
   * ⚠ 兩樣嘢冪等嘅條件唔同。
   *
   * 張票可以因為「同一本書已經有票」而唔寫（用戶畀咗兩次錢），
   * 但嗰兩筆錢**兩筆都真係收過**。會計紀錄跟住張票嘅結果走嘅話，
   * 第二筆錢就會唔見咗。
   */
  it('畀咗兩次錢：一張票，但兩行會計紀錄', async () => {
    const { book } = await seedBook(me);
    await db.asService();
    await grant(book, me, 'pi_1');
    await grant(book, me, 'pi_2');
    const [tickets] = await db.sql('select count(*)::int as n from entitlements');
    const [records] = await db.sql('select count(*)::int as n from payment_records');
    expect(tickets!.n).toBe(1);
    expect(records!.n).toBe(2);
  });

  it('Stripe 重送同一個事件：會計紀錄唔會多一行', async () => {
    const { book } = await seedBook(me);
    await db.asService();
    await grant(book, me, 'pi_1');
    await grant(book, me, 'pi_1');
    const [records] = await db.sql('select count(*)::int as n from payment_records');
    expect(records!.n).toBe(1);
  });
});
