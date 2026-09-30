-- 觀微 · 資料庫 baseline（2026-09-30 由 0001–0012 合併）
--
-- 一張新 Supabase project：SQL Editor → New query → 貼晒 → Run，一次就夠。
-- 線上嗰個已經行晒 0001–0012，唔使再跑呢個檔。之後有改動就由 0002 開始加。
--
-- 合併嗰陣用兩個資料庫逐項對比過（表、欄、限制、索引、function、權限、RLS、trigger），同 0001–0012 一模一樣。
-- 逐步嘅歷史（例如 create_book 點解改過三次）喺 git log。
--
-- 三條貫穿成個 schema 嘅決定：
--   一、reader.id 就係 auth.uid()：認領唔使搬資料。
--   二、書屬於讀者（books.reader_id），唔經 subject 推：書可以先於生辰存在。
--   三、版本欄一律唔准 'latest'（規範 §17）。

-- ── readers ────────────────────────────────────────────────
create table readers (
  id           uuid primary key references auth.users (id) on delete cascade,
  is_anonymous boolean     not null default true,
  email        text,
  created_at   timestamptz not null default now(),
  -- 回訪次數（0003）：認領提示「第二次回訪」要數；一日算一次。
  visit_days         smallint    not null default 1,
  last_visit_on      date        not null default current_date,
  -- 成書後嗰個認領提示撳走咗就唔再嘈。
  claim_dismissed_at timestamptz,

  -- 認領咗（唔再匿名）就一定有 email；匿名嗰陣一定冇。
  constraint readers_claim_shape check (is_anonymous = (email is null))
);

-- ── subjects：命書講緊嗰個人 ────────────────────────────────
-- 唔一定係讀者本人 —— 架構 §7「書架『＋ 新書』讓人排屋企人」。
create table subjects (
  id                   uuid primary key default gen_random_uuid(),
  reader_id            uuid not null references readers (id) on delete cascade,
  name                 text not null check (length(btrim(name)) between 1 and 40),
  birth_date           date not null,

  -- ⚠ 可以係 null：唔知時辰。冇時辰定唔到命宮 = 冇書，
  -- 但**書架要顯示得到**嗰本未題名嘅書（架構 §8）。
  birth_time           time,

  birth_tz             text not null,
  birth_place          text not null,
  lng                  double precision not null check (lng between -180 and 180),
  lat                  double precision not null check (lat between -90 and 90),
  sex                  text not null check (sex in ('male', 'female')),
  true_solar_corrected boolean not null default false,
  created_at           timestamptz not null default now(),

  -- 畀 books 做複合外鍵用：一本書唔可以指去第二個人嘅 subject。
  unique (id, reader_id)
);

-- ── charts：一次排盤嘅結果 ──────────────────────────────────
create table charts (
  id                uuid primary key default gen_random_uuid(),
  subject_id        uuid not null references subjects (id) on delete cascade,

  -- 引擎版本係最重要嗰欄（架構 §5）。冇佢就無法重現舊盤、
  -- 無法批次重算、無法向用戶交代（R-008）。
  engine_version    text not null check (engine_version <> 'latest'),

  -- 流派設定（B13）。規範 §17 要求每個結論都填得到呢一欄。
  school_profile_id text not null check (school_profile_id <> 'latest'),

  computed_at       timestamptz not null default now(),
  payload           jsonb not null,

  unique (id, subject_id)
);

