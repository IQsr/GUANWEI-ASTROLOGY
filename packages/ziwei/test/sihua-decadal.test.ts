import { describe, expect, it } from 'vitest';
import oracle from './fixtures/sihua-decadal-oracle.json';
import {
  SIHUA_META,
  SIHUA_ORDER,
  STEMS,
  buildDecadals,
  decadalForward,
  disputedStems,
  isYangStem,
  resolvePalaces,
  sihuaOfStar,
  sihuaOfStem,
  type BirthInput,
} from '../src/index';

function inputFor(c: { solar: number[]; shichen: number; gender: string }): BirthInput {
  const [y, m, d] = c.solar as [number, number, number];
  return {
    solar: { y, m, d },
    time: { h: (c.shichen * 2) % 24, min: 0 },
    tz: 'Asia/Shanghai',
    place: { lng: 120, lat: 30, label: '東經 120 度' },
    sex: c.gender === '男' ? 'male' : 'female',
    options: { trueSolarTime: false },
  };
}

describe('四化表', () => {
  it('十個天干都齊，每個剛好四粒唔同嘅星', () => {
    for (const s of STEMS) {
      const row = sihuaOfStem(s);
      expect(row).not.toBeNull();
      const stars = SIHUA_ORDER.map((h) => row![h]);
      expect(stars).toHaveLength(4);
      expect(new Set(stars).size).toBe(4);
    }
  });

  it('庚干跟中州派：陽武府同（天府化科）', () => {
    expect(sihuaOfStem('庚')).toEqual({ 祿: '太陽', 權: '武曲', 科: '天府', 忌: '天同' });
  });

  /**
   * 三個干有分歧，唔係一個。
   *
   * 2026-09 核實（工單 B17）推翻咗原本「庚係唯一」嗰句 ——
   * 嗰句係冇出處嘅斷言。王亭之〈談左輔右弼的化科問題〉講中州派
   * 「左輔右弼不化科」，直接影響戊（右弼化科）同壬（左輔化科）。
   */
  it('戊、庚、壬三個干都標咗分歧', () => {
    expect(disputedStems()).toEqual(['戊', '庚', '壬']);
    const v = SIHUA_META.disputed['庚']!.variants;
    expect(Object.keys(v).sort()).toEqual(
      ['中州派（王亭之）', '世傳', '吳師青古本', '陸斌兆', '《紫微斗數全書》卷二'].sort(),
    );
  });

  /**
   * 2026-09-13：《全書》原文到手，戊同壬嘅處境分開咗。
   *
   *   戊 —— 我哋同**原文一致**（「戊貪月弼機為主」）。
   *         分歧喺中州派嗰邊（「左輔右弼不化科」），唔喺原文。冇 ⚠。
   *   壬 —— **原文同中州派兩邊都指向天府**，而我哋跟緊第三個版本。
   *         呢個唔再係「未核實」，係「核實咗但未決定改唔改」。保留 ⚠。
   */
  it('戊：同《全書》原文一致，所以唔再係待核', () => {
    expect(sihuaOfStem('戊')!.科).toBe('右弼');
    expect(SIHUA_META.disputed['戊']!.note).not.toContain('⚠');
    expect(SIHUA_META.disputed['戊']!.note).toContain('同《全書》原文一致');
  });

  /**
   * 壬干已經決定咗（2026-09-13）：維持左輔，跟通行本。
   *
   * 原文同中州派兩邊都指向天府 —— 我哋知道，而且揀咗唔跟。
   * 呢條測試守住嘅唔係個值，係**個決定有冇記錄低**：
   * 揀咗乜、否決咗乜、點解、代價係乜。
   * 冇呢啲欄位，呢個決定過幾個月就會退化成一個冇人記得點解嘅數字。
   */
  it('壬：維持左輔，但個決定要有完整記錄', () => {
    expect(sihuaOfStem('壬')!.科).toBe('左輔');
    const d = SIHUA_META.disputed['壬']!;
    // 唔再係 ⚠ 待決 —— 係已決定
    expect(d.note).not.toContain('⚠');
    expect(d.note).toContain('已決定');
    const dec = (d as unknown as { decision?: Record<string, string> }).decision!;
    for (const k of ['date', 'by', 'chose', 'rejected', 'reason', 'cost']) {
      expect(dec[k], `decision.${k}`).toBeTruthy();
    }
    expect(dec.rejected).toContain('天府');
    // 三個版本入面，有兩個係天府 —— 我哋揀咗少數嗰個，所以更加要寫低
    const fu = Object.values(d.variants).filter((x) => x['科'] === '天府');
    expect(fu).toHaveLength(2);
  });

  it('查星化乜', () => {
    expect(sihuaOfStar('甲', '廉貞')).toBe('祿');
    expect(sihuaOfStar('甲', '太陽')).toBe('忌');
    expect(sihuaOfStar('甲', '紫微')).toBeNull();
  });
});

