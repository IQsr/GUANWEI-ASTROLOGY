#!/usr/bin/env python3
"""
觀微 — 曆法表生成（工單 B1）

一次性腳本。唔喺 runtime 行，唔喺 CI 行。
輸出：packages/ziwei/src/calendar/tables.json

生成兩張表：
  1. 二十四節氣  1900–2100，每年 24 個時刻（東八區分鐘數，delta 編碼）
  2. 農曆年      1900–2100，每年 [正月初一日序, 閏月, 月大小 bitfield]

為咩要離線生成：農曆同節氣係天文計算，唔應該喺每次排盤時再算。
離線算一次、入 repo、加 checksum，就永遠一致、可審、runtime 零依賴。

基準：中國標準時 UTC+8（120°E）—— 農曆嘅法定定義基準（GB/T 33661-2017）。
"""

import ephem
import json
import math
from datetime import date, datetime, timedelta, timezone

YEAR_FROM, YEAR_TO = 1900, 2100
# 中國曆法嘅時間基準有一次歷史性轉換：
#   1929-01-01 之前 —— 北京地方平時（116°25′E）= UTC+7:45:40
#   1929-01-01 之後 —— 東經 120° 標準時       = UTC+8
# 唔處理呢個轉換，1929 年前嘅朔日會有幾個月差一日，連帶閏月都會錯。
OLD_OFFSET = timedelta(hours=7, minutes=45, seconds=40)
NEW_OFFSET = timedelta(hours=8)
SWITCH_UTC = datetime(1928, 12, 31, 16, 0, 0)   # = 1929-01-01 00:00 (+08)
EPOCH_DATE = date(1900, 1, 1)
UTC_EPOCH = datetime(1900, 1, 1)


def china_offset(dt_utc):
    return NEW_OFFSET if dt_utc >= SWITCH_UTC else OLD_OFFSET

# 二十四節氣：黃經度數 → 名。0° = 春分。
TERMS = [
    (315, "立春"), (330, "雨水"), (345, "驚蟄"), (0, "春分"),
    (15, "清明"), (30, "穀雨"), (45, "立夏"), (60, "小滿"),
    (75, "芒種"), (90, "夏至"), (105, "小暑"), (120, "大暑"),
    (135, "立秋"), (150, "處暑"), (165, "白露"), (180, "秋分"),
    (195, "寒露"), (210, "霜降"), (225, "立冬"), (240, "小雪"),
    (255, "大雪"), (270, "冬至"), (285, "小寒"), (300, "大寒"),
]
# 中氣 = 偶數位（雨水、穀雨、小滿…）：黃經為 30 嘅倍數
MAJOR_LONS = {lon for lon, _ in TERMS if lon % 30 == 0}


def sun_lon(dt_utc):
    """
    太陽視黃經（度），以「當日春分點」為基準。

    注意 epoch=d 呢個參數唔可以慳：ephem.Ecliptic 預設用 J2000 座標，
    但節氣定義用嘅係當日春分點。兩者相差歲差量（約 50"／年），
    1900 年差約 1.4°，即係成日 —— 足以令節氣同閏月全部錯位。
    """
    d = ephem.Date(dt_utc)
    s = ephem.Sun(d)
    return math.degrees(ephem.Ecliptic(s, epoch=d).lon) % 360


def find_term(target_lon, around_utc):
    """由 around_utc 附近搵太陽黃經等於 target_lon 嘅時刻（UTC datetime）。"""
    def diff(dt):
        d = (sun_lon(dt) - target_lon + 180) % 360 - 180
        return d

    lo = around_utc - timedelta(days=20)
    hi = around_utc + timedelta(days=20)
    # 二分：diff 由負變正
    for _ in range(60):
        mid = lo + (hi - lo) / 2
        if diff(mid) < 0:
            lo = mid
        else:
            hi = mid
    return lo + (hi - lo) / 2


def utc_minutes(dt_utc):
    """UTC datetime → 由 1900-01-01T00:00Z 起計嘅分鐘數。

    節氣一律存 UTC —— 唔好存本地時，因為 1929 年前後基準唔同，
    存本地時會令同一個表入面兩段時間嘅意思唔一樣。
    """
    return round((dt_utc - UTC_EPOCH).total_seconds() / 60)


def cst_day_index(dt_utc):
    """呢個 UTC 時刻喺中國民用曆屬邊一日（由 1900-01-01 起計嘅日序）。"""
    local = dt_utc + china_offset(dt_utc)
    return (local.date() - EPOCH_DATE).days


