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
- **宮名**：讀者見到嘅一律叫「僕役宮」，唔叫交友宮（`barnum.test.ts`）；出處註保留原書章名「交友宮」。
- **題目次序 = 輸出次序**：組合／地支題目擺前，單星通則其次，`stars: []` 嘅唔限主星通則擺最尾，主星規則少過兩條先補上。
- **index 前綴**：`src/branch/index.ts` 用變數名前綴分辨來源（`x` 星系、`f c g q d t m b j z` 各宮）。加新宮要揀未用過嘅字母，
  `x` 已經用咗。
