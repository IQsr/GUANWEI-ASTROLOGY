# 觀微 —— 隱私與 analytics 規格

> 工單 H1｜出處：架構 §10（UK GDPR）
> **呢份唔係私隱政策，係規格。** 私隱政策係寫畀讀者睇嘅一版頁（`/privacy`，工單 H2），
> 呢份係寫畀我哋自己睇嘅：邊啲資料、點解收得、擺喺邊、幾時刪、乜嘢量得、乜嘢量唔得。
>
> ⚠ **唔係法律意見。** 收錢之前要搵人睇條款同私隱政策（架構 §10 尾句）。
> 呢份文件嘅工作係令嗰個人有嘢睇。

---

## 一、我哋收乜（逐類：lawful basis · 擺喺邊 · 幾時刪）

| 資料 | 係咩 | Lawful basis | 擺喺邊 | 保留 |
|---|---|---|---|---|
| **生辰** | 出生年月日、時辰、出生地（經緯度）、性別 | **Contract**（Art. 6(1)(b)）—— 冇佢排唔到盤，即係交付唔到個人哋叫嘅嘢 | `subjects`（Supabase） | 到讀者刪除為止 |
| **盤** | `charts.payload`，連 `engine_version`、`school_profile_id` | Contract —— 佢**就係**成品嘅一半 | `charts` | 同上 |
| **命書正文** | `chapters.body`、`content_version`、`slots`、`cut_at` | Contract | `chapters` | 同上 |
| **姓名** | 讀者自己填、印喺封面嗰個 | Contract | `subjects.name` | 同上 |
| **Email** | 認領之後先有 | Contract（認領＝開帳號）；流年提醒要另外 **consent** | `auth.users` | 同上 |
| **付款紀錄** | `stripe_payment_id`、`purchased_at` | Contract ＋ **Legal obligation**（會計紀錄） | `entitlements` | ⚠ 稅務紀錄有法定年期，**唔跟讀者刪除一齊走** —— 見第五節 |
| **Session** | 匿名或已認領嘅 `reader.id` | Contract | cookie ＋ `auth.users` | Session 過期 |

### ⚠ 一個唔明顯嘅分類：盤面值**就係**生辰

`五行局`、`命宮`、`身宮`、`四柱干支` 睇落似係「結果」，唔似「個人資料」。

但佢哋全部由出生時刻算出嚟，而且係**可逆方向收窄**嘅：
知道命宮同五行局，就收窄咗農曆月份同時辰嘅可能組合。
再加一個性別（大限順逆），收窄得更多。

所以喺呢份文件同 `lib/analytics.ts` 入面，**盤面值同生辰同一級**。
呢個唔係謹慎過頭 —— 呢個係「生辰唔准入 analytics」嗰句真正嘅意思。

### 匿名讀者一樣受保障

架構 §10 第三條。一個匿名 `reader` 嘅生辰，同一個已認領 `reader` 嘅生辰，
喺 UK GDPR 之下係同一樣嘢：**假名（pseudonymous）唔係匿名（anonymous）。**
配返 DB 就認得返個人，所以佢仲係 personal data。

---

## 二、Cookie 同本機儲存（**實測**，唔係照 plan 抄）

`apps/web/scripts/check-privacy.mjs` 起一個真 server，逐條 route 睇 `Set-Cookie`。
下面呢張表由嗰個 script 量返嚟，而且嗰個 script 會對返呢一節 ——
量到一個文件冇提嘅 cookie，個 build 就紅。

| 名 | 邊個發 | 做乜 | Strictly necessary？ |
|---|---|---|---|
| `NEXT_LOCALE` | next-intl（middleware） | 記住語言，唔使每次重新協商 `Accept-Language` | ✅ 係 —— 冇佢個站照行，但會喺語言之間彈 |
| `sb-<ref>-auth-token` | Supabase（`@supabase/ssr`，由**我哋部 server** 寫） | Session。冇佢＝冇書齋、冇命書 | ✅ 係 |

