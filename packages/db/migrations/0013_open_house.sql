-- 0013 · 限時全開（2026-11-13）
--
-- 付款（Stripe）未開，但想搵真人睇晒全本、問佢哋有冇料。
-- 逐本手動加票行唔通：`entitlements_need_claimed_reader` 擋住未認領嘅讀者，
-- 測試者要先填 email、撳確認信，門檻太高。
--
-- 做法：一張得一行嘅表記住「全開到幾時」。喺嗰個時間之前，
-- 每個讀者自己本書嘅深度章都照開 —— 匿名讀者都係。
--
-- ⚠ 唔寫票。`entitlements` 仍然係「畀咗錢」嘅憑據，一行都冇多；
--    `has_entitlement()` 冇改，`/pay` 嗰邊照樣答「未畀錢」。
-- ⚠ 時間一過自動鎖返，唔使再跑 migration、唔使 deploy。
--    期間裁開過嘅章 `cut_at` 會留低，但正文照樣要過 `chapter_body()`，所以攞唔到。
-- ⚠ 呢個檔本身唔開任何嘢：`until` 起初係 null（= 關）。
--    開：update public.open_house set until = '2026-11-23 00:00+08';
--    關：update public.open_house set until = null;
-- ⚠ 可以重複跑。

create table if not exists public.open_house (
  id    boolean primary key default true check (id),
  until timestamptz
);

insert into public.open_house (id) values (true) on conflict do nothing;

-- 冇 policy、冇 grant：讀者同 anon 一行都掂唔到。改日期係我哋自己（postgres）嘅事。
alter table public.open_house enable row level security;
revoke all on table public.open_house from public, anon, authenticated, service_role;

create or replace function public.open_house()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select o.until > now() from open_house o where o.id), false);
$$;

revoke all on function public.open_house() from public, anon;
grant execute on function public.open_house() to authenticated;

-- 目次問嘅嗰句：「呢本書而家睇唔睇得晒」。有票，或者限時全開而本書係你嘅。
create or replace function public.book_open(p_book uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.has_entitlement(p_book)
      or (
        public.open_house()
        and exists (select 1 from books b where b.id = p_book and b.reader_id = auth.uid())
      );
$$;

revoke all on function public.book_open(uuid) from public, anon;
grant execute on function public.book_open(uuid) to authenticated;

-- 以下兩個同 baseline 一樣，淨係多咗一句 `or public.open_house()`。
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
       or public.open_house()
     );
$$;

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
       or public.open_house()
     );

  if v_ok is null then
    return false;
  end if;

  update chapters set cut_at = now() where id = p_chapter and cut_at is null;

  /* ⚠ 兩個人同時撳 —— 輸嗰個唔應該都播一次動畫。 */
  return found;
end;
$$;
