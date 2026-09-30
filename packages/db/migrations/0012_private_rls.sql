-- 觀微 · private.pay_token 開 RLS（2026-09-30 · Supabase SQL Editor 提示）
--
-- 呢張表本身已經安全：`private` schema 唔經 API 開放，anon / authenticated 冇任何權限（0010，測試守住）。
-- 開 RLS 係多一層：就算將來有人誤開咗權限，冇 policy 一樣一行都讀唔到。
--
-- 唔用 force：rotate_pay_token()（表主人喺 SQL Editor 行）同 pay_grant / pay_revoke
-- （擁有者 service_role，有 bypassrls）照舊行得。
alter table private.pay_token enable row level security;
