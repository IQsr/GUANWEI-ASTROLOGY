# 王亭之參考資料入口

寫命書、補出處、寫規則之前，由呢度查。目標係快速定位完整相關原頁，再核對條件；搜尋分數唔係吉凶權重，亦唔決定應採用邊個結論。

初階同深造現時都有獨立詳細入口：

- [INITIAL.md](INITIAL.md)：初階25篇導讀、113項附段號重點、小節／段內分支及8組閱讀問題。來源係第三方轉錄，尚未對原書校勘。
- [DEEP.md](DEEP.md)：深造20個大章、92項附原頁重點、六十星系摘要、354個小節／圖片入口，以及人工條件卡與待核清單。來源係本機595頁PDF。

深造專用查閱：

```powershell
python tools/wang-reference/deep.py search --part friends --pair 紫破
python tools/wang-reference/deep.py search --part career --stars 天機 --condition 化科
python tools/wang-reference/deep.py show --section deep.system.17
python tools/wang-reference/deep.py show --id wtz.deep.p087.b014 --context 0
python tools/wang-reference/deep.py check
```

深造按同頁內嘅實際標題位置分節；偵測到跨頁續句會連前後段顯示。續接係按同小節及標點推測嘅閱讀輔助，唔代替原頁段落校勘。`--condition`只查字詞，未把四化字詞自動綁定到指定星曜；例如命宮太陽化科可以出現喺天機事業段，仍須核對原文對象。
人工拆過嘅前提同例外見 [條件卡](deep/CONDITIONS.md)；五組示範唔等於全書全部分支已拆完。原PDF疑字、近形字、圖表同253條舊引文差異見 [待核清單](deep/REVIEW.md)。
詳細索引係 [deep-index.json](deep-index.json)，人工摘要係 [deep-guides.json](deep-guides.json)，逐節結構係 [deep-structure.json](deep-structure.json)。原文只放忽略嘅 `tmp/wang-reference/deep/`。
改摘要後用 `deep.py build` 重建；改章節偵測先 `deep.py scan`，再核對原頁同編輯導航。移機先 `reference.py build` 建立底層頁文字，詳細摘要同時核對PDF及頁文字指紋；唔可只換指紋跳過來源與段號覆核。

### 253條舊引文：逐項核對結果

[完整總表](deep/EXCERPT-AUDIT.md)分開記定位差異、原頁提取行、段ID、現有中文消費句及修改建議。253項均已有逐項裁定：61項主要處理定位／摘錄格式、85項須補引上下文或修飾、59項文案需收窄、40項條件／範圍不足、7項原檔或讀法待核、1項未見直接使用。分類互斥，唔等於所有相關文案或引擎已核實。

```powershell
python tools/wang-reference/excerpt_audit.py show --id deep.星系06.8 --source
python tools/wang-reference/excerpt_audit.py search --verdict fix_conditions
python tools/wang-reference/excerpt_audit.py check
```

機讀結果：[excerpt-audit.json](excerpt-audit.json)；人工裁定入口：[excerpt-decisions.json](excerpt-decisions.json)，修改後用`excerpt_audit.py build`。結果保存287個直接引用位置、11個由branch basis連到星系正文的間接掛源，原書正文仍只由忽略快取讀取。產品文案、摘引庫及判斷引擎未隨本次審核改動。

本輪六十星系重點係`plain.basis`、`plain.lean`及逐項指出的其他中文欄；舊稿`core/trine/lean`、整套點票規則、所有英文及實際命盤未全核。宮位plain的來源只覆蓋`summary`，唔順便替`watch`背書。查舊passage先看本表；「原句找回」仍唔代表原文支持現有完整文案或程式已判對原局。來源或消費句改動會令核對失效，工具會拒絕靜默重用裁定。

初階專用查閱：

```powershell
python tools/wang-reference/initial.py search --pair 紫破 --palace 交友
python tools/wang-reference/initial.py search --chapter 4 子時
python tools/wang-reference/initial.py search --stars 天機 --palace 官祿 --condition 化科
python tools/wang-reference/initial.py show --chapter 21 --section 紫微
python tools/wang-reference/initial.py show --id wtz.initial.21.p0022 --context 2
python tools/wang-reference/initial.py check
```

