-- 觀微 · 裁開同段落結構（工單 F2 · F4 · 架構 §6）
--
-- 兩樣嘢，一條 migration，因為兩樣都係「一章多知一件事」。

-- ── 一、⚠ 裁開係書上面嘅事，唔係瀏覽器上面嘅事 ──────────────
--
-- F4 驗收標準：「裂開動畫 1600ms，**一生只播一次**」。
--
-- 記喺邊？G1 立咗一條規矩：「localStorage 只存主題同上次讀到邊段」。
-- 加第三個 key 就係破咗佢，而且清 cookie、換部機，本已經裁開咗嘅書
-- 會再裂一次 —— 即係「一生」其實係「呢個瀏覽器呢一次」。
--
-- 之前提過用 `entitlements.purchased_at` 推。**嗰個唔成立**：
-- 買咗嘅時間唔會變，所以重新載入會再播。佢答嘅係「幾時買」，
-- 唔係「裁開咗未」。
--
-- 決定（Issac，2026-09-21）：**加一欄。**
-- 裁開一版書係一個唔可逆嘅動作 —— 一版裁咗就係裁咗，
-- 唔會因為你換咗部機而癒合。呢個唔係 UI 狀態，係書嘅屬性。
alter table chapters add column cut_at timestamptz;

-- ── 二、段落結構 ────────────────────────────────────────────
--
-- F2：「右側細命盤**跟捲動**高亮對應宮位」。
--
-- 要跟捲動，就要知道而家讀緊嘅係邊一格（開場？牽動？留白？）——
-- 而 `body` 係一嚿接埋咗嘅字，結構喺寫入嗰陣冇咗。
--
-- ⚠ 所以 `slots` 同 `body` **分開兩欄**，而唔係將 body 改成 jsonb：
-- body 係收費嘅（欄級權限收住，要行 `chapter_body()`），
-- 而**格嘅名唔係內容**。一個未裁開嘅讀者睇得到呢一版有幾多格、
-- 係乜嘢格，咁先至係「毛邊本」—— 你揸得到本書，只係未裁開。
alter table chapters add column slots text[] not null default '{}';

-- ── 裁開 ────────────────────────────────────────────────────
--
-- ⚠ 只可以裁一次，而且只可以裁自己有權睇嘅章。
--
-- 回 true = 今次先裁開（即係要播嗰個動畫）；
-- 回 false = 本來就裁咗，或者裁唔到（未買、唔係你本書）。
--
-- security definer：要讀 entitlements，而讀者對嗰張表只有 select
-- 自己嗰啲 —— 呢度要查嘅係「呢一章屬唔屬於一本你買咗嘅書」。
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
     );

  if v_ok is null then
    return false;
  end if;

  update chapters set cut_at = now() where id = p_chapter and cut_at is null;

  /* ⚠ 兩個人同時撳 —— 輸嗰個唔應該都播一次動畫。 */
  return found;
end;
$$;

grant execute on function public.cut_page(uuid) to authenticated;

-- 讀者本來就 select 得到 chapters 嗰幾欄，加埋新嗰兩欄。
-- （`body` 仍然冇喺入面 —— 嗰欄要行 `chapter_body()`。）
grant select (cut_at, slots) on chapters to authenticated;

-- ── ⚠ create_book 要連 slots 一齊寫 ──────────────────────────
--
-- migration 係 append-only，`create or replace` 要成個 function 重貼一次。
-- 下面同 `0005_chengshu.sql` 嗰個**一個字都冇爭**，除咗 chapters
-- 嗰句 insert 多咗 `slots` 一欄（同埋佢喺 p_chapters 入面點攞）。
--
-- 重貼成段嘅代價係：改嘅時候兩邊都要改。所以 `test/caijuan.test.ts`
-- 有一條守住「成書之後 slots 真係入咗去」—— 漏咗重貼就會紅。

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

    insert into chapters (book_id, slug, ord, tier, title, body, content_version, slots)
    select v_book,
           c ->> 'slug',
           (c ->> 'ord')::smallint,
           c ->> 'tier',
           c ->> 'title',
           c ->> 'body',
           c ->> 'content_version',
           coalesce(
             (select array_agg(s #>> '{}' order by i)
                from jsonb_array_elements(coalesce(c -> 'slots', '[]'::jsonb)) with ordinality t(s, i)),
             '{}'
           )
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
