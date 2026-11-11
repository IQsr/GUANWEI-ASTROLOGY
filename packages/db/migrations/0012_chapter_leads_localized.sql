-- 0012 · 未裁章結論段讀英日新版（2026-11-11）
--
-- 0010 `chapter_leads_v2` 嘅 international_lead 係舊章快照（reading.international）第一段。
-- 綜合判讀層章（財帛、這一年）同一生十二步，起書時另存英日新版（reading.localized.en / .ja），
-- 讀者裁開之後讀嘅係新版；未裁頁同目次問目要用同一份，唔係舊章。
-- 只收讀者頁真係讀 localized 嘅 writer（ming-international.ts internationalMing）；其餘照舊用 international_lead。
-- 呢度淨係加兩欄：localized 第一段（英、日），同 v2 一樣只開第一段，絕不交完整 reading。
-- ⚠ 可以重複跑。

create or replace function public.chapter_leads_v3(p_book uuid)
returns table (slug text, lead text, quote text, international_lead text, citations jsonb, en_lead text, ja_lead text)
language sql stable security definer set search_path = public
as $$
  select v.slug, v.lead, v.quote, v.international_lead, v.citations,
         case when c.reading ->> 'writer' in ('synthesis-v1', 'life-steps-reader-v2', 'sentence-backed-v1') then nullif(c.reading #>> '{localized,en,0,text}', '') end,
         case when c.reading ->> 'writer' in ('synthesis-v1', 'life-steps-reader-v2', 'sentence-backed-v1') then nullif(c.reading #>> '{localized,ja,0,text}', '') end
    from public.chapter_leads_v2(p_book) v
    join public.chapters c on c.book_id = p_book and c.slug = v.slug
   order by c.ord;
$$;
revoke all on function public.chapter_leads_v3(uuid) from public, anon;
grant execute on function public.chapter_leads_v3(uuid) to authenticated;
