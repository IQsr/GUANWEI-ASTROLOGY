#!/usr/bin/env python3
"""
生成表嘅驗證（工單 B1 驗收）。

同兩個獨立嘅公佈農曆表對照：lunardate、borax。
兩個表本身都唔完全一致 —— 邊度唔一致、我哋企邊邊，全部要記錄。
"""
import json, pathlib, random, collections
from datetime import date, timedelta
from lunardate import LunarDate as LD
from borax.calendars.lunardate import LunarDate as BLD

P = pathlib.Path(__file__).resolve().parents[2] / "packages/ziwei/src/calendar/tables.json"
T = json.loads(P.read_text(encoding="utf-8"))
EPOCH = date(1900, 1, 1)
LY = {int(k): v for k, v in T["lunarYears"].items()}


def months_of(y):
    first, leap, bits, n = LY[y]
    out, cur, m, used = [], first, 1, False
    for i in range(n):
        ln = 30 if (bits >> i) & 1 else 29
        if leap and m == leap + 1 and not used:
            out.append((leap, True, cur, ln)); used = True
        else:
            out.append((m, False, cur, ln)); m += 1
        cur += ln
    return out


IDX = {}
for y in sorted(LY):
    for m, lp, s, ln in months_of(y):
        for k in range(ln):
            IDX[s + k] = (y, m, k + 1, lp)


def main():
    start, end = date(1900, 2, 1), date(2099, 12, 31)
    mine_vs_ld = collections.Counter()
    mine_vs_bx = collections.Counter()
    ld_vs_bx = collections.Counter()
    n = 0
    d = start
    while d <= end:
        di = (d - EPOCH).days
        mine = IDX.get(di)
        a = LD.from_solar_date(d.year, d.month, d.day)
        ta = (a.year, a.month, a.day, bool(a.isLeapMonth))
        b = BLD.from_solar_date(d.year, d.month, d.day)
        tb = (b.year, b.month, b.day, bool(b.leap))
        if mine != ta: mine_vs_ld[d.year] += 1
        if mine != tb: mine_vs_bx[d.year] += 1
        if ta != tb: ld_vs_bx[d.year] += 1
        n += 1
        d += timedelta(days=1)

    print(f"全期 {n} 日（1900-02-01 … 2099-12-31）")
    print(f"  我 vs lunardate  差異 {sum(mine_vs_ld.values()):5d} 日，年份 {sorted(mine_vs_ld)}")
    print(f"  我 vs borax      差異 {sum(mine_vs_bx.values()):5d} 日，年份 {sorted(mine_vs_bx)}")
    print(f"  lunardate vs borax 差異 {sum(ld_vs_bx.values()):5d} 日，年份 {sorted(ld_vs_bx)}")

    # 隨機 200 日（驗收條文）
    random.seed(7)
    days = (end - start).days
    sample = [start + timedelta(days=random.randrange(days)) for _ in range(200)]
    ok_ld = sum(1 for x in sample
                if IDX.get((x - EPOCH).days) ==
                (lambda r: (r.year, r.month, r.day, bool(r.isLeapMonth)))(LD.from_solar_date(x.year, x.month, x.day)))
    ok_bx = sum(1 for x in sample
                if IDX.get((x - EPOCH).days) ==
                (lambda r: (r.year, r.month, r.day, bool(r.leap)))(BLD.from_solar_date(x.year, x.month, x.day)))
    print(f"  隨機 200 日：對 lunardate {ok_ld}/200，對 borax {ok_bx}/200")

    # 節氣抽查
    base, deltas, names = T["termsBase"], T["termsDelta"], T["termNames"]
    st = T["termsStartIndex"]
    times, cur = [base], base
    for dl in deltas:
        cur += dl; times.append(cur)
    UTC0 = date(1900, 1, 1)

    def term_local_date(i):
        # 節氣存 UTC 分鐘；轉返中國民用日
        mins = times[i]
        off = 8 * 60 if mins >= (28 * 365 + 7) * 24 * 60 + 16 * 60 else 7 * 60 + 45
        return UTC0 + timedelta(minutes=mins + off)

    idx_name = [names[(st + i) % 24] for i in range(len(times))]
    known = {
        ("冬至", 2024): date(2024, 12, 21), ("立春", 2025): date(2025, 2, 3),
        ("春分", 2025): date(2025, 3, 20), ("夏至", 2025): date(2025, 6, 21),
        ("秋分", 2024): date(2024, 9, 22), ("冬至", 1900): date(1900, 12, 22),
        ("立春", 2000): date(2000, 2, 4), ("清明", 2025): date(2025, 4, 4),
        ("冬至", 2050): date(2050, 12, 22),  # UTC 12-21 16:34 → 中國時間 12-22 ("立春", 1950): date(1950, 2, 4),
    }
    ok = 0
    for (nm, yr), expect in sorted(known.items(), key=lambda kv: kv[0][1]):
        found = [term_local_date(i) for i in range(len(times))
                 if idx_name[i] == nm and term_local_date(i).year == yr]
        got = found[0] if found else None
        mark = "✓" if got == expect else "✗"
        ok += got == expect
        print(f"  {mark} {yr} {nm}: 表={got} 預期={expect}")
    print(f"節氣抽查 {ok}/{len(known)}")


if __name__ == "__main__":
    main()
