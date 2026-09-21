import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/**
 * 一個真 Postgres，跑真 migration，跑真 RLS（工單 G1）
 *
 * ── 點解唔用 mock ──
 *
 * G1 交嘅嘢九成係**約束**：外鍵、CHECK、RLS policy、欄級權限。
 * 呢啲嘢用 mock 測等於測緊我自己寫嗰個 mock。
 *
 * PGlite 係真 PostgreSQL 17 編做 WASM，喺 process 入面行。
 * 所以下面啲測試係真係 insert 落去、真係被 constraint 彈返出嚟。
 *
 * ── 呢個 shim 覆蓋唔到嘅嘢（要老實講）──
 *
 * Supabase 嘅 `auth.users`、`auth.uid()`、匿名登入發 JWT ——
 * 呢度係照住佢哋嘅定義寫一個一模一樣嘅出嚟。
 * **所以「匿名登入行唔行得通」呢件事，呢度證明唔到。**
 * 呢度證明到嘅係：一個攞住某個 uid 嘅 session，睇得到同寫得到啲乜。
 */

const MIGRATIONS = fileURLToPath(new URL('../migrations', import.meta.url));

/**
 * Supabase `auth` schema 嘅最小版本。
 *
 * `auth.uid()` 逐字照 Supabase 嘅定義抄（先睇 `request.jwt.claim.sub`，
 * 再 fallback 去 `request.jwt.claims` 入面嘅 `sub`）—— 因為如果呢度
 * 寫一個「差唔多」嘅版本，policy 喺測試度過咗都唔代表喺線上過。
 */
const AUTH_SHIM = `
  create schema if not exists auth;

  create table auth.users (
    id            uuid primary key default gen_random_uuid(),
    email         text,
    is_anonymous  boolean not null default true,
    created_at    timestamptz not null default now()
  );

  create or replace function auth.uid() returns uuid
  language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;

  create role anon;
  create role authenticated;
  create role service_role bypassrls;

  -- ⚠ Supabase 開 project 嗰陣就 grant 咗呢一句，所以線上冇人見過佢。
  -- 冇佢，任何**唔係 security definer** 嘅 function 一叫 auth.uid()
  -- 就會撞到「permission denied for schema auth」—— G1 嗰陣全部 policy
  -- 同 definer function 都行得，所以呢個窿一路匿到 G5 先浮返出嚟。
  grant usage on schema auth to anon, authenticated, service_role;
`;

export type TestDb = {
  sql: (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
  /** 由呢一刻起，之後嘅 query 都當係呢個 uid 嘅已登入 session。 */
  asReader: (uid: string) => Promise<void>;
  /** 未登入。 */
  asAnon: () => Promise<void>;
  /** server 上面嘅 webhook —— bypass RLS。 */
  asService: () => Promise<void>;
  /** 我哋自己（superuser），用嚟鋪測試資料。 */
  asOwner: () => Promise<void>;
  close: () => Promise<void>;
};

export async function createTestDb(): Promise<TestDb> {
  const db = await PGlite.create();
  await db.exec(AUTH_SHIM);

  /*
   * ⚠ 只跑編咗號嗰啲，唔係全部 `.sql`。
   *
   * `migrations/all.sql` 係一個生成檔（五隻接埋一齊，畀你貼落
   * Supabase SQL Editor）。佢一擺入呢個資料夾，原本嗰句
   * 「全部 .sql 順住跑」就會將成套 schema 跑多次 ——
   * 三十條測試一次過紅，而錯誤訊息淨係話 "already exists"。
   *
   * 加咗之後即刻爆咗一次，所以呢個註釋唔係假設，係記錄。
   */
  const numbered = readdirSync(MIGRATIONS)
    .filter((f) => /^0\d+_.*\.sql$/.test(f))
    .sort();

  for (const file of numbered) {
    await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  }

  const sql = async (query: string, params?: unknown[]) =>
    (await db.query(query, params)).rows as Record<string, unknown>[];

  return {
    sql,
    asReader: async (uid) => {
      await db.exec('reset role;');
      await db.query('select set_config($1, $2, false)', ['request.jwt.claim.sub', uid]);
      await db.exec('set role authenticated;');
    },
    asAnon: async () => {
      await db.exec('reset role;');
      await db.query('select set_config($1, $2, false)', ['request.jwt.claim.sub', '']);
      await db.exec('set role anon;');
    },
    asService: async () => {
      await db.exec('reset role;');
      await db.exec('set role service_role;');
    },
    asOwner: async () => {
      await db.exec('reset role;');
    },
    close: () => db.close(),
  };
}

/** 起一個已登入嘅讀者（預設匿名），回佢個 uid。 */
export async function seedReader(
  db: TestDb,
  opts: { anonymous?: boolean; email?: string } = {},
): Promise<string> {
  const anonymous = opts.anonymous ?? true;
  await db.asOwner();
  const [user] = await db.sql(
    'insert into auth.users (email, is_anonymous) values ($1, $2) returning id',
    [anonymous ? null : (opts.email ?? 'reader@example.com'), anonymous],
  );
  /* `readers` 嗰行由 `auth.users` 嘅 trigger 自己生（G2）—— 呢度唔使 insert。 */
  return String(user!.id);
}
