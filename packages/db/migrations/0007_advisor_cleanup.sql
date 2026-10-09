-- 0007 · Supabase Advisors 嘅警告（2026-10-09，經 Supabase connector 讀到）
--
-- ── Security ──
--
-- 「anon 可以行 SECURITY DEFINER function」：chapter_body、cut_page、dismiss_claim_prompt、touch_visit
--   入面全部用 auth.uid() 篩，anon（冇登入）行咗都係乜都冇 —— 但唔應該靠呢層。收返 anon，淨係畀 authenticated。
--   pay_grant／pay_revoke 照留畀 anon：webhook 冇 session，佢哋靠 token（0010 嘅設計）。
-- 「handle_new_auth_user／sync_reader_identity 可以經 /rest/v1/rpc 行」：佢哋係 trigger function，
--   直接 call 會彈（trigger functions can only be called as triggers），不過權限都收埋佢。
--   ⚠ trigger 觸發嗰陣唔查 EXECUTE 權限，收咗都照樣喺 auth.users insert／update 嗰陣行。
-- 「entitlement_needs_claimed_reader 冇固定 search_path」：補返。
-- 幾個 invoker function（touch_book、has_entitlement、export_reader、delete_reader）都收返 anon，整齊啲。
--
-- 唔改嘅（係特登）：
--   「RLS 開咗但冇 policy」：pay_token、payment_records、rectify_trials 本來就唔畀任何人直接讀寫。
--   「anonymous access policies」：匿名登入係設計（唔使註冊就起盤），policy 照 auth.uid() 篩。
--   「leaked password protection」：我哋唔用密碼登入。
--
-- ── Performance ──
--
-- RLS policy 入面嘅 auth.uid() 改做 (select auth.uid())：一條 query 計一次，唔係每行計一次。
-- 補四條外鍵嘅索引。
--
-- ⚠ 可以重複跑。

-- 只畀登入咗嘅人（包括匿名 session）
revoke all on function public.chapter_body(uuid) from public, anon;
revoke all on function public.cut_page(uuid) from public, anon;
revoke all on function public.dismiss_claim_prompt() from public, anon;
revoke all on function public.touch_visit() from public, anon;
revoke all on function public.touch_book(uuid, text) from public, anon;
revoke all on function public.has_entitlement(uuid) from public, anon;
revoke all on function public.export_reader() from public, anon;
revoke all on function public.delete_reader() from public, anon;
grant execute on function public.chapter_body(uuid) to authenticated;
grant execute on function public.cut_page(uuid) to authenticated;
grant execute on function public.dismiss_claim_prompt() to authenticated;
grant execute on function public.touch_visit() to authenticated;
grant execute on function public.touch_book(uuid, text) to authenticated;
grant execute on function public.has_entitlement(uuid) to authenticated;
grant execute on function public.export_reader() to authenticated;
grant execute on function public.delete_reader() to authenticated;

-- trigger function：冇人可以直接 call
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.sync_reader_identity() from public, anon, authenticated;
revoke all on function public.entitlement_needs_claimed_reader() from public, anon, authenticated;

alter function public.entitlement_needs_claimed_reader() set search_path = public;

-- RLS：(select auth.uid())
alter policy readers_self on public.readers
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy subjects_own on public.subjects
  using (reader_id = (select auth.uid())) with check (reader_id = (select auth.uid()));
alter policy charts_own on public.charts
  using (exists (select 1 from public.subjects s where s.id = charts.subject_id and s.reader_id = (select auth.uid())))
  with check (exists (select 1 from public.subjects s where s.id = charts.subject_id and s.reader_id = (select auth.uid())));
alter policy books_own on public.books
  using (reader_id = (select auth.uid())) with check (reader_id = (select auth.uid()));
alter policy chapters_own on public.chapters
  using (exists (select 1 from public.books b where b.id = chapters.book_id and b.reader_id = (select auth.uid())))
  with check (exists (select 1 from public.books b where b.id = chapters.book_id and b.reader_id = (select auth.uid())));
alter policy entitlements_own on public.entitlements
  using (reader_id = (select auth.uid()));

-- 外鍵索引
create index if not exists books_chart_subject on public.books (chart_id, subject_id);
create index if not exists books_subject_reader on public.books (subject_id, reader_id);
create index if not exists entitlements_book_reader on public.entitlements (book_id, reader_id);
