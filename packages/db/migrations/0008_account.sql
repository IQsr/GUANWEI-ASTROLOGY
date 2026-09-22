-- 觀微 · 設定：匯出、真刪（工單 G4 · 架構 §10）
--
-- ── ⚠ 一個由 G3 逼出嚟嘅 schema 改動 ──
--
-- 架構 §10：「`/account` 必須有**真刪**」。而 schema 由 G1 起就係
-- 一條 cascade 鏈：`auth.users → readers → subjects → charts → books
-- → chapters`，仲有 `entitlements`。刪一個 reader，全部跟住走。
--
-- 呢個係啱嘅 —— 除咗一樣：**付款紀錄有法定保留期。**
--
-- `entitlements.reader_id` 係 `on delete cascade`，即係話一個人一撳
-- 刪除，佢嗰張票同埋「呢筆錢幾時收過」呢件事**一齊消失**。
-- 噉樣唔係保護私隱，係做唔到會計 —— 而做唔到會計就代表真刪呢件事
-- 遲早會被一句「不過我哋要留返紀錄」推翻，然後變成「標記刪除」。
--
-- 所以喺删除之前先分家：**一張唔連住任何人嘅付款紀錄表。**

-- ── payment_records ────────────────────────────────────────
--
-- ⚠ 呢張表刻意**冇** reader_id、冇 book_id、冇 FK。
--
-- 佢淨係答會計問嘅嗰條問題：「呢個月收咗幾多錢」。
-- 佢答唔到「邊個畀嘅」—— 而嗰個正正係佢應該答唔到嘅嘢。
--
-- 換句話講：一個人刪咗戶口之後，呢行嘢仲喺度，但佢**唔再係
-- 關於任何人嘅資料**。GDPR 之下噉樣就唔再係 personal data，
-- 亦都唔會同「真刪」呢個承諾打交。
create table payment_records (
  stripe_payment_id text primary key,
  amount            integer not null check (amount > 0),
  currency          text not null check (length(currency) = 3),
  paid_at           timestamptz not null default now()
);

alter table payment_records enable row level security;
alter table payment_records force row level security;

-- ⚠ 一條 policy 都冇 —— 即係話讀者一行都睇唔到。
-- 呢張表係畀會計睇嘅，唔係畀讀者睇。service_role 有 bypassrls。

-- ⚠ 而 bypassrls **唔等於有權限**（0002 嗰段註釋已經寫過一次）。
--
-- 0002 行過 `grant all privileges on all tables …`，但嗰句係**當時**
-- 嗰批表 —— 之後先出世嘅表一行都冇拎到。所以呢張新表要自己 grant，
-- 否則 webhook 會撞到 `permission denied for table payment_records`，
-- 而錯誤訊息一個字都冇提「你張表係新起嘅」。
--
-- （呢個窿喺寫測試嗰陣即刻爆咗出嚟 —— 即係話唔喺 PGlite 度跑真權限，
-- 佢就會留到上線，喺第一個人畀錢嗰一刻先出現。）
grant select, insert on payment_records to service_role;

-- ── ⚠ grant_entitlement 要連會計紀錄一齊寫 ──────────────────
--
-- 改咗簽名（多咗金額同貨幣），所以要先 drop 返舊嗰個。
-- `create or replace` 喺簽名唔同嘅時候唔會覆蓋，只會**多一個**
-- overload —— 然後 `rpc('grant_entitlement', …)` 會撞到
-- 「function is not unique」，而嗰個錯同呢個改動完全唔似。
drop function if exists public.grant_entitlement(uuid, uuid, text, text);

