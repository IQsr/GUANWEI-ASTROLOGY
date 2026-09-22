# 觀微 —— 裁書（收費）

> 工單 G3｜出處：架構 §4、§6、§8
> ⚠ **唔係法律意見，亦都唔係稅務意見。** 真係收錢之前要搵人睇。

---

## 一、賣乜（Issac 2026-09-22 決定）

| | |
|---|---|
| **我採用** | **一次過買成本書。** 一張票開晒全部深度章 |
| **否決咗** | 逐組買（架構 §6 分咗六組：宮位三組 ／ 四化飛星 ／ 大限 ／ 流年） |
| **貨幣** | USD |
| **價錢** | ⚠ **未定。** 而家係 `US$1.00`，一個明顯假嘅數，`PRICE.placeholder` 標住佢係假 |

### 點解唔逐組賣

兩個理由，而第一個係硬嘅：

1. **六組入面得三組生成到。** 四化飛星、大限、流年要等 C11。
   逐組賣即係賣緊三組空章。
2. `chapter_body()` 由 G1 起就係噉寫：查「呢本書有冇票」，唔查 `product`。
   揀一次過買，**DB 一個字都唔使改**。

逐組賣冇被否決永遠 —— `entitlements.product` 呢一欄仲喺度，
而 `unique (reader_id, book_id, product)` 本來就容得落幾張票。
改嘅日子要改嘅係 `chapter_body()`，同埋 `chapters` 加一個「屬邊組」嘅欄。

### 點解價錢係一個明顯假嘅數

一個似層似樣嘅假價錢（`US$29`）會喺截圖同 demo 入面扮到自己係真嘅，
然後有一日冇人記得佢係假。**一蚊唔會。**

而且「係咪真」唔靠人記得：`PRICE.placeholder` 係資料嘅一部分，
測試守住佢。定咗真價錢就改嗰兩個值。

---

## 二、⚠ 票由 webhook 發，唔由 return URL 發

驗收標準兩條，而佢哋其實係同一條：

> 「webhook 先寫 entitlement，唔靠 return URL」
> 「用戶關咗頁都收到」

一個人撳完「畀錢」之後會唔會返到我哋版頁，**我哋控制唔到** ——
佢可以熄咗個 tab、可以斷線、可以撳咗返上一頁。
票如果係由嗰版頁發嘅，噉佢就係**收咗錢冇畀嘢**。

所以：

| | |
|---|---|
| `/api/stripe/webhook` | **唯一**發票嘅路 |
| `/pay/[bookId]?done=1` | 淨係問得一句 `has_entitlement()`，問完照實講 |

### 成功頁三句，三句都係照實講

| 狀態 | 意思 |
|---|---|
| `paid` | 票到咗 |
| `pending` | 畀咗錢，票未到 —— **唔係錯，係兩條路嘅時差** |
| `cancelled` | 佢喺 Stripe 嗰邊撳咗返轉頭 |

⚠ `pending` 嗰句**唔准**寫成「請稍候」再自動 refresh。
自動 refresh 係喺度扮緊「你等一等就會好」，而我哋唔知 ——
webhook 可能一秒到，可能因為我哋部 server 有事而唔到。
講得出嘅只有：錢收到咗，票未到，而且唔使佢做嘢。

---

## 三、⚠ 未認領硬閘要喺三層，唔係一層

架構 §4：「認領提示只准出現三次……**付款前（硬閘）**」。

| 層 | 喺邊 | 擋嗰陣發生咗乜 |
|---|---|---|
| 一 | `/pay` 版面（`payGate()`） | 佢仲未撳 |
| 二 | `checkoutAction`（server action） | 佢撳咗，但未去到 Stripe |
| 三 | DB trigger（`entitlements_need_claimed_reader`） | ⚠ **佢已經畀咗錢** |

**第二層先係真正嗰道閘。** server action 係一個公開 HTTP endpoint（E4 嗰課）——
一個匿名讀者用 `curl` 直接 POST 佢，係入得到 checkout 嘅，除非嗰度自己查。
版面嗰次係畀人睇。

第三層係最後一道網，唔係第一道。佢爆嘅時候錢已經收咗，
而 webhook 會回 500、Stripe dashboard 會見到一條紅 —— 嗰個正正係我哋想見到。

---

## 四、⚠ 邊啲嘢唔喺 handler 度做

