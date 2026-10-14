-- 0008 · 目次「你想知甚麼」：每章第一段 ＋ 第一句引文（2026-10-14）
--
-- 競品拆解之後（docs/compare-three-way-1990-05-15.md §6）Issac 拍板：
-- 目次頂加一節問目（事業、財運、感情、健康、今年……），每題直接出該章第一段做答案，
-- 未買嘅深度章都出 —— 先答讀者想知嘅嘢，再請佢入章慢慢讀。
--
-- ⚠ `chapter_body()` 唔郁：佢照舊係「全章正文要有票」。呢個 function 係另一道門，
--   **只開第一段同一句《…》引文**，唔開其餘段落。
--   第一段嘅界線同 app 一樣：`body` 用空行（\n\n）分段（apps/web/src/lib/suidu.ts `paragraphs()`）。
-- ⚠ 一次回成本書（目次一頁要六題，唔好行六次）。只回自己本書：`b.reader_id = auth.uid()`。
-- ⚠ public schema 會自動 grant 晒（0004）：收返 public／anon，淨係畀 authenticated（同 0007 一樣）。
--
-- 可以重複跑。

create or replace function public.chapter_leads(p_book uuid)
returns table (slug text, lead text, quote text)
language sql
stable
security definer
set search_path = public
as $$
  select c.slug,
         split_part(c.body, E'\n\n', 1) as lead,
         substring(c.body from '《[^》]+》寫「[^」]+」') as quote
    from chapters c
    join books b on b.id = c.book_id
   where c.book_id = p_book
     and b.reader_id = (select auth.uid())
   order by c.ord;
$$;

revoke all on function public.chapter_leads(uuid) from public, anon;
grant execute on function public.chapter_leads(uuid) to authenticated;
