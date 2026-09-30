import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, seedReader, type TestDb } from '../src/testing';

/**
 * 認領：Supabase 分兩句 UPDATE（2026-09-30 · Issac 實測撳完確認信仍然係匿名）
 *
 * 匿名讀者行 `updateUser({ email })`，撳確認信嗰陣 Supabase（GoTrue）
 * 唔係一句過改晒：先寫 `email`，再另一句改 `is_anonymous = false`（次序唔保證）。
 *
 * 以前嘅 sync trigger 逐句照抄，第一句之後 readers 就變成「有 email 但仲係匿名」——
 * 撞正 `readers_claim_shape`（is_anonymous = (email is null)），成個確認 rollback。
 * 讀者收到信、撳咗，DB 入面照舊係匿名，付款同開通兩道閘都過唔到。
 *
 * 舊測試（claim.test.ts）一句過改晒兩個欄，所以一直冇捉到。
 */

let db: TestDb;
let me: string;

beforeEach(async () => {
  db = await createTestDb();
  me = await seedReader(db);
  await db.asOwner();
});

afterEach(async () => {
  await db?.close();
});

async function reader() {
  const [row] = await db.sql('select is_anonymous, email from readers where id = $1', [me]);
  return row!;
}

describe('確認 email 分兩步', () => {
  it('先寫 email、再改 is_anonymous → 唔會爆，最後係已認領', async () => {
    await db.sql('update auth.users set email = $1 where id = $2', ['me@example.com', me]);
    expect(await reader()).toEqual({ is_anonymous: true, email: null });
    await db.sql('update auth.users set is_anonymous = false where id = $1', [me]);
    expect(await reader()).toEqual({ is_anonymous: false, email: 'me@example.com' });
  });

  it('先改 is_anonymous、再寫 email → 一樣', async () => {
    await db.sql('update auth.users set is_anonymous = false where id = $1', [me]);
    expect(await reader()).toEqual({ is_anonymous: true, email: null });
    await db.sql('update auth.users set email = $1 where id = $2', ['me@example.com', me]);
    expect(await reader()).toEqual({ is_anonymous: false, email: 'me@example.com' });
  });
});
