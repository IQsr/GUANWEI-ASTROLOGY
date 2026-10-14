# 原文分支（細讀）嘅寫作工具

`src/branch/**.json` 同 `src/sources/zhongzhou.json` 入面 `deep.*` 嘅段落，全部由呢度生成。
**改規則就改呢度嘅來源檔，再跑 ingest**，唔好直接改 `src/branch/` 嘅 JSON，否則下次重新生成會被蓋過。

| 檔 | 管乜 |
|---|---|
| `rules/<key>.py` | 宮位題目（夫妻 `fuqi`、財帛 `caibo`、官祿 `guanlu`、遷移 `qianyi`、福德 `fude`、田宅 `tianzhai`、父母 `fumu`、兄弟 `xiongdi`、僕役 `jiaoyou`、子女 `zinv`） |
| `ingest_palace.py` | 讀 `rules/<key>.py` → 寫 `src/branch/<key>/NN.json`、`deep.<宮>.*` 段落、`src/branch/index.ts` |
| `xingxi/NN.json` | 命宮六十星系嘅規則（骨架章「細讀」） |
| `ingest_xingxi.py` | 讀 `xingxi/NN.json` → 寫 `src/branch/xingxi/NN.json`、`deep.星系NN.*` 段落、重寫 `src/branch/index.ts` |
| `ocr/` | 原書文字唔見咗先用：PDF → PNG → OCR → ingest 用嘅文字檔 |

官祿宮天機（`src/branch/tianji-guanlu.json`）同同梁寅申（`src/branch/tongliang-ming.json`）係人手寫嘅試點，唔經呢度。

## 用法

```bash
python tools/branch/ingest_palace.py caibo      # 重做一個宮
python tools/branch/ingest_xingxi.py 14 52      # 重做指定星系；唔畀數字 = 全部
npx vitest run                                  # 喺 packages/content 跑，branch.test.ts 有覆蓋率、出處、英文檢查
```

兩個腳本都係「整份重寫」：同一個輸入跑幾多次結果都一樣，跑完 `git diff` 只會見到你改過嘅嘢。

## 原書文字（有版權，唔入 repo）

ingest 會逐條核對摘錄喺唔喺原書入面，對唔上就停。原書文字放本機：

```
%LOCALAPPDATA%\guanwei\b5\
  b5_flat.txt      全書 OCR 文字（簡體）
  b5_pages.json    [[起始字元位置, 頁碼], ...]
  xingxi\NN.txt    六十星系逐個一份
```

要放第二度就設 `B5_DIR`。**唔好放入 repo 或者 OneDrive**：王亭之《中州派紫微斗數深造講義》係現代著作，有版權。
repo 只留規則、頁數同已經引用嘅短摘錄（語料庫本身已經有呢啲）。

唔見咗就由 PDF 重新整（PDF 喺 `Downloads/《中州派紫微斗数深造讲义》—王亭之.pdf`，595 頁）：

```bash
python tools/branch/ocr/render.py "<PDF>" "%LOCALAPPDATA%/guanwei/b5/png"
powershell -File tools/branch/ocr/ocr.ps1 -Dir "%LOCALAPPDATA%/guanwei/b5/png" -Out "%LOCALAPPDATA%/guanwei/b5/ocr.txt"
python tools/branch/ocr/build_text.py "%LOCALAPPDATA%/guanwei/b5/ocr.txt" "%LOCALAPPDATA%/guanwei/b5"
```

OCR 用 Windows 內置 `Windows.Media.Ocr`（zh-Hant-HK），595 頁大約十分鐘。重新 OCR 嘅誤認字可能同而家嗰份唔一樣，
ingest 停喺邊條，就改返嗰條嘅摘錄。

## 寫規則嘅規矩

每條規則：`R(id, when, text, en, src, quote, role)`。`src` 係原書摘錄（簡體，照抄 OCR，包括錯字），`quote` 係摘錄入面
讀者撳「據」會見到嘅一截（最少 4 字）。

- **唔寫**：生死、病、意外、官非、刑剋、流產、子女數目、生男生女、外遇、偏房、吸毒、弱智一類；金額同「巨富」一類保證；
  風水（近「化解」）；只按男女分嘅條文（引擎冇性別）；要靠引擎冇嘅星（天刑、天姚、天月、龍池鳳閣、桃花雜曜⋯）或者要分
  日夜生、廟陷嘅條文。原書講「某星守某宮之年應驗」嘅流年條文都唔用。
- **只講盤上有嘅**：唔好寫「見吉則⋯」「再見煞就⋯」。條件拆成另一條規則，用 `when` 管，盤上真係有先出。lint P3 會捉部份。
- **中英句數一樣**：英文按句對中文，中文一句（一個「。」）英文都要一句，唔係就譯唔到。
- **借對宮**：宮內冇主星會借對宮主星入嚟讀（`branch.ts` `applies()`），對宮嗰顆星同時算「同宮」同「相對」。
  寫「與某星相對」嘅條件要加 `{'not': {'star': X, 'at': 'same'}}`，唔係兩條會一齊出。
