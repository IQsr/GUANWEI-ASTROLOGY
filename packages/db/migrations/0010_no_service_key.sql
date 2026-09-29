-- 觀微 · 網站唔再攞 service role key（2026-09-29 · Issac：「怕 service role key 權限太大」）
--
-- 之前網站 server 有兩處要 service role key：
--
--   一、Stripe webhook 發票／收票（grant_entitlement、revoke_entitlement）
--   二、刪帳戶嗰陣刪 auth 帳戶（auth.admin.deleteUser）
--
-- 而 service role key bypass 晒 RLS：外洩一次，全部讀者嘅生辰、盤、書都讀得到。
-- 呢條 migration 將兩件事都換成**權限只夠做嗰一件事**嘅 function：
--
--   一、pay_grant / pay_revoke：憑一條專用 token（資料庫只存 hash）。
--       token 外洩，最多有人發票或者收票 —— 一行讀者資料都讀唔到。
--   二、delete_my_auth_user：讀者用自己個 session 刪自己，刪唔到第二個人。

-- ── 一、付款 token ─────────────────────────────────────────
--
-- 擺喺 `private` schema：Supabase 個 API 淨係開 `public`，
-- 所以呢度嘅表同 function 由網站一個都叫唔到，只可以喺 SQL Editor 度郁。
create schema if not exists private;
revoke all on schema private from public;

create table private.pay_token (
  id         integer primary key default 1 check (id = 1),
  hash       bytea not null,
  rotated_at timestamptz not null default now()
);

-- 生成一條新 token，淨係回一次；資料庫只記 hash。
-- 用法（SQL Editor）：select private.rotate_pay_token();
-- 然後將回嚟嗰條貼落 .env.local 嘅 PAY_WEBHOOK_TOKEN。再行一次就換咗舊嗰條。
create or replace function private.rotate_pay_token()
returns text
language plpgsql
set search_path = ''
as $$
declare
  t text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  insert into private.pay_token (id, hash) values (1, sha256(convert_to(t, 'UTF8')))
  on conflict (id) do update set hash = excluded.hash, rotated_at = now();
  return t;
end;
$$;

-- ⚠ 淨係 hash 對得上先過。冇設過 token = 一律唔過（唔係一律過）。
create or replace function private.pay_token_ok(p_token text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from private.pay_token
     where hash = sha256(convert_to(coalesce(p_token, ''), 'UTF8'))
  );
$$;

-- ── pay_grant / pay_revoke ─────────────────────────────────
--
-- ⚠ security definer，而且**擁有者係 service_role**（下面 alter owner）：
-- 入面行 grant_entitlement 要寫 entitlements、payment_records，而兩張表都係
-- force row level security。service_role 有 bypassrls —— 但佢嘅權力困喺呢兩個
-- function 入面：外面淨係叫得到「發票」「收票」，冇第三樣。
create or replace function public.pay_grant(
  p_token      text,
  p_book       uuid,
  p_reader     uuid,
  p_product    text,
  p_payment_id text,
  p_amount     integer,
  p_currency   text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.pay_token_ok(p_token) then
    raise exception '付款 token 唔啱' using errcode = 'insufficient_privilege';
  end if;
  return public.grant_entitlement(p_book, p_reader, p_product, p_payment_id, p_amount, p_currency);
end;
$$;

create or replace function public.pay_revoke(p_token text, p_payment_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.pay_token_ok(p_token) then
    raise exception '付款 token 唔啱' using errcode = 'insufficient_privilege';
  end if;
  return public.revoke_entitlement(p_payment_id);
end;
$$;

grant usage on schema private to service_role;
grant select on private.pay_token to service_role;
grant execute on function private.pay_token_ok(text) to service_role;

alter function public.pay_grant(text, uuid, uuid, text, text, integer, text) owner to service_role;
alter function public.pay_revoke(text, text) owner to service_role;

-- webhook 用 anon key（冇 session）叫。token 先係真正嗰道閘。
revoke all on function public.pay_grant(text, uuid, uuid, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.pay_revoke(text, text) from public, anon, authenticated;
grant execute on function public.pay_grant(text, uuid, uuid, text, text, integer, text) to anon;
grant execute on function public.pay_revoke(text, text) to anon;

-- ⚠ 收緊舊嗰兩個：Supabase 嘅預設權限會畀 anon、authenticated execute
-- public 入面每一個新 function。佢哋係 invoker（入面嘅 insert 過唔到 RLS），
-- 但唔好靠嗰一層。
revoke all on function public.grant_entitlement(uuid, uuid, text, text, integer, text) from anon, authenticated;
revoke all on function public.revoke_entitlement(text) from anon, authenticated;

-- ── 二、刪自己個 auth 帳戶 ─────────────────────────────────
--
-- 之前用 admin API（要 service role key）。而家讀者用自己個 session 叫，
-- function 入面只刪 `auth.uid()` 嗰一個 —— 參數都冇，冇得指定第二個人。
-- 擁有者係跑 migration 嗰個（Supabase 係 postgres），佢有權刪 auth.users。
create or replace function public.delete_my_auth_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception '冇登入' using errcode = 'insufficient_privilege';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_auth_user() from public, anon, authenticated;
grant execute on function public.delete_my_auth_user() to authenticated;
