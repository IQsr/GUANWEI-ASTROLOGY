# 星敘網站內容檢查 · 2026-10-05

今次按工作區內的星敘網站原始碼檢查：中英文介面文案、首頁與落款流程、保存與付款描述、條款與私隱頁，以及即時生成的示範命書全部 20 章。另抽查英文藏經閣詞條。未提供正式網站網址，所以以下是目前程式版本的內容審查，未確認線上部署是否同一版本，亦不是命理準確度或法律合規審核。

整體判斷：品牌語氣已經清楚，英文大致讀得明；最需要處理的是描述與功能不一致、組裝段落互相牴觸，以及部分英文把傾向寫成事實。單純改文法未能處理全部問題。

## 先處理：內容與實際功能

### 1. 每年流年信的設定承諾未落實

位置：`apps/web/messages/{zh-Hant,en}.json` 的 `claim.promise2`；`apps/web/src/app/[locale]/account/page.tsx`。

- 中文：「立春前一年一封流年信，可以在設定裡關掉。」
- 英文：「You can turn it off in Settings.」

目前設定頁只有匯出、版本重排、刪除，沒有流年信開關。搜尋目前程式亦未找到寄送這類年信或保存訂閱偏好的實作。至少「可以在設定裡關掉」與目前介面不符；寄送服務是否在外部另有安排，仍需營運資料確認。

建議：功能落實前刪去 `promise2`；已有外部寄送安排則先補真正的退訂入口。`promise1` 說電郵「只用來認出你的書」，亦要與年信用途一致。

### 2. 不知道時辰的首頁描述容易令人以為可以直接讀書

位置：`ruzhai.hint`、`cast.noHourComfort`、`cast.awaitBody1`。

中文首頁說「不知道時辰也可以排」，英文說「An unknown birth hour is fine.」。但後續實際是留下待時辰的書，未能完成命宮與命書。容許提交資料與可以完成命書是兩回事，首頁要講清楚結果。

建議中文：

> 落款五步，約三分鐘。不知道時辰也可以先保存資料，補回後才成書。

建議英文：

> Five steps, about three minutes. If you don't know your birth time, you can save your details and complete the book later.

### 3. 示範頁的個人化承諾太絕對

位置：`sample.note`、`sample.endBody`；章框與翻譯組裝資料。

「每一章都不一樣 / every chapter reads differently」並非每張盤都可保證。同一星曜組合會用相同內容塊，部分導語與結尾也共用。「書裡每一句都由命盤推出來 / Every line in it comes from the chart」亦包含了並非命理推論的編輯文字。

建議中文：

> 這是一本用虛構出生資料寫成的示範，全書已經裁開。你的書會按你的出生資料排盤，再依盤面組合各章內容。

建議英文：

> This sample uses fictional birth details, with all chapters open. Your own book is based on your chart, with each chapter assembled from the relevant interpretations.

結尾可改為：

> 命書的解讀依據盤面寫成；換成你的出生資料，就會按你的命盤組成一本書。

> The interpretations are based on the chart. Your birth details are used to create a book based on your own chart.

### 4. 公開條款與私隱頁仍有待填內容

位置：`apps/web/src/lib/legal.ts`、`apps/web/src/lib/legal-text.ts`。

尚有 `〔營運者名稱〕`、`〔聯絡電郵〕`、`〔適用法律〕`、`〔退款期限〕`、`〔refund window〕`、`〔database region〕` 等。英文頁還會插入中文的營運者與聯絡欄位佔位符。

這些是未完成的內容，不是錯字。應由營運資料補實；今次不猜名稱、地區、期限或法律。刪除失敗時要求讀者「來信」的提示，亦需要可用的聯絡方式。

### 5. 溯時百分比不宜寫成已驗證的準確把握

位置：`shiyan.confidence`；`packages/content/src/rectify.ts` 的 `posterior()`；`apps/web/src/lib/dingshi.server.ts`。

目前「把握 {p}% / {p}% confident」是候選時辰在指定模型下的正規化權重。這個值取決於模型假設和候選範圍，不等於經真人資料校準的命中率。頁面有說「試驗中」，但百分比本身仍容易令人以為是準確率。

