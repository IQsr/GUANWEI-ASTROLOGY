-- 觀微 · 寫票（工單 G3 · 架構 §6、§8）
--
-- ── ⚠ 呢條 migration 淨係做一件事：令「寫票」變成一句唔可以寫錯嘅嘢 ──
--
-- `entitlements` 嗰張表 G1 已經起好，連三道保險：
--
--   unique (stripe_payment_id)        Stripe 重送唔會出兩張票
--   unique (reader_id, book_id, …)    同一本書唔會有兩張
--   trigger                           未認領嘅讀者唔可以有票（架構 §4 硬閘）
--
-- 而 RLS 嗰邊寫住：讀者對 entitlements **得 select，冇 insert** ——
-- 「一張票係『畀咗錢』嘅憑據，用戶自己寫得入就唔係憑據」。
--
-- 所以寫票淨係行得通一條路：**Stripe webhook，用 service_role**。
-- 而 service_role bypass 晒 RLS —— 即係話上面嗰三道保險入面，
-- 只有 unique 同 trigger 仲喺度，「呢本書係咪佢本書」冇人查。
--
-- 呢個 function 就係補返嗰一格。

-- ── grant_entitlement ──────────────────────────────────────
--
-- 回 true  = 今次寫咗一張新票
-- 回 false = 本來就有（Stripe 重送、或者用戶撳咗兩次 checkout）
--
-- ⚠ 兩個都係**成功**。webhook 收到 false 要回 200，唔係回錯 ——
-- 回錯 Stripe 就會再送，而再送一樣會 false，噉就永遠重試落去。
create or replace function public.grant_entitlement(
  p_book       uuid,
  p_reader     uuid,
  p_product    text,
  p_payment_id text
)
returns boolean
language plpgsql
-- ⚠ invoker，唔係 definer。
--
-- 呢個 function 由 webhook 行，而 webhook 攞住 service_role ——
-- 即係話佢本來就已經 bypass 晒 RLS，加 definer 一個字都唔會多。
-- 反而 invoker 令佢喺 PGlite 測試入面行得到真權限：
-- 一個攞住 `authenticated` 身分嘅人叫佢，照樣寫唔入。
security invoker
set search_path = public
as $$
declare
  v_owner uuid;
begin
  /*
   * ⚠ 一、呢本書係咪佢本書。
   *
   * service_role 之下冇 RLS，所以 `p_reader` 同 `p_book` 唔夾
   * 係寫得入去嘅 —— 即係一條「畀 A 張 B 本書嘅票」嘅路。
   * 冇人會有心噉做，但 webhook 收到嘅係 Stripe metadata，
   * 而 metadata 係我哋自己喺 checkout 嗰陣塞落去嘅兩個字串。
   * 一個字串打錯，就係一張錯票。
   */
  select reader_id into v_owner from books where id = p_book;

  if v_owner is null then
    raise exception '冇呢本書：%', p_book using errcode = 'foreign_key_violation';
  end if;

  if v_owner <> p_reader then
    raise exception '呢本書唔屬於呢個讀者 —— 票唔可以跨人寫'
      using errcode = 'check_violation';
  end if;

  /*
   * ⚠ 二、冪等唔喺呢度做，喺 unique 度做。
   *
   * 「先 select 睇吓有冇，冇就 insert」係一條 race：Stripe 同一個
   * 事件重送兩次，兩個 request 可以同時 select 到「冇」。
   * `on conflict do nothing` 係由 DB 答，冇中間狀態。
   */
  insert into entitlements (reader_id, book_id, product, stripe_payment_id)
  values (p_reader, p_book, p_product, p_payment_id)
  on conflict do nothing;

  return found;
end;
$$;

-- ⚠ 淨係 service_role 行得。
--
-- `authenticated` 冇 execute —— 一個讀者攞住自己個 session
-- 直接叫 RPC 都叫唔郁。（就算叫得郁，入面嗰句 insert 一樣過唔到 RLS，
-- 因為個 function 係 invoker。兩層都擋，唔靠其中一層。）
revoke all on function public.grant_entitlement(uuid, uuid, text, text) from public;
grant execute on function public.grant_entitlement(uuid, uuid, text, text) to service_role;

-- ── has_entitlement ────────────────────────────────────────
--
-- ⚠ 點解要多呢個 function：**成功頁唔可以自己答自己。**
--
-- G3 驗收標準第一條：「webhook 先寫 entitlement，唔靠 return URL」。
-- 即係話 Stripe 送返嚟嗰版頁**唔准發票**，佢只可以問一句
-- 「票到咗未」，然後照實答。
--
-- 讀者本來就 select 得到自己嗰啲 entitlements，所以呢個唔係新權限，
-- 係一個講得清楚啲嘅問法 —— 而且令成功頁嗰段 code 冇得順手做多啲嘢。
create or replace function public.has_entitlement(p_book uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from entitlements e
     where e.book_id = p_book
       and e.reader_id = auth.uid()
  );
$$;

grant execute on function public.has_entitlement(uuid) to authenticated;
