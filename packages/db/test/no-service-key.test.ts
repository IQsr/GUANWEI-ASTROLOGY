import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, seedReader, type TestDb } from '../src/testing';

/**
 * 網站唔再攞 service role key（0010）
 *
 * 量嘅係兩樣：
 *   一、付款憑一條 token（資料庫只存 hash）先發到票／收到票；冇 token、錯 token 一律唔得
 *   二、刪帳戶只刪得自己，而且 anon 叫唔郁
 * 同埋：token 外洩嘅最壞情況 —— 用 anon 身分拎住 token，都讀唔到任何讀者資料。
 */

let db: TestDb;
let reader: string;
let other: string;
let token: string;

beforeEach(async () => {
  db = await createTestDb();
  reader = await seedReader(db, { anonymous: false, email: 'r@example.com' });
  other = await seedReader(db, { anonymous: false, email: 'o@example.com' });
  await db.asOwner();
  const [t] = await db.sql('select private.rotate_pay_token() as t');
  token = String(t!.t);
});

afterEach(() => db.close());

async function seedBook(owner: string) {
  await db.asOwner();
  const [b] = await db.sql('insert into books (reader_id) values ($1) returning id', [owner]);
  return String(b!.id);
}

const payGrant = (tok: string, book: string, who: string, pid: string) =>
  db.sql('select pay_grant($1, $2, $3, $4, $5, $6, $7) as ok', [tok, book, who, 'book', pid, 100, 'usd']);

describe('pay_grant / pay_revoke：憑 token', () => {
  it('啱 token：發到票，收得返', async () => {
    const book = await seedBook(reader);
    await db.asAnon();
    const [g] = await payGrant(token, book, reader, 'cs_1');
    expect(g!.ok).toBe(true);
    const [r] = await db.sql('select pay_revoke($1, $2) as ok', [token, 'cs_1']);
    expect(r!.ok).toBe(true);
  });

  it('錯 token、冇 token：一律唔得', async () => {
    const book = await seedBook(reader);
    await db.asAnon();
    await expect(payGrant('wrong', book, reader, 'cs_2')).rejects.toThrow(/token 唔啱/);
    await expect(payGrant('', book, reader, 'cs_2')).rejects.toThrow(/token 唔啱/);
    await expect(db.sql('select pay_revoke($1, $2)', ['wrong', 'cs_2'])).rejects.toThrow(/token 唔啱/);
  });

  it('換咗 token，舊嗰條即刻失效', async () => {
    const book = await seedBook(reader);
    await db.asOwner();
    await db.sql('select private.rotate_pay_token()');
    await db.asAnon();
    await expect(payGrant(token, book, reader, 'cs_3')).rejects.toThrow(/token 唔啱/);
  });

  it('token 啱都好，原本嗰幾道閘照舊：書唔屬於佢唔得', async () => {
    const book = await seedBook(reader);
    await db.asAnon();
    await expect(payGrant(token, book, other, 'cs_4')).rejects.toThrow(/唔屬於呢個讀者/);
  });

  it('⚠ token 外洩嘅最壞情況：拎住 token 都讀唔到讀者資料', async () => {
    await seedBook(reader);
    await db.asAnon();
    /* anon 連打開 books 呢張表嘅權限都冇 */
    await expect(db.sql('select * from books')).rejects.toThrow(/permission denied/i);
    await expect(db.sql('select * from private.pay_token')).rejects.toThrow(/permission denied/i);
    await expect(db.sql('select private.rotate_pay_token()')).rejects.toThrow(/permission denied/i);
  });

  it('網站身分（anon、authenticated）直接叫舊嗰兩個 function 都唔得', async () => {
    const book = await seedBook(reader);
    await db.asAnon();
    await expect(
      db.sql('select grant_entitlement($1, $2, $3, $4, $5, $6)', [book, reader, 'book', 'cs_5', 100, 'usd']),
    ).rejects.toThrow(/permission denied/i);
    await db.asReader(reader);
    await expect(db.sql('select revoke_entitlement($1)', ['cs_5'])).rejects.toThrow(/permission denied/i);
  });
});

describe('delete_my_auth_user：只刪得自己', () => {
  it('讀者刪自己：auth 帳戶冇咗，另一個讀者冇郁', async () => {
    await db.asReader(reader);
    await db.sql('select delete_my_auth_user()');
    await db.asOwner();
    const rows = await db.sql('select id from auth.users where id = any($1::uuid[])', [[reader, other]]);
    expect(rows.map((r) => String(r.id))).toEqual([other]);
  });

  it('anon 叫唔郁', async () => {
    await db.asAnon();
    await expect(db.sql('select delete_my_auth_user()')).rejects.toThrow(/permission denied/i);
  });
});

describe('private.pay_token 開咗 RLS（0012）', () => {
  it('RLS 開咗，而且發票照行得', async () => {
    await db.asOwner();
    const [r] = await db.sql(`select relrowsecurity as on from pg_class where oid = 'private.pay_token'::regclass`);
    expect(r!.on).toBe(true);
    const book = await seedBook(reader);
    await db.asAnon();
    const [g] = await payGrant(token, book, reader, 'cs_rls');
    expect(g!.ok).toBe(true);
  });
});

describe('⚠ 轉擁有者：喺 Supabase 唔係 superuser（2026-09-30 撞過）', () => {
  /**
   * Supabase 跑 migration 嘅係 postgres（唔係 superuser），而 service_role 喺 public 冇 CREATE。
   * 直接 `alter … owner to service_role` 會撞「permission denied for schema public」。
   * 呢度用一個非 superuser 角色重現，證明 0010 嗰個 do 區塊行得通，而且行完收返權限。
   */
  it('直接轉會撞錯；暫時畀權限嘅做法行得通，行完 service_role 冇 CREATE', async () => {
    await db.asOwner();
    await db.exec(`
      create role mig;
      grant service_role to mig;
      grant usage, create on schema public to mig;
      set role mig;
      create function public.zz_probe() returns int language sql as 'select 1';
    `);
    await expect(db.exec('alter function public.zz_probe() owner to service_role')).rejects.toThrow(/permission denied for schema public/);
    await db.exec('reset role; grant create on schema public to mig with grant option; set role mig;');
    await db.exec(`
      do $o$
      declare had boolean := has_schema_privilege('service_role', 'public', 'CREATE');
      begin
        if not had then execute 'grant create on schema public to service_role'; end if;
        execute 'alter function public.zz_probe() owner to service_role';
        if not had then execute 'revoke create on schema public from service_role'; end if;
      end $o$;
    `);
    await db.asOwner();
    const [r] = await db.sql(`select pg_get_userbyid(proowner) as owner, has_schema_privilege('service_role', 'public', 'CREATE') as can
                                from pg_proc where proname = 'zz_probe'`);
    expect(r!.owner).toBe('service_role');
    expect(r!.can).toBe(false);
  });
});
