-- 0009 · 目次引文：認埋「寫」以外嘅引法（2026-10-18 · docs/leads-audit-2026-10-17.md A4）
--
-- 0008 只認「《…》寫「…」」。正文另有「《全書》另有一句「…」」「記「…」」「鈴星歌記「…」」
-- 「形容其人「…」」「卷二說七殺「…」」等寫法，60 本樣本書有 38 章有引文但目次抽唔到。
--
-- 改為：書名號同引號之間，可以有最多十二個字嘅引出語，但唔准有標點（。，；：！？、）——
-- 咁樣唔會由一句跨到下一句，亦唔會抽到「《全書》：「…」」呢類唔係引文嘅結構。
-- apps/web/src/lib/wenmu.ts `QUOTE_RE` 同呢度一樣，兩邊要一齊改。
--
-- 其餘同 0008 一樣：只開第一段同一句引文；只回自己本書；淨係畀 authenticated。
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
         substring(c.body from '《[^》]+》[^「」。，；：！？、\n]{0,12}「[^」]+」') as quote
    from chapters c
    join books b on b.id = c.book_id
   where c.book_id = p_book
     and b.reader_id = (select auth.uid())
   order by c.ord;
$$;

revoke all on function public.chapter_leads(uuid) from public, anon;
grant execute on function public.chapter_leads(uuid) to authenticated;
