-- 命宮展開稿：正文以外的逐句來源、標題及英日舊版快照一同鎖定。
-- 只新增欄位，不回填或重寫舊書。先部署本 migration，再部署前端。
alter table public.chapters add column if not exists reading jsonb;
alter table public.chapters add constraint chapters_reading_object
  check (reading is null or jsonb_typeof(reading) = 'object');
-- reading 含完整正文，與 body 一樣不得直接 select。
revoke select (reading) on public.chapters from public, anon, authenticated;

create or replace function public.create_book(
  p_token    uuid,
  p_subject  jsonb,
  p_chart    jsonb,   -- null = 待時辰（架構 §8）
  p_title    text,    -- 同 p_chart 一齊有或者一齊冇
  p_seal     text,
  p_chapters jsonb,   -- [{slug, ord, tier, title, body, content_version}]
  p_terms_version text  -- 同意咗邊個版本嘅條款及私隱政策（0011）
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
  -- ⚠ 冇同意條款及私隱政策就唔收生辰（0011）。介面擋一次，呢度再擋一次。
  if p_terms_version is null or length(trim(p_terms_version)) = 0 then
    raise exception '未同意條款及私隱政策，成唔到書' using errcode = '23514';
  end if;

  -- 重送：攞返上次嗰本。
  select id into v_book from books where reader_id = v_reader and client_token = p_token;
  if found then
    return v_book;
  end if;

  -- ⚠ 每個讀者每個鐘最多成 10 本書（0006）。重送（上面）唔計，照樣攞返上次嗰本。
  if (select count(*) from books where reader_id = v_reader and created_at > now() - interval '1 hour') >= 10 then
    raise exception '一個鐘內成書太多' using errcode = 'GW429';
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

  insert into books (reader_id, subject_id, chart_id, title, cover_seal, titled_at, client_token,
                     terms_version, terms_accepted_at)
  values (
    v_reader, v_subject, v_chart, p_title, p_seal,
    case when v_chart is null then null else now() end,
    p_token,
    p_terms_version, now()
  ) returning id into v_book;

  if v_chart is not null then
    -- ⚠ 一本題咗名但冇正文嘅書，係一個封面。
    -- 讓佢寫得入去，就等於畀書架出一本揭開係空白嘅書。
    if p_chapters is null or jsonb_array_length(p_chapters) = 0 then
      raise exception '題咗名就一定要有正文' using errcode = '23514';
    end if;

    insert into chapters (book_id, slug, ord, tier, title, body, content_version, slots, reading)
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
           ),
           nullif(c -> 'reading', 'null'::jsonb)
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

revoke all on function public.create_book(uuid, jsonb, jsonb, text, text, jsonb, text) from public, anon;
grant execute on function public.create_book(uuid, jsonb, jsonb, text, text, jsonb, text) to authenticated;

-- 沿用 chapter_body 的所有權及深度章購買檢查。
create or replace function public.chapter_reading(p_chapter uuid)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select c.reading from public.chapters c
   where c.id = p_chapter and public.chapter_body(c.id) is not null;
$$;
revoke all on function public.chapter_reading(uuid) from public, anon;
grant execute on function public.chapter_reading(uuid) to authenticated;


-- 目次仍只開第一段；絕不把完整 reading 快照交給未購買的讀者。
create or replace function public.chapter_leads_v2(p_book uuid)
returns table (slug text, lead text, quote text, international_lead text, citations jsonb)
language sql stable security definer set search_path = public
as $$
  select l.slug, l.lead, l.quote,
         split_part(c.reading #>> '{international,text}', E'\n\n', 1),
         case when c.reading is null then null else coalesce((
           select jsonb_agg(distinct cite)
             from jsonb_array_elements(coalesce(c.reading #> '{segments,0,statements}', '[]'::jsonb)) s,
                  jsonb_array_elements(coalesce(s -> 'citations', '[]'::jsonb)) cite
         ), '[]'::jsonb) end
    from public.chapter_leads(p_book) l
    join public.chapters c on c.book_id = p_book and c.slug = l.slug
    join public.books b on b.id = c.book_id
   where b.reader_id = (select auth.uid())
   order by c.ord;
$$;
revoke all on function public.chapter_leads_v2(uuid) from public, anon;
grant execute on function public.chapter_leads_v2(uuid) to authenticated;
