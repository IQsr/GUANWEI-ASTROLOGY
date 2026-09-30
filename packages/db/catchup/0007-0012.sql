-- 觀微 · 追趕 migration 0007–0012（生成檔，唔好手改：python scripts/catchup.py）
--
-- 用法：Supabase → SQL Editor → 貼晒落去 → Run。
-- 前提：0001–0006 已經跑過（成過書就一定跑過）。
-- 可以重複跑：已經有嘅嘢會跳過，唔會撞 already exists。

-- ── 0007_pay.sql ──
create or replace function public.grant_entitlement(
  p_book       uuid,
  p_reader     uuid,
  p_product    text,
  p_payment_id text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid;
begin
  /*
   * ⚠ 一、呢本書係咪佢本書。
   *
   * service_role 之下冇 RLS，所以 `p_reader` 同 `p_book` 唔夾
   * 係寫得入去嘅 —— 即係一條「畀 A 張 B 本書嘅票」嘅路。
   * 冇人會有心噉做，但 webhook 收到嘅係 Stripe metadata，
   * 而 metadata 係我哋自己喺 checkout 嗰陣塞落去嘅兩個字串。
   * 一個字串打錯，就係一張錯票。
   */
  select reader_id into v_owner from books where id = p_book;

  if v_owner is null then
    raise exception '冇呢本書：%', p_book using errcode = 'foreign_key_violation';
  end if;

  if v_owner <> p_reader then
    raise exception '呢本書唔屬於呢個讀者 —— 票唔可以跨人寫'
      using errcode = 'check_violation';
  end if;

  /*
   * ⚠ 二、冪等唔喺呢度做，喺 unique 度做。
   *
   * 「先 select 睇吓有冇，冇就 insert」係一條 race：Stripe 同一個
   * 事件重送兩次，兩個 request 可以同時 select 到「冇」。
   * `on conflict do nothing` 係由 DB 答，冇中間狀態。
   */
  insert into entitlements (reader_id, book_id, product, stripe_payment_id)
  values (p_reader, p_book, p_product, p_payment_id)
  on conflict do nothing;

  return found;
end;
$$;

revoke all on function public.grant_entitlement(uuid, uuid, text, text) from public;
grant execute on function public.grant_entitlement(uuid, uuid, text, text) to service_role;

create or replace function public.has_entitlement(p_book uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from entitlements e
     where e.book_id = p_book
       and e.reader_id = auth.uid()
  );
$$;

grant execute on function public.has_entitlement(uuid) to authenticated;

-- ── 0008_account.sql ──
create table if not exists payment_records (
  stripe_payment_id text primary key,
  amount            integer not null check (amount > 0),
  currency          text not null check (length(currency) = 3),
  paid_at           timestamptz not null default now()
);

alter table payment_records enable row level security;
alter table payment_records force row level security;

grant select, insert on payment_records to service_role;

drop function if exists public.grant_entitlement(uuid, uuid, text, text);

create or replace function public.grant_entitlement(
  p_book       uuid,
  p_reader     uuid,
  p_product    text,
  p_payment_id text,
  p_amount     integer,
  p_currency   text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select reader_id into v_owner from books where id = p_book;

  if v_owner is null then
    raise exception '冇呢本書：%', p_book using errcode = 'foreign_key_violation';
  end if;

  if v_owner <> p_reader then
    raise exception '呢本書唔屬於呢個讀者 —— 票唔可以跨人寫'
      using errcode = 'check_violation';
  end if;

  /*
   * ⚠ 會計紀錄行先，而且佢自己一個 on conflict。
   *
   * 兩樣嘢冪等嘅條件唔同：張票可以因為「同一本書已經有票」而唔寫
   * （用戶畀咗兩次錢），但嗰兩筆錢**兩筆都真係收過**。
   * 所以如果會計紀錄跟住張票嘅結果走，第二筆錢就會唔見咗。
   */
  insert into payment_records (stripe_payment_id, amount, currency)
  values (p_payment_id, p_amount, lower(p_currency))
  on conflict (stripe_payment_id) do nothing;

  insert into entitlements (reader_id, book_id, product, stripe_payment_id)
  values (p_reader, p_book, p_product, p_payment_id)
  on conflict do nothing;

  return found;
end;
$$;

revoke all on function public.grant_entitlement(uuid, uuid, text, text, integer, text) from public;
grant execute on function public.grant_entitlement(uuid, uuid, text, text, integer, text) to service_role;

create or replace function public.export_reader()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'reader', (
      select to_jsonb(r) - 'id'
        from readers r where r.id = auth.uid()
    ),
    'subjects', coalesce((
      select jsonb_agg(to_jsonb(s) - 'reader_id' order by s.created_at)
        from subjects s where s.reader_id = auth.uid()
    ), '[]'::jsonb),
    'charts', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.computed_at)
        from charts c
        join subjects s on s.id = c.subject_id
       where s.reader_id = auth.uid()
    ), '[]'::jsonb),
    'books', coalesce((
      select jsonb_agg(
               (to_jsonb(b) - 'reader_id') || jsonb_build_object(
                 'chapters', coalesce((
                   select jsonb_agg(
                            jsonb_build_object(
                              'slug', ch.slug,
                              'ord', ch.ord,
                              'tier', ch.tier,
                              'title', ch.title,
                              'content_version', ch.content_version,
                              'slots', ch.slots,
                              'cut_at', ch.cut_at,
                              /* ⚠ 未買就係 null。匯出唔繞過 paywall。 */
                              'body', chapter_body(ch.id)
                            ) order by ch.ord
                          )
                     from chapters ch where ch.book_id = b.id
                 ), '[]'::jsonb)
               ) order by b.created_at
             )
        from books b where b.reader_id = auth.uid()
    ), '[]'::jsonb),
    'entitlements', coalesce((
      select jsonb_agg(to_jsonb(e) - 'reader_id' order by e.purchased_at)
        from entitlements e where e.reader_id = auth.uid()
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.export_reader() to authenticated;

grant delete on readers to authenticated;

create or replace function public.delete_reader()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_counts jsonb;
  v_gone   integer;
begin
  select jsonb_build_object(
    'subjects', (select count(*) from subjects where reader_id = auth.uid()),
    'books',    (select count(*) from books where reader_id = auth.uid()),
    'chapters', (select count(*) from chapters ch
                   join books b on b.id = ch.book_id
                  where b.reader_id = auth.uid()),
    'entitlements', (select count(*) from entitlements where reader_id = auth.uid())
  ) into v_counts;

  delete from readers where id = auth.uid();
  get diagnostics v_gone = row_count;

  if v_gone = 0 then
    raise exception '冇嘢刪到 —— 搵唔到呢個讀者' using errcode = 'no_data_found';
  end if;

  /*
   * ⚠ 呢度刪唔到 `auth.users`。
   *
   * 嗰行要 service_role 行 admin API（`auth.admin.deleteUser`）。
   * 即係話「真刪」實際上係兩步，而**第二步喺呢個檔案之外**。
   *
   * 兩步之間仆咗街嘅話，剩低嘅係一個冇任何資料嘅 auth 帳戶 ——
   * 即係得返個 email。`lib/account.ts` 要照直講出嚟，唔准報「刪晒」。
   */
  return v_counts;
end;
$$;

grant execute on function public.delete_reader() to authenticated;

-- ── 0009_refund.sql ──
alter table payment_records add column if not exists refunded_at timestamptz;

grant update (refunded_at) on payment_records to service_role;

create or replace function public.revoke_entitlement(p_payment_id text)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  /* 會計紀錄行先：就算張票早已唔喺度（重送、人手刪咗），退款都要記低 */
  update payment_records
     set refunded_at = now()
   where stripe_payment_id = p_payment_id
     and refunded_at is null;

  delete from entitlements where stripe_payment_id = p_payment_id;
  return found;
end;
$$;

revoke all on function public.revoke_entitlement(text) from public;
grant execute on function public.revoke_entitlement(text) to service_role;

-- ── 0010_no_service_key.sql ──
create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.pay_token (
  id         integer primary key default 1 check (id = 1),
  hash       bytea not null,
  rotated_at timestamptz not null default now()
);

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

do $o$
declare
  had boolean := has_schema_privilege('service_role', 'public', 'CREATE');
begin
  if not had then
    execute 'grant create on schema public to service_role';
  end if;
  execute 'alter function public.pay_grant(text, uuid, uuid, text, text, integer, text) owner to service_role';
  execute 'alter function public.pay_revoke(text, text) owner to service_role';
  if not had then
    execute 'revoke create on schema public from service_role';
  end if;
end
$o$;

revoke all on function public.pay_grant(text, uuid, uuid, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.pay_revoke(text, text) from public, anon, authenticated;
grant execute on function public.pay_grant(text, uuid, uuid, text, text, integer, text) to anon;
grant execute on function public.pay_revoke(text, text) to anon;

revoke all on function public.grant_entitlement(uuid, uuid, text, text, integer, text) from anon, authenticated;
revoke all on function public.revoke_entitlement(text) from anon, authenticated;

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

-- ── 0011_terms.sql ──
alter table books add column if not exists terms_version text;
alter table books add column if not exists terms_accepted_at timestamptz;

do $c$ begin
  alter table books add constraint books_terms_together
    check ((terms_version is null) = (terms_accepted_at is null));
exception when duplicate_object then null;
end $c$;

drop function if exists public.create_book(uuid, jsonb, jsonb, text, text, jsonb);

create or replace function public.create_book(
  p_token    uuid,
  p_subject  jsonb,
  p_chart    jsonb,   -- null = 待時辰（架構 §8）
  p_title    text,    -- 同 p_chart 一齊有或者一齊冇
  p_seal     text,
  p_chapters jsonb,   -- [{slug, ord, tier, title, body, content_version}]
  p_terms_version text  -- 同意咗邊個版本嘅條款及私隱政策（0011）
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_reader  uuid := auth.uid();
  v_subject uuid;
  v_chart   uuid;
  v_book    uuid;
begin
  if v_reader is null then
    raise exception '未登入，成唔到書' using errcode = '42501';
  end if;
  if p_token is null then
    raise exception '成書要一個 token —— 冇佢就防唔到重送' using errcode = '23514';
  end if;
  if p_terms_version is null or length(trim(p_terms_version)) = 0 then
    raise exception '未同意條款及私隱政策，成唔到書' using errcode = '23514';
  end if;

  select id into v_book from books where reader_id = v_reader and client_token = p_token;
  if found then
    return v_book;
  end if;

  if (p_chart is null) <> (p_title is null) then
    raise exception '有盤先有名，有名一定有盤' using errcode = '23514';
  end if;

  insert into subjects (
    reader_id, name, birth_date, birth_time, birth_tz, birth_place,
    lng, lat, sex, true_solar_corrected
  ) values (
    v_reader,
    p_subject ->> 'name',
    (p_subject ->> 'birth_date')::date,
    (p_subject ->> 'birth_time')::time,
    p_subject ->> 'birth_tz',
    p_subject ->> 'birth_place',
    (p_subject ->> 'lng')::double precision,
    (p_subject ->> 'lat')::double precision,
    p_subject ->> 'sex',
    coalesce((p_subject ->> 'true_solar_corrected')::boolean, false)
  ) returning id into v_subject;

  if p_chart is not null then
    insert into charts (subject_id, engine_version, school_profile_id, payload)
    values (
      v_subject,
      p_chart ->> 'engine_version',
      p_chart ->> 'school_profile_id',
      p_chart -> 'payload'
    ) returning id into v_chart;
  end if;

  insert into books (reader_id, subject_id, chart_id, title, cover_seal, titled_at, client_token,
                     terms_version, terms_accepted_at)
  values (
    v_reader, v_subject, v_chart, p_title, p_seal,
    case when v_chart is null then null else now() end,
    p_token,
    p_terms_version, now()
  ) returning id into v_book;

  if v_chart is not null then
    if p_chapters is null or jsonb_array_length(p_chapters) = 0 then
      raise exception '題咗名就一定要有正文' using errcode = '23514';
    end if;

    insert into chapters (book_id, slug, ord, tier, title, body, content_version, slots)
    select v_book,
           c ->> 'slug',
           (c ->> 'ord')::smallint,
           c ->> 'tier',
           c ->> 'title',
           c ->> 'body',
           c ->> 'content_version',
           coalesce(
             (select array_agg(s #>> '{}' order by i)
                from jsonb_array_elements(coalesce(c -> 'slots', '[]'::jsonb)) with ordinality t(s, i)),
             '{}'
           )
      from jsonb_array_elements(p_chapters) c;
  end if;

  return v_book;

exception
  when unique_violation then
    select id into v_book from books where reader_id = v_reader and client_token = p_token;
    if v_book is null then
      raise;
    end if;
    return v_book;
end;
$$;

revoke all on function public.create_book(uuid, jsonb, jsonb, text, text, jsonb, text) from public, anon;
grant execute on function public.create_book(uuid, jsonb, jsonb, text, text, jsonb, text) to authenticated;

-- ── 0012_private_rls.sql ──
alter table private.pay_token enable row level security;
