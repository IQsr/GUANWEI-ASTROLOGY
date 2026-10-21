# 開書 504 核查與防護

## 已觀察到的事實

2026-10-21 03:14:34 Europe/London（02:14:34 UTC），正式部署 `EvG7CRskA3DsnBzJdgMShRXPfeqE` 的中文命宮 GET 在 routing middleware 停留 25.1 秒，回 `MIDDLEWARE_INVOCATION_TIMEOUT`。Vercel 紀錄記憶體為 230 / 2048 MB，沒有記錄到外部 API 呼叫；頁面處理尚未開始。前一條明確繁中 URL 先正常 307 到無前綴 URL，重試同一書頁則成功。

同時段 01:55–02:20 UTC 的 Supabase Auth 日誌有 139 筆，均為 200；02:14:25–02:15:05 UTC 窗口只見一條 `/user`，約 3.6 ms。這不能把該條 Auth 請求直接歸屬到逾時 request，也不能排除未抵達服務端的網絡問題。原有 middleware 沒有分階段診斷，因此未能斷言原始卡點是 SDK 初始化、網絡等待或平台調度。不能把它定性為已證實的 Supabase 服務事故、無限 redirect 或記憶體不足。

正式站再以同一瀏覽器重開英文、日文、中文各三次，九次均可讀，觀察到的瀏覽器重載耗時約 0.6–2.5 秒。另測日文切回中文亦成功。這是有限抽查，不是可靠的全站失敗率，也不能證明永不再發生。

## 可修補的缺口

原有私密頁 middleware 無上限等待 `createServerClient(...).auth.getUser()`；唯一非同步分支若不完成，會直接碰到平台的 25 秒限制。只替 fetch 加 timeout 不能處理 SDK 尚未發出網絡請求便卡住的情況。

- 對整段 session refresh 設 5 秒 deadline，同時取消仍在執行的 fetch。
- 保留原來的服務端 `getUser()` 驗證及頁面/RLS 檢查，不以讀 cookie 或未驗證 JWT 取代。
- 更新 cookie 先留在本次操作的暫存；成功才一併傳到 request 及 response。失敗與逾時的遲到結果不會改寫 cookie。
- 逾時、例外及 Auth 暫時性錯誤回傳四語 503 重試頁；不回私密內容、不把讀者登出、不自動重送 POST。正常缺少 session／無效 token 維持原有頁面權限判斷與 SDK 清理流程。
- 錯誤與換 token 的 response 均禁止快取。診斷只記固定事件、原因與耗時，不記 token、生辰、書 ID 或其他個人資料。

這是限制應用程式等待並提供安全重試的防護，並非已證實消除了原始平台／SDK 卡點；服務真正不可用時仍會出重試頁，不能保證每次開書必定成功。

## 驗證

新增 middleware 測試使用真正 next-intl routing，模擬無 outgoing fetch 的 SDK 卡住、fetch 取消、逾時後 cookie 遲到、正常換 token 對 request/response 同步、Auth 429/503、缺少 session、無效 token 清理、公開頁不碰 Auth、四語重試頁及 query escaping。

全 web 測試首次高並行時，一項原有六十星系測試超過其 5 秒上限；限制本機 worker 數為 2 後，50 個檔案、579 項測試全過。型別檢查、修改檔案 lint、文案檢查通過；生產構建與 CI 另以實際執行結果為準。

參考：[Vercel timeout 說明](https://vercel.com/docs/errors/middleware_invocation_timeout)、[Supabase SSR 驗證與 cookie 更新](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)。已讀 2026-10-21 changelog；現有 client 仍保留 getUser，不引入套件升級或資料庫變更。
