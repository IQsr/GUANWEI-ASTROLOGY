# 英文試做：命宮（示範盤 · 2026-10-05）

示範盤：1990-03-21 14:20 香港，女（`/sample` 同一個盤）。程式出嘅英文，冇人手改過。
**畀睇稿嘅朋友：** 請睇右邊英文讀落自唔自然、似唔似人寫，唔使理術語（術語見 `docs/en-glossary.md`）。

## I · The Life Palace

| 格 | 中文 | English |
|---|---|---|
| 結論 | 你性格和緩：不爭先、不記仇，很懂得把日子過得舒服。要留意的是：舒服會削弱你前進的動力，有時你需要一點外來的推力。 | You are easy-going by nature: you don't push to be first, you don't hold grudges, and you know how to make life comfortable. The catch: comfort can sap your drive, and sometimes you need a push from outside. |
| 開場 | 你的命宮坐天同、天梁。 | Your Life Palace holds Tian Tong and Tian Liang. |
| 結構 | 天同的課題不在苦，在動力——舒服本身會削弱移動的理由。有一點壓力，對你反而是好事。福氣厚，日子過得舒服，人緣寬，不必用力也有人願意幫。它的舒服是真的，不必替它擔心。天梁在命的基調是出面：遇到不公會說話，遇到有難的人會接。它有一套自己認定的標準，而且相當堅持。天同化忌，想安頓而安頓不下，舒服的條件恰好最缺。它的形狀是拖而不是痛。 | For Tian Tong, the challenge isn't hardship but drive — comfort itself weakens the reasons to move. A little pressure is actually good for you. You are well blessed: life is comfortable, you get on with people, and help arrives without your having to work for it. That comfort is real; there's no need to worry about it. With Tian Liang in the Life Palace, the keynote is stepping forward: you speak up when something is unfair, and you take in people who are in trouble. Tian Liang keeps its own standards, and holds to them firmly. Tian Tong turns to Obstruction: you want to settle but can't, and the very conditions for comfort are the ones in shortest supply. This shows up as drag rather than pain. |
| 牽動 | 這一面也和你的在外表現、工作和錢連在一起：在外時，天同在陌生環境裡討人喜歡；工作上，天機的做事方式是拆解與變通；錢方面，太陰處理資源的方式是慢慢積。 | This side of you is also tied to your life out in the world, your work and your money. Out in the world, Tian Tong wins people over in unfamiliar settings. At work, Tian Ji's way of working is to take things apart and adapt. With money, Tai Yin's way with resources is to build up slowly. |
| 擾動 | 同宮還有火星：性急，起手快；熱度來得猛，退得也快。 | Also in this palace is Huo Xing (Fire): quick-tempered and quick to start; enthusiasm comes on strong and fades just as fast. |
| 生活 | 放假時你最懂得享受，一頓好飯、一個午覺就很滿足；只是舒服的位置坐久了，換工作、學新東西，往往要別人推你一把。 | On holiday you know exactly how to enjoy yourself — a good meal and an afternoon nap are enough. But stay in a comfortable spot too long, and changing jobs or learning something new usually takes someone else's nudge. |

## 做法

**中文照舊砌章，英文逐句譯。** 揀乜講、剷邊句重複，全部由中文嗰邊決定；英文只管點講。

- 資料句（基塊、修飾語、生活場景）→ 翻譯表 `packages/content/src/en/tm.json`
- 程式砌嘅句（「你的命宮坐⋯」「同宮還有⋯」牽動開頭）→ 模板 `packages/content/src/en/render.ts`
- 術語 → `packages/content/src/en/terms.ts`（跟詞彙表）
- 英文檢查 → `packages/content/src/en/lint.ts`（宿命、恐嚇、AI 腔、感嘆號、美式拼寫、漏中文）
- 譯唔到嘅句唔會出中文，測試（`apps/web/test/en-pilot.test.ts`）會列出嚟

## 全書要做幾多（量咗 400 本書）

| | 唔同嘅句 | 中文字 |
|---|---|---|
| 命宮一章 | 372 | 約 1.15 萬 |
| 全書 | 11,571 | 約 41 萬 |

全書嘅句數比資料多好多，因為「這十年」「這一年」「一生十二步」「回看過去」「序」嗰啲句係程式砌、入面有年份、歲數、星名清單 —— 約 5,000 句只出現過一次。**呢啲唔係逐句譯，係逐個模板寫**（估計 40–60 個模板）。資料句就逐句譯（估計 6,000 句左右）。

## 試做發現嘅問題

1. **中文本身有重複**：「舒服」一段出現五次。中文讀落仲可以，英文 *comfort* 五次就好明顯。要喺中文嗰邊改，定係英文譯嘅時候換字（ease、comfortable、settled）—— 建議英文譯時換。
2. **「它」**：中文用「它」指星，英文 *It* 會唔知指邊樣。試做嗰兩句已經改寫成星名同 *This*；全書譯嘅時候要留意。
3. **正文出星名**：中文「結構」格本身有星名（天同、天梁），英文跟住用拼音。英文讀者第一次見 *Tian Tong* 會唔知係乜 —— 需要註層（撳開解釋），或者第一次出現加意思（*Tian Tong, the Contented*）。
