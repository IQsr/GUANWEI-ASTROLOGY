# clash：同章相反講法嘅標註（2026-10-18）

`src/clash.ts` 用 `src/plain/clash.json` 判斷同一章兩句係咪講同一件事、方向相反。呢個資料夾係點樣整出嗰份 JSON。

1. 盤點：`CLASH_INVENTORY=1 npx vitest run tools/clash/inventory.test.ts`（喺 packages/content 跑；平時略過）→ `inventory.json`（3,000 張盤嘅宮位章 + 1,500 張盤嘅這十年／這一年，每句記章、段、係咪組合講法）。
2. 分批：`python -I tools/clash/batch.py` → 拎走盤面事實句、統一前綴 → `texts.json`（6,155 句）同 `batch-01..10.json`。
3. 標註：十個 sub-agent 各跟 `GUIDE.md` 標一批 → `out-01..10.json`（只列有方向嘅句）。
4. 合併：`python -I tools/clash/merge.py` → `src/plain/clash.json`。統一對象（主動／快慢／嚴寬一律「你」；兄弟姊妹、朋友 →「平輩」）、範圍用字面重判、`SKIP` 係人手覆核唔標嘅句。

`texts.json` 同 `out-*.json` 係源頭（id 對應），要入庫；`inventory.json`、`batch-*.json` 可以重新生成。新句未標註就冇方向，resolver 唔會郁佢。
