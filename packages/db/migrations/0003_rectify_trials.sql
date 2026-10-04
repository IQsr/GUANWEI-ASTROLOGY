-- 0003 · 定時辰驗證紀錄（2026-10-05）
--
-- 驗證頁（/tokens/dingshi）：知道自己準確時辰嘅試用者答十幾條「某年某方面有冇事」，
-- 最後先填真時辰，量系統揀唔揀得返啱。呢張表收嗰次嘅結果，用嚟校準同決定收唔收錢。
--
-- ⚠ 唔收個人資料：冇生日、冇出生地、冇名、冇 email、冇 reader id。
--   每題只記年份、方面、答案、同埋邊幾個候選時辰預測「有」—— 夠重新計分，唔夠認出係邊個。
-- ⚠ 網站只有 anon key（0010 之後唔再攞 service role）：寫入經 `rectify_record()`
--   （security definer），張表本身 anon／authenticated 讀唔到、寫唔到。睇結果用 SQL editor。
-- ⚠ 可以重複跑。

create table if not exists rectify_trials (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  -- 大概時段：0 夜（子丑寅）、1 朝（卯辰巳）、2 晝（午未申）、3 晚（酉戌亥）；null = 唔知
  band          smallint check (band between 0 and 3),
  candidates    smallint[] not null check (cardinality(candidates) between 1 and 12),
  -- 試用者最後填嘅真時辰；null = 佢自己都唔肯定（嗰次唔計準確度）
  true_shichen  smallint check (true_shichen between 0 and 11),
  picked        smallint not null check (picked between 0 and 11),
  confidence    real not null check (confidence between 0 and 1),
  -- [{ "year": 2014, "area": "工作", "a": "yes" | "no" | "unsure", "yes": [3, 5] }, …]
  answers       jsonb not null check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) <= 30),
  -- 每個候選時辰最後嘅分數：{ "3": 0.82, "4": 0.11, … }
  posterior     jsonb not null check (jsonb_typeof(posterior) = 'object'),
  -- 計分模型同版本：{ "model": { "hit": 0.75, "base": 0.3 }, "content": "…", "engine": "…" }
  meta          jsonb not null default '{}'::jsonb check (jsonb_typeof(meta) = 'object'),
  -- 防人亂塞大嘢入嚟（頁面係公開網址，只係冇連結）
  constraint rectify_trials_size check (pg_column_size(answers) + pg_column_size(posterior) + pg_column_size(meta) < 16000)
);

alter table rectify_trials enable row level security;
revoke all on rectify_trials from anon, authenticated;

create or replace function public.rectify_record(
  p_band smallint,
  p_candidates smallint[],
  p_true smallint,
  p_picked smallint,
  p_confidence real,
  p_answers jsonb,
  p_posterior jsonb,
  p_meta jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
begin
  if not (p_picked = any (p_candidates)) then
    raise exception '揀中嘅時辰唔喺候選入面';
  end if;
  insert into rectify_trials (band, candidates, true_shichen, picked, confidence, answers, posterior, meta)
  values (p_band, p_candidates, p_true, p_picked, p_confidence, p_answers, p_posterior, coalesce(p_meta, '{}'::jsonb))
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.rectify_record(smallint, smallint[], smallint, smallint, real, jsonb, jsonb, jsonb) from public;
grant execute on function public.rectify_record(smallint, smallint[], smallint, smallint, real, jsonb, jsonb, jsonb) to anon, authenticated;
