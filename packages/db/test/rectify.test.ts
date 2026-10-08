import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, seedReader, type TestDb } from '../src/testing';

/**
 * 溯時紀錄（0003 → 0005）：
 *   只收登入咗、自己本書嘅；真時辰由 DB 讀盤；每本書只記第一次；
 *   張表本身讀唔到、直接寫唔到；紀錄唔連書、唔連人。
 */
let db: TestDb;
let me: string;
let other: string;
let myBook: string;
let otherBook: string;

async function seedBook(reader: string, shichen: number) {
  await db.asOwner();
  const [s] = await db.sql(
    `insert into subjects (reader_id, name, birth_date, birth_tz, birth_place, lng, lat, sex)
     values ($1, '試', '1990-01-01', 'Asia/Hong_Kong', '香港', 114.17, 22.32, 'male') returning id`,
    [reader],
  );
  const [c] = await db.sql(
    `insert into charts (subject_id, engine_version, school_profile_id, payload)
     values ($1, '0.4.0', 'zhongzhou-v1@x', $2::jsonb) returning id`,
    [String(s!.id), JSON.stringify({ lunar: { shichen } })],
  );
  const [b] = await db.sql(
    `insert into books (reader_id, subject_id, chart_id, title, titled_at) values ($1, $2, $3, '書', now()) returning id`,
    [reader, String(s!.id), String(c!.id)],
  );
  return String(b!.id);
}

beforeEach(async () => {
  db = await createTestDb();
  me = await seedReader(db);
  other = await seedReader(db);
  myBook = await seedBook(me, 4);
  otherBook = await seedBook(other, 9);
});
afterEach(() => db.close());

const record = (book: string, picked = 3, candidates = '{3,4,5}', answers = '[{"year":2014,"area":"工作","a":"yes","yes":[3]}]') =>
  db.sql(
    `select rectify_record($1::uuid, 1::smallint, $2::smallint[], $3::smallint, 0.9::real, $4::jsonb, '{"3":0.9,"4":0.05,"5":0.05}'::jsonb, '{}'::jsonb) as id`,
    [book, candidates, picked, answers],
  );

describe('rectify_record', () => {
  it('自己本書寫得入；真時辰由盤讀，唔係 call 嗰個人講', async () => {
    await db.asReader(me);
    const [r] = await record(myBook);
    expect(r!.id).toBeTruthy();
    await db.asOwner();
    expect(await db.sql('select band, picked, true_shichen from rectify_trials')).toEqual([{ band: 1, picked: 3, true_shichen: 4 }]);
  });

  it('紀錄唔連書、唔連人', async () => {
    await db.asOwner();
    const cols = await db.sql(`select column_name from information_schema.columns where table_name = 'rectify_trials'`);
    const names = cols.map((c) => String(c.column_name));
    expect(names.some((n) => /book|reader|subject/.test(n))).toBe(false);
  });

  it('每本書只記第一次', async () => {
    await db.asReader(me);
    await record(myBook);
    const [again] = await record(myBook);
    expect(again!.id).toBeNull();
    await db.asOwner();
    expect(await db.sql('select count(*)::int as n from rectify_trials')).toEqual([{ n: 1 }]);
  });

  it('第二個人本書：唔寫', async () => {
    await db.asReader(me);
    const [r] = await record(otherBook);
    expect(r!.id).toBeNull();
    await db.asOwner();
    expect(await db.sql('select count(*)::int as n from rectify_trials')).toEqual([{ n: 0 }]);
  });

  it('未登入：call 都 call 唔到', async () => {
    await db.asAnon();
    await expect(record(myBook)).rejects.toThrow(/permission denied/);
  });

  it('登入咗都讀唔到、直接寫唔到張表', async () => {
    await db.asReader(me);
    await expect(db.sql('select * from rectify_trials')).rejects.toThrow();
    await expect(
      db.sql(`insert into rectify_trials (candidates, picked, confidence, answers, posterior) values ('{1}', 1, 0.5, '[]', '{}')`),
    ).rejects.toThrow();
  });

  it('揀中嘅唔喺候選、太多題：拒絕', async () => {
    await db.asReader(me);
    await expect(record(myBook, 7)).rejects.toThrow();
    const many = JSON.stringify(Array.from({ length: 31 }, (_, i) => ({ year: 2000 + i, area: '錢', a: 'no', yes: [] })));
    await expect(record(myBook, 3, '{3,4,5}', many)).rejects.toThrow();
  });
});
