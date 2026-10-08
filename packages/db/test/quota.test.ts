import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createTestDb, seedReader, type TestDb } from '../src/testing';

/** 0006：每個讀者每個鐘最多成 10 本書（2026-10-08 security 檢查 🟠3） */
const TERMS = '2026-09-29';
const SUBJECT = JSON.stringify({
  name: '試', birth_date: '1996-06-16', birth_time: null, birth_tz: 'Asia/Hong_Kong',
  birth_place: '香港', lng: 114.17, lat: 22.32, sex: 'male',
});

let db: TestDb;
let me: string;
let other: string;

beforeEach(async () => {
  db = await createTestDb();
  me = await seedReader(db);
  other = await seedReader(db);
});
afterEach(() => db.close());

const make = (token = randomUUID()) =>
  db.sql('select create_book($1, $2, null, null, null, null, $3) as id', [token, SUBJECT, TERMS]);
const quota = async () => Number((await db.sql('select cast_quota() as n'))[0]!.n);

describe('成書次數上限', () => {
  it('cast_quota 由 10 數落去，第 11 本彈 GW429', async () => {
    await db.asReader(me);
    expect(await quota()).toBe(10);
    for (let i = 0; i < 10; i++) await make();
    expect(await quota()).toBe(0);
    await expect(make()).rejects.toMatchObject({ code: 'GW429' });
  });

  it('重送同一個 token 唔計，照樣攞返上次嗰本', async () => {
    await db.asReader(me);
    const token = randomUUID();
    const [first] = await make(token);
    for (let i = 0; i < 9; i++) await make();
    const [again] = await make(token);
    expect(again!.id).toBe(first!.id);
  });

  it('一個鐘之前嘅書唔計；每個讀者各自計', async () => {
    await db.asReader(me);
    for (let i = 0; i < 10; i++) await make();
    await db.asOwner();
    await db.sql(`update books set created_at = now() - interval '2 hours' where reader_id = $1`, [me]);
    await db.asReader(me);
    expect(await quota()).toBe(10);
    await db.asReader(other);
    expect(await quota()).toBe(10);
  });

  it('未登入 call 唔到 cast_quota', async () => {
    await db.asAnon();
    await expect(db.sql('select cast_quota()')).rejects.toThrow(/permission denied/);
  });
});
