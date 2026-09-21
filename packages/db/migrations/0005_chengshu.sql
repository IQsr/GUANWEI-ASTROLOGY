-- 觀微 · 成書（工單 G5 · 架構 §5）
--
-- ── 點解要有呢一個 migration ──
--
-- E4 寫生辰、E5 題名、E6 展卷，六幕由頭行到尾 —— 但行完之後
-- **一個字都冇留低**。本書淨係活喺 React state 度：
-- 撳一下重新整理就冇咗，書架永遠係空，`/book/[id]` 永遠撈唔到嘢。
--
-- 架構 §5 寫住：「命書內容存返落 DB，唔好每次即時生成 ——
-- 『一本書』嘅承諾包括『佢唔會自己變』」。呢個 migration 就係嗰句。
--
-- ── 點解成書要用一個 function，唔喺 adapter 度逐張表 insert ──
--
-- 一、**原子性。** Supabase 個 JS client 冇 transaction：四次 insert
--     就係四次獨立嘅請求。第三次仆街，留低嘅係一本有封面、
--     得三章正文嘅書 —— 而**一本殘缺嘅書比冇書差**，因為佢睇落係完整嘅。
--     一個 function 就係一個 statement，即係一個 transaction。
--
-- 二、**驗得到。** `identity/shelf/juan` 三個 adapter 到今日為止一次都冇
--     真係行過（冇 instance）。寫落 SQL 之後，成書呢條路可以喺 PGlite
--     度連 RLS 一齊跑 —— 即係話「寫落 DB」呢件事唔再靠睇落啱。
--
-- ⚠ **security invoker（預設），唔係 definer。**
-- RLS 要照行：呢個 function 寫入嘅每一行都要過 `reader_id = auth.uid()`
-- 嗰幾條 policy。一個 definer function 會繞過晒佢哋 ——
-- 噉樣做出嚟嘅原子性，代價係將六條 policy 一次過廢咗。
--
-- ⚠ **一個要老實講嘅限制。**
-- 呢個 function 係讀者身分行嘅，所以理論上有人可以攞住自己張 JWT
-- 直接呼叫佢，傳一個亂噏嘅 `engine_version`。
-- 影響範圍係**佢自己嗰本書**（RLS 擋住其他人），即係話佢呃嘅係自己。
-- 但噉都代表 `engine_version` 呢一欄係「我哋寫嗰陣係啱嘅」，
-- 唔係「數學上唔可能係假」。搬去 service_role 可以堵死 ——
-- 代價係成書要行 server-side key，而嗰條路現階段仲未鋪。記低，未做。

-- ── 重送 ────────────────────────────────────────────────────
--
-- ⚠ 撳「成書」之後網絡斷一下，粒掣返生，佢再撳一次 ——
-- 第一次可能已經寫成功咗，只係個回覆冇返到嚟。冇防重就出兩本一模一樣嘅書。
--
-- 同 `entitlements.stripe_payment_id` 一樣嘅做法：由 DB 保證，
-- 唔靠 handler 自己記得去 dedupe。個 token 由 client 一開始生成，
-- 重試用返同一個，所以第二次呼叫攞返嘅係**同一本書**嘅 id。
alter table books add column client_token uuid;

create unique index books_client_token on books (reader_id, client_token);

-- ── 成書 ────────────────────────────────────────────────────
create or replace function public.create_book(
  p_token    uuid,
  p_subject  jsonb,
  p_chart    jsonb,   -- null = 待時辰（架構 §8）
  p_title    text,    -- 同 p_chart 一齊有或者一齊冇
  p_seal     text,
  p_chapters jsonb    -- [{slug, ord, tier, title, body, content_version}]
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_reader  uuid := auth.uid();
  v_subject uuid;
  v_chart   uuid;
  v_book    uuid;
begin
  if v_reader is null then
    raise exception '未登入，成唔到書' using errcode = '42501';
  end if;
  if p_token is null then
    raise exception '成書要一個 token —— 冇佢就防唔到重送' using errcode = '23514';
  end if;

  -- 重送：攞返上次嗰本。
  select id into v_book from books where reader_id = v_reader and client_token = p_token;
  if found then
    return v_book;
  end if;

  -- ⚠ 題名同成盤係同一件事（`books_titled_with_chart`）。
  -- 呢度早一步擋住，係為咗出一句講得明嘅錯，唔係一句 constraint 名。
  if (p_chart is null) <> (p_title is null) then
    raise exception '有盤先有名，有名一定有盤' using errcode = '23514';
  end if;

  insert into subjects (
    reader_id, name, birth_date, birth_time, birth_tz, birth_place,
    lng, lat, sex, true_solar_corrected
  ) values (
    v_reader,
    p_subject ->> 'name',
    (p_subject ->> 'birth_date')::date,
    (p_subject ->> 'birth_time')::time,
    p_subject ->> 'birth_tz',
    p_subject ->> 'birth_place',
    (p_subject ->> 'lng')::double precision,
    (p_subject ->> 'lat')::double precision,
    p_subject ->> 'sex',
    coalesce((p_subject ->> 'true_solar_corrected')::boolean, false)
  ) returning id into v_subject;

  if p_chart is not null then
    insert into charts (subject_id, engine_version, school_profile_id, payload)
    values (
      v_subject,
      p_chart ->> 'engine_version',
      p_chart ->> 'school_profile_id',
      p_chart -> 'payload'
    ) returning id into v_chart;
  end if;

  insert into books (reader_id, subject_id, chart_id, title, cover_seal, titled_at, client_token)
  values (
    v_reader, v_subject, v_chart, p_title, p_seal,
    case when v_chart is null then null else now() end,
    p_token
  ) returning id into v_book;

  if v_chart is not null then
    -- ⚠ 一本題咗名但冇正文嘅書，係一個封面。
    -- 讓佢寫得入去，就等於畀書架出一本揭開係空白嘅書。
    if p_chapters is null or jsonb_array_length(p_chapters) = 0 then
      raise exception '題咗名就一定要有正文' using errcode = '23514';
    end if;

    insert into chapters (book_id, slug, ord, tier, title, body, content_version)
    select v_book,
           c ->> 'slug',
           (c ->> 'ord')::smallint,
           c ->> 'tier',
           c ->> 'title',
           c ->> 'body',
           c ->> 'content_version'
      from jsonb_array_elements(p_chapters) c;
  end if;

  return v_book;

exception
  -- 兩個請求撞正同一個 token：上面嗰句 select 兩邊都摷唔到，
  -- 然後 unique index 彈一個出嚟。輸嗰個攞返贏嗰個本書。
  when unique_violation then
    select id into v_book from books where reader_id = v_reader and client_token = p_token;
    if v_book is null then
      raise;
    end if;
    return v_book;
end;
$$;

grant execute on function public.create_book(uuid, jsonb, jsonb, text, text, jsonb) to authenticated;

-- ── 讀到邊、幾時讀 ──────────────────────────────────────────
--
-- E3 個書架按 `last_read_at` 排序，但到今日為止**冇一個地方寫過佢** ——
-- 即係話「最近讀嗰本喺最左」呢條 AC 一直都係靠 `created_at` 撐住。
--
-- 兩個欄要一齊郁（`books_last_read_together`），所以擺喺一個 function 度，
-- 而唔係散喺 adapter 入面兩句 update。
create or replace function public.touch_book(p_book uuid, p_chapter text)
returns void
language sql
set search_path = public
as $$
  update books
     set last_read_chapter = p_chapter,
         last_read_at      = now()
   where id = p_book and reader_id = auth.uid();
$$;

grant execute on function public.touch_book(uuid, text) to authenticated;
