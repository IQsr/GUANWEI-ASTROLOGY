import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { bookState } from '../src/schema';
import { createTestDb, seedReader, type TestDb } from '../src/testing';

/**
 * 成書（工單 G5 · 架構 §5）
 *
 * ⚠ 呢一份測試係整個 G 線入面**第一份真係跑過寫入路徑**嘅嘢。
 *
 * `identity.server.ts`、`shelf.server.ts`、`juan.server.ts` 到今日為止
 * 一句都冇行過（冇 instance）。所以成書特登唔寫喺 adapter 度 ——
 * 寫落 SQL，就可以喺 PGlite 連 RLS 一齊跑。
 *
 * 呢度證明到嘅：寫入本身、原子性、防重送、RLS 擋唔擋得住。
 * 呢度**證明唔到**嘅：Supabase 個 `rpc()` 呼叫本身接唔接得通。
 * 嗰一段仲係得三行，而且仲係冇跑過。
 */

const SUBJECT = {
  name: '思協',
  birth_date: '1996-06-16',
  birth_time: '08:30',
  birth_tz: 'Asia/Hong_Kong',
  birth_place: '香港',
  lng: 114.17,
  lat: 22.32,
  sex: 'male',
  true_solar_corrected: true,
};

const CHART = {
  engine_version: 'ziwei@0.1.0',
  school_profile_id: 'zhongzhou-v1',
  payload: { palaces: [] },
};

const CHAPTERS = [
  { slug: '命宮', ord: 1, tier: 'free', title: '一 · 命宮', body: '命宮嘅正文。', content_version: 'c1@aec70cc1' },
  { slug: '兄弟', ord: 2, tier: 'deep', title: '二 · 兄弟', body: '兄弟嘅正文。', content_version: 'c1@aec70cc1' },
];

let db: TestDb;
let me: string;
let other: string;

/** 每條測試一個乾淨 DB —— 成書會寫嘢，共用一個 DB 就會互相影響。 */
beforeEach(async () => {
  db = await createTestDb();
  me = await seedReader(db);
  other = await seedReader(db);
});

afterEach(() => db.close());

const TOKEN = '11111111-1111-4111-8111-111111111111';

async function countOf(table: 'books' | 'subjects'): Promise<number> {
  const rows = await db.sql(`select count(*)::int as n from ${table} where reader_id = $1`, [me]);
  return Number(rows[0]!.n);
}

function cheng(
  token = TOKEN,
  opts: { chart?: unknown; title?: string | null; chapters?: unknown } = {},
) {
  const chart = 'chart' in opts ? opts.chart : CHART;
  const title = 'title' in opts ? opts.title : '思協命書';
  const chapters = 'chapters' in opts ? opts.chapters : CHAPTERS;
  return db.sql('select create_book($1, $2, $3, $4, $5, $6) as id', [
    token,
    JSON.stringify(SUBJECT),
    chart === null ? null : JSON.stringify(chart),
    title,
    '觀微',
    chapters === null ? null : JSON.stringify(chapters),
  ]);
}

describe('一次呼叫，一本書', () => {
  it('四張表一齊有嘢', async () => {
    await db.asReader(me);
    const [row] = await cheng();
    const id = String(row!.id);

    const [book] = await db.sql('select * from books where id = $1', [id]);
    expect(book!.title).toBe('思協命書');
    expect(book!.cover_seal).toBe('觀微');
    expect(book!.titled_at).not.toBeNull();
    expect(bookState(book as never)).toBe('titled');

    const [subject] = await db.sql('select * from subjects where id = $1', [book!.subject_id]);
    expect(subject!.name).toBe('思協');
    expect(subject!.true_solar_corrected).toBe(true);

    const [chart] = await db.sql('select * from charts where id = $1', [book!.chart_id]);
    expect(chart!.engine_version).toBe('ziwei@0.1.0');
    expect(chart!.subject_id).toBe(book!.subject_id);

    const rows = await db.sql('select slug, ord, tier from chapters where book_id = $1 order by ord', [id]);
    expect(rows.map((r) => r.slug)).toEqual(['命宮', '兄弟']);
    expect(rows.map((r) => r.tier)).toEqual(['free', 'deep']);
  });

  it('本書屬於嗰個呼叫嘅人，唔使自己傳 reader_id', async () => {
    await db.asReader(me);
    const [row] = await cheng();
    const [book] = await db.sql('select reader_id from books where id = $1', [row!.id]);
    expect(book!.reader_id).toBe(me);
  });
});

describe('⚠ 防重送', () => {
  /**
   * 網絡斷一下、粒掣返生、佢再撳一次 —— 第一次其實已經寫成功咗。
   * 冇防重就係兩本一模一樣嘅書坐喺書架上面。
   */
  it('同一個 token 撳兩次，得一本', async () => {
    await db.asReader(me);
    const [first] = await cheng();
    const [second] = await cheng();
    expect(second!.id).toBe(first!.id);

    expect(await countOf('books')).toBe(1);
    expect(await countOf('subjects')).toBe(1);
  });

  it('唔同 token 就係兩本', async () => {
    await db.asReader(me);
    await cheng();
    await cheng('22222222-2222-4222-8222-222222222222');
    expect(await countOf('books')).toBe(2);
  });

  /** 個 token 只喺自己嘅範圍入面唯一 —— 兩個人撞同一個 token 唔應該互相踩。 */
  it('兩個人用同一個 token，各有各本', async () => {
    await db.asReader(me);
    const [mine] = await cheng();
    await db.asReader(other);
    const [theirs] = await cheng();
    expect(theirs!.id).not.toBe(mine!.id);
  });

  it('冇 token 就唔畀成書', async () => {
    await db.asReader(me);
    await expect(cheng(null as unknown as string)).rejects.toThrow(/token/);
  });
});

