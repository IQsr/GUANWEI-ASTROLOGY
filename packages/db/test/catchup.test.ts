import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createTestDb, seedReader, type TestDb } from '../src/testing';

/**
 * 追趕檔（catchup/0007-0012.sql）
 *
 * 線上資料庫跑過 0001–0006，之後嘅唔知跑到邊。all.sql 太大（SQL Editor 報 Backend error）
 * 而且唔可以重跑，所以有呢個細檔：成段貼落去，跑幾多次都得。
 *
 * 量三樣：一、由 0006 起跑得完；二、再跑一次唔撞錯；三、跑完之後同逐隻 migration 跑出嚟嘅一模一樣。
 */
const CATCHUP = readFileSync(fileURLToPath(new URL('../catchup/0007-0012.sql', import.meta.url)), 'utf8');

async function shape(db: TestDb) {
  await db.asOwner();
  const fns = await db.sql(`
    select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as f
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') order by 1`);
  const cols = await db.sql(`
    select table_schema || '.' || table_name || '.' || column_name as c
      from information_schema.columns where table_schema in ('public', 'private') order by 1`);
  const cons = await db.sql(`select conname from pg_constraint c join pg_namespace n on n.oid = c.connamespace
                              where n.nspname in ('public', 'private') order by 1`);
  return { fns: fns.map((r) => r.f), cols: cols.map((r) => r.c), cons: cons.map((r) => r.conname) };
}

describe('追趕檔 0007–0012', () => {
  it('由 0006 起跑兩次都得，而且同逐隻 migration 跑出嚟一樣', async () => {
    const full = await createTestDb();
    const want = await shape(full);
    await full.close();

    const old = await createTestDb({ until: '0006' });
    await old.exec(CATCHUP);
    await old.exec(CATCHUP);
    expect(await shape(old)).toEqual(want);
    await old.close();
  }, 60_000);

  it('跑到一半（例如已經有 0007–0009）再跑都得', async () => {
    const db = await createTestDb({ until: '0009' });
    await db.exec(CATCHUP);
    const [r] = await db.sql(`select count(*)::int as n from information_schema.columns
                               where table_name = 'books' and column_name = 'terms_version'`);
    expect(r!.n).toBe(1);
    await db.close();
  }, 60_000);

  it('跑完之後成書要帶條款版本（0011 生效）', async () => {
    const db = await createTestDb({ until: '0006' });
    await db.exec(CATCHUP);
    const me = await seedReader(db);
    await db.asReader(me);
    await expect(
      db.sql('select create_book($1, $2, null, null, null, null, null)', [
        '11111111-1111-4111-8111-111111111111',
        JSON.stringify({ name: 'x', birth_date: '1996-06-16', birth_time: null, birth_tz: 'Asia/Hong_Kong', birth_place: '香港', lng: 114, lat: 22, sex: 'male' }),
      ]),
    ).rejects.toThrow(/未同意條款/);
    await db.close();
  }, 60_000);
});