本機儲存（唔係 cookie，但一樣係「留低喺用戶部機」）：

| Key | 做乜 |
|---|---|
| `gw-theme` | 日讀／夜讀 |
| `gw-last-read` | 上次讀到邊一段 |

兩個都由 `lib/local.ts` 一個出入口管，`test/local.test.ts` 掃全 `src`：
`localStorage` 出現喺嗰個檔以外就爆（工單 G1）。

### ⚠ 架構 §10 嗰句「只用 session + 主題兩個 essential cookie」唔準確

量咗先知。實際係：

- **主題唔係 cookie。** 佢喺 `localStorage`。
- **有第三個冇人計過嘅 cookie**：`NEXT_LOCALE`，next-intl 預設行為，
  由 middleware 發，連公開層（`/`、`/cast`）都會發。

兩樣都唔改變結論 —— 兩個 cookie 都係 strictly necessary，
PECR 之下唔使 consent，所以**「唔要 cookie banner」呢個立場仲成立**。

但要改文件。一份講到明「只得兩個」而實際係另外兩樣嘅私隱政策，
同一個唔標出處嘅玄學站係同一個形狀嘅問題 ——
**我哋唔可以一邊拎「工程誠實」做賣點，一邊靠一份冇量過嘅清單。**

### `NEXT_LOCALE` 關唔關得？

關得（`localeCookie: false`）。但關咗之後每一個 request 都要重新讀
`Accept-Language`，而 middleware 嗰度已經有一條為咗藏經閣寫嘅語言豁免（D1）。
**冇量過就唔郁。** 記低喺呢度，留返畀 H3 上線稽核決定。

---

## 三、Analytics 事件規格

> 架構 §10 第二條：**生辰唔准入 analytics event，只記步驟唔記值。**

### 現況：一個 provider 都未接

`lib/analytics.ts` 個 `track()` 而家**乜都唔做**。
寫住「乜都唔做」好過寫一個假嘅 `console.log` —— 後者會令人以為有嘢送緊出去。

接 provider 嗰陣改一處（`track()` 尾嗰行），其餘一個字都唔使郁。

### 閘點解喺型別，唔喺 code review

一條「記得唔好將生辰放入 event」嘅規矩係守唔到嘅。
最容易犯嗰下唔係有心：debug 嗰陣順手加個 `{ chart }` 落去睇下排盤啱唔啱，
然後嗰行留咗喺度。

所以 `EVENTS` 張表**寫死咗每個事件准帶嘅欄同埋每個欄准係邊幾個值**。
表入面冇一個 `string` ——

- 欄名擋第一層（`FORBIDDEN_KEYS`）
- **值擋第二層，而嗰層先係真嘅**：欄名可以改成 `q`，但一個 enum 塞唔入 `1996-06-16`

### 事件表

| 事件 | 帶乜 |
|---|---|
| `lexicon.view` | `kind`: star / palace / hua / ju / index |
| `enter.view` | — |
| `shelf.view` | `state`: empty / books / unavailable |
| `shelf.take` | — |
| `luokuan.step` | `step`: name / date / time / place / sex　**只記行到邊一步，唔記佢填咗乜** |
| `luokuan.time.unknown` | — |
| `cast.done` | `result`: full / partial / failed |
| `timing.seal` | — |
| `juan.open` | — |
| `chapter.view` | `tier`: free / deep　**唔記邊一章** |
| `caijuan.cut` | — |
| `claim.done` | — |

### 三樣特別講明唔記

| | 點解 |
|---|---|
| **章 slug** | 十二宮名本身唔係秘密，但「邊個讀咗邊幾章、幾時讀」拼埋就係一份行為檔案。`tier` 已經答到「免費章同收費章嘅讀完率」呢條真正想問嘅問題 |
| **讀者／書 id** | 假名唔係匿名。配返 DB 就認得返個人 |
| **排盤錯誤碼** | 錯誤碼本身無害，但 `OUT_OF_RANGE` 等於話畀你聽呢個人嘅出生年份喺 1900–2100 以外。`failed` 夠用 |

