-- 觀微 · 書架（工單 E3 · 視覺 §8 · 架構 §4）
--
-- ⚠ E3 第二條驗收標準：「**最近讀嗰本喺最左**；在讀嗰本轉朱砂。」
--
-- 但 G1 排唔到呢個序：`books` 有 `last_read_chapter`（讀到邊一章），
-- **冇一個「幾時讀」**。知道讀到邊度，唔等於知道幾時讀。
--
-- 用 `created_at` 代替唔得：書架係回訪落點（架構 §4），
-- 而回訪嗰個人想見到嘅係「我上次喺度」，唔係「我幾時開咗呢本」。
-- 一個按開書日期排嘅書架，讀得越耐排得越後 —— 啱啱掉轉。
alter table books add column last_read_at timestamptz;

-- 讀到邊、幾時讀，兩樣要一齊郁 —— 一個有章冇時間嘅 row 排唔到序。
alter table books
  add constraint books_last_read_together
  check ((last_read_chapter is null) = (last_read_at is null));

create index books_last_read on books (reader_id, last_read_at desc nulls last);