建議改用：

> 候選時辰的模型權重：{p}%（試驗中，並非已驗證的準確率）

> Model weight for this candidate: {p}% (experimental; not a validated accuracy rate).

也可只列候選排序，免卻一個需要額外解釋的百分比。

## 命書：需要改組裝或語意的地方

### 6. 同一章有未解釋的相反描述

當前示範書確實出現以下組合，中英文都有：

- 遷移章先說「融入得快」「換環境的阻力小」，後面又說「重新架起節奏往往要花時間」。
- 父母章先說「衝突也來得快」「和長輩的關係緊張」，後面又說「與長輩、與權威之間相對談得通」。
- 命宮先說「日子過得舒服」，又說「舒服的條件恰好最缺」。

相反的訊號可以共存，但要解釋適用層面，例如融入人群與建立日常節奏可能不同。目前文章沒有明說區別，讀者容易覺得前後都講、無論現實怎樣都符合。

建議：在組裝器內辨識衝突，交代主訊號、修飾訊號及各自範圍；未能從資料支持區別時，刪去或降低其中一個結論。不要只靠加「不過」「同時」掩蓋矛盾，也不要為了接得順而創作盤上沒有的原因。

### 7. 英文把回看傾向變成已知經歷

位置：`packages/content/src/en/time.ts:124`，示範書〈一生十二步〉。

中文：「容易捲入是非爭拗，有些事要靠白紙黑字、找人評理才解決。」

英文：「you were more easily drawn into disputes, and some could only be settled in writing or by bringing in someone to judge」。英文令人以為已知讀者當年確實遇過爭拗，實際上未問過讀者。

建議：

> The chart points to a greater tendency towards disputes in 2014. If that fits your experience, putting agreements in writing or asking someone to mediate may have mattered.

全段其他「your peers were a real help」「you had more on your mind」亦應用同一原則處理：標明是盤面讀法，保留讀者核對是否符合的空間，不捏造過去。中文回看段也值得一併收斂。

### 8. 英文加重了原文的結論

位置：`packages/content/src/en/time.ts:207`。

中文：「對你一生影響特別大。」

英文：「shapes your life more than anything else」。這變成比人生所有其他事情影響都大，超過原文。

建議：

> What you gain and lose in these stages may have a particularly strong influence on your life.

其他值得收斂的例子：`never offend either side`、`never make trouble for anyone`、`you come to understand each other in the end`。最後一句中文本身也有保證和解的意味，應先改中文內容塊再同步改英文。

### 9. 通用建議不應一概叫人延遲急事

位置：`packages/content/src/en/render.ts:124`；中文年度建議相同意思。

「急著要答覆的事，先放一晚 / let anything that needs an urgent answer wait a night」過於廣泛。有時確實有期限，不能只憑章節模板要求延遲。

建議中文：

> 不必即時答覆的事，可以先放一晚再決定。

建議英文：

> If a decision can wait, give yourself a night before replying.

### 10. 年度章的開頭時態與正文不一致

位置：`packages/content/src/en/time.ts:260`。

「2026 … was a Bing Wu year, and you were …」緊接「This year …」。現年閱讀時像把今年寫成已過去；書又會長期保存，只改成現在式也不足。

建議固定書內年份，減少依賴閱讀當下：

> This chapter covers 2026, a Bing Wu year. Your age during that year is shown as …

正文以 `In 2026` 或 `During the year covered by this book` 為時間錨點，與成書後不自動更新的設定一致。

## 可直接優化的英文

以下屬文字修改建議；術語如 Life Palace、Tian Tong、四化名稱維持已定方案。