# ── 一、節氣表 ────────────────────────────────────────────────
def build_solar_terms():
    """每年 24 個節氣，由立春起。回傳 [(minutes, name)] 順序表。"""
    out = []
    for y in range(YEAR_FROM, YEAR_TO + 1):
        for lon, name in TERMS:
            # 各節氣大約落喺邊個月：立春(315°) ≈ 2月初，每 15° ≈ 半個月
            approx_month_day = {
                315: (2, 4), 330: (2, 19), 345: (3, 6), 0: (3, 21),
                15: (4, 5), 30: (4, 20), 45: (5, 6), 60: (5, 21),
                75: (6, 6), 90: (6, 21), 105: (7, 7), 120: (7, 23),
                135: (8, 8), 150: (8, 23), 165: (9, 8), 180: (9, 23),
                195: (10, 8), 210: (10, 23), 225: (11, 7), 240: (11, 22),
                255: (12, 7), 270: (12, 22), 285: (1, 6), 300: (1, 20),
            }[lon]
            m, d = approx_month_day
            # 小寒、大寒屬公曆年初，但屬「上一個立春年」嘅尾 —— 照公曆年放
            around = datetime(y, m, min(d, 28))
            t = find_term(lon, around)
            out.append((utc_minutes(t), name, y, lon))
    out.sort(key=lambda r: r[0])
    return out


# ── 二、農曆表 ────────────────────────────────────────────────
def new_moons(start_utc, end_utc):
    """區間內所有朔（UTC datetime）。"""
    res = []
    d = ephem.Date(start_utc)
    while True:
        d = ephem.next_new_moon(d)
        dt = d.datetime()
        if dt > end_utc:
            break
        res.append(dt)
        d = ephem.Date(d + 1)
    return res


def winter_solstice(y):
    return find_term(270, datetime(y, 12, 22))


def build_lunar_years():
    """
    每個農曆年輸出 [正月初一日序, 閏月(0=冇), 月大小 bitfield]。

    規則（現行農曆）：
      · 朔所在嗰日（東八區）為初一
      · 含冬至（黃經 270°）嘅月為十一月
      · 兩個十一月之間如果有 13 個月，第一個冇中氣嘅月為閏月
    """
    nm = new_moons(datetime(YEAR_FROM - 2, 1, 1), datetime(YEAR_TO + 2, 6, 1))
    starts = [cst_day_index(t) for t in nm]

    # 中氣日序（用嚟判斷有冇中氣）
    majors = []
    for y in range(YEAR_FROM - 2, YEAR_TO + 3):
        for lon, name in TERMS:
            if lon not in MAJOR_LONS:
                continue
            approx = {0: (3, 21), 30: (4, 20), 60: (5, 21), 90: (6, 21),
                      120: (7, 23), 150: (8, 23), 180: (9, 23), 210: (10, 23),
                      240: (11, 22), 270: (12, 22), 300: (1, 20), 330: (2, 19)}[lon]
            t = find_term(lon, datetime(y, approx[0], min(approx[1], 28)))
            majors.append(cst_day_index(t))
    majors = sorted(set(majors))
    major_set = set(majors)

    def has_major(i):
        """第 i 個朔月（starts[i] .. starts[i+1]-1）有冇中氣。"""
        return any(starts[i] <= m < starts[i + 1] for m in major_set)

    # 每年冬至所在嘅朔月 index = 該歲嘅十一月
    ws_index = {}
    for y in range(YEAR_FROM - 2, YEAR_TO + 2):
        wd = cst_day_index(winter_solstice(y))
        for i in range(len(starts) - 1):
            if starts[i] <= wd < starts[i + 1]:
                ws_index[y] = i
                break

    # 由每對冬至月推出月序，再抽出農曆年（正月至十二月）
    month_of = {}   # 朔月 index → (lunar_year, month, is_leap)
    for y in range(YEAR_FROM - 1, YEAR_TO + 1):
        a, b = ws_index.get(y - 1), ws_index.get(y)
        if a is None or b is None:
            continue
        span = b - a
        leap_at = None
        if span == 13:
            for k in range(1, 13):
                if not has_major(a + k):
                    leap_at = a + k
                    break
            if leap_at is None:
                leap_at = a + 12
        m = 11
        for i in range(a, b):
            if i == leap_at:
                # 閏月承上一個月嘅月號：閏X月 一定跟喺 X月 之後
                prev = 12 if m == 1 else m - 1
                month_of[i] = (None, prev, True)
                continue
            month_of[i] = (None, m, False)
            m = 1 if m == 12 else m + 1
        # 標年份：正月開始屬農曆 y 年
        cur_year = y - 1
        for i in range(a, b):
            _, mm, lp = month_of[i]
            if mm == 1 and not lp:
                cur_year = y
            month_of[i] = (cur_year, mm, lp)

    # 砌每年嘅 bitfield
    years = {}
    for i in range(len(starts) - 1):
        rec = month_of.get(i)
        if not rec:
            continue
        ly, mm, lp = rec
        if ly is None or not (YEAR_FROM <= ly <= YEAR_TO):
            continue
        years.setdefault(ly, [])
        length = starts[i + 1] - starts[i]
        years[ly].append((mm, lp, starts[i], length))

    out = {}
    for ly in range(YEAR_FROM, YEAR_TO + 1):
        ms = sorted(years.get(ly, []), key=lambda r: r[2])
        if not ms:
            continue
        first_day = ms[0][2]
        leap = next((m for m, lp, _, _ in ms if lp), 0)
        bits = 0
        for idx, (_, _, _, length) in enumerate(ms):
            if length == 30:
                bits |= 1 << idx
        out[ly] = [first_day, leap, bits, len(ms)]
    return out


