-- 0005 · 溯時紀錄只收「自己本書」嘅（2026-10-08 security 檢查 🟠2）
--
-- ── 出咗咩事 ──
--
-- 0003 嘅 `rectify_record()` grant 咗畀 anon：網頁條 anon key 係公開嘅，
-- 任何人直接 call REST 就寫得入，而且「真時辰」係 call 嗰個人自己講 —— 研究數據可以亂塞。
--
-- ── 改做 ──
--
--   一、要登入（匿名 session 都得），而且要畀一本**自己嘅、有盤**嘅書。
--   二、真時辰由 DB 自己讀嗰本書個盤（charts.payload → lunar.shichen），唔信 call 嗰個人。
--   三、每本書只記第一次（`books.rectify_recorded_at`）。第一次最冇偏差；之後再玩照計，唔再寫。
--
-- ⚠ 紀錄照舊唔連人：`rectify_trials` 冇 book id、冇 reader id（docs/privacy.md）。
--   「記過未」記喺本書度，跟本書一齊刪。
-- ⚠ /tokens/dingshi（冇書）由今日起唔再寫紀錄；/tokens 喺正式站亦都收埋咗。
-- ⚠ 可以重複跑。

alter table public.books add column if not exists rectify_recorded_at timestamptz;

drop function if exists public.rectify_record(smallint, smallint[], smallint, smallint, real, jsonb, jsonb, jsonb);

create or replace function public.rectify_record(
  p_book       uuid,
  p_band       smallint,
  p_candidates smallint[],
  p_picked     smallint,
  p_confidence real,
  p_answers    jsonb,
  p_posterior  jsonb,
  p_meta       jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_reader uuid := auth.uid();
  v_true   smallint;
  new_id   uuid;
begin
  if v_reader is null then
    raise exception '未登入' using errcode = '42501';
  end if;
  if not (p_picked = any (p_candidates)) then
    raise exception '揀中嘅時辰唔喺候選入面';
  end if;

  -- 鎖住本書：同一本書兩個 request 同時到，只有一個寫得入
  select (c.payload -> 'lunar' ->> 'shichen')::smallint
    into v_true
    from books b
    join charts c on c.id = b.chart_id
   where b.id = p_book
     and b.reader_id = v_reader
     and b.rectify_recorded_at is null
   for update of b;

  if not found then
    return null;  -- 唔係你本書、未有盤、或者已經記過：唔寫，唔講原因
  end if;

  insert into rectify_trials (band, candidates, true_shichen, picked, confidence, answers, posterior, meta)
  values (p_band, p_candidates, v_true, p_picked, p_confidence, p_answers, p_posterior, coalesce(p_meta, '{}'::jsonb))
  returning id into new_id;

  update books set rectify_recorded_at = now() where id = p_book;
  return new_id;
end;
$$;

revoke all on function public.rectify_record(uuid, smallint, smallint[], smallint, real, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.rectify_record(uuid, smallint, smallint[], smallint, real, jsonb, jsonb, jsonb) to authenticated;