-- ── books ──────────────────────────────────────────────────
create table books (
  id                uuid primary key default gen_random_uuid(),
  reader_id         uuid not null references readers (id) on delete cascade,

  -- ⚠ 兩條都可以係 null —— 呢個就係「未題名」狀態。
  subject_id        uuid,
  chart_id          uuid,

  title             text,
  cover_seal        text,
  last_read_chapter text,
  created_at        timestamptz not null default now(),
  titled_at         timestamptz,
  -- 書架按「幾時讀」排（0004），唔按開書日期。
  last_read_at      timestamptz,
  -- 防重送（0005）：由 client 生成，重試用返同一個，撳兩次成書攞返同一本。
  client_token      uuid,
  -- 同意咗邊個版本嘅條款及私隱政策、幾時（0011）。
  terms_version     text,
  terms_accepted_at timestamptz,

  -- subject 一定要係同一個讀者嘅。MATCH SIMPLE：subject_id 係 null
  -- 就跳過（未寫生辰），唔係 null 就一定要對得返 reader_id。
  foreign key (subject_id, reader_id)
    references subjects (id, reader_id) match simple on delete cascade,

  -- 盤一定要係本書嗰個 subject 嘅盤。
  --
  -- ⚠ 呢兩條**唔可以用 MATCH FULL**。MATCH FULL 要求「全部 null 或者
  -- 全部非 null」，即係禁咗 `subject_id` 有值但 `chart_id` 係 null ——
  -- 而嗰個狀態正正係「唔知時辰」：生辰寫咗，盤排唔到，書架要顯示
  -- 一條虛線書脊（架構 §8）。所以用 MATCH SIMPLE ＋ 下面嗰條 CHECK。
  foreign key (chart_id, subject_id)
    references charts (id, subject_id) match simple on delete cascade,

  constraint books_chart_needs_subject check (chart_id is null or subject_id is not null),

  -- 題名同成盤係同一件事（E5：排盤成功先入題名動畫）。
  constraint books_titled_with_chart check ((chart_id is null) = (title is null)),
  constraint books_titled_at check ((titled_at is null) = (title is null)),
  constraint books_last_read_together check ((last_read_chapter is null) = (last_read_at is null)),
  constraint books_terms_together check ((terms_version is null) = (terms_accepted_at is null)),

  unique (id, reader_id)
);

-- ── chapters ───────────────────────────────────────────────
create table chapters (
  id              uuid primary key default gen_random_uuid(),
  book_id         uuid not null references books (id) on delete cascade,
  slug            text not null,
  ord             smallint not null,
  tier            text not null check (tier in ('free', 'deep')),
  title           text not null,
  body            text not null,

  -- 內容版本同引擎版本係**兩條線**。改文案唔使重排盤，
  -- 改引擎唔使重寫文案 —— 所以兩個欄各自住喺各自嘅表。
  content_version text not null check (content_version <> 'latest'),

  generated_at    timestamptz not null default now(),
  -- 裁開係書嘅屬性（0006）：一版裁咗就係裁咗，一生只播一次動畫。
  cut_at          timestamptz,
  -- 每一段嘅格名（0006），同 body 分開：格名唔係內容，未裁都睇得到。
  slots           text[] not null default '{}',

  unique (book_id, slug),
  unique (book_id, ord)
);

-- ── entitlements ───────────────────────────────────────────
create table entitlements (
  id                uuid primary key default gen_random_uuid(),
  reader_id         uuid not null references readers (id) on delete cascade,
  book_id           uuid not null references books (id) on delete cascade,
  product           text not null,

  -- ⚠ unique：Stripe webhook 會重送。重送兩次唔可以出兩張票 ——
  -- 由 DB 保證，唔靠 handler 自己記得去 dedupe（G3）。
  stripe_payment_id text not null unique,

  purchased_at      timestamptz not null default now(),

  unique (reader_id, book_id, product),
  foreign key (book_id, reader_id) references books (id, reader_id)
);

-- ⚠ 付款前必須認領（架構 §4「付款前（硬閘）」）。
--
-- 呢條唔擺喺 checkout 頁，擺喺 DB：一個只喺 UI 擋嘅硬閘，
-- 喺 webhook 呢條路上面根本冇經過。
create or replace function public.entitlement_needs_claimed_reader()
returns trigger language plpgsql as $$
begin
  if (select is_anonymous from readers where id = new.reader_id) then
    raise exception '未認領嘅讀者唔可以有 entitlement（架構 §4 硬閘）'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger entitlements_need_claimed_reader
  before insert or update on entitlements
  for each row execute function public.entitlement_needs_claimed_reader();

