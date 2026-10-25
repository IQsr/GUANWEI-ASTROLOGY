# 共用成書紀錄 P0

日期：2026-10-25。對應 [共用成書規格](book-authoring-spec-v1.md) 與 [全章矩陣](book-authoring-audit-2026-10-25.md)。本批只接資料及保存合約，沒有改網站正文、建議、收結、引文、條件或例外；沒有 push、合併或部署。

## 已接入的流程

`createBookChapters` 每次新成書建立一份 `BookAnalysis`；同一份跨宮分析交給原有寫作層及紀錄 adapter。普通宮位閱讀器將實際使用的三態核對結果交回 collector，沒有另設一套吉煞計分或星數判讀器。

```text
出生／版本 → 共用原位事實及借宮關係
           → 原有條件判讀結果、完整候選及未出文原因
           → 章節與段落重點、正文／建議／收結連結
           → 各章自己的 reading.analysis 快照
```

正式 cast action、公開樣本及本機預覽仍共用同一 creator。歷史 `bookChapters` 保留原預設，供歷史比較；已存書只讀快照，不走新分析、不補算未知資料。

## 共用紀錄內容

| 層 | 本批保存的資料 | 不混用的界線 |
|---|---|---|
| `AnalysisContext` | 成書年份、明示性別、出生日期／時間／時區及輸入來源、引擎／流派／曆表／時間基準、查星目錄、年齡層、廟陷／四化／日夜覆蓋 | 缺輸入保留 null；不從姓名、樣本或大限順逆猜性別；英日原版仍是原版 |
| `AnalysisFact` | P1b 目錄的原位事實、安法來源、版本及可查性；`fact:natal:星名:原位` | 星曜只在原位有一個 ID；位置可算不等於安法原書已校勘 |
| `BorrowReference` | 目標、原位、對宮結構檢查及原位主星 ID | 不搬四化／配曜，不增加一份實坐，不把借入當同宮 |
| `RuleDecision` | 原卡條件、現有 evaluator 結果／trace／bindings／gates、事實依賴、出處、條件、例外、有效查星版本與時間層 | `supported`、`not_supported`、`unknown_input`、`source_pending`、`out_of_scope` 分開；未符不代表相反判斷成立 |
| 呈現狀態 | `selected`、`valid_not_written`、`not_selected` 及原因 | 有效未成文不覆寫語意結果；選中作比較亦不會把未符改成成立 |
| `ChapterDecision` | 章節主語、共用主重點、段落重點、fact／decision／relation ID、未解及有效未出文清單 | 父母／主管、平輩／一般下屬／親近後輩及不同時間層仍按原章界線保存 |
| `ClaimLink` | 實際段落／句子位置、原 source ID／citation ID、重點及判讀連結、引用角色 | 明示的直接原段才標 direct；未完成角色映射標 `legacy-unclassified`，不把掛源等同逐句已證實 |

普通宮位判讀仍用原有 P0 查星設定，跨宮仍用原有 P1b 設定。共用紀錄同時記下 effective catalogue，沒有為提高命中率而替普通閱讀器靜默啟用新條件。完整 trace 保留必要前提、否定、修飾及例外，沒有從摘要字數或「本盤」開頭判斷支持程度。

## 矩陣揭示並補記的入口差異

太陰辰戌財帛、天機子午官祿保留既有專用稿。這兩條路徑原先會繞過普通候選卡，矩陣卻另外計算了登記候選。P0 在有 collector 的新成書流程，使用同一 predicate evaluator 補記這些候選的成立／未符／未知結果，註明正文仍走專用稿。這些結果不新增段落、不改條件排序、不冒充已採用的個人分支。

夫妻、田宅及其餘九宮的閱讀器審核記錄新增 `shared_record_review`。更新指紋前先移除本批 observer 及專用稿記錄分支，重建修改前程式；兩份重建程式的 SHA-256 與原審核值完全相同。原卡資料、原文及參照格式指紋沒有刷新。另以實際矩陣、原有正反例及完整輸出回歸核對，並非單靠換指紋通過。

## 正文、建議及收結如何接

原有來源句與條件規則用穩定 ID 連回本章決策；每個有來源段另有自己的 focus。編輯建議連到已選章節重點，記錄其編輯身分；尚未有更細一對一規則連結的建議保留章節範圍，沒有替它新增書證。

骨架保存命宮 focus 連結。收結從原有 `epilogue.selected.<章名>` 的明示識別，保存對應命、官、財、福 focus 及決策；未使用的試點 trace 留在付費收結快照，沒有整份塞進免費章節。既有結尾的文字選擇策略本批不改，之後 P1 才重寫仍在重貼正文的收結。

## 保存與讀取

沿用現有 `chapters.reading` JSONB 及 `create_book`，沒有資料庫 migration、權限或認證改動。新內容版本附 `book-analysis-v1`。每章只保存自己的紀錄及明示所需的跨宮依賴；章節 JSON 中重現同一事實時沿用同一 ID，不作重複計入。

原本沒有 rich reading 的章用 `legacyPresentation` 包住原段落，畫面仍走原有標註方式；同時封存相同首段引用 ID，避免目次 RPC 因新增 JSON 而遺失舊的據。十二步繼續公開無據，內部原引用、條件與三層時間範圍照存。

