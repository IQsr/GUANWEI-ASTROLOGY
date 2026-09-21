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