| | 點解 |
|---|---|
| **冪等** | 做喺 DB 嗰句 `on conflict do nothing`。「先查有冇，冇就寫」係一條 race：Stripe 同一個事件重送兩次，兩個 request 可以同時查到「冇」 |
| **驗簽名用 raw body** | `await req.json()` 再 `JSON.stringify()` 返轉頭係驗唔到嘅 —— 鍵嘅次序、空格、Unicode escape 全部會變。症狀係「本機用 CLI 試就得，上到線全部 400」 |
| **`payment_status` 要查** | `checkout.session.completed` 自己**唔等於畀咗錢**。延遲付款方式（銀行過數嗰類）喺 `payment_status: unpaid` 之下都會送呢個事件 |
| **`payment_id` 用 session id** | 唔用 `payment_intent` —— 佢喺某啲付款方式之下可以係 null，而 null 過唔到 `not null`。而且 Stripe 重送嘅係同一個 session |

### 三個回應碼，三個意思

| 情況 | 回 | 點解 |
|---|---|---|
| 唔關事嘅事件 | 200 | 回錯 Stripe 會一路重送 |
| 已經有票（重送） | 200 | **呢個係成功。** 回錯就永遠重試落去 |
| metadata 唔齊 | **500** | ⚠ 收咗錢但唔知係邊本書 —— 一定要嘈。靜靜雞回 200 就係收咗錢冇畀嘢，而且連我哋自己都唔知 |

---

## 五、第三方：Stripe

用 **hosted Checkout**，唔喺自己版度收卡。兩個理由，第二個先係重點：

1. 卡號永遠唔會掂到我哋部 server。
2. **唔使喺自己版度載 Stripe 嘅 JS** —— 即係話 `docs/privacy.md`
   嗰張第三方名單**唔會多一個 host**。個人係由我哋部 server 被轉去
   `checkout.stripe.com`，而唔係一入 `/pay` 就有一段第三方 script 喺度睇住佢。

「揀咗」同「真係冇」之間差一個量度，所以 `check-privacy.mjs`
而家連 `/pay` 一齊掃 —— 有人日後加一段 Stripe.js 落去，嗰度就紅。

Stripe 收到乜、保留幾耐，見 `docs/privacy.md` 第四節同第五節。

---

## 六、價錢只准喺一個地方

架構 §6 硬規則：「『題名』之前唔准出現任何價錢或者『升級』字眼。」

實際上做得更窄：**價錢只應該喺 `/pay` 出現，一版都不多。**
一個價錢喺書齋、喺命書、喺藏經閣頁尾出現，每一個都會有佢自己嘅理由
（「畀人知幾錢啊嘛」），而加埋就係一個成日喺度叫你畀錢嘅網。

兩層守住，而且量嘅係兩樣唔同嘢：

| | 量乜 | 捉到乜 |
|---|---|---|
| `test/pay.test.ts` | source | 一個未接線嘅常數、一句註釋以外嘅 `US$` |
| `check-routes.mjs` | 畫出嚟嗰版 | 由 DB、由 messages、由 Stripe 帶返嚟嘅字 |

---

## 七、已知缺口

| | |
|---|---|
| **真價錢** | 未定。定咗改 `PRICE` 兩個值，同埋熄咗 `placeholder` |
| **退款** | 冇做。`charge.refunded` 事件而家唔處理 —— 即係退咗錢張票仲喺度。要人手喺 Supabase 度刪 |
| **收據／發票** | 靠 Stripe 自己嗰封。我哋唔寄 |
| **付款紀錄保留期** | 會計法定年期未問過（見 `docs/privacy.md` 第五節）。⚠ **G4 嘅「真刪」要喺呢個答案出咗之後先做得準** |
| **`/account` 睇得到買過乜** | G4 |
| **⚠ 冇跑過** | `lib/pay.server.ts`、webhook route、`/pay` 版面 —— 呢個環境接唔到真 Stripe。判斷全部喺 `lib/pay.ts`（測過），接 API 嗰半零判斷 |
| **Stripe 稅** | 完全冇掂過。跨境賣數碼商品有 VAT／GST 嘅問題，要問人 |

---

## 八、點量

```
pnpm --filter @guanwei/db  test pay     # 15 條：真 RLS 之下邊啲人寫唔到票
pnpm --filter @guanwei/web test pay     # 24 條：三道閘、webhook 判斷、價錢只喺一處
pnpm --filter @guanwei/web verify       # check-routes（價錢全站掃）· check-bundle（key）· check-privacy（第三方）
```