describe('⚠ 原子性：仆街咗就乜都冇留低', () => {
  /**
   * 呢個就係用一個 function 而唔係四次 insert 嘅原因。
   * 四次獨立 insert 之下，下面呢條測試會見到一個孤零零嘅 subject
   * 同一本得封面嘅書 —— 而嗰本書喺書架上面睇落完全正常。
   */
  it('題咗名但零章 → 彈，而且 subject 同 book 都唔存在', async () => {
    await db.asReader(me);
    await expect(cheng(TOKEN, { chapters: [] })).rejects.toThrow(/正文/);

    expect([await countOf('books'), await countOf('subjects')]).toEqual([0, 0]);
  });

  it('一章 slug 撞咗 → 成本書都唔會出現', async () => {
    await db.asReader(me);
    const dup = [CHAPTERS[0], { ...CHAPTERS[0], ord: 2 }];
    await expect(cheng(TOKEN, { chapters: dup })).rejects.toThrow();
    expect(await countOf('books')).toBe(0);
  });

  it("版本欄寫 'latest' → 成本書都唔會出現", async () => {
    await db.asReader(me);
    await expect(cheng(TOKEN, { chart: { ...CHART, engine_version: 'latest' } })).rejects.toThrow();
    expect(await countOf('subjects')).toBe(0);
  });
});

describe('待時辰（架構 §8）', () => {
  /**
   * 冇時辰定唔到命宮 = 冇盤。但**本書要存在** ——
   * 一條虛線書脊就係最好嘅回訪理由。
   *
   * ⚠ `awaiting` 呢個狀態 G1 就定義咗，但到今日為止去唔到 ——
   * 冇任何一條路寫得出一本「有 subject 冇 chart」嘅書。
   */
  it('冇盤冇名冇章，但書架見得到', async () => {
    await db.asReader(me);
    const [row] = await db.sql('select create_book($1, $2, null, null, null, null) as id', [
      TOKEN,
      JSON.stringify({ ...SUBJECT, birth_time: null }),
    ]);

    const [book] = await db.sql('select * from books where id = $1', [row!.id]);
    expect(bookState(book as never)).toBe('awaiting');
    expect(book!.titled_at).toBeNull();

    const [subject] = await db.sql('select birth_time from subjects where id = $1', [book!.subject_id]);
    expect(subject!.birth_time).toBeNull();
  });

  it('有名冇盤 → 彈', async () => {
    await db.asReader(me);
    await expect(cheng(TOKEN, { chart: null })).rejects.toThrow(/有盤先有名/);
  });

  it('有盤冇名 → 彈', async () => {
    await db.asReader(me);
    await expect(cheng(TOKEN, { title: null })).rejects.toThrow(/有盤先有名/);
  });
});

describe('⚠ RLS 照行', () => {
  /**
   * 呢個 function 係 security **invoker** —— 所以佢寫入嘅每一行
   * 一樣要過 policy。一個 definer function 攞到原子性，
   * 代價係一次過廢咗六條 policy。
   */
  it('未登入成唔到書', async () => {
    await db.asAnon();
    await expect(cheng()).rejects.toThrow();
  });

  it('第二個人撈唔到我本書', async () => {
    await db.asReader(me);
    const [row] = await cheng();
    await db.asReader(other);
    const rows = await db.sql('select id from books where id = $1', [row!.id]);
    expect(rows).toHaveLength(0);
  });

  /** 端到端：成書之後，個未裁之頁真係裁唔開。 */
  it('免費章攞到正文，未買嘅深度章回 null', async () => {
    await db.asReader(me);
    const [row] = await cheng();
    const chapters = await db.sql('select id, tier from chapters where book_id = $1 order by ord', [row!.id]);

    const free = await db.sql('select chapter_body($1) as body', [chapters[0]!.id]);
    const deep = await db.sql('select chapter_body($1) as body', [chapters[1]!.id]);
    expect(free[0]!.body).toBe('命宮嘅正文。');
    expect(deep[0]!.body).toBeNull();
  });

  it('連讀者自己都 select 唔到 body 呢一欄', async () => {
    await db.asReader(me);
    const [row] = await cheng();
    await expect(db.sql('select body from chapters where book_id = $1', [row!.id])).rejects.toThrow();
  });
});

describe('讀到邊、幾時讀', () => {
  /**
   * E3 個書架按 `last_read_at` 排序，但到今日為止冇一個地方寫過佢 ——
   * 「最近讀嗰本喺最左」一直靠 `created_at` 撐住。
   */
  it('touch_book 兩個欄一齊郁', async () => {
    await db.asReader(me);
    const [row] = await cheng();
    await db.sql('select touch_book($1, $2)', [row!.id, '命宮']);

    const [book] = await db.sql('select last_read_chapter, last_read_at from books where id = $1', [row!.id]);
    expect(book!.last_read_chapter).toBe('命宮');
    expect(book!.last_read_at).not.toBeNull();
  });

  it('touch 唔郁到第二個人本書', async () => {
    await db.asReader(me);
    const [row] = await cheng();
    await db.asReader(other);
    await db.sql('select touch_book($1, $2)', [row!.id, '命宮']);

    await db.asReader(me);
    const [book] = await db.sql('select last_read_at from books where id = $1', [row!.id]);
    expect(book!.last_read_at).toBeNull();
  });
});
