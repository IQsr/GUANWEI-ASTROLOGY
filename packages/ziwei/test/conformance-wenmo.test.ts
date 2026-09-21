/**
 * 工單 B12b — 同文墨天機 pro 2.5.9 對照
 *
 * 點解要有呢個測試（iztro 嗰個唔夠）：
 *   我哋跟過 iztro 學排盤，所以 conformance-iztro 唔算獨立驗證 —— 佢會同我哋一齊錯。
 *   文墨天機係一個同我哋完全冇關係嘅商業實作，所以佢係**獨立證人**。
 *
 * 佢仍然唔係 ground truth。兩個軟件夾到唔等於啱；ground truth 係書本例盤（B5）。
 *
 * 資料來源：packages/ziwei/test/fixtures/wenmo/*.pdf（文墨天機匯出）
 * 解析工具：tools/parse-wenmo/parse.py
 * 已解析：   packages/ziwei/test/fixtures/wenmo-charts.json
 *
 * PDF 攞唔到生年四化、身宮、宮名（畫出嚟，唔喺文字層），所以呢個測試唔核嗰三樣。
 * 庚干四化要睇截圖 —— 結果記咗喺 docs/engine-divergence.md D-004。
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { BRANCHES, cast, type BirthInput, type Branch } from '../src/index';

type WenmoChart = {
  file: string;
  clock: string;
  trueSolar: string;
  lunar: string;
  yinyang: '陽男' | '陰男' | '陽女' | '陰女';
  ju: string;
  mingGong: Branch;
  birth: { y: number; m: number; d: number; h: number; min: number };
  palaces: Record<string, { stem: string | null; decadal: [number, number] | null; stars: [string, string | null][] }>;
};

const CHARTS: WenmoChart[] = JSON.parse(
  readFileSync(new URL('./fixtures/wenmo-charts.json', import.meta.url), 'utf8'),
);

const MAJOR = [
  '紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府',
  '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
] as const;
const AUX = [
  '左輔', '右弼', '文昌', '文曲', '天魁', '天鉞',
  '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫', '祿存', '天馬',
] as const;
const MINE = new Set<string>([...MAJOR, ...AUX]);

/**
 * 文墨天機**唔處理歷史夏令時** —— 佢當東八區永遠 UTC+8。
 *
 * 所以對照嗰陣要用固定 +8，唔可以用 'Asia/Shanghai'（Intl 識得 1986–1991 夏令時）。
 * 唔係咁樣做嘅話，1990 年夏天嗰兩張盤會成個唔同，而分歧嘅原因係時區唔係斗數。
 *
 * 夏令時本身係一條真分歧，喺 docs/engine-divergence.md D-002，
 * 下面亦有一條專門測試鎖住佢。
 */
const WENMO_TZ = 'Etc/GMT-8';
const WENMO_LNG = 120;

function input(c: WenmoChart, tz = WENMO_TZ): BirthInput {
  return {
    solar: { y: c.birth.y, m: c.birth.m, d: c.birth.d },
    time: { h: c.birth.h, min: c.birth.min },
    tz,
    place: { lng: WENMO_LNG, lat: 30, label: '東八區標準經線' },
    sex: c.yinyang.endsWith('男') ? 'male' : 'female',
  };
}

/**
 * 已知差異。任何唔喺呢張表嘅差異 = 測試爆。
 *
 * 加新項之前要先喺 docs/engine-divergence.md 開一條 D-xxx。
 * **唔准為咗令測試綠返而喺度加項。**
 */
const KNOWN_DIVERGENCES: { star: string; branch: Branch; ours: string; theirs: string; doc: string }[] = [
  { star: '天梁', branch: '巳', ours: '陷', theirs: '得', doc: 'D-003' },
];

function known(star: string, branch: string, ours: string | null, theirs: string | null) {
  return KNOWN_DIVERGENCES.some(
    (k) => k.star === star && k.branch === branch && k.ours === ours && k.theirs === theirs,
  );
}