| 位置 | 現有文字 | 建議 | 原因 |
|---|---|---|---|
| `ruzhai.steps[1].desc` | A book cast for you alone | A book based on your birth chart | `cast` 適合 chart，搭配 book 不自然；`alone` 亦有孤單的語感。 |
| `ruzhai.steps[2].desc` | Begin at the Life Palace, one chapter each | Start with the Life Palace, then read a chapter for each palace | `each` 沒說每個甚麼。 |
| `cast.mulu` | The Skeleton of Character | The Shape of Your Character | 跟實際章名與已定詞彙表一致。 |
| `cast.mulu` | The Three Directions and Four Squares | The Four Directions | 同一章在落款與閱讀頁有不同名字，`Four Squares` 也容易誤解。 |
| `cast.label` | Born / Place / Hour | Date of birth / Place of birth / Birth time | 表單標籤直接講欄位用途。 |
| `cast.timeHint` | Use the clock time on your birth certificate. We handle daylight saving ourselves. | Enter the time recorded on your birth certificate, or the time you remember. We'll account for daylight saving time. | 英文漏了中文容許使用記憶時間的意思。 |
| `cast.noHourComfort` | It is usually on the birth certificate, and family can often remember. | Check your birth certificate or ask a family member; either may help you find the time. | 不同地方的出生證明未必列出生時間；避免把通常有寫當通則。 |
| `account.export1` | every birth you have written | all the birth details you've entered | 不會說「寫過每次出生」。`removeList`、`deleteOutcome.partial` 亦要同步。 |
| `account.recastLink` 等 | from the same birth | using the same birth details | `birth details` 才是這裡指的資料。 |
| `claim`、`shelf` | books are known only to this browser | Your books are currently linked to this browser. | 少一層擬人比喻，更容易明白保存機制。 |
| `shiyan.cardBody`、`shiyan.intro` | In trial / still in trial | Experimental / still experimental | `in trial` 在這種功能介紹不自然。 |
| `tm.json` 地劫夫妻句（sentences、clauses 都有） | you can say what you've given | It may help to explain the effort you've put in. | 原句像在說「你能列出你送了甚麼」，未清楚傳達投入不被理解。 |
| 事業章結論與轉接器 | Watch that long, repetitive work … is where you lose patience fastest. | You tend to lose patience fastest with repetitive work that leaves little room for change. | `Watch that … is where …` 是模板拼接造成的繞口句。需要檢查轉接器，避免同類句全部被固定前綴弄壞。 |
| `tm.json`、`terms.ts` | has you need / has you want | you need / you want，按整句調整 | 如 `Ju Men has you need things said clearly` 不自然；以讀者為主語，星名放依據。 |
| `lexicon/en.json` 的 `star.七殺.summary` | its placement and the stars sharing its palace shape how it shows a great deal | Its placement and the stars sharing its palace strongly influence how it is interpreted. | `how it shows a great deal` 語序不通，詞條摘要也需要英文審稿。 |

首頁的 `Inscribe`、`Uncut`、`Go deeper` 帶有書本感，可以保留。重點是補清楚每步會發生甚麼；付款入口可考慮用 `Unlock all chapters` 或 `Open all chapters — one payment`，讓讀者即使未理解毛邊書比喻，也明白按掣用途。`deeper chapters` 與條款的 `in-depth chapters` 建議統一一個講法。

## 驗證與範圍

- 本次重新生成全部 20 章的中英示範內容，並非只讀舊試譯稿。快照在 `docs/content-audit-sample-2026-10-05.json`，供逐句比對。
- 相關現有檢查通過：英文閱讀 5 項、語言 7 項、藏經閣 13 項，共 25 項。另以臨時匯出檢查生成快照；臨時程式已移除。
- 這些檢查確認示範書段落對應、沒有漏譯中文、語言結構與詞條資料可讀；不能證明英文自然、論述一致或承諾已落實。上述內容問題可以在測試全部通過時仍然出現。
- 目前 35 條藏經閣詞條的引用來源確實全部是 `quanshu`；「不同篇章仍是一個來源」這個提醒與現有詞條相符，不應因語料庫另有一本書就直接刪掉。
- 今次只新增審稿文件與示範快照，沒有改產品文案、推理規則或部署網站。

建議執行次序：先修功能描述與待填資料，再處理命書矛盾及結論強度，最後統一章名並潤飾英文。改命書內容時要同步修改中文塊、英文翻譯表及會產生句子的模板，不能只改英文顯示後的字。
