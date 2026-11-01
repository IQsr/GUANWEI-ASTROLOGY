-- 0011 · keepalive（2026-11-01）
--
-- Supabase 免費版 7 日冇活動會暫停 project。`/api/keepalive`（Vercel Cron，每日一次）
-- 用 anon key call 呢個 function，令資料庫每日至少行一條 query。
--
-- 原本直接讀 books，但 0004 收咗 anon 嘅表權限，回 401。
-- 呢個 function 唔掂任何表，淨係回 true，invoker，只畀 anon 行。
-- ⚠ 可以重複跑。

create or replace function public.keepalive()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select true $$;

revoke all on function public.keepalive() from public, anon, authenticated;
grant execute on function public.keepalive() to anon;
