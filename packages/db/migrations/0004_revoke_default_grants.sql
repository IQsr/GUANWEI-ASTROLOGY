-- 0004 · 收返 Supabase 預設畀 anon／authenticated 嘅表權限（2026-10-08 security 檢查）
--
-- ── 出咗咩事 ──
--
-- Supabase 嘅 public schema 有預設權限：postgres 開嘅表，自動 grant all 畀 anon、authenticated。
-- baseline 只係「加」權限，從來冇「收」—— 所以線上（`information_schema.role_table_grants` 證實）：
--
--   chapters  authenticated 有成張表嘅 SELECT、UPDATE
--     → 用網頁本身條 anon key 直接 call REST，`chapters?select=body` 讀得到未買嘅深度章；
--       或者將自己啲章 `tier` 改做 'free'、搬去一本買咗嘅書，再經 chapter_body() 攞。
--   books、charts、subjects  authenticated 有 UPDATE（已發出嘅書唔應該改得）
--   全部表  anon 有齊權限（RLS 冇 anon 嘅 policy，所以讀唔到行，但唔應該靠呢一層）
--
-- 測試用 PGlite 冇呢個預設，所以「body 唔 grant」喺測試度一直守得住。
-- `packages/db/src/testing.ts` 依家照抄 Supabase 嘅預設，呢個窿測得到。
--
-- ── 做法 ──
--
-- 一、七張表對 anon、authenticated 全部收晒。
-- 二、逐張加返 app 真係要用嘅（同 baseline 原意一樣，只係今次係「淨係呢啲」）。
--     app 直接讀表；寫嘢全部經 function：
--       create_book（invoker）    insert subjects、charts、books、chapters
--       touch_book（invoker）     update books.last_read_chapter、last_read_at
--       delete_reader（invoker）  delete readers（cascade 落去）
--     其餘寫入（cut_page、touch_visit、dismiss_claim_prompt、pay_*）係 security definer，唔使表權限。
-- 三、改預設：以後 postgres 喺 public 開嘅表、sequence、function 唔再自動畀 anon／authenticated。
--     新表新 function 要自己 grant —— 漏咗會係「permission denied」，唔會係外洩。
--
-- ⚠ 可以重複跑。

revoke all on table
  public.readers, public.subjects, public.charts, public.books,
  public.chapters, public.entitlements, public.payment_records
from anon, authenticated;

-- readers：自己嗰行讀得到、刪得到（delete_reader）。寫由 trigger 同 definer function 做。
grant select, delete on public.readers to authenticated;

-- subjects、charts：成書嗰陣寫一次；之後只讀、刪（delete_reader 會 cascade）。
grant select, insert, delete on public.subjects to authenticated;
grant select, insert, delete on public.charts   to authenticated;

-- books：成書寫一次；讀者只改得「讀到邊」。
grant select, insert, delete on public.books to authenticated;
grant update (last_read_chapter, last_read_at) on public.books to authenticated;

-- chapters：⚠ 冇 body、冇 update。正文只可以經 chapter_body() 攞（佢會查票）。
grant select (id, book_id, slug, ord, tier, title, content_version, generated_at, cut_at, slots)
  on public.chapters to authenticated;
grant insert, delete on public.chapters to authenticated;

-- entitlements：只讀。寫票係 pay_grant 嘅事。
grant select on public.entitlements to authenticated;

-- payment_records：讀者一行都唔使見（會計用）。service_role 嘅權限 baseline 已經畀咗，唔郁。

-- 以後開嘅嘢唔再自動畀 anon／authenticated。
alter default privileges for role postgres in schema public revoke all on tables    from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
