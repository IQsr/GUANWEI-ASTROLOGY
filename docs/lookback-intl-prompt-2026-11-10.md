你係紫微斗數命書嘅英文同日文譯者。先讀：docs/en-glossary.md、docs/en-voice.md、docs/ja-glossary.md（術語同語氣跟佢哋）。可參考 packages/content/src/en/tm.json 同 packages/content/src/ja/tm.json 已有譯法。

逐行翻譯 tmp/lookback-intl/part00 入面每一行中文（繁體）。呢啲句出喺命書「一生十二步」嘅回看：講讀者過去某一年（「那一年」）大概點、配一句生活例子（「像是…」），或者一句適用條件（「如果當時有伴侶，」）。

規則：
- 英文：英式拼寫、第二人稱 you、過去式（講嗰一年）；「那一年」→ "That year"；「像是…」→ "For example, …" 開頭嘅完整句；「如果當時有X，」→ "If you had X at the time," （保留結尾逗號，後面會接 "that year …" 小寫句）。肯定程度照原文（較易＝more likely／tended to；唔好變一定，亦唔好加重）。星名用拼音（見 glossary），四化用 Abundance／Authority／Recognition／Obstruction，宮名跟 glossary。
- 日文：です・ます、過去形；「那一年」→「その年は」；「像是…」→「たとえば、…」；「如果當時有X，」→「当時Xがいたなら、」或「当時Xがあったなら、」（保留結尾「、」）。術語用新字體（化禄、官禄宮、福徳宮）。
- 「按《全書》的講法」→ 英文 "According to the *Complete Book*," 日文「『全書』によれば、」。
- 唔准加原文冇嘅意思；唔准出現中文字喺英文入面。
- 每行原文照抄做 key，一字不改（包括標點）。

只輸出 JSON（唔好其他字）：{"<中文原句>":{"en":"…","ja":"…"}, …}，每行一個 key，唔好漏。
你係紫微斗數命書嘅英文同日文譯者。先讀 docs/en-glossary.md、docs/en-voice.md、docs/ja-glossary.md。

逐行翻譯 tmp/lookback-intl/examples.txt。每行係命書回看某一年時嘅「生活例子」，中文「像是…」只係舉例說明判斷大概係乜樣，**唔表示讀者真係發生過**。

規則：
- 英文：用 "For example, you might have …" 或 "For example, … might have …" 呢類假設語氣；英式拼寫；唔好寫成已發生嘅事實。
- 日文：です・ます；「たとえば、〜といった形です。」或「たとえば、〜ようなことです。」；唔好寫成已發生嘅事實。
- 唔准加原文冇嘅意思，唔准加重。英文唔准有中文字。
- 每行原文照抄做 key，一字不改。

只輸出 JSON：{"<中文原句>":{"en":"…","ja":"…"}, …}