`initial.py` 由已取得嘅轉錄段落查；原文及HTML只存忽略嘅 `tmp/wang-reference/initial/`。
可追蹤嘅 [initial-index.json](initial-index.json) 保存詳細摘要、來源網址／指紋及段落導航，唔複製原文全文。
初階人工編輯入口係 [initial-guides.json](initial-guides.json)，修改後執行 `initial.py build`；新機要先 `initial.py fetch` 下載原筆記列出嘅25篇，再 `build`。`fetch --refresh` 先會更新已保存嘅來源。
人工摘要以 `reviewed_html_sha256` 綁定來源快照。網頁更新後，`build`會要求先對齊摘要及段號，唔會靜默沿用舊定位；核對後先更新該指紋。索引檢查通過仍唔等於逐條語意已對原書。

以下 `reference.py` 保留底層頁文字、舊passage反查、A2及既有資料使用審核；詳細摘要優先用上面嘅 `deep.py`／`initial.py`。其中 `--kind notes` 只保留舊版簡短摘要。

- 人讀目錄：[CATALOGUE.md](CATALOGUE.md)：章節、六十星系、初階25篇、版本差異、A2缺口。
- AI／程式索引：[index.json](index.json)：頁定位、星曜／組合／宮位／條件／時間層字詞、現有 passage id、資料反查及輸入指紋。
- 原文查閱：`reference.py search` → `reference.py show`。只需本機Python，查詢唔使網絡或模型。
- 手工編輯入口：[curated.json](curated.json)。修改後重建；唔直接改生成嘅目錄或索引。

## 即刻用

喺專案根目錄執行；查詢只用Python標準庫，建庫文字提取另需 `pypdf`。

```powershell
# 組合先行：原文明寫紫破／紫微破軍，亦屬交友章或提及交友宮
python tools/wang-reference/reference.py search --pair 紫破 --palace 交友

# 讀命中頁前後文（預設前後各一頁）；唔只睇搜尋節錄
python tools/wang-reference/reference.py show --page 504 --context 1

# 天機事業宮，附四化字詞；繁體、簡體均可
python tools/wang-reference/reference.py search --stars 天機 --palace 官祿 --condition 化科

# 時間層只係原文提及，仍需看明講緊本命、所行宮垣定四化交涉
python tools/wang-reference/reference.py search --pair 同梁 --layer 流年

# 查已摘引文，以及佢喺邊份JSON／邊條規則用緊
python tools/wang-reference/reference.py search --kind passages --pair 紫破 --palace 僕役
python tools/wang-reference/reference.py show --id xingxi.17

# 已有摘引文，但未見現有資料引用（唔等於全書未用內容清單）
python tools/wang-reference/reference.py search --kind passages --usage not_referenced_in_scanned_data

# 初階只查摘要導航；篇號唔係原書頁碼
python tools/wang-reference/reference.py search 子時 --kind notes

# A2缺口、引用使用統計；--review另列逐字比對待核條目
python tools/wang-reference/reference.py audit
python tools/wang-reference/reference.py audit --review
python tools/wang-reference/reference.py check
```

每個搜尋詞之間用 AND；`--stars 紫微 破軍` 只要求同頁／同條提到兩星，**唔保證同宮**。查組合優先用 `--pair 紫破`，但名稱出現仍唔證明該條適用某盤。`--palace` 會優先排該宮章節，亦保留其他章提及該宮嘅材料，方便找交涉規則。

「合作」會同搜合作、合伙、合股；但有啲合作材料只寫下屬另謀發展，所以唔好一開始將所有條件塞滿。先查星系、宮位，再收窄話題。查唔到只表示呢個查法未命中，唔代表作者冇講。

## AI 每次引用流程