- **同一段唔好打架**：雙星宮會同時中組合題目同兩粒星嘅通則（最多 4 條）。通則講法同組合題目相反嘅，喺通則加
  `not` 排除嗰個組合。
- **講行運就填 `decade`**：規則講「行到某星嗰步運」，就喺規則加 `decade: ['天府']`（講某宮嗰步就寫 `'#酉'`）。講到嘅運全部喺
  九十歲後先起步（大限章冇列，`src/steps.ts`），引擎就唔出嗰條。命宮星系嘅規則喺 `xingxi/NN.json` 直接加呢個欄。
- **宮位連動**：條件可以睇第二個宮：`{'palace': '官祿', 'is': 'good' | 'bad'}`（吉凶定義見 `branch.ts` `palaceState()`：
  有化忌或兩粒以上煞星係不吉；有祿權科、祿存或兩粒以上輔佐星係吉；其餘中性唔出），或者 `{'palace': '夫妻', 'star': '地劫'}`。
  連動題目加 `'link': True`，細讀入面排最前。寫連動句之前要搵晒其他章有冇相反講法（例如夫妻宮「宜合作」對官祿章
  「不宜合作」），有就喺嗰邊加 `not` 條件。
- **宮名**：讀者見到嘅一律叫「僕役宮」，唔叫交友宮（`barnum.test.ts`）；出處註保留原書章名「交友宮」。
- **句子要有主語、講清楚意思**：每句最少 14 字，廿字以下一定要有「你」（「宜遲婚。」唔得，要寫「貪狼在辰戌，晚一點結婚對你比較好。」）。
  `branch.test.ts` 會查。句子加長之後留意同一段其他句會唔會有 6 個字相同 —— 相同就會被當重複剷走（`restates()`）。
- **泛稱用〔〕標**：「見吉」「見煞忌」「輔佐吉星」呢類泛稱，讀者唔知係邊粒星。寫成「紫微見〔煞忌〕」，引擎會填返
  令呢條規則成立嘅星（`branch.ts` `fillSlots()`）：「紫微化忌，又見擎羊」。
  - 〔〕入面嘅字決定揀邊類：有「煞」＝羊陀火鈴空劫（有「忌」再加化忌）；「吉化」＝化祿權科；「吉星」「輔佐吉星」
    「成對的輔佐星」＝左右昌曲魁鉞；單一個「吉」或者「吉化吉星」＝以上吉嘅全部加祿存。
  - 只係標條件（`when`）真係有檢查嗰類星嘅泛稱 —— 條件冇查嗰類星就永遠填唔到，照出泛稱。冇 `when` 嘅規則唔准標。
  - 唔好標否定、讓步、假設同講將來行運嘅（「無煞」「即使見吉」「只要見吉化」「行到⋯又見吉化的那幾步」）：
    嗰啲星唔係而家盤上成立嘅條件。
  - 英文都要標，數目同中文一樣、次序一樣：「Zi Wei meets 〔harsh stars or Obstruction〕」。英文會填同一批星
    （`en/render.ts` `fillEn()`）：「Zi Wei meets Qing Yang and Zi Wei in Obstruction」；主星自己嘅四化寫「its own Abundance」。
    〔〕前後嘅英文要填咗星名都讀得通（「well transformed」緊跟星名就唔得，改「with 〔good transformations〕」）。
    填唔到就照出〔〕入面嘅泛稱。
- **命宮星系（骨架章）用真宮名**：命宮嘅對宮一定係遷移宮，三合一定係財帛宮、官祿宮。寫「對面遷移宮的太陽」，
  唔寫「對宮的太陽」；寫「財帛宮、官祿宮的⋯」，唔寫「三合的⋯」「會合的⋯」（`xingxi.test.ts` 會查）。
  「會照的X」照寫：引擎（`branch.ts` `placeHui()`）會換成X真正坐嘅宮（「財帛宮的天機化忌」），英文嘅
  「in your trine」跟住換。「對面遷移宮」唔計重複（`restates()` 前拎走）。改 `systems.json` 嘅句要喺 `en/tm.json`
  加新句嘅英文，**舊句唔好刪**（舊書照用舊句，R-008）。
- **太陽太陰入廟落陷**：條件 `{'bright': 'high' | 'low', 'star': '太陽' | '太陰'}`（2026-10-12 起用）。只得兩頭：
  太陽 high 寅卯辰巳午、low 子丑戌亥；太陰 high 子丑酉戌亥、low 卯辰巳午（`branch.ts` `BRIGHT`，引擎表同原書表都同意嘅格）。
  其他星嘅廟陷、中間幾檔、要分日生夜生嘅條文照舊唔用。條文寫「入廟」就寫「光熱充足／光亮」，「落陷」寫「光熱不足／光弱」。
- **題目次序 = 輸出次序**：組合／地支題目擺前，單星通則其次，`stars: []` 嘅唔限主星通則擺最尾，主星規則少過兩條先補上。
- **index 前綴**：`src/branch/index.ts` 用變數名前綴分辨來源（`x` 星系、`f c g q d t m b j z` 各宮）。加新宮要揀未用過嘅字母，
  `x` 已經用咗。