def published_year_records():
    """
    由兩個獨立嘅公佈農曆表（lunardate、borax）重建年記錄。

    用途見 reconcile()：呢啲係公佈曆，唔係計算結果。
    """
    from lunardate import LunarDate as LD
    from borax.calendars.lunardate import LunarDate as BLD

    def scan(get):
        """由逐日查詢重建年記錄。

        每個月嘅長度要用下一個月嘅起日去減，所以一定要先砌一條
        橫跨全期嘅朔日序列，再切開逐年 —— 淨係睇同一年嘅月份，
        最後一個月會冇長度。
        """
        seq = []          # [(day_index, lunar_year, month, is_leap)]
        d = date(1900, 1, 31)
        end_d = date(2100, 12, 20)
        while d <= end_d:
            try:
                y, m, dd, lp = get(d)
            except Exception:
                break   # 公佈表覆蓋範圍到此為止
            if dd == 1:
                seq.append(((d - EPOCH_DATE).days, y, m, lp))
            d += timedelta(days=1)

        by_year = {}
        for i in range(len(seq) - 1):
            day_i, y, m, lp = seq[i]
            length = seq[i + 1][0] - day_i
            by_year.setdefault(y, []).append((m, lp, day_i, length))

        recs = {}
        for y, ms in by_year.items():
            ms.sort(key=lambda r: r[2])
            if len(ms) not in (12, 13):
                continue
            if ms[0][0] != 1 or ms[0][1]:
                continue
            leap = next((m for m, lp, _, _ in ms if lp), 0)
            bits = 0
            for i, (_, _, _, length) in enumerate(ms):
                if length == 30:
                    bits |= 1 << i
            recs[y] = [ms[0][2], leap, bits, len(ms)]
        return recs

    a = scan(lambda d: (lambda r: (r.year, r.month, r.day, bool(r.isLeapMonth)))(
        LD.from_solar_date(d.year, d.month, d.day)))
    b = scan(lambda d: (lambda r: (r.year, r.month, r.day, bool(r.leap)))(
        BLD.from_solar_date(d.year, d.month, d.day)))
    return a, b


def reconcile(mine):
    """
    同兩個公佈表對數，規則：

      兩個公佈表一致而同我唔同  → 用公佈表（農曆係公佈嘅民用曆，
                                  唔係我哋重算出嚟嘅嘢，佢哋為準）
      兩個公佈表互相唔同        → 用我嘅計算做仲裁，並記錄

    每一項都記低，唔靜靜雞改。
    """
    a, b = published_year_records()
    overridden, tiebroken = [], []
    for y in sorted(mine):
        ra, rb, rm = a.get(y), b.get(y), mine[y]
        if ra is None or rb is None:
            continue
        if ra == rb:
            if rm != ra:
                overridden.append({"year": y, "mine": rm, "published": ra})
                mine[y] = ra
        else:
            if rm != ra or rm != rb:
                tiebroken.append({
                    "year": y, "mine": rm, "lunardate": ra, "borax": rb,
                    "agreesWith": "lunardate" if rm == ra else ("borax" if rm == rb else "neither"),
                })
    return overridden, tiebroken


def main():
    print("計節氣… (201 年 × 24)")
    terms = build_solar_terms()
    print(f"  {len(terms)} 個")

    print("計農曆…")
    lunar = build_lunar_years()
    print(f"  {len(lunar)} 年")

    print("同公佈曆對數…")
    overridden, tiebroken = reconcile(lunar)
    print(f"  採用公佈表覆蓋：{[o['year'] for o in overridden]}")
    print(f"  公佈表互相唔同、由計算仲裁：{[t['year'] for t in tiebroken]}")

    base = terms[0][0]
    deltas = [terms[i][0] - terms[i - 1][0] for i in range(1, len(terms))]

    tables = {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "generator": "tools/gen-calendar/generate.py",
            "library": f"pyephem {ephem.__version__}",
            "termsEpoch": "1900-01-01T00:00Z（節氣時刻存 UTC 分鐘）",
            "lunarEpoch": "1900-01-01 中國民用曆日序",
            "meridian": "1929 年前：北京地方平時 UTC+7:45:40；1929 年起：UTC+8",
            "yearFrom": YEAR_FROM,
            "yearTo": YEAR_TO,
            "note": "時刻單位＝分鐘；日序＝由 epoch 起計嘅日數",
        },
        "termNames": [name for _, name in TERMS],
        "termsStartIndex": TERMS.index(next(t for t in TERMS if t[1] == terms[0][1])),
        "termsBase": base,
        "termsDelta": deltas,
        "lunarYears": {str(y): v for y, v in sorted(lunar.items())},
        "divergence": {
            "note": "農曆係公佈嘅民用曆。兩個公佈表一致就跟公佈表；"
                    "兩個公佈表互相唔同先由本引擎嘅天文計算仲裁。",
            "publishedWins": overridden,
            "computedTiebreak": tiebroken,
        },
    }

    import pathlib
    p = pathlib.Path(__file__).resolve().parents[2] / "packages/ziwei/src/calendar/tables.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(tables, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"寫入 {p}  ({p.stat().st_size/1024:.1f} KB)")


if __name__ == "__main__":
    main()
