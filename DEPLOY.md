# 上線：Supabase ＋ Vercel

> 呢份係**你做嘅步驟**。我做唔到嘅原因好簡單：開戶同貼 key 要你張憑證，
> 而嗰樣嘢唔應該經過對話。

---

## 零、先明白你而家解鎖緊乜

而家冇 DB 之下，六幕行得完，但**行完乜都冇留低**：
書齋永遠空、`/book/[id]` 永遠撈唔到嘢。

接咗 Supabase 之後解鎖：書齋、命書目錄同正文、未裁之頁、認領。

⚠ **同時亦都係四個 adapter 第一次真係行。**
`identity.server.ts`、`shelf.server.ts`、`juan.server.ts`、`chengshu.server.ts`
到今日為止一句都冇跑過 —— 判斷同文案全部抽咗出去測過，
但「接唔接得通」呢一半，只有你部 instance 答得到。

**所以預咗第一次會有嘢爆。** 下面第四節有一張對住嚟報錯嘅清單。

---

## 一、Supabase

### 1. 開一個 project

`supabase.com` → New project。地區揀近英國嗰個（`eu-west-2` London）。
資料庫密碼佢會叫你設一個 —— **嗰個唔使畀我，亦都唔使記落 repo**。

### 2. 跑 schema

SQL Editor → New query → 貼 `packages/db/migrations/all.sql` 成個檔 → Run。

⚠ 呢個檔冇 `IF NOT EXISTS`，跑第二次會撞 "already exists"。
噉樣係**特登**嘅：一個靜靜雞跑得第二次嘅 migration，
就係一個你永遠唔知跑到邊一步嘅 migration。

跑完應該見到 `Success. No rows returned`。

### 3. ⚠ 開匿名登入（最易漏嗰步）

Authentication → Sign In / Providers → **Anonymous Sign-ins** → 開。

漏咗呢步，成書會靜靜雞失敗 —— 因為 `keepBook()` 接住所有錯之後
回 `null`（唔擋住題名，架構 §8）。即係話你會見到六幕行得好地地，
但書架永遠係空，而**畫面上一個錯都唔會出**。

### 4. 攞兩條環境變數

Project Settings → API：

```
NEXT_PUBLIC_SUPABASE_URL       = Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  = anon / public key
```

⚠ 同一版嗰個 **service_role key 唔好掂**。佢 bypass 晒 RLS，
即係話 `packages/db` 嗰十五條 RLS 測試一次過失效，而個 app 會照樣行得好地地。
而家冇任何一段 code 用得著佢（要到 G3 Stripe webhook 先要）。

**唔好貼落對話、issue、截圖、或者任何 `NEXT_PUBLIC_` 開頭嘅變數度。**

---

## 二、Vercel

1. `vercel.com` → Add New Project → Import 你個 GitHub repo
2. **Root Directory** 揀 `apps/web`（唔係 repo 根目錄）
3. Framework 佢會自己認到 Next.js
4. Build Command 留返預設（即係 `pnpm build`）
5. Environment Variables 加上面兩條，三個環境（Production / Preview / Development）都加
6. Deploy

⚠ **Build Command 一定要係 `pnpm build`，唔係 `pnpm build && pnpm verify`。**

`verify` 係九層驗收掃描 —— 佢會起一個 server、開一個 headless Chromium，
逐頁量闊度、動畫時序、有幾多個掣、有冇價錢出現過。
嗰啲喺 CI 同你部機跑，**喺 Vercel 上面跑唔到**（冇 Chromium）。
兩個指令特登分開就係為咗呢件事。

---

## 三、跑完之後先試呢六樣

順住試，每一樣都試埋失敗嗰邊：

| | 試乜 | 應該點 |
|---|---|---|
| 1 | 開首頁 → 落款五步 → 成書 | 題名幕行完之後，本書下面有一行「讀下去」 |
| 2 | 撳「讀下去」 | 去到 `/book/<id>`，目錄列住 序 · 命宮 · 身宮與五行局 ＋ 十一章「未裁」 |
| 3 | 撳「序 · 你的命盤」 | 見到五段：章首、生辰、盤面、體系（版權頁）、留白 |
| 4 | 撳任何一章「未裁」 | 見到「這一頁還沒有裁開」，**唔係** 404、**唔係**正文 |
| 5 | 返 `/shelf` | 見到書脊，唔係空架，亦唔係「一時搵唔到」 |
| 6 | 「不知道時辰」再成書一次 | 書架多一條**虛線**書脊（待時辰），冇名 |

第 4 樣最緊要：嗰個係 paywall，而佢係 DB 嘅欄級權限擋住（`chapter_body()`），
唔係前端唔 render。如果你見到正文，即係 grant 出咗事 —— 即刻同我講。

---

## 四、預咗會撞到嘅嘢（對住嚟報）

| 症狀 | 多數係乜 |
|---|---|
| 六幕行得完，但書架永遠空、冇「讀下去」 | 匿名登入未開（第一節第 3 步），或者環境變數未入到 Production |
| `/shelf` 出「一時搵唔到」 | `shelf.server.ts` 接得通但 query 出錯。要 Vercel 嗰邊 function log |
| 目錄出到但撳入去一片白 | `chapter_body()` 嘅 grant。貼個 error 畀我 |
| 「認領」之後冇收到信 | Supabase 預設 SMTP 有好低嘅限額，要自己駁一個 |
| Supabase Table Editor 見唔到行 | 六張表全部 `force row level security` —— 冇 `auth.uid()` 就冇行。**呢個係啱嘅** |
| SQL Editor 跑 `0003` 嗰段撞權限 | 嗰度要喺 `auth.users` 上面開 trigger。貼個錯畀我，我改做另一條路 |

報錯嘅時候，**貼錯誤訊息本身**，唔好貼 key、唔好貼 URL 入面嘅 token。

---

## 五、⚠ 呢一步唔會解鎖嘅嘢

- **G3 收費** —— Stripe 未接。所有「裁開」撳落去會去到一版未做嘅 `/pay`
- **F4 未裁之頁** —— 而家係一句話，唔係毛邊（而且「一生播一次」嗰條仲未決）
- **G4 /account** —— 真刪除、匯出、重排，未做
- **H 線** —— 條款、私隱、上線稽核，未做

即係話：**呢一步之後個網行得通，但未收得錢，亦都未上得正式街。**
佢係一條你自己撳得入、send 得畀人試嘅連結 —— C10b 真人測試就係要呢樣。
