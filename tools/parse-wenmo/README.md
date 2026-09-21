# 文墨天機 PDF 解析（工單 B12b）

將文墨天機 pro 匯出嘅命盤 PDF 轉做 JSON，畀 `conformance-wenmo.test.ts` 用。

## 點解要有呢個

`conformance-iztro` 唔算獨立驗證 —— 我哋跟過 iztro 學排盤，佢會同我哋一齊錯。
文墨天機係閉源商業軟件，同我哋零關係，所以佢係**獨立證人**。

（佢仍然唔係 ground truth。ground truth 係書本例盤，工單 B5。）

## 用法

```bash
pip install pdfplumber
python3 tools/parse-wenmo/parse.py \
  packages/ziwei/test/fixtures/wenmo/*.pdf \
  > packages/ziwei/test/fixtures/wenmo-charts.json
```

跑完之後 `pnpm test` 應該仍然綠。唔綠就代表出現咗未記錄差異 ——
處理方法見 `docs/engine-divergence.md` 最後一節。

## 點解用座標唔用 pdftotext

個 PDF 係四乘四格嘅命盤。`pdftotext -layout` 會將唔同宮嘅字撈埋同一行，
分唔清邊粒星屬邊個宮、邊個廟旺對應邊粒星。所以用 pdfplumber 攞每個字嘅
`(x, y)`，再按格分。

格線係寫死嘅（`XS` / `YS`），對住 A4 橫向、文墨天機 pro 2.5.9 嘅版面。
**如果文墨改版，呢啲數要重新度。** 度法：搵十二個宮嘅地支標記（13pt 單字），
佢哋喺每格右下角。

## 攞唔到嘅嘢

呢三樣係畫出嚟嘅，唔喺 PDF 文字層：

| | 點算 |
|---|---|
| **生年四化** | 要截圖。人手核，結果記喺 `docs/engine-divergence.md` |
| **身宮** | 暫時唔核 |
| **宮名** | 推得返：命宮 = 起運歲最細嗰格（起運歲 = 局數），其餘順住逆數 |

## 加新盤

1. 喺文墨天機入生辰，匯出 PDF 落 `packages/ziwei/test/fixtures/wenmo/`
2. 檔名跟 `A01-紫微子.pdf` / `B03-閏上半月.pdf` 格式（A 組 = 廟旺覆蓋，B 組 = 打規則）
3. 涉及四化嘅盤要連截圖（同名 `.png`）
4. 重新跑上面條命令，再 `pnpm test`

**出生地一律用東經 120°、UTC+8**，除非專登考時區。
文墨天機睇落唔支援非中國出生地 —— B08 / B09 入咗倫敦，佢照計東八區
（真太陽時 08:29 = 120°E 嘅結果），所以 `rules.md` R-004 對唔到，仍然係「暫定」。