describe('文墨天機對照（B12b）', () => {
  it('二十一張盤全部解析到', () => {
    expect(CHARTS).toHaveLength(21);
    for (const c of CHARTS) {
      expect(c.birth, c.file).toBeTruthy();
      expect(Object.keys(c.palaces), c.file).toHaveLength(12);
      expect(c.mingGong, c.file).toBeTruthy();
    }
  });

  it('五行局、命宮、宮干、大限、星曜落宮、主星廟旺 —— 除咗已記錄差異之外全對', () => {
    const unexpected: string[] = [];
    let compared = 0;

    for (const c of CHARTS) {
      const r = cast(input(c));
      if (!r.ok) {
        unexpected.push(`${c.file}: cast 失敗 ${r.code}`);
        continue;
      }
      const chart = r.value;

      if (chart.wuxingJu.name !== c.ju) {
        unexpected.push(`${c.file}: 五行局 我${chart.wuxingJu.name} / 佢${c.ju}`);
      }
      if (chart.mingGong !== c.mingGong) {
        unexpected.push(`${c.file}: 命宮 我${chart.mingGong} / 佢${c.mingGong}`);
      }
      compared += 2;

      for (const p of chart.palaces) {
        const wp = c.palaces[p.branch];
        if (!wp) continue;

        if (wp.stem && wp.stem !== p.stem) {
          unexpected.push(`${c.file} ${p.branch}宮: 宮干 我${p.stem} / 佢${wp.stem}`);
        }
        compared++;

        const d = chart.decadals.find((x) => x.branch === p.branch);
        if (wp.decadal && d && (d.fromAge !== wp.decadal[0] || d.toAge !== wp.decadal[1])) {
          unexpected.push(
            `${c.file} ${p.branch}宮: 大限 我${d.fromAge}-${d.toAge} / 佢${wp.decadal[0]}-${wp.decadal[1]}`,
          );
        }
        compared++;

        // 文墨仲有幾十粒雜曜（天官、破碎、蜚廉⋯⋯），我哋唔排，唔比。
        const theirs = new Map(wp.stars.filter(([n]) => MINE.has(n)));
        const mine = new Map(p.stars.map((s) => [s.name, s.brightness ?? null]));

        for (const [name, brightness] of mine) {
          compared++;
          if (!theirs.has(name)) {
            unexpected.push(`${c.file} ${p.branch}宮: 我有${name}，佢冇`);
            continue;
          }
          const t = theirs.get(name) ?? null;
          // 輔星煞星嘅廟旺我哋唔排（文墨有），所以只比主星
          if (MAJOR.includes(name as (typeof MAJOR)[number]) && t !== brightness) {
            if (!known(name, p.branch, brightness, t)) {
              unexpected.push(`${c.file} ${p.branch}宮: ${name}廟旺 我${brightness} / 佢${t}`);
            }
          }
        }
        for (const name of theirs.keys()) {
          if (!mine.has(name)) unexpected.push(`${c.file} ${p.branch}宮: 佢有${name}，我冇`);
        }
      }
    }

    expect(compared).toBeGreaterThan(1000);
    expect(unexpected).toEqual([]);
  });

  it('A 組十二張盤啱啱好鋪滿十四主星 × 十二宮 = 168 格廟旺', () => {
    // 十四主星嘅排列只得 12 種（紫微落邊個宮決定晒其餘十三粒）。
    // 所以「紫微分別落十二宮」嘅十二張盤，每粒星都會行勻十二宮一次。
    // 呢個唔係巧合，係揀呢十二張盤嘅原因 —— 見 project doc《對照盤收集清單》。
    const seen = new Map<string, number>();
    for (const c of CHARTS.filter((x) => x.file.startsWith('A'))) {
      for (const [branch, p] of Object.entries(c.palaces)) {
        for (const [name] of p.stars) {
          if (MAJOR.includes(name as (typeof MAJOR)[number])) {
            const k = `${name}/${branch}`;
            seen.set(k, (seen.get(k) ?? 0) + 1);
          }
        }
      }
    }
    expect(seen.size).toBe(MAJOR.length * BRANCHES.length);
    expect([...seen.entries()].filter(([, n]) => n !== 1)).toEqual([]);
  });

  it('已記錄差異仲喺度（唔准靜靜雞「修正」咗佢）', () => {
    // 呢條同 D-001 嗰條一樣係防盜鈴：如果邊日有人將廟旺表改到同文墨一樣，
    // 呢條會爆，逼佢哋去改 docs/engine-divergence.md 而唔係靜靜雞改表。
    for (const k of KNOWN_DIVERGENCES) {
      const hit = CHARTS.some((c) => {
        const r = cast(input(c));
        if (!r.ok) return false;
        const p = r.value.palaces.find((x) => x.branch === k.branch);
        const ours = p?.stars.find((s) => s.name === k.star);
        const theirs = c.palaces[k.branch]?.stars.find(([n]) => n === k.star);
        return !!ours && !!theirs && ours.brightness === k.ours && theirs[1] === k.theirs;
      });
      expect(hit, `${k.doc}：${k.star}喺${k.branch}宮嘅差異搵唔返`).toBe(true);
    }
  });
});

describe('夏令時（D-002）', () => {
  // 文墨天機當東八區永遠 +8。我哋跟 IANA 時區資料，即係識得：
  //   中國 1986–1991 夏令時、香港 1941–1979 夏令時、台灣 1945–1979 夏令時
  // 香港嗰段對觀微特別重要 —— 1979 年之前夏天喺香港出世嘅人全部受影響。
  const summer1990 = CHARTS.filter((c) => c.file.startsWith('B03') || c.file.startsWith('B04'));

  it('B03、B04 係 1990 年中國夏令時期內', () => {
    expect(summer1990).toHaveLength(2);
    for (const c of summer1990) {
      const dt = new Date(Date.UTC(c.birth.y, c.birth.m - 1, c.birth.d, 4));
      const off = new Intl.DateTimeFormat('en', {
        timeZone: 'Asia/Shanghai',
        timeZoneName: 'longOffset',
      })
        .format(dt)
        .split(' ')
        .pop();
      expect(off, c.file).toBe('GMT+09:00');
    }
  });

  it('用 Asia/Shanghai 排會同文墨唔同；強制 +8 就一樣', () => {
    for (const c of summer1990) {
      const dst = cast(input(c, 'Asia/Shanghai'));
      const fixed = cast(input(c, WENMO_TZ));
      expect(dst.ok && fixed.ok).toBe(true);
      if (!dst.ok || !fixed.ok) continue;

      // 強制 +8 = 同文墨一致
      expect(fixed.value.mingGong, `${c.file} 強制+8`).toBe(c.mingGong);
      expect(fixed.value.wuxingJu.name, `${c.file} 強制+8`).toBe(c.ju);

      // 認夏令時 = 同文墨唔同。呢個差異係我哋主動要嘅（docs/rules.md R-007）
      expect(dst.value.mingGong, `${c.file} 認夏令時`).not.toBe(c.mingGong);
    }
  });

  it('香港 1979 年之前夏天真係有夏令時（觀微用戶最可能撞到）', () => {
    const jul1970 = new Date(Date.UTC(1970, 6, 15, 4));
    const off = new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Hong_Kong',
      timeZoneName: 'longOffset',
    })
      .format(jul1970)
      .split(' ')
      .pop();
    expect(off).toBe('GMT+09:00');
  });
});