create index subjects_reader on subjects (reader_id);
create index charts_subject on charts (subject_id);
create index books_reader on books (reader_id, created_at desc);
create index chapters_book on chapters (book_id, ord);
create index entitlements_reader on entitlements (reader_id);
create index books_last_read on books (reader_id, last_read_at desc nulls last);
create unique index books_client_token on books (reader_id, client_token);

-- 觀微 · 列級權限（工單 G1 · 架構 §10）
--
-- ── 點解要喺呢一層寫 ──
--
-- 命書入面有生辰。生辰喺 UK GDPR 之下係個人資料（架構 §10）。
-- 一個「喺 query 度記得加 where reader_id = …」嘅系統，
-- 總有一日會有一條 query 唔記得 —— 而嗰次就係一次外洩。
--
-- 所以規矩寫喺表上面：**預設乜都睇唔到**，policy 逐條開返。
-- `force row level security` 連表主人都要守，唔留後門。
--
-- 三個角色（同 Supabase 一樣）：
--   anon          未登入 —— 六張表一律掂唔到
--   authenticated 已登入（**包括匿名登入**）—— 只掂到自己嗰份
--   service_role  server 上面嘅 webhook —— bypass RLS

alter table readers      enable row level security;
alter table subjects     enable row level security;
alter table charts       enable row level security;
alter table books        enable row level security;
alter table chapters     enable row level security;
alter table entitlements enable row level security;

alter table readers      force row level security;
alter table subjects     force row level security;
alter table charts       force row level security;
alter table books        force row level security;
alter table chapters     force row level security;
alter table entitlements force row level security;

grant usage on schema public to anon, authenticated;

-- ⚠ `bypassrls` 唔等於有權限。
--
-- service_role 有 BYPASSRLS，所以佢唔受 policy 限制 —— 但 policy 同
-- GRANT 係兩套嘢。冇下面呢兩行，webhook 會撞到
-- `permission denied for table entitlements`，而錯誤訊息一個字都冇提 RLS。
-- （Supabase 預設已經 grant 咗，所以呢個窿喺線上唔會出現，
-- 喺一個乾淨嘅 Postgres 度先會 —— 即係話唔喺呢度測就永遠見唔到。）
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;

-- ── readers ────────────────────────────────────────────────
create policy readers_self on readers
  for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

grant select, insert, update (email, is_anonymous) on readers to authenticated;

-- ── subjects ───────────────────────────────────────────────
create policy subjects_own on subjects
  for all to authenticated
  using (reader_id = auth.uid()) with check (reader_id = auth.uid());

grant select, insert, update, delete on subjects to authenticated;

-- ── charts ─────────────────────────────────────────────────
-- 盤跟 subject 走，subject 跟讀者走。
create policy charts_own on charts
  for all to authenticated
  using (exists (select 1 from subjects s where s.id = charts.subject_id and s.reader_id = auth.uid()))
  with check (exists (select 1 from subjects s where s.id = charts.subject_id and s.reader_id = auth.uid()));

grant select, insert, delete on charts to authenticated;

-- ── books ──────────────────────────────────────────────────
create policy books_own on books
  for all to authenticated
  using (reader_id = auth.uid()) with check (reader_id = auth.uid());

grant select, insert, update, delete on books to authenticated;

-- ── chapters ───────────────────────────────────────────────
--
-- ⚠ 未裁之頁唔係一個 CSS 效果，係一條權限規則。
--
-- 架構 §6：「未裁章喺目錄照樣列出章名，唔收埋。」
-- 即係話**行係睇得到，正文係睇唔到** —— 而 RLS 係列級，做唔到呢件事。
-- 所以正文用**欄級權限**收：`body` 唔 grant 畀 authenticated，
-- 要攞就要行 `chapter_body()`，而嗰個 function 會查票。
--
-- 一個只靠前端唔 render 嘅 paywall，唔係 paywall。
create policy chapters_own on chapters
  for all to authenticated
  using (exists (select 1 from books b where b.id = chapters.book_id and b.reader_id = auth.uid()))
  with check (exists (select 1 from books b where b.id = chapters.book_id and b.reader_id = auth.uid()));

grant select (id, book_id, slug, ord, tier, title, content_version, generated_at) on chapters to authenticated;
grant insert, delete on chapters to authenticated;