讀取器只在 `chapter_body` 通過後取 `chapter_reading`。目次只取既有首段資料，沒有取分析紀錄。新 metadata 版本、ID 唯一性、原位／借宮關係、fact／decision／focus 邊、語意及呈現狀態、時間層、句子來源與存檔正文會核對；錯配不從當前引擎猜補。沒有紀錄的舊書維持原行為。

儲存模型沿用 [Supabase 的 JSONB 支援](https://supabase.com/docs/guides/database/json)；權限驗證沿原有章節 RPC，另經本機 PGlite 實際 SQL 驗證，未對線上資料庫寫入。

## 驗收與重跑

| 檢查 | 範圍 |
|---|---|
| 固定成書回歸 | 176 本：144 結構盤、固定八本、24 本先前抽查盤，共 3,344 章 |
| 固定宮位矩陣 | 1,728 格：1,440 實坐宮位、288 借入宮位；逐格核對原有選中、命中及未符規則 |
| 命宮幾何 | 120 實坐及 24 合法借入；沒有為不存在的借入幾何生造規則 |
| 另行封存輸入 | 16 個新固定輸入，只作未參與改稿的自動驗收；不是新一輪人手盲讀評分 |
| 正反例 | 必要星在本宮／移至別宮／缺安星、native-only 借入不適用、三條同時有效但只採兩條、manual 待核、缺出生性別、未啟用目錄、缺流年層輸入 |
| 快照 | 實際 cast/save 序列化、舊書不補算、篡改 ID／狀態／引用拒收、本機 SQL 保留 JSON、未購／其他讀者／匿名不能取完整快照、目次不洩漏 metadata |
| 不改文案 | 逐字正文、標註與據、完整引用庫、條件與例外、英日及首段目次比較 |

主要測試：`apps/web/test/book-analysis.test.ts`、`production-book-entry.test.ts`、`current-book-reading.test.ts`、`epilogue-snapshot.test.ts`、`packages/db/test/chapter-reading.test.ts`。固定基準仍是原有 CSV、fixtures 及已封存輸入，沒有刷新歷史成書快照。

```powershell
pnpm --filter @guanwei/web test -- test/book-analysis.test.ts --maxWorkers=1
pnpm --filter @guanwei/web test -- --maxWorkers=2
pnpm --filter @guanwei/content test -- test/palace-focused.test.ts test/palace-remaining.test.ts test/palace-rule-reference.test.ts --maxWorkers=2
pnpm --filter @guanwei/db test -- test/chapter-reading.test.ts --maxWorkers=1
```

## P0 與下一批的界線

P0 交付的是共用紀錄、現有判讀器 adapter、章節連結及保存驗收。沒有趁這次補新星曜、放寬三組跨宮 gates、選定機梁兩端或改全書文字。

已掛來源但尚未映射成共同 executable 條件卡的舊分支，保存實際選句、原出處及全部原條件，標 `coverage: unmapped`／`source_pending`。這表示機器判讀映射尚未完成，**不表示原引文已判錯，也不冒充完整語意驗證**。已核主題 profile 另標 `selection-only`，只證明星系／宮支選取，不能代替所有個人修飾都成立。運限的既有選稿亦先完整封存，仍標 legacy adapter，未升級成新的共用運限判讀器。

下一批 P1 才按規格補 RB 廉忌科文、RC 同祿機權等完整條件卡，將上述明示缺口轉成可執行判讀，並讓正文、建議、收結更深入使用同一決策。不能用刪掉 pending、改成 supported 或更新快照當作已完成。


## 本批最後驗證結果

- Web：72 個測試檔，676 項全部通過。
- Content：54 個測試檔通過，590 項通過；原有 4 個測試檔／5 項模擬測試維持 skipped。
- DB：5 項本機 PGlite 快照／權限測試通過；沒有對線上資料庫操作。
- Web、Content、DB typecheck 通過；lint 零 error，4 項既有 warning。
- Production build 通過，286 靜態頁生成成功；14 項 verify 全部通過，client bundle 沒有排盤引擎或私鑰。
- 固定 176 本、1,728 宮位格、16 個另行封存輸入及正反例通過。
- 另對照 P0 開始前的不可變 176 本輸出：3,344 章正文、逐句來源、據及英日快照差異為零，沒有重新生成基準。
- 另從 Git 取出原審核時的三份閱讀器，用 176 盤比較 1,936 個普通宮位閱讀結果：原預設正文、來源及條件差異為零。
- 三組 P1a／P1b／跨宮的完整 report hash 沿原值重新驗證通過，沒有刷新分析報告或歷史成書快照。
- 本機 3101 已恢復；同梁命宮、天府財帛、機梁骨架三個預覽路由回 200。

較廣內容驗收找到舊 parent 指紋需要重新綁定。原值、逐項差異及證據保存於 [重新綁定清單](book-authoring-p0-parent-rebinding.json)：只改指定 parent 欄位，所有樣本結果、完整 report hash、規則、原文及其他審核欄位不變。相依的 coherence 審核另逐項核對 174 個已裁定改稿仍完全吻合後才綁定。其他較早審閱文件保留當時紀錄，本批沒有把所有舊指紋一律改成現值。

本批處理的單本 JSON 平均約 718 KB，最大約 1.09 MB；這是含章節、來源快照與共用紀錄的保存大小，不是 client 引擎 bundle。

工作保留於既有 `codex/cross-palace-production`，HEAD 仍為 `182d904`。本批未 commit、push、合併或部署。
