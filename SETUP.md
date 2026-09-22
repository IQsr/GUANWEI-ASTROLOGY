# 起手式

## 一、行起佢（唔使任何帳號）

```bash
pnpm install
pnpm dev          # → http://localhost:3000
```

需要 **Node 22+** 同 **pnpm 10**（`npm i -g pnpm`）。

冇環境變數都行得。入齋、藏經閣、落款、排盤、題名、展卷全部唔使 DB；
書齋同命書會顯示「一時搵唔到」—— 係一個已知狀態，唔係壞咗。

想睇齊全部元件：`/tokens`、`/tokens/shu`、`/tokens/shelf`、
`/tokens/mingshu`、`/tokens/zhanjuan`。

其餘指令：

```bash
pnpm test         # 984 條
pnpm typecheck
pnpm lint
pnpm build        # next build —— 淨係 build，冇掃描
pnpm verify       # 十二層驗收掃描（要 build 完先，會開 headless Chromium）
```

## 二、推上 GitHub

repo 已經 `git init` 同埋做咗第一個 commit（branch `main`）。
喺 github.com 開一個**私人** repo（唔好揀 add README），然後：

```bash
git remote add origin git@github.com:<你>/<repo>.git
git push -u origin main
```

⚠ **開私人 repo。** 唔係因為 code 見唔得人，係因為
`packages/content` 入面有兩萬幾字自己寫嘅內容 —— 嗰個係最值錢嘅資產。

⚠ `.gitignore` 已經擋住 `.env`、`.env*.local`、`node_modules`、`.next`。
推之前 `git status` 望一眼，確認冇 `.env` 混咗入去。

## 三、之後要接嘅嘢

### Supabase（解鎖書齋、命書、認領、付款）

1. 開一個 Supabase project
2. 順住跑 `packages/db/migrations/*.sql`（`0001` → `0005`，順序要啱）
3. 抄 `.env.example` 做 `apps/web/.env.local`，填頭兩條

⚠ 第三條 `SUPABASE_SERVICE_ROLE_KEY` **bypass 晒 RLS**。
暫時冇 server 用得著佢（G3 Stripe webhook 先要），可以唔填。
唔好貼落任何對話、issue 或者截圖。

### 部署

Vercel 揀 `apps/web` 做 root，環境變數照上面。
⚠ **Vercel 個 Build Command 要係 `pnpm build`，唔好加 `pnpm verify`。**
驗收掃描會起 server、開 headless Chromium，喺 Vercel 上面跑唔到 ——
兩個指令特登分開就係為咗呢件事（見 `DEPLOY.md`）。

## 四、睇邊度

| | |
|---|---|
| 幾份 plan | claude.ai project「Zi-Wei-Dou-shu-astrology-chart-generator website」 |
| 工單簿（即時進度） | artifact《觀微 工單簿》v0.5 |
| 規則決策 | `docs/rules.md`（R-xxx）· `docs/engine-divergence.md`（D-xxx） |
| 語言同推理規範 | `docs/voice-spec.md` |
| 逐張工單嘅記錄 | project 入面《觀微 工單記錄-*》 |

## 五、⚠ 兩件未驗嘅事

- **書本例盤零張。** `docs/rules.md` 七條規則冇一條去到「已核」。
  引擎同兩個軟件對得上，但冇一樣嘢對得返原書。
- **真人測試未跑。** 我哋知十二章砌得出、機器分得出兩本書；
  唔知有冇人讀完覺得似自己。

個殼起得幾實；殼入面嗰樣嘢仲未驗過。
