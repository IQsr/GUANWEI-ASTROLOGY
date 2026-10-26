# 宮位規則卡 v2：日生／夜生、天刑、天姚（2026-10-26）

只入新成書入口（`createBookChapters` → `separateRuleReferences`）。基準入口 `bookChapters`、舊書快照、凍結審核表不變。新書內容版本加 `palace-conditions-v2`。

## 日生／夜生點定

《深造講義》上篇主星論寫明，唔使估分界：

- p.9（wtz.deep.p009.b002）：「日生人(寅卯辰巳午未時生人)以太陽為中天主星」
- p.9–10（wtz.deep.p009.b009 → p010.b001）、p.21（wtz.deep.p021.b009）：「夜生人(申酉戌亥子丑時生人)」

所以 `birthHalf(chart)` 只睇安命用嘅時辰（`chart.lunar.shichen`）：寅至未為日生，申至丑為夜生。早子、晚子都係子時，一律夜生。洛陽時選項照樣影響時辰，因為命宮都係由同一個時辰安。

## 程式

- `condition.ts`：`birthHalf()`，條件原子 `{ birth: '日生' | '夜生' }`（`rule.ts` schema、`ming-writer.ts` 描述同步）。現有原子冇改。
- `palace-predicate.ts`：新 op `birth`（`is`）同 `lacks`（即 `has` 取反，唔收四化）。`has`／`lacks-hua`／`branch` 行為不變；engine-p0 嗰 83 條舊規則嘅凍結語義測試照過。
- `palace-remaining.ts`／`palace-focused.ts`：規則有 `since` 就只喺 `separateRuleReferences` 先評核。
- 卡由 `tools/cards/conditions-v2/cards.mjs` 寫，`build.mjs` 由本機原文庫逐段取原文、對 deep-index 段指紋，再併入兩個卡檔同兩份 review。

## 卡（25 條）

廟陷只用 `branch.ts` `BRIGHT` 嗰兩端（原書表同引擎表一致嘅格）。單星卡唔包丑未，因為嗰度係太陽太陰同度，原書另有專條。

| 宮 | 卡 | 條件 | 原文 |
|---|---|---|---|
| 兄弟 | siblings-moon-night-bright | 太陰入廟（子酉戌亥）＋夜生 | p.373 b016 |
| 兄弟 | siblings-moon-day | 太陰入廟＋日生 | p.373 b017–p.374 b001 |
| 財帛 | wealth-moon-night-bright | 太陰入廟＋夜生 | p.451 b013–014 |
| 財帛 | wealth-moon-day-fallen | 太陰落陷＋日生 | p.451 b013 |
| 財帛 | wealth-yinyang-night | 丑未日月同度＋夜生 | p.440 b003 |
| 財帛 | wealth-sun-wu-day | 午太陽＋日生＋吉化＋輔佐吉曜＋見祿；見天梁化祿不採 | p.439 b010–p.440 b001 |
| 財帛 | wealth-ji-chouwei-xing | 丑未天機＋本宮天刑或擎羊 | p.437 b002 |
| 財帛 | wealth-liang-xing | 天梁＋本宮天刑 | p.458 b010 |
| 財帛 | wealth-jumen-yang-xing | 巨門＋本宮擎羊＋天刑（詞訟一說不用） | p.455 b005 |
| 官祿 | career-wupo-xing | 武破＋本宮天刑；見鈴陀不採（下一條偏門） | p.531 b012–014 |
| 官祿 | career-tanlang-ziwu-xing | 子午貪狼＋本宮天刑 | p.542 b006 |
| 官祿 | career-qisha-yang-xing | 七殺＋四方擎羊、天刑、廉貞化忌（下一條無忌轉利器行業） | p.548 b007–008 |
| 僕役 | friends-moon-night-bright | 太陰入廟＋夜生 | p.512 b003 |
| 僕役 | friends-moon-day-fallen | 太陰落陷＋日生（「多損友」屬他人品格不用） | p.512 b003 |
| 福德 | wellbeing-sun-night | 太陽非丑未非落陷＋夜生 | p.570 b002 |
| 福德 | wellbeing-sun-night-fallen | 太陽落陷（子戌亥）＋夜生 | p.570 b002 |
| 福德 | wellbeing-sun-day-fallen | 太陽落陷（子戌亥）＋日生 | p.570 b003 |
| 福德 | wellbeing-yinyang-day／-night | 丑未日月同度＋日生／夜生 | p.576 b002（夜生並引p.570 b002例外） |
| 福德 | wellbeing-fu-yao／-xing | 天府＋本宮天姚／天刑 | p.575 b006 |
| 夫妻 | spouse-tanlang-ziwu-xing | 子午貪狼＋本宮天刑或地空地劫 | p.395 b003、p.394 b012 |
| 田宅 | property-sun-day-fuzuo | 太陽入廟＋日生＋四方輔佐吉曜 | p.554 b009 |
| 田宅 | property-sun-night-fallen | 太陽落陷（子戌亥）＋夜生 | p.554 b010 |
| 田宅 | property-moon-day-fallen | 太陰落陷＋日生；本宮見輔佐不採（下一條可自置） | p.560 b006–007 |

## 冇做嘅

- **紅鸞、天喜、咸池**：宮垣論入面提到佢哋嘅段（約二十段），結論全部係事件（添人口、外寵、暗戀、私生子）或者要埋引擎冇嘅雜曜（大耗、天虛、陰煞、天月），所以呢批一張都冇用。
- **天刑、天姚其他段**：大部份係官非、刑克、意外、他人品格（兄弟深沉刁狡、下屬陰謀），或者要埋引擎冇嘅雜曜，不用。
- **八句冇改寫被刪嘅導語**：靜態搵到十一個組合首句屬純四化分支（子女同巨／同梁／廉破、疾厄陽巨／武殺／廉破、遷移紫殺、僕役廉破／廉貪、父母紫府／武貪）。宮垣論對呢啲組合冇日夜生或天刑天姚可判嘅非事件條文，呢批補唔到；要另寫改寫句或者等 P1 雜曜。
- 子女、父母宮嘅日夜生條文多數講子女數目、性別、父母存亡或他人境遇，不用。父母宮「太陽落陷又空劫天刑主代溝」（p.593 b013）要查太陽喺三方嘅地支，現有 op 做唔到，下批加。

## 驗證

- `packages/content/test/palace-conditions-v2.test.ts`：日夜分界、`birth`／`lacks` op、基準入口唔出新卡、1500 盤逐卡核「符合先出、出就附盤面事實同原文」。
- book-lint（150 盤）：A／B 數同改前一樣，見 PR。另計 150 盤入面新卡段數同「由冇規則段變有」嘅章數。
