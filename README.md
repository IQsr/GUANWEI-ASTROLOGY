# 觀微 GUAN WEI

透過紫微斗數，提供一種閱讀與理解自己的方式。

命盤是一張圖；觀微把它變成一本可以閱讀的命書。

---

## 結構

```
apps/web            Next.js（App Router）· 網站
packages/ziwei      排盤引擎（私有，只服務觀微）
docs/               規則決策日誌（rules.md · engine-divergence.md）
```

`packages/ziwei` 以 TypeScript 原始碼形式被引入（`transpilePackages`），
冇獨立 build step。佢係一個獨立 package，因為測試要喺冇 Next.js、
冇瀏覽器嘅情況下跑一千個對照盤。

## 指令

```bash
pnpm install
pnpm dev          # 起 apps/web
pnpm build        # next build —— 淨係 build，冇掃描
pnpm verify       # 十三層驗收掃描（要 build 完先，會開 headless Chromium）
pnpm typecheck    # 全 workspace
pnpm test         # 全 workspace
pnpm lint         # apps/web
```

⚠ `build` 同 `verify` 分開兩個指令，唔係一個。

十三層掃描要起一個 server、開一個 Chromium，逐頁量真嘢 ——
闊度、動畫時序、有幾多個掣、有冇價錢出現過。嗰啲喺 CI 同本機跑得，
**喺 Vercel 上面跑唔到**（冇 Chromium，亦都唔應該喺 build 期間起 server）。

合埋一個指令嘅話，部署就永遠 fail。

第一次跑 `verify` 之前要裝一次瀏覽器：

```bash
pnpm --filter @guanwei/web exec playwright install chromium
```

（要用一個唔喺預設位置嘅 Chromium，就設 `GUANWEI_CHROMIUM=<路徑>`。）

⚠ Windows 同 macOS 都行得。九個掃描起 server 同開瀏覽器嗰兩段
抽咗去 `apps/web/scripts/_server.mjs` —— 之前嗰版寫死咗
POSIX 嘅 `process.kill(-pid)` 同一條容器入面先有嘅 Chromium 路徑。

需要 Node 22+ 同 pnpm 10。

## 環境變數

抄 `.env.example` 做 `apps/web/.env.local`。

**冇環境變數都行得**：入齋、藏經閣、落款、排盤、題名、展卷全部唔使 DB。
書齋同命書會顯示「一時搵唔到」—— 係一個已知狀態，唔係壞咗。

⚠ `SUPABASE_SERVICE_ROLE_KEY` bypass 晒 RLS。唔好貼落對話、issue 或者截圖。

## 資料庫

`packages/db/migrations/*.sql` 順住跑。測試唔需要真 instance ——
`packages/db` 用 PGlite（PostgreSQL 編做 WASM）跑真 migration 同真 RLS。

## 語言

繁中為主，架構留位。`localePrefix: 'as-needed'`：`zh-Hant` 冇前綴
（`/book/x`），第二語言先會出現 `/en/book/x`。

**所有文案放 `apps/web/messages/<locale>.json`，唔准寫死落 component。**
`en` 而家只係用嚟證明 routing 同文案分離行得通，未打算出英文版。

## 引擎

排盤引擎唔准落 client bundle：佢係核心資產，而且 server 行先可以鎖
`engineVersion`、快取、同重算。一律經 server action 或 route handler 調用。

三個流派分歧點（年界、早晚子時、庚干化科）嘅預設值喺
`packages/ziwei/src/rules.ts`，完整理由記喺 `docs/rules.md`。
**改任何一個預設值 = 改變所有新排嘅盤，記得 bump `ENGINE_VERSION`。**

舊盤唔自動重算。

## Plan

完整規格喺 Claude project「Zi-Wei-Dou-shu-astrology-chart-generator website」：

- 觀微 視覺系統 v0.1
- 觀微 資訊架構 v0.1
- 觀微 內容系統 v0.1
- 觀微 排盤引擎 v0.1
- 觀微 iztro 使用守則
- 觀微 工單簿 v0.1 ← 開工由呢度攞 ticket

## 出處

排盤實作參考開源專案 [iztro](https://github.com/SylarLong/iztro)（MIT）。
命理體系依三合派（中州派），詳見 `docs/rules.md`。
