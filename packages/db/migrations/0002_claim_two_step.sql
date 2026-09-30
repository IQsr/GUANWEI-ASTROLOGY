-- 0002 · 認領：Supabase 確認 email 係分兩句 UPDATE（2026-09-30）
--
-- Issac 實測：收到確認信、撳咗，DB 入面照舊係匿名，付款同開通兩道閘都過唔到。
--
-- 原因：匿名讀者行 `updateUser({ email })`，撳確認信嗰陣 Supabase（GoTrue）
-- 唔係一句過改晒 —— 先寫 `email`，再另一句改 `is_anonymous = false`（次序唔保證）。
-- 舊嘅 sync trigger 逐句照抄：第一句之後 readers 變成「有 email 但仲係匿名」，
-- 撞正 `readers_claim_shape`（is_anonymous = (email is null)），成個確認 rollback。
--
-- 改法：兩樣都成立（有 email 而且唔係匿名）嗰一刻先算認領；中間嗰步照舊係匿名、冇 email。
-- 條 constraint 唔郁 —— 「有 email 就一定已認領」呢條規矩仍然啱，錯嘅係 trigger 逐句抄。
--
-- ⚠ 可以重複跑（create or replace）。

create or replace function public.sync_reader_identity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  claimed boolean := new.email is not null and not coalesce(new.is_anonymous, true);
begin
  update readers
     set is_anonymous = not claimed,
         email        = case when claimed then new.email end
   where id = new.id;
  return new;
end;
$$;

-- 新開嘅 auth user 一樣：兩樣都成立先算認領（例如直接用 email 註冊）
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  claimed boolean := new.email is not null and not coalesce(new.is_anonymous, true);
begin
  insert into readers (id, is_anonymous, email)
  values (new.id, not claimed, case when claimed then new.email end)
  on conflict (id) do nothing;
  return new;
end;
$$;
