import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { createTestDb, seedReader, type TestDb } from '../src/testing';

/**
 * 目次問目：`chapter_leads()`（0008 · 2026-10-14）
 *
 * 未買嘅深度章都出第一段同一句引文 —— Issac 拍板「先答再請入章」。
 * 呢度量嘅係**只開到第一段**：第二段之後一個字都唔出，
 * 而 `chapter_body()` 嘅 paywall（全章要有票）唔受影響。
 */

let db: TestDb;
let me: string;
let other: string;
let myBook: string;
let otherBook: string;
let myDeep: string;

const BODY = [
  '你靠自己開局賺錢。要留意的是，風險都在自己身上。',
  '你的財帛宮坐七殺。《全書》寫「白手生財成家」：你的錢多半靠自己一手打出來。',
  '第三段：只有買咗先睇得到。',
].join('\n\n');

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

  const chapter = async (book: string, slug: string, ord: number, tier: string, body: string) => {
    const [c] = await db.sql(
      `insert into chapters (book_id, slug, ord, tier, title, body, content_version)
       values ($1, $2, $3, $4, $5, $6, 'c1@aec70cc1') returning id`,
      [book, slug, ord, tier, slug, body],
    );
    return String(c!.id);
  };
  await chapter(myBook, '命宮', 1, 'free', '你不安於現狀。\n\n第二段。');
  myDeep = await chapter(myBook, '財帛', 2, 'deep', BODY);
  await chapter(otherBook, '財帛', 1, 'deep', BODY);
});

afterAll(async () => {
  await db?.close();
});

describe('chapter_leads()', () => {
  it('未買都攞到深度章第一段同第一句引文，按章序', async () => {
    await db.asReader(me);
    const rows = await db.sql('select slug, lead, quote from chapter_leads($1)', [myBook]);
    expect(rows.map((r) => r.slug)).toEqual(['命宮', '財帛']);
    const cai = rows.find((r) => r.slug === '財帛')!;
    expect(cai.lead).toBe('你靠自己開局賺錢。要留意的是，風險都在自己身上。');
    expect(cai.quote).toBe('《全書》寫「白手生財成家」');
    expect(rows.find((r) => r.slug === '命宮')!.quote).toBeNull();
  });

  it('⚠ 第二段之後一個字都唔出', async () => {
    await db.asReader(me);
    const rows = await db.sql('select lead, quote from chapter_leads($1)', [myBook]);
    const all = rows.map((r) => `${r.lead ?? ''}${r.quote ?? ''}`).join('');
    expect(all).not.toContain('第三段');
    expect(all).not.toContain('你的財帛宮坐七殺');
  });

  it('⚠ chapter_body() 照舊：未買嘅深度章仲係 null', async () => {
    await db.asReader(me);
    const [row] = await db.sql('select chapter_body($1) as body', [myDeep]);
    expect(row!.body).toBeNull();
  });

  it('第二個人本書：零行', async () => {
    await db.asReader(me);
    const rows = await db.sql('select * from chapter_leads($1)', [otherBook]);
    expect(rows).toHaveLength(0);
  });

  it('anon 行唔到', async () => {
    await db.asAnon();
    await expect(db.sql('select * from chapter_leads($1)', [myBook])).rejects.toThrow(/permission denied/);
  });

  /* 0009 · A4：「寫」以外嘅引出語都認；有標點隔住就唔算（唔會跨句） */
  it('認埋「另有一句」「記」「形容其人」「卷二說七殺」呢類引法', async () => {
    await db.asOwner();
    const [b] = await db.sql('insert into books (reader_id) values ($1) returning id', [me]);
    const book = String(b!.id);
    const cases: [string, string | null][] = [
      ['第一段。\n\n《全書》另有一句「在廟旺有力，陷地無力」：所以要看亮度。', '《全書》另有一句「在廟旺有力，陷地無力」'],
      ['第一段。\n\n《全書》鈴星歌記「若與貪狼會，指日立邊庭」。', '《全書》鈴星歌記「若與貪狼會，指日立邊庭」'],
      ['第一段。\n\n《全書》形容其人「忠厚老成，謙恭耿直」——這是自我要求的樣子。', '《全書》形容其人「忠厚老成，謙恭耿直」'],
      ['第一段。\n\n《全書》卷二說七殺「遇帝為權」。', '《全書》卷二說七殺「遇帝為權」'],
      ['第一段。\n\n這一句講《全書》。下一句「不是引文」。', null],
      ['第一段。\n\n《全書》：「冒號後面不算」。', null],
    ];
    for (const [i, [body]] of cases.entries()) {
      await db.sql(
        `insert into chapters (book_id, slug, ord, tier, title, body, content_version)
         values ($1, $2, $3, 'deep', $2, $4, 'c1@aec70cc1')`,
        [book, `q${i}`, i + 1, body],
      );
    }
    await db.asReader(me);
    const rows = await db.sql('select slug, quote from chapter_leads($1)', [book]);
    expect(rows.map((r) => r.quote)).toEqual(cases.map(([, q]) => q));
  });
});