### 生辰唔准入網址

網址會入 server log、入 referrer、入書籤、入分享 —— 四個我哋控制唔到嘅地方。

架構 §3 早就定咗 `/cast` 只帶 `?step=`。
`test/analytics.test.ts` 掃全 `src`，`searchParams.set('date'…)` 之類一出現就爆；
`check-privacy.mjs` 再喺 runtime 掃一次所有 `href` / `src` / `action` 同轉向目標。

---

## 四、第三方（用戶部機會直接同邊個講嘢）

| Host | 做乜 | 收到乜 | Cookie？ |
|---|---|---|---|
| `fonts.googleapis.com` | 字體 stylesheet | IP · User-Agent · Referer | 冇 |
| `fonts.gstatic.com` | 字體檔本身 | 同上 | 冇 |

**得呢兩個。** Supabase 唔喺呢張表度，因為 `src/lib` 入面冇 `createBrowserClient` ——
瀏覽器由頭到尾冇直接同 Supabase 講過嘢，生辰行嘅路係
`瀏覽器 → 我哋部 server（server action）→ Supabase`。

### Stripe：係 processor，但**唔喺上面張表**（工單 G3）

Stripe 收到付款資料，所以佢一定要喺呢份文件出現。
但佢唔喺「第三方 host」嗰張表，因為**佢唔喺我哋版頁度載任何嘢**：

我哋用 hosted Checkout —— 個人係由我哋部 server 被**轉去**
`checkout.stripe.com`，而唔係一入 `/pay` 就有一段 Stripe.js 喺度睇住佢。
`check-privacy.mjs` 而家連 `/pay` 一齊掃，就係為咗令「揀咗唔載」
同「真係冇載」之間唔差一個量度。

| | |
|---|---|
| **Stripe 收到** | 卡資料（我哋永遠見唔到）· email（佢哋自己問嘅）· IP · 金額 · 兩個 metadata 字串（`book_id`、`reader_id`） |
| **我哋收到** | 一個 session id、`payment_status`、同埋我哋自己塞落去嗰兩個 id。**冇卡號、冇最後四位、冇卡種** |
| **角色** | Stripe 係獨立 controller（佢要守自己嗰套反洗錢同保留規定），同時係我哋嘅 processor |
| **⚠ 跨境** | Stripe 會將資料送去佢哋自己嘅基建，包括英國以外。上線前要喺 `/privacy` 寫明 |

⚠ **`book_id` 同 `reader_id` 係假名，唔係匿名。** 送兩個 UUID 去 Stripe，
即係 Stripe 嗰邊多咗一條「呢個付款人對應我哋系統入面呢個 id」嘅線。
呢個係必要嘅（冇佢 webhook 唔知發邊本書），但要講出嚟 ——
而且正正係點解 analytics 嗰邊連呢兩個 id 都唔准入 event。

### ⚠ Google Fonts 係一個要講出嚟嘅取捨

冇 cookie，但**用戶部機會將 IP 送去 Google**，而呢件事喺歐盟／英國
係有人告過嘅（LG München I，2022年1月，Google Fonts 熱連結判 GDPR 違規）。

`src/app/fonts.ts` 已經寫低咗點解而家噉做（CJK 用 `next/font` 會令 build 爆炸），
同埋條升級路線（`cn-font-split` 自己切片自 host）。

**H1 唔改佢** —— 改咗係一個字體交付決定，唔係一個私隱決定，
而且要重新量 build 時間同首屏。但由今日起佢喺呢度有名有姓，
而且 `/privacy`（H2）一定要提佢。

---

## 五、用戶權利（Art. 15–21）

