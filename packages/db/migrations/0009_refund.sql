-- 觀微 · 退款（2026-09-29 · docs/pay.md 第七節「已知缺口」）
--
-- 之前 `charge.refunded` 唔處理：退咗錢，張票仲喺度，要人手喺 Supabase 度刪。
--
-- ── 兩樣嘢，唔同處理 ──
--
--   entitlements     張票刪走 —— 冇畀錢就冇票，同 grant 嗰邊一樣係「憑據」
--   payment_records  **唔刪**，記低幾時退 —— 會計要答得到「呢個月收咗幾多、退咗幾多」
--
-- ⚠ 淨係全數退款先收票。部分退款（例如補償）張票照留；由 webhook 嗰邊判斷。

alter table payment_records add column refunded_at timestamptz;

-- 0008 淨係 grant 咗 select, insert；而家要改 refunded_at。
-- 只准改呢一欄 —— 金額同貨幣係收錢嗰一刻嘅事實，唔准事後郁。
grant update (refunded_at) on payment_records to service_role;

-- ── revoke_entitlement ─────────────────────────────────────
--
-- 回 true  = 今次收咗一張票
-- 回 false = 本來就冇（Stripe 重送同一個退款事件，或者嗰筆錢當初冇出票）
--
-- ⚠ 兩個都係**成功**，同 grant_entitlement 一樣：回錯 Stripe 就會一路重送。
create or replace function public.revoke_entitlement(p_payment_id text)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  /* 會計紀錄行先：就算張票早已唔喺度（重送、人手刪咗），退款都要記低 */
  update payment_records
     set refunded_at = now()
   where stripe_payment_id = p_payment_id
     and refunded_at is null;

  delete from entitlements where stripe_payment_id = p_payment_id;
  return found;
end;
$$;

revoke all on function public.revoke_entitlement(text) from public;
grant execute on function public.revoke_entitlement(text) to service_role;
