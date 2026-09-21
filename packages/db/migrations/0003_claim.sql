-- 觀微 · 認領（工單 G2 · 架構 §4）
--
-- ── 認領係乜 ──
--
-- 匿名讀者 → 加一個 email 落同一個 auth user 度（`linkIdentity`）。
-- `auth.uid()` 一個字都冇變，所以佢啲書同票根本冇搬過 ——
-- 「認領後所有書同已購章節自動跟住走」呢條 AC，喺 G1 揀
-- `readers.id = auth.users.id` 嗰陣就已經贏咗。呢個檔做嘅係**守住佢**。
--
-- ── G1 留低咗一個窿 ──
--
-- G1 grant 咗 `update (email, is_anonymous) on readers to authenticated`，
-- 即係話一個匿名讀者可以自己一句 SQL 話自己認咗領。
--
-- 而「認咗領」唔係一個形容詞，係**付款硬閘嘅條件**（架構 §4）。
-- 一個自己講自己認咗領嘅欄位，同 entitlements 一樣 —— 唔係憑據。
--
-- 所以呢兩個欄由 `auth.users` 同步落嚟，讀者自己寫唔到。
-- 真正嘅認領喺 Supabase Auth 嗰邊發生（`linkIdentity` 要收驗證信），
-- 我哋呢邊淨係跟。

-- ── 一、readers 由 auth.users 自己生 ─────────────────────
--
-- 本來係 app 去 insert 一行。但咁樣佢就 insert 得出一行
-- `is_anonymous = false` —— 又係同一個窿。
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into readers (id, is_anonymous, email)
  values (new.id, coalesce(new.is_anonymous, true), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ── 二、認領狀態由 auth.users 同步 ───────────────────────
create or replace function public.sync_reader_identity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update readers
     set is_anonymous = coalesce(new.is_anonymous, true),
         email        = new.email
   where id = new.id;
  return new;
end;
$$;

create trigger auth_user_identity_changed
  after update of email, is_anonymous on auth.users
  for each row execute function public.sync_reader_identity();

-- 讀者寫唔到自己嘅認領狀態。
revoke insert on readers from authenticated;
revoke update on readers from authenticated;

-- ── 三、回訪次數 ────────────────────────────────────────
--
-- 架構 §4：「認領提示**只准出現三次**：成書後／第二次回訪／付款前。」
--
-- 頭尾兩次係**時刻**（啱啱題完名、撳緊付款），唔使記低。
-- 中間嗰次係「第二次回訪」—— 要數。
--
-- ⚠ 呢個數唔可以擺喺 localStorage：G1 定咗嗰度只准兩個 key，
-- 而且清 cookie 就會由頭數過，變成每次都嘈。
--
-- 一個「回訪」= 一日。唔用 session：同一日開兩次唔算兩次回訪，
-- 而一日一次嘅寫入平到唔使諗。
alter table readers
  add column visit_days   smallint    not null default 1,
  add column last_visit_on date       not null default current_date,
  -- 成書後嗰次係「可撳走」嘅。撳走咗就唔好再喺嗰個位嘈。
  add column claim_dismissed_at timestamptz;

/**
 * 記一次回訪。同一日行幾多次都只會加一次。
 *
 * security definer：讀者寫唔到 `readers`（上面 revoke 咗），
 * 但佢要數得到自己嘅回訪。呢個 function 只掂自己嗰行。
 */
create or replace function public.touch_visit()
returns smallint
language plpgsql
security definer
set search_path = public
as $$
declare
  n smallint;
begin
  update readers
     set visit_days    = visit_days + 1,
         last_visit_on = current_date
   where id = auth.uid()
     and last_visit_on < current_date
  returning visit_days into n;

  if n is null then
    select visit_days into n from readers where id = auth.uid();
  end if;
  return n;
end;
$$;

grant execute on function public.touch_visit() to authenticated;

/** 撳走「成書後」嗰個提示。同樣只掂自己嗰行。 */
create or replace function public.dismiss_claim_prompt()
returns void
language sql
security definer
set search_path = public
as $$
  update readers set claim_dismissed_at = now()
   where id = auth.uid() and claim_dismissed_at is null;
$$;

grant execute on function public.dismiss_claim_prompt() to authenticated;
