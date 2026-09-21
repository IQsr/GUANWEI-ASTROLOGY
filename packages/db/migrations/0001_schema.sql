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