describe('大限', () => {
  it('陰陽天干分得啱', () => {
    expect(STEMS.filter(isYangStem)).toEqual(['甲', '丙', '戊', '庚', '壬']);
  });

  it('陽男陰女順行，陰男陽女逆行', () => {
    expect(decadalForward('甲', 'male')).toBe(true); // 陽男
    expect(decadalForward('甲', 'female')).toBe(false); // 陽女
    expect(decadalForward('乙', 'male')).toBe(false); // 陰男
    expect(decadalForward('乙', 'female')).toBe(true); // 陰女
  });

  it('不變量 09：十二段連續、無缺口無重疊，起運歲 = 局數', () => {
    for (const stem of STEMS) {
      for (const sex of ['male', 'female'] as const) {
        for (const ju of [
          { name: '水二局', n: 2 },
          { name: '木三局', n: 3 },
          { name: '金四局', n: 4 },
          { name: '土五局', n: 5 },
          { name: '火六局', n: 6 },
        ] as const) {
          const d = buildDecadals({ mingGong: '子', wuxingJu: ju, yearStem: stem, sex });
          expect(d).toHaveLength(12);
          expect(d[0]!.fromAge).toBe(ju.n);
          for (let i = 0; i < 12; i++) {
            expect(d[i]!.toAge - d[i]!.fromAge).toBe(9);
            if (i > 0) expect(d[i]!.fromAge).toBe(d[i - 1]!.toAge + 1);
          }
          // 十二宮地支各一次
          expect(new Set(d.map((x) => x.branch)).size).toBe(12);
        }
      }
    }
  });

  it('第一段一定由命宮開始', () => {
    const d = buildDecadals({
      mingGong: '亥',
      wuxingJu: { name: '水二局', n: 2 },
      yearStem: '戊',
      sex: 'male',
    });
    expect(d[0]!.branch).toBe('亥');
    expect(d[0]!.fromAge).toBe(2);
    expect(d[1]!.branch).toBe('子'); // 陽男順行
  });
});

describe(`對照 iztro（${oracle.cases.length} 個）`, () => {
  it('大限全對（順逆同起運歲）', () => {
    const bad: string[] = [];
    for (const c of oracle.cases) {
      const r = resolvePalaces(inputFor(c));
      if (!r.ok) {
        bad.push(`${c.solar.join('-')} → ${r.code}`);
        continue;
      }
      const byBranch = new Map<string, string>(
        r.value.decadals.map((d) => [d.branch as string, `${d.fromAge}-${d.toAge}`]),
      );
      for (const entry of c.decadals as string[]) {
        const [b, range] = entry.split(':') as [string, string];
        if (byBranch.get(b) !== range) {
          bad.push(`${c.solar.join('-')} ${c.gender} ${b} 得 ${byBranch.get(b)} 應 ${range}`);
          break;
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('四化全對 —— 庚年除外（R-003 預期分歧）', () => {
    const bad: string[] = [];
    let gengSkipped = 0;
    for (const c of oracle.cases) {
      if (c.yearStem === '庚') {
        gengSkipped++;
        continue;
      }
      const r = resolvePalaces(inputFor(c));
      if (!r.ok) continue;
      const mine = r.value.layout.palaces
        .slice(2)
        .concat(r.value.layout.palaces.slice(0, 2))
        .map((p) =>
          p.stars
            .filter((s) => s.sihua)
            .map((s) => `${s.name}${s.sihua}`)
            .sort()
            .join('·'),
        );
      const theirs = c.sihua as string[];
      for (let i = 0; i < 12; i++) {
        if (mine[i] !== theirs[i]) {
          bad.push(`${c.solar.join('-')} ${c.yearStem}年 第${i + 1}格 得「${mine[i]}」應「${theirs[i]}」`);
          break;
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
    expect(gengSkipped).toBeGreaterThan(0); // 確保真係有庚年個案畀我哋跳過
  });

  it('庚年：我哋同 iztro 一定唔同，而且分別就喺化科', () => {
    const geng = (oracle.cases as Array<{ yearStem: string }>).filter((c) => c.yearStem === '庚');
    expect(geng.length).toBeGreaterThan(0);
    const c = geng[0] as never as { solar: number[]; shichen: number; gender: string; sihua: string[] };
    const r = resolvePalaces(inputFor(c));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const mineAll = r.value.layout.palaces
      .flatMap((p) => p.stars.filter((s) => s.sihua).map((s) => `${s.name}${s.sihua}`))
      .sort();
    const theirsAll = (c.sihua as string[]).flatMap((x) => (x ? x.split('·') : [])).sort();
    expect(mineAll).toContain('天府科');
    expect(theirsAll).toContain('太陰科');
    expect(mineAll).not.toEqual(theirsAll);
  });

  it('每個盤剛好四粒星有四化', () => {
    for (const c of oracle.cases.slice(0, 120)) {
      const r = resolvePalaces(inputFor(c));
      if (!r.ok) continue;
      const hua = r.value.layout.palaces.flatMap((p) => p.stars.filter((s) => s.sihua));
      // 不變量 06：四化剛好四粒，祿權科忌各一
      expect(hua).toHaveLength(4);
      expect(new Set(hua.map((s) => s.sihua)).size).toBe(4);
    }
  });
});