create or replace function public.grant_entitlement(
  p_book       uuid,
  p_reader     uuid,
  p_product    text,
  p_payment_id text,
  p_amount     integer,
  p_currency   text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select reader_id into v_owner from books where id = p_book;

  if v_owner is null then
    raise exception '冇呢本書：%', p_book using errcode = 'foreign_key_violation';
  end if;

  if v_owner <> p_reader then
    raise exception '呢本書唔屬於呢個讀者 —— 票唔可以跨人寫'
      using errcode = 'check_violation';
  end if;

  /*
   * ⚠ 會計紀錄行先，而且佢自己一個 on conflict。
   *
   * 兩樣嘢冪等嘅條件唔同：張票可以因為「同一本書已經有票」而唔寫
   * （用戶畀咗兩次錢），但嗰兩筆錢**兩筆都真係收過**。
   * 所以如果會計紀錄跟住張票嘅結果走，第二筆錢就會唔見咗。
   */
  insert into payment_records (stripe_payment_id, amount, currency)
  values (p_payment_id, p_amount, lower(p_currency))
  on conflict (stripe_payment_id) do nothing;

  insert into entitlements (reader_id, book_id, product, stripe_payment_id)
  values (p_reader, p_book, p_product, p_payment_id)
  on conflict do nothing;

  return found;
end;
$$;

revoke all on function public.grant_entitlement(uuid, uuid, text, text, integer, text) from public;
grant execute on function public.grant_entitlement(uuid, uuid, text, text, integer, text) to service_role;

-- ── 匯出（Art. 15、20） ─────────────────────────────────────
--
-- ⚠ **匯出唔係一道後門。**
--
-- 「畀我全部我嘅資料」呢個要求，最順手嘅實作係 service_role 撈晒
-- 佢名下所有行 —— 而噉樣會連未買嘅深度章正文一齊交出去。
-- 即係話 paywall 有一個叫「匯出」嘅繞路。
--
-- 所以呢個 function 係 **security invoker**：佢跑喺讀者自己嘅權限
-- 之下，`body` 呢一欄佢本來就 select 唔到，要行 `chapter_body()`，
-- 而嗰個會查票。未買嘅章喺匯出檔入面係 `null` —— 誠實，而且唔漏。
create or replace function public.export_reader()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'reader', (
      select to_jsonb(r) - 'id'
        from readers r where r.id = auth.uid()
    ),
    'subjects', coalesce((
      select jsonb_agg(to_jsonb(s) - 'reader_id' order by s.created_at)
        from subjects s where s.reader_id = auth.uid()
    ), '[]'::jsonb),
    'charts', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.computed_at)
        from charts c
        join subjects s on s.id = c.subject_id
       where s.reader_id = auth.uid()
    ), '[]'::jsonb),
    'books', coalesce((
      select jsonb_agg(
               (to_jsonb(b) - 'reader_id') || jsonb_build_object(
                 'chapters', coalesce((
                   select jsonb_agg(
                            jsonb_build_object(
                              'slug', ch.slug,
                              'ord', ch.ord,
                              'tier', ch.tier,
                              'title', ch.title,
                              'content_version', ch.content_version,
                              'slots', ch.slots,
                              'cut_at', ch.cut_at,
                              /* ⚠ 未買就係 null。匯出唔繞過 paywall。 */
                              'body', chapter_body(ch.id)
                            ) order by ch.ord
                          )
                     from chapters ch where ch.book_id = b.id
                 ), '[]'::jsonb)
               ) order by b.created_at
             )
        from books b where b.reader_id = auth.uid()
    ), '[]'::jsonb),
    'entitlements', coalesce((
      select jsonb_agg(to_jsonb(e) - 'reader_id' order by e.purchased_at)
        from entitlements e where e.reader_id = auth.uid()
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.export_reader() to authenticated;

-- ── 真刪（Art. 17） ─────────────────────────────────────────
--
-- ⚠ 「真刪」係 `delete`，唔係 `update … set deleted_at = now()`。
--
-- 架構 §10 特別寫明呢一點，因為標記刪除係最容易滑落去嗰個做法：
-- 佢一樣令個人見唔到自己啲嘢，而且「萬一佢想恢復呢」聽落好體貼。
-- 但一個標記咗刪除嘅生辰，**仲係一個我哋揸住嘅生辰**。
--
-- G1 由第一日起就將 cascade 鋪好咗，所以真刪就係刪一行：
--   readers → subjects → charts → books → chapters ＋ entitlements
--
-- 讀者本來冇 delete 權限（0002 只 grant 咗 select/insert/update），
-- 所以要喺呢度開 —— policy `readers_self` 保證佢只刪得到自己嗰行。
grant delete on readers to authenticated;

-- 回一份「刪咗啲乜」嘅數，畀個人見到佢真係冇咗嘢。
-- ⚠ 要喺刪之前數 —— 刪完就冇得數。
create or replace function public.delete_reader()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_counts jsonb;
  v_gone   integer;
begin
  select jsonb_build_object(
    'subjects', (select count(*) from subjects where reader_id = auth.uid()),
    'books',    (select count(*) from books where reader_id = auth.uid()),
    'chapters', (select count(*) from chapters ch
                   join books b on b.id = ch.book_id
                  where b.reader_id = auth.uid()),
    'entitlements', (select count(*) from entitlements where reader_id = auth.uid())
  ) into v_counts;

  delete from readers where id = auth.uid();
  get diagnostics v_gone = row_count;

  if v_gone = 0 then
    raise exception '冇嘢刪到 —— 搵唔到呢個讀者' using errcode = 'no_data_found';
  end if;

  /*
   * ⚠ 呢度刪唔到 `auth.users`。
   *
   * 嗰行要 service_role 行 admin API（`auth.admin.deleteUser`）。
   * 即係話「真刪」實際上係兩步，而**第二步喺呢個檔案之外**。
   *
   * 兩步之間仆咗街嘅話，剩低嘅係一個冇任何資料嘅 auth 帳戶 ——
   * 即係得返個 email。`lib/account.ts` 要照直講出嚟，唔准報「刪晒」。
   */
  return v_counts;
end;
$$;

grant execute on function public.delete_reader() to authenticated;
