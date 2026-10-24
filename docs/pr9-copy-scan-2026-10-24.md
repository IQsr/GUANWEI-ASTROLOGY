# PR #9 文案掃描修正 · 2026-10-24

首輪 CI 的 Typecheck、Lint、Test、Build 及瀏覽器驗收均通過，Verify 最後的 check-copy 命中新增跨宮成書器的中文文字模板。

將模板、宮位鍵與原有註文替換表移到同一份 cross-palace-reading.json 的 presentation 欄位，沒有修改 check-copy.mjs，沒有新增掃描例外，也沒有改任何正文、原文、判讀條件或來源。

搬位前固定 TL／A／C 三組完整預覽成書 JSON 的 SHA256，搬位後逐 byte 相同；三個指紋保存於 apps/web/test/fixtures/cross-copy-before.json，並由 cross-palace-reading.test.ts 持續核對。這個比對涵蓋全部章節與引文資料，不只畫面正文。

cross-palace-review.json 與 cross-reference-polish-review.json 保留歷史版本指紋。本次只搬資料，不用更新其舊指紋冒充重新核讀原書；其後版本的來源不變及輸出相等，由完整成書指紋測試與 CI 重核。

本機 check-copy、web typecheck、lint 及跨宮／引文測試通過；提交後再等 PR CI 最終結果。保持 PR 未合併，沒有手動部署或提升至正式環境。現有 Vercel GitHub 連線會自動產生分支 Preview。