| 權利 | 而家 | 邊張工單 |
|---|---|---|
| 查閱 / 攜帶（匯出） | ❌ 冇 | **G4** |
| 更正（校訂生辰） | ❌ 冇 | **G4** |
| 刪除 | ❌ 冇 | **G4** —— 而且要**真刪**，唔係標記（架構 §10） |
| 反對 / 限制 | 冇 analytics、冇 profiling-for-marketing，暫時無從反對 | — |

### ⚠ 「真刪」有一個做唔到嘅角落，而家就要講清楚

`entitlements` 入面嘅付款紀錄受**會計法定保留期**管住，
所以「刪除全部資料」實際上係：

- `subjects` / `charts` / `books` / `chapters` —— **真刪**
- `entitlements` —— 留返金額同 `stripe_payment_id`，**但斬斷指返個人嗰條線**

呢個分別要喺 `/privacy` 度寫明，亦要喺 `/account` 嗰粒刪除掣旁邊寫明。
一句「我哋會刪除你所有資料」而實際留咗一行，就係一句大話。

**⚠ 更新（2026-09-22，工單 G3）：收錢嘅路而家寫咗，但一分錢都未收過（test mode）。**

即係話上面呢段由「將來要諗」變成「收第一蚊之前一定要有答案」：

- 會計法定保留期實際係幾年 —— **要問會計**，唔可以估
- `/account` 嗰粒刪除掣旁邊要寫明邊樣真刪、邊樣留
- 退款之後張票要點 —— 而家 `charge.refunded` **完全唔處理**（見 `docs/pay.md` 第七節）

---

## 六、已知缺口（H1 交唔到，要邊張工單交）

| 缺口 | 工單 |
|---|---|
| `/account`：匯出、真刪、校訂 | G4 |
| `/privacy`、`/terms` 三版頁 | H2 |
| 版權頁列實際時區偏移（R-007） | H2（引擎未 export） |
| 一個真 provider，同埋接線之後再量一次 | 未開 |
| Google Fonts 自 host | 未開（`fonts.ts` 有路線） |
| `NEXT_LOCALE` 關唔關 | H3 |
| 付款紀錄保留期嘅實際年期（要問會計） | ⚠ 收第一蚊之前 |
| 退款之後張票要點（`charge.refunded` 而家唔處理） | 見 `docs/pay.md` |
| 跨境賣數碼商品嘅 VAT／GST | 未掂過，要問人 |
| **`NEXT_PUBLIC_SITE_URL` 冇入 `.env.example` 同 `DEPLOY.md`** | 見下 |

### ⚠ 順手量到一個唔關私隱但會咬人嘅嘢

掃第三方 host 嗰陣見到 `localhost:3000` 出現喺 `/lexicon` 嘅 HTML 度。

`lib/site.ts` 冇 `NEXT_PUBLIC_SITE_URL` 就 fallback 去 `http://localhost:3000`，
而嗰條變數**兩份部署文件一個都冇提過**。即係話 Vercel 上面如果冇入佢：
每一條 canonical、每一個 OG URL、`sitemap.xml` 全部 37 條、
`robots.txt` 嗰句 `Sitemap:` —— 一律指住 `localhost:3000`。

藏經閣係全站唯一嘅流量入口。呢個唔係私隱問題，係**收錄問題**，
而且係一條環境變數就修得返嘅。已經補咗入 `.env.example` 同 `DEPLOY.md`。

---

## 七、點量

```
pnpm --filter @guanwei/web test analytics    # 事件閘、禁字名單、網址掃描
pnpm --filter @guanwei/web verify            # 入面第十二層：check-privacy.mjs
```

`check-privacy.mjs` 量四樣：cookie 逐個要喺名單度、第三方 host 逐個要喺名單度、
**呢份文件要提齊量到嗰幾個**（反向亦然）、生辰唔准出現喺任何網址。

而且佢會先證明自己量到嘢（fetch 次數、見到嘅 cookie 數、見到嘅 host 數）——
一個喺乜都冇之上通過嘅檢查，呢個 repo 已經出過七次。
