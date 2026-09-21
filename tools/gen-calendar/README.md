# 曆法表生成（工單 B1）

一次性腳本。**唔喺 runtime 行，唔喺 CI 行。**
輸出 `packages/ziwei/src/calendar/tables.json`，入 repo。

## 點解要離線生成

農曆同節氣係天文計算，唔應該喺每次排盤時再算：

- **永遠一致** —— 表入咗 repo，一年後排同一個生辰結果一樣
- **可審** —— JSON 睇得明，改咗 git diff 一眼睇到
- **runtime 零依賴** —— 唔使喺 server 裝天文庫
- **快** —— 查表 vs 天文計算

## 環境

| | |
|---|---|
| Python | 3.11 |
| [pyephem](https://rhodesmill.org/pyephem/) | 4.2.1 —— 節氣、朔 |
| [lunardate](https://pypi.org/project/lunardate/) | 對照用（公佈農曆表之一） |
| [borax](https://pypi.org/project/borax/) | 對照用（公佈農曆表之二） |
| 最後執行 | 2026-09-12 |

```bash
pip install ephem lunardate borax
python3 generate.py      # 生成
python3 verify.py        # 驗證
```

## 兩張表

**節氣**　1900–2100，每年 24 個。存 **UTC 分鐘**（由 1900-01-01T00:00Z 起計），delta 編碼。
存 UTC 唔存本地時，因為 1929 年前後基準唔同（見下）——存本地時會令同一個表入面兩段時間嘅意思唔一樣。

**農曆年**　每年 `[正月初一日序, 閏月, 月大小 bitfield, 月數]`。日序係中國民用曆日序。

## 兩個唔可以慳嘅細節

### 一、`ephem.Ecliptic` 一定要指定 `epoch`

```python
ephem.Ecliptic(s, epoch=d).lon    # ✅ 當日春分點
ephem.Ecliptic(s).lon             # ❌ 預設 J2000
```

節氣定義用當日春分點。J2000 同 1900 差歲差量（約 50″／年）≈ **1.4°**，即係成日。
第一版就係咁錯，令 1900 年所有節氣同閏月全部錯位。

### 二、1929 年嘅基準轉換

| 時期 | 基準 |
|---|---|
| 1929-01-01 之前 | 北京地方平時（116°25′E）= **UTC+7:45:40** |
| 1929-01-01 之後 | 東經 120° 標準時 = **UTC+8** |

唔處理呢個轉換，1914／1916／1920 嘅朔日會差一日，連帶閏月都錯。

## 農曆點對數

農曆係**公佈嘅民用曆**，唔係我哋重算出嚟嘅嘢。所以：

> 兩個公佈表一致而同計算結果唔同 → **用公佈表**
> 兩個公佈表互相唔同 → **用計算結果仲裁**，並記錄

每一項都寫落 `tables.json` 嘅 `divergence`，唔靜靜雞改。

現況：

- **公佈表覆蓋**：1906、1922（兩個公佈表一致，計算結果讓路）
- **計算仲裁**：1933、1954、1978（lunardate 係少數）；2057、2089、2097（borax 係少數）

## 驗證結果（2026-09-12）

```
隨機 200 日：對 lunardate 200/200，對 borax 200/200
節氣抽查：9/9（含 2050 冬至呢個近午夜個案）
```

`verify.py` 會跑全期 73,018 日逐日對照，唔止 200 日。

## 改咗表之後

`tables.json` 有 sha256 checksum 寫喺 `packages/ziwei/src/calendar/tables.ts`，
測試會實算一次同佢比對。重新生成之後要更新：

```bash
pnpm --filter @guanwei/ziwei run checksum
```

然後**一定要 bump `ENGINE_VERSION`** —— 表變咗即係所有新排嘅盤都可能變。
舊盤唔重算（見《排盤引擎 v0.1》第九節）。
