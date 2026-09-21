-- 觀微 · 全部 migration，順住接埋一齊（生成檔，唔好手改）
--
-- 用法：Supabase → SQL Editor → 新 query → 貼晒落去 → Run。
--
-- ⚠ 一張新 project 跑一次就夠。呢個檔冇 IF NOT EXISTS，
--    跑第二次會撞 "already exists" —— 噉樣係啱嘅：
--    一個靜靜雞跑得第二次嘅 migration，就係一個你永遠唔知
--    到底跑到邊一步嘅 migration。
--
-- ⚠ 跑完之後喺 Supabase 個 Table Editor 度可能乜都見唔到。
--    唔係壞咗：六張表全部 `force row level security`，
--    連 owner 都要守 policy。冇 auth.uid() 就冇行 —— 呢個正正係
--    我哋要嘅嘢（架構 §10）。
--
-- 生成方法：packages/db/migrations/*.sql 順住檔名接埋。




-- ══════════════════════════════════════════════════════════
-- 0001_schema.sql
-- ══════════════════════════════════════════════════════════
-- 觀微 · 資料模型（工單 G1 · 資訊架構 §5）
--
-- ── 三條貫穿成個 schema 嘅決定 ──
--
-- 一、**reader.id 就係 auth.uid()，唔係我哋自己生成。**
--     所以「認領」（G2）唔使搬任何資料 —— `linkIdentity` 加一個 email
--     落同一個 auth user 度，id 一個字都冇變。架構 §5 寫住
--     「唔好自己捲 cookie 之後搬資料」，呢條 FK 就係嗰句嘅落實。
--
-- 二、**書屬於讀者，唔經 subject 推。**
--     架構 §5 原本嘅表寫 `books: id · subject_id · chart_id` ——
--     即係「本書屬於邊個」要經 subject 推出嚟。但六幕流程（v0.2）係
--     **書先出嚟，再寫生辰**：架上抽一本空白書落嚟嗰陣根本冇 subject。
--     一本冇 subject 嘅書如果冇 `reader_id`，就係一本**冇主人嘅書** ——
--     RLS 寫唔到，書架亦都撈唔返。所以 `books` 自己攞住 `reader_id`。
--
-- 三、**版本欄一律唔准 'latest'。**
--     規範 §17 明文禁止。呢個唔靠寫程式嗰個人記得 —— 寫落 CHECK。
--
-- 要 `auth.users` 同 `auth.uid()` 先行得到。Supabase 本身有；
-- 測試環境由 `src/testing.ts` 起一個一模一樣嘅 shim。

-- ⚠ 冇 `create extension pgcrypto`。
-- `gen_random_uuid()` 由 PostgreSQL 13 起就係核心函數，唔再需要 pgcrypto。
-- 呢句係一個抄開嘅反射動作 —— 寫咗落去，喺一個冇裝 contrib 嘅
-- Postgres 上面就會由第一行開始死。

-- ── readers ────────────────────────────────────────────────
create table readers (
  id           uuid primary key references auth.users (id) on delete cascade,
  is_anonymous boolean     not null default true,
  email        text,
  created_at   timestamptz not null default now(),

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


-- ══════════════════════════════════════════════════════════
-- 0002_rls.sql
-- ══════════════════════════════════════════════════════════
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


-- ══════════════════════════════════════════════════════════
-- 0003_claim.sql
-- ══════════════════════════════════════════════════════════
-- 觀微 · 認領（工單 G2 · 架構 §4）
--
-- ── 認領係乜 ──
--
-- 匿名讀者 → 加一個 email 落同一個 auth user 度（`linkIdentity`）。
-- `auth.uid()` 一個字都冇變，所以佢啲書同票根本冇搬過 ——
-- 「認領後所有書同已購章節自動跟住走」呢條 AC，喺 G1 揀
-- `readers.id = auth.users.id` 嗰陣就已經贏咗。呢個檔做嘅係**守住佢**。
--
-- ── G1 留低咗一個窿 ──
--
-- G1 grant 咗 `update (email, is_anonymous) on readers to authenticated`，
-- 即係話一個匿名讀者可以自己一句 SQL 話自己認咗領。
--
-- 而「認咗領」唔係一個形容詞，係**付款硬閘嘅條件**（架構 §4）。
-- 一個自己講自己認咗領嘅欄位，同 entitlements 一樣 —— 唔係憑據。
--
-- 所以呢兩個欄由 `auth.users` 同步落嚟，讀者自己寫唔到。
-- 真正嘅認領喺 Supabase Auth 嗰邊發生（`linkIdentity` 要收驗證信），
-- 我哋呢邊淨係跟。

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
alter table readers
  add column visit_days   smallint    not null default 1,
  add column last_visit_on date       not null default current_date,
  -- 成書後嗰次係「可撳走」嘅。撳走咗就唔好再喺嗰個位嘈。
  add column claim_dismissed_at timestamptz;

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


-- ══════════════════════════════════════════════════════════
-- 0004_shelf.sql
-- ══════════════════════════════════════════════════════════
-- 觀微 · 書架（工單 E3 · 視覺 §8 · 架構 §4）
--
-- ⚠ E3 第二條驗收標準：「**最近讀嗰本喺最左**；在讀嗰本轉朱砂。」
--
-- 但 G1 排唔到呢個序：`books` 有 `last_read_chapter`（讀到邊一章），
-- **冇一個「幾時讀」**。知道讀到邊度，唔等於知道幾時讀。
--
-- 用 `created_at` 代替唔得：書架係回訪落點（架構 §4），
-- 而回訪嗰個人想見到嘅係「我上次喺度」，唔係「我幾時開咗呢本」。
-- 一個按開書日期排嘅書架，讀得越耐排得越後 —— 啱啱掉轉。
alter table books add column last_read_at timestamptz;

-- 讀到邊、幾時讀，兩樣要一齊郁 —— 一個有章冇時間嘅 row 排唔到序。
alter table books
  add constraint books_last_read_together
  check ((last_read_chapter is null) = (last_read_at is null));

create index books_last_read on books (reader_id, last_read_at desc nulls last);


-- ══════════════════════════════════════════════════════════
-- 0005_chengshu.sql
-- ══════════════════════════════════════════════════════════
-- 觀微 · 成書（工單 G5 · 架構 §5）
--
-- ── 點解要有呢一個 migration ──
--
-- E4 寫生辰、E5 題名、E6 展卷，六幕由頭行到尾 —— 但行完之後
-- **一個字都冇留低**。本書淨係活喺 React state 度：
-- 撳一下重新整理就冇咗，書架永遠係空，`/book/[id]` 永遠撈唔到嘢。
--
-- 架構 §5 寫住：「命書內容存返落 DB，唔好每次即時生成 ——
-- 『一本書』嘅承諾包括『佢唔會自己變』」。呢個 migration 就係嗰句。
--
-- ── 點解成書要用一個 function，唔喺 adapter 度逐張表 insert ──
--
-- 一、**原子性。** Supabase 個 JS client 冇 transaction：四次 insert
--     就係四次獨立嘅請求。第三次仆街，留低嘅係一本有封面、
--     得三章正文嘅書 —— 而**一本殘缺嘅書比冇書差**，因為佢睇落係完整嘅。
--     一個 function 就係一個 statement，即係一個 transaction。
--
-- 二、**驗得到。** `identity/shelf/juan` 三個 adapter 到今日為止一次都冇
--     真係行過（冇 instance）。寫落 SQL 之後，成書呢條路可以喺 PGlite
--     度連 RLS 一齊跑 —— 即係話「寫落 DB」呢件事唔再靠睇落啱。
--
-- ⚠ **security invoker（預設），唔係 definer。**
-- RLS 要照行：呢個 function 寫入嘅每一行都要過 `reader_id = auth.uid()`
-- 嗰幾條 policy。一個 definer function 會繞過晒佢哋 ——
-- 噉樣做出嚟嘅原子性，代價係將六條 policy 一次過廢咗。
--
-- ⚠ **一個要老實講嘅限制。**
-- 呢個 function 係讀者身分行嘅，所以理論上有人可以攞住自己張 JWT
-- 直接呼叫佢，傳一個亂噏嘅 `engine_version`。
-- 影響範圍係**佢自己嗰本書**（RLS 擋住其他人），即係話佢呃嘅係自己。
-- 但噉都代表 `engine_version` 呢一欄係「我哋寫嗰陣係啱嘅」，
-- 唔係「數學上唔可能係假」。搬去 service_role 可以堵死 ——
-- 代價係成書要行 server-side key，而嗰條路現階段仲未鋪。記低，未做。

-- ── 重送 ────────────────────────────────────────────────────
--
-- ⚠ 撳「成書」之後網絡斷一下，粒掣返生，佢再撳一次 ——
-- 第一次可能已經寫成功咗，只係個回覆冇返到嚟。冇防重就出兩本一模一樣嘅書。
--
-- 同 `entitlements.stripe_payment_id` 一樣嘅做法：由 DB 保證，
-- 唔靠 handler 自己記得去 dedupe。個 token 由 client 一開始生成，
-- 重試用返同一個，所以第二次呼叫攞返嘅係**同一本書**嘅 id。
alter table books add column client_token uuid;

create unique index books_client_token on books (reader_id, client_token);

-- ── 成書 ────────────────────────────────────────────────────
create or replace function public.create_book(
  p_token    uuid,
  p_subject  jsonb,
  p_chart    jsonb,   -- null = 待時辰（架構 §8）
  p_title    text,    -- 同 p_chart 一齊有或者一齊冇
  p_seal     text,
  p_chapters jsonb    -- [{slug, ord, tier, title, body, content_version}]
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

  insert into books (reader_id, subject_id, chart_id, title, cover_seal, titled_at, client_token)
  values (
    v_reader, v_subject, v_chart, p_title, p_seal,
    case when v_chart is null then null else now() end,
    p_token
  ) returning id into v_book;

  if v_chart is not null then
    -- ⚠ 一本題咗名但冇正文嘅書，係一個封面。
    -- 讓佢寫得入去，就等於畀書架出一本揭開係空白嘅書。
    if p_chapters is null or jsonb_array_length(p_chapters) = 0 then
      raise exception '題咗名就一定要有正文' using errcode = '23514';
    end if;

    insert into chapters (book_id, slug, ord, tier, title, body, content_version)
    select v_book,
           c ->> 'slug',
           (c ->> 'ord')::smallint,
           c ->> 'tier',
           c ->> 'title',
           c ->> 'body',
           c ->> 'content_version'
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

grant execute on function public.create_book(uuid, jsonb, jsonb, text, text, jsonb) to authenticated;

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


-- ══════════════════════════════════════════════════════════
-- 0006_caijuan.sql
-- ══════════════════════════════════════════════════════════
-- 觀微 · 裁開同段落結構（工單 F2 · F4 · 架構 §6）
--
-- 兩樣嘢，一條 migration，因為兩樣都係「一章多知一件事」。

-- ── 一、⚠ 裁開係書上面嘅事，唔係瀏覽器上面嘅事 ──────────────
--
-- F4 驗收標準：「裂開動畫 1600ms，**一生只播一次**」。
--
-- 記喺邊？G1 立咗一條規矩：「localStorage 只存主題同上次讀到邊段」。
-- 加第三個 key 就係破咗佢，而且清 cookie、換部機，本已經裁開咗嘅書
-- 會再裂一次 —— 即係「一生」其實係「呢個瀏覽器呢一次」。
--
-- 之前提過用 `entitlements.purchased_at` 推。**嗰個唔成立**：
-- 買咗嘅時間唔會變，所以重新載入會再播。佢答嘅係「幾時買」，
-- 唔係「裁開咗未」。
--
-- 決定（Issac，2026-09-21）：**加一欄。**
-- 裁開一版書係一個唔可逆嘅動作 —— 一版裁咗就係裁咗，
-- 唔會因為你換咗部機而癒合。呢個唔係 UI 狀態，係書嘅屬性。
alter table chapters add column cut_at timestamptz;

-- ── 二、段落結構 ────────────────────────────────────────────
--
-- F2：「右側細命盤**跟捲動**高亮對應宮位」。
--
-- 要跟捲動，就要知道而家讀緊嘅係邊一格（開場？牽動？留白？）——
-- 而 `body` 係一嚿接埋咗嘅字，結構喺寫入嗰陣冇咗。
--
-- ⚠ 所以 `slots` 同 `body` **分開兩欄**，而唔係將 body 改成 jsonb：
-- body 係收費嘅（欄級權限收住，要行 `chapter_body()`），
-- 而**格嘅名唔係內容**。一個未裁開嘅讀者睇得到呢一版有幾多格、
-- 係乜嘢格，咁先至係「毛邊本」—— 你揸得到本書，只係未裁開。
alter table chapters add column slots text[] not null default '{}';

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

-- 讀者本來就 select 得到 chapters 嗰幾欄，加埋新嗰兩欄。
-- （`body` 仍然冇喺入面 —— 嗰欄要行 `chapter_body()`。）
grant select (cut_at, slots) on chapters to authenticated;

-- ── ⚠ create_book 要連 slots 一齊寫 ──────────────────────────
--
-- migration 係 append-only，`create or replace` 要成個 function 重貼一次。
-- 下面同 `0005_chengshu.sql` 嗰個**一個字都冇爭**，除咗 chapters
-- 嗰句 insert 多咗 `slots` 一欄（同埋佢喺 p_chapters 入面點攞）。
--
-- 重貼成段嘅代價係：改嘅時候兩邊都要改。所以 `test/caijuan.test.ts`
-- 有一條守住「成書之後 slots 真係入咗去」—— 漏咗重貼就會紅。

create or replace function public.create_book(
  p_token    uuid,
  p_subject  jsonb,
  p_chart    jsonb,   -- null = 待時辰（架構 §8）
  p_title    text,    -- 同 p_chart 一齊有或者一齊冇
  p_seal     text,
  p_chapters jsonb    -- [{slug, ord, tier, title, body, content_version}]
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

  insert into books (reader_id, subject_id, chart_id, title, cover_seal, titled_at, client_token)
  values (
    v_reader, v_subject, v_chart, p_title, p_seal,
    case when v_chart is null then null else now() end,
    p_token
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

grant execute on function public.create_book(uuid, jsonb, jsonb, text, text, jsonb) to authenticated;