create or replace function public.chapter_body(p_chapter uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.body
    from chapters c
    join books b on b.id = c.book_id
   where c.id = p_chapter
     and b.reader_id = auth.uid()
     and (
       c.tier = 'free'
       or exists (
         select 1 from entitlements e
          where e.book_id = b.id and e.reader_id = b.reader_id
       )
     );
$$;

grant execute on function public.chapter_body(uuid) to authenticated;

-- ── entitlements ───────────────────────────────────────────
--
-- ⚠ 得 select，冇 insert。
--
-- 一張票係「畀咗錢」嘅憑據。如果用戶自己寫得入，噉佢就唔係憑據。
-- 寫票係 Stripe webhook 嘅事，而 webhook 行 service_role（bypass RLS）。
create policy entitlements_own on entitlements
  for select to authenticated
  using (reader_id = auth.uid());

grant select on entitlements to authenticated;

-- ── 一、readers 由 auth.users 自己生 ─────────────────────
--
-- 本來係 app 去 insert 一行。但咁樣佢就 insert 得出一行
-- `is_anonymous = false` —— 又係同一個窿。
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into readers (id, is_anonymous, email)
  values (new.id, coalesce(new.is_anonymous, true), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ── 二、認領狀態由 auth.users 同步 ───────────────────────
create or replace function public.sync_reader_identity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update readers
     set is_anonymous = coalesce(new.is_anonymous, true),
         email        = new.email
   where id = new.id;
  return new;
end;
$$;

create trigger auth_user_identity_changed
  after update of email, is_anonymous on auth.users
  for each row execute function public.sync_reader_identity();

-- 讀者寫唔到自己嘅認領狀態。
revoke insert on readers from authenticated;
revoke update on readers from authenticated;

-- ── 三、回訪次數 ────────────────────────────────────────
--
-- 架構 §4：「認領提示**只准出現三次**：成書後／第二次回訪／付款前。」
--
-- 頭尾兩次係**時刻**（啱啱題完名、撳緊付款），唔使記低。
-- 中間嗰次係「第二次回訪」—— 要數。
--
-- ⚠ 呢個數唔可以擺喺 localStorage：G1 定咗嗰度只准兩個 key，
-- 而且清 cookie 就會由頭數過，變成每次都嘈。
--
-- 一個「回訪」= 一日。唔用 session：同一日開兩次唔算兩次回訪，
-- 而一日一次嘅寫入平到唔使諗。

/**
 * 記一次回訪。同一日行幾多次都只會加一次。
 *
 * security definer：讀者寫唔到 `readers`（上面 revoke 咗），
 * 但佢要數得到自己嘅回訪。呢個 function 只掂自己嗰行。
 */
create or replace function public.touch_visit()
returns smallint
language plpgsql
security definer
set search_path = public
as $$
declare
  n smallint;
begin
  update readers
     set visit_days    = visit_days + 1,
         last_visit_on = current_date
   where id = auth.uid()
     and last_visit_on < current_date
  returning visit_days into n;

  if n is null then
    select visit_days into n from readers where id = auth.uid();
  end if;
  return n;
end;
$$;

grant execute on function public.touch_visit() to authenticated;

/** 撳走「成書後」嗰個提示。同樣只掂自己嗰行。 */
create or replace function public.dismiss_claim_prompt()
returns void
language sql
security definer
set search_path = public
as $$
  update readers set claim_dismissed_at = now()
   where id = auth.uid() and claim_dismissed_at is null;
$$;

grant execute on function public.dismiss_claim_prompt() to authenticated;

-- ── 成書（create_book：原子寫入 subjects / charts / books / chapters；0005 → 0006 → 0011 最終版）──
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
  -- ⚠ 冇同意條款及私隱政策就唔收生辰（0011）。介面擋一次，呢度再擋一次。
  if p_terms_version is null or length(trim(p_terms_version)) = 0 then
    raise exception '未同意條款及私隱政策，成唔到書' using errcode = '23514';
  end if;

  -- 重送：攞返上次嗰本。
  select id into v_book from books where reader_id = v_reader and client_token = p_token;
  if found then
    return v_book;
  end if;

  -- ⚠ 題名同成盤係同一件事（`books_titled_with_chart`）。
  -- 呢度早一步擋住，係為咗出一句講得明嘅錯，唔係一句 constraint 名。
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
    -- ⚠ 一本題咗名但冇正文嘅書，係一個封面。
    -- 讓佢寫得入去，就等於畀書架出一本揭開係空白嘅書。
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
  -- 兩個請求撞正同一個 token：上面嗰句 select 兩邊都摷唔到，
  -- 然後 unique index 彈一個出嚟。輸嗰個攞返贏嗰個本書。
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

-- ── 讀到邊、幾時讀 ──────────────────────────────────────────
--
-- E3 個書架按 `last_read_at` 排序，但到今日為止**冇一個地方寫過佢** ——
-- 即係話「最近讀嗰本喺最左」呢條 AC 一直都係靠 `created_at` 撐住。
--
-- 兩個欄要一齊郁（`books_last_read_together`），所以擺喺一個 function 度，
-- 而唔係散喺 adapter 入面兩句 update。
create or replace function public.touch_book(p_book uuid, p_chapter text)
returns void
language sql
set search_path = public
as $$
  update books
     set last_read_chapter = p_chapter,
         last_read_at      = now()
   where id = p_book and reader_id = auth.uid();
$$;

grant execute on function public.touch_book(uuid, text) to authenticated;

-- ── 裁開 ────────────────────────────────────────────────────
--
-- ⚠ 只可以裁一次，而且只可以裁自己有權睇嘅章。
--
-- 回 true = 今次先裁開（即係要播嗰個動畫）；
-- 回 false = 本來就裁咗，或者裁唔到（未買、唔係你本書）。
--
-- security definer：要讀 entitlements，而讀者對嗰張表只有 select
-- 自己嗰啲 —— 呢度要查嘅係「呢一章屬唔屬於一本你買咗嘅書」。
create or replace function public.cut_page(p_chapter uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  select true into v_ok
    from chapters c
    join books b on b.id = c.book_id
   where c.id = p_chapter
     and b.reader_id = auth.uid()
     and c.cut_at is null
     and (
       c.tier = 'free'
       or exists (
         select 1 from entitlements e
          where e.book_id = b.id and e.reader_id = b.reader_id
       )
     );

  if v_ok is null then
    return false;
  end if;

  update chapters set cut_at = now() where id = p_chapter and cut_at is null;

  /* ⚠ 兩個人同時撳 —— 輸嗰個唔應該都播一次動畫。 */
  return found;
end;
$$;

grant execute on function public.cut_page(uuid) to authenticated;

grant select (cut_at, slots) on chapters to authenticated;

-- ── has_entitlement ────────────────────────────────────────
--
-- ⚠ 點解要多呢個 function：**成功頁唔可以自己答自己。**
--
-- G3 驗收標準第一條：「webhook 先寫 entitlement，唔靠 return URL」。
-- 即係話 Stripe 送返嚟嗰版頁**唔准發票**，佢只可以問一句
-- 「票到咗未」，然後照實答。
--
-- 讀者本來就 select 得到自己嗰啲 entitlements，所以呢個唔係新權限，
-- 係一個講得清楚啲嘅問法 —— 而且令成功頁嗰段 code 冇得順手做多啲嘢。
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

-- ── payment_records ────────────────────────────────────────
--
-- ⚠ 呢張表刻意**冇** reader_id、冇 book_id、冇 FK。
--
-- 佢淨係答會計問嘅嗰條問題：「呢個月收咗幾多錢」。
-- 佢答唔到「邊個畀嘅」—— 而嗰個正正係佢應該答唔到嘅嘢。
--
-- 換句話講：一個人刪咗戶口之後，呢行嘢仲喺度，但佢**唔再係
-- 關於任何人嘅資料**。GDPR 之下噉樣就唔再係 personal data，
-- 亦都唔會同「真刪」呢個承諾打交。
create table payment_records (
  stripe_payment_id text primary key,
  amount            integer not null check (amount > 0),
  currency          text not null check (length(currency) = 3),
  paid_at           timestamptz not null default now(),
  -- 全數退款（0009）：張票收走，呢行留低記幾時退。
  refunded_at       timestamptz
);

alter table payment_records enable row level security;
alter table payment_records force row level security;

-- ⚠ 一條 policy 都冇 —— 即係話讀者一行都睇唔到。
-- 呢張表係畀會計睇嘅，唔係畀讀者睇。service_role 有 bypassrls。

-- ⚠ 而 bypassrls **唔等於有權限**（0002 嗰段註釋已經寫過一次）。
--
-- 0002 行過 `grant all privileges on all tables …`，但嗰句係**當時**
-- 嗰批表 —— 之後先出世嘅表一行都冇拎到。所以呢張新表要自己 grant，
-- 否則 webhook 會撞到 `permission denied for table payment_records`，
-- 而錯誤訊息一個字都冇提「你張表係新起嘅」。
--
-- （呢個窿喺寫測試嗰陣即刻爆咗出嚟 —— 即係話唔喺 PGlite 度跑真權限，
-- 佢就會留到上線，喺第一個人畀錢嗰一刻先出現。）
grant select, insert on payment_records to service_role;
grant update (refunded_at) on payment_records to service_role;

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

-- ── 匯出（Art. 15、20） ─────────────────────────────────────
--
-- ⚠ **匯出唔係一道後門。**
--
-- 「畀我全部我嘅資料」呢個要求，最順手嘅實作係 service_role 撈晒
-- 佢名下所有行 —— 而噉樣會連未買嘅深度章正文一齊交出去。
-- 即係話 paywall 有一個叫「匯出」嘅繞路。
--
-- 所以呢個 function 係 **security invoker**：佢跑喺讀者自己嘅權限
-- 之下，`body` 呢一欄佢本來就 select 唔到，要行 `chapter_body()`，
-- 而嗰個會查票。未買嘅章喺匯出檔入面係 `null` —— 誠實，而且唔漏。
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

-- ── 真刪（Art. 17） ─────────────────────────────────────────
--
-- ⚠ 「真刪」係 `delete`，唔係 `update … set deleted_at = now()`。
--
-- 架構 §10 特別寫明呢一點，因為標記刪除係最容易滑落去嗰個做法：
-- 佢一樣令個人見唔到自己啲嘢，而且「萬一佢想恢復呢」聽落好體貼。
-- 但一個標記咗刪除嘅生辰，**仲係一個我哋揸住嘅生辰**。
--
-- G1 由第一日起就將 cascade 鋪好咗，所以真刪就係刪一行：
--   readers → subjects → charts → books → chapters ＋ entitlements
--
-- 讀者本來冇 delete 權限（0002 只 grant 咗 select/insert/update），
-- 所以要喺呢度開 —— policy `readers_self` 保證佢只刪得到自己嗰行。
grant delete on readers to authenticated;

-- 回一份「刪咗啲乜」嘅數，畀個人見到佢真係冇咗嘢。
-- ⚠ 要喺刪之前數 —— 刪完就冇得數。
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

-- ── revoke_entitlement ─────────────────────────────────────
--
-- 回 true  = 今次收咗一張票
-- 回 false = 本來就冇（Stripe 重送同一個退款事件，或者嗰筆錢當初冇出票）
--
-- ⚠ 兩個都係**成功**，同 grant_entitlement 一樣：回錯 Stripe 就會一路重送。
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

-- 多一層（0012）：就算將來誤開咗權限，冇 policy 一樣讀唔到。
alter table private.pay_token enable row level security;

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

-- ⚠ 轉擁有者要新擁有者喺 public 有 CREATE 權限（Postgres 規定），而 Supabase 冇畀 service_role。
-- 2026-09-30 喺 Supabase 撞咗「permission denied for schema public」—— PGlite 測試用 superuser
-- 行，Postgres 會跳過呢個檢查，所以測試捉唔到。做法：暫時畀，轉完即刻收返；本身有就唔郁。
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
