import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

/**
 * `migrations/all.sql` 係一個生成檔（工單 G6）
 *
 * ⚠ 一個貼落 Supabase SQL Editor 嘅檔，同真正跑測試嗰幾個檔走音，
 * 係一種特別難查嘅走音：本機全綠，線上行緊另一套 schema。
 *
 * 所以呢度做兩件事：逐隻檔對返內容，同埋**真係喺一個乾淨
 * Postgres 上面由頭跑一次**。
 */

const DIR = fileURLToPath(new URL('../migrations', import.meta.url));
const parts = readdirSync(DIR)
  .filter((f) => /^0\d+_.*\.sql$/.test(f))
  .sort();
const all = readFileSync(join(DIR, 'all.sql'), 'utf8');

const AUTH_SHIM = `
  create schema if not exists auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text, is_anonymous boolean not null default true,
    created_at timestamptz not null default now()
  );
  create or replace function auth.uid() returns uuid language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid $$;
  create role anon; create role authenticated; create role service_role bypassrls;
  grant usage on schema auth to anon, authenticated, service_role;
`;

describe('all.sql 同逐隻 migration 唔准走音', () => {
  it('每一隻都喺入面，而且順序啱', () => {
    expect(parts.length).toBeGreaterThan(0);
    let at = -1;
    for (const f of parts) {
      const i = all.indexOf(readFileSync(join(DIR, f), 'utf8'));
      expect(i, `${f} 唔喺 all.sql 入面（或者改過）`).toBeGreaterThan(at);
      at = i;
    }
  });

  it('冇多咗嘢 —— 淨係標題同內容', () => {
    const body = parts.map((f) => readFileSync(join(DIR, f), 'utf8')).join('').length;
    /* 標題橫額每隻約 150 字元，加頂頭嗰段說明。 */
    expect(all.length - body).toBeLessThan(2000);
  });

  /** ⚠ 對得返內容唔代表跑得到 —— 所以真係跑一次。 */
  it('喺一個乾淨 Postgres 上面由頭跑得完', async () => {
    const db = await PGlite.create();
    await db.exec(AUTH_SHIM);
    await db.exec(all);
    const rows = (
      await db.query<{ n: number }>(
        "select count(*)::int as n from information_schema.tables where table_schema = 'public'",
      )
    ).rows;
    expect(rows[0]!.n).toBe(6);
    await db.close();
  }, 60_000);
});
