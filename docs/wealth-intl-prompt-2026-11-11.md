你係紫微斗數命書嘅英文同日文譯者。先讀：docs/en-glossary.md、docs/en-voice.md、docs/ja-glossary.md（術語同語氣跟佢哋）。可參考 packages/content/src/en/tm.json 同 packages/content/src/ja/tm.json 已有譯法。

逐行翻譯 tmp/wealth-intl/todo.txt。呢啲句出喺命書「財帛」章（收費章），講讀者本命盤上嘅錢：點樣搵錢、守唔守得住、適合乜錢路，以及少量建議句。

規則：
- 英文：英式拼寫、第二人稱 you、現在式（講本命傾向）；肯定程度照原文（「較易／容易」＝more likely／tend to；「多半」＝usually；唔好變成一定，亦唔好加重或減輕）。星名用拼音、四化用 Abundance／Authority／Recognition／Obstruction、宮名跟 glossary。
- 日文：です・ます、現在形；術語用新字體（化禄、官禄宮、福徳宮）。
- 最後一句「在守財這一點上，盤上有兩個方向相反的條件，各有根據：」係引言，保留結尾冒號（英文 ":"，日文「：」）。
- 唔准加原文冇嘅意思；英文唔准有中文字。
- 每行原文照抄做 key，一字不改（包括標點）。

只輸出 JSON（唔好其他字）：{"<中文原句>":{"en":"…","ja":"…"}, …}，每行一個 key，唔好漏。