1. 查組合／星系、所論宮位，再查四化、廟陷、配曜及時間層。可用 `curated.json` 嘅 reading_routes 起步。
2. 用 `show` 讀原頁同前後頁。需要時擴到整節；圖片、表格、錯字或否定詞有歧義，要看原PDF。
3. 記低書名、PDF指紋、PDF頁、章節、passage id（如已有），再用自己文字寫原文重點。
4. 分開保存：原文明示嘅必要條件／排除條件、當前命盤是否符合、修飾與相反材料、適用宮位及時間層。未確定就標未核，唔自己補主語、補前提或賦權重。
5. 對照已知版本差異。組合、單星、宮垣、四化互有修飾時，一齊讀完先形成該話題嘅判斷；分歧未解就記錄，唔靠刪句假裝解決。
6. 將書中判斷、編輯演繹、生活例子／建議分開；寫作唔可以比原文支持嘅意思更強。大限／流年要再核對同本命嘅差異，唔因搜尋到相同星名就抄本命句。

`condition_mentions`、`layer_mentions`、`pair_mentions` 全部係檢索標籤，**唔係已核對嘅判斷條件**。例如「無煞」同「見煞」、「不宜會照」同「宜會照」，必須讀返原文。`uses[].encoded_conditions` 沿用現有資料條件，未經本索引新增語意認證。

## 來源與可信範圍

| 材料 | 本次可以做甚麼 | 仲未證明甚麼 |
|---|---|---|
| 本機《深造講義》595頁PDF | 原頁全文搜尋、頁碼回查、PDF指紋固定版本 | 出版資訊、所有錯字、每條推論語意已逐項審核 |
| 第327–332頁圖片／圖表 | OCR供標題及部分字詞定位，保留原頁圖 | 表格行列、廟陷數值、垂直文字完整性；必須視覺核對 |
| 現有1,592條摘引文 | 保留既有id及頁碼，逐字比對，反查現有資料 | 有引用唔等於文案受支持；未吻合者列待核，唔自動更正文案 |
| 初階25篇轉錄及詳細導讀 | 本次已取網頁、分段、寫詳細摘要並附段號；用initial.py查 | 原書頁碼、原書版本與轉錄一致性；初階原書尚未在手 |
| 《紫微斗數全書》及舊決策紀錄 | 四化、廟陷等比較線索 | 唔歸入王亭之著作，亦唔同王亭之融合成不具名共識 |

原有「已核」註記係沿用紀錄；本次另做文字比對，唔替過往語意審查背書。PDF提取同OCR仍會有錯字。`text_match: needs_page_review` 可能係摘引文加咗標題、跨段、或原檔提取差異，唔可以直接當作產品錯誤。

資料反查掃描 `packages/content/src/**/*.json`（排除 `sources/`），保留精確JSON Pointer及record id。`referenced_in_data` 只表示呢個資料範圍引用咗；唔代表執行時會選中、已發布或已通過語意審核。`not_referenced_in_scanned_data` 亦唔排除TS檔、文件或其他工作區有用過。

A2口徑係 `plain/palace.json` 排除命宮、疾厄：10宮 × 14星 = 140個；78個有source、62個未有。初建結果見目錄，改資料後須重建。

## 重建與移機

全文放喺已被 `.gitignore` 忽略嘅 `tmp/wang-reference/`，唔加入Git。可追蹤嘅 `index.json` 無原書全文，只有導航、檢索標籤及資料引用位置；原有摘引文仍留喺原 corpus，唔另抄一份。

```powershell
python tools/wang-reference/reference.py build
# 原書位置唔同時
python tools/wang-reference/reference.py build --pdf 'D:/books/深造講義.pdf' --notes 'D:/books/初階講義-25頁重點筆記.md'
```

預設讀本機 `~/Downloads/《中州派紫微斗数深造讲义》—王亭之.pdf` 同同目錄初階筆記。只接受595頁版本，其他版本要另建頁碼映射，唔可套用本目錄。

圖片頁OCR會用 `pdftoppm` 同Windows內置中文OCR，結果亦只存 `tmp/`，按PDF指紋重用。無工具／OCR權限時仍會產生其餘索引，並明確報告缺少文字頁；`check`會指出缺口。可用以下命令獨立補OCR，再重建：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/wang-reference/ocr-pages.ps1 -RequestPath tmp/wang-reference/ocr-request.json -OutputPath tmp/wang-reference/ocr-pages.json
python tools/wang-reference/reference.py build
```

`build --pages-cache PATH` 只係排錯入口，會標文字未重新對原PDF，唔應作正式交付。新增或修改資料會觸發索引過期提示；先重建再作引用審核。
