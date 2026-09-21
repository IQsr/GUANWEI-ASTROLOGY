/**
 * 流年層 + 限流疊宮（工單 B15）
 *
 * 出處：引擎 §2、docs/voice-spec.md §10、§13、§16
 *
 * 呢層係**年度章唯一嘅證據來源**。規範 §16 要求年度結論要有
 * 「流年群 ＋ 大限核心支持」—— 冇呢層，年度章一個字都寫唔到。
 *
 * 同本命層一樣：呢度**唔做任何吉凶判斷**，只回答
 * 「今年邊個宮做命宮」、「邊四粒星化乜」、「呢個宮喺三層分別叫乜」。
 * 點解讀係規則庫（C2）同推理器（C8）嘅事。
 *
 * ── 唔喺呢層嘅嘢（講出嚟好過扮冇）──
 *   流曜（流昌流曲、流羊流陀、流魁流鉞…）—— 未做
 *   小限                                  —— 未做
 *   流月、流日                            —— 未做
 *   流年宮干 / 流年自化                    —— 三合派唔用，而且我哋唔安流年宮干
 */
import {
  BRANCHES,
  type Branch,
  type Chart,
  type Decadal,
  type PalaceName,
  type Result,
  type Sihua,
  type Stem,
} from '../types';
import { palaceNameAt } from './palaces';
import { sihuaOfStem, SIHUA_ORDER } from './sihua';
import { pillarFromIndex } from '../ganzhi/sexagenary';
import { yearPillarIndexFromLunarYear } from '../ganzhi/four-pillars';
import { lunarFromSolarDate } from '../calendar/lunar';

/** 一粒星喺某一層化乜，同埋佢坐嘅宮喺三層各自叫乜。 */
export type SihuaHit = {
  hua: Sihua;
  star: string;
  /**
   * 呢粒星喺**本命盤**邊個宮。四化係「邊粒星化」，唔係「邊個宮化」——
   * 所以流年四化一樣係貼落本命星曜嘅位置度。
   *
   * null = 呢粒星唔喺盤上（例如引擎未安嗰粒星）。
   * **唔准靜靜雞 drop 咗佢** —— 冇就要睇得見。
   */
  branch: Branch | null;
  natalPalace: PalaceName | null;
  decadalPalace: PalaceName | null;
  annualPalace: PalaceName | null;
};

/** 一個地支宮位喺三層分別叫乜。呢個就係「疊宮」。 */
export type PalaceOverlay = {
  branch: Branch;
  natal: PalaceName;
  /** 未起運就冇大限層。 */
  decadal: PalaceName | null;
  annual: PalaceName;
};

export type AnnualChart = {
  /** 農曆年。年界跟 R-001（正月初一），唔係立春。 */
  lunarYear: number;
  ganzhi: [Stem, Branch];
  /**
   * 虛歲。大限區間用虛歲 —— `Decadal.fromAge` / `toAge` 都係虛歲。
   * 虛歲 = 流年農曆年 − 出生農曆年 + 1（出世嗰年就係一歲）。
   */
  nominalAge: number;
  /** 流年命宮＝太歲地支所在嗰個宮。 */
  mingGong: Branch;
  /**
   * 覆蓋呢個虛歲嘅大限，連埋佢嘅**本命宮干**（大限四化由佢嚟）。
   *
   * null = **未起運**。水二局要到虛歲 2、火六局要到虛歲 6 先起運，
   * 之前嗰幾年冇大限可言。呢個唔係 error，係事實 ——
   * 但年度章喺呢啲年份寫唔到（§16 要大限核心支持）。
   */
  decadal: (Decadal & { stem: Stem }) | null;
  /** 十二個宮喺三層分別叫乜。 */
  overlay: PalaceOverlay[];
  sihua: {
    /** 生年四化。唔隨年變，擺喺度係為咗三層可以並排睇。 */
    natal: SihuaHit[];
    /** 大限四化：由大限命宮嘅本命宮干引動。未起運就 null。 */
    decadal: SihuaHit[] | null;
    /** 流年四化：由太歲天干引動。 */
    annual: SihuaHit[];
  };
};

const idx = (b: Branch) => BRANCHES.indexOf(b);

/** 覆蓋呢個虛歲嘅大限。未起運回 null。 */
export function decadalForAge(decadals: Decadal[], nominalAge: number): Decadal | null {
  return decadals.find((d) => nominalAge >= d.fromAge && nominalAge <= d.toAge) ?? null;
}

/**
 * 某個天干引動嘅四化，逐粒搵返佢喺本命盤邊個宮。
 *
 * 一粒星只會落一個宮，所以搵到第一個就夠。
 */
function hits(
  chart: Chart,
  stem: Stem,
  nameAt: { decadal: ((b: number) => PalaceName) | null; annual: (b: number) => PalaceName },
): SihuaHit[] {
  const row = sihuaOfStem(stem);
  if (!row) return [];
  return SIHUA_ORDER.map((hua) => {
    const star = row[hua];
    const p = chart.palaces.find((q) => q.stars.some((s) => s.name === star));
    if (!p) {
      return { hua, star, branch: null, natalPalace: null, decadalPalace: null, annualPalace: null };
    }
    const b = idx(p.branch);
    return {
      hua,
      star,
      branch: p.branch,
      natalPalace: p.name,
      decadalPalace: nameAt.decadal ? nameAt.decadal(b) : null,
      annualPalace: nameAt.annual(b),
    };
  });
}

/**
 * 排一個流年。
 *
 * ── 三條規則 ──
 *
 * 1. **流年命宮 = 太歲地支所在嘅宮。** 丙午年就喺午宮起流年命宮。
 *    （同 iztro 一致；亦係三合派通行做法。）
 *
 * 2. **流年十二宮由流年命宮逆佈**，算式同本命一模一樣 ——
 *    所以直接借 `palaceNameAt()`，唔另外寫一份。
 *
 * 3. **流年四化由太歲天干引動，貼落本命星曜嘅位置。**
 *    大限四化就由大限命宮嘅**本命宮干**引動（五虎遁嗰個干）。
 *
 * 純函數：同一個 (chart, year) 永遠出同一個結果。
 */
export function annual(chart: Chart, lunarYear: number): Result<AnnualChart> {
  const pillar = pillarFromIndex(yearPillarIndexFromLunarYear(lunarYear));
  const annualIdx = idx(pillar.branch);

  // 虛歲：出世嗰年算一歲。大限區間用嘅就係佢。
  const nominalAge = lunarYear - chart.lunar.y + 1;
  if (nominalAge < 1) {
    return {
      ok: false,
      code: 'OUT_OF_RANGE',
      message: `${lunarYear} 年喺出生年（${chart.lunar.y}）之前，冇流年可言。`,
    };
  }

  const d = decadalForAge(chart.decadals, nominalAge);
  const decadalIdx = d ? idx(d.branch) : null;
  const decadalStem = d ? chart.palaces[idx(d.branch)]!.stem : null;

  const annualNameAt = (b: number) => palaceNameAt(annualIdx, b);
  const decadalNameAt = decadalIdx === null ? null : (b: number) => palaceNameAt(decadalIdx, b);

  const overlay: PalaceOverlay[] = chart.palaces.map((p) => ({
    branch: p.branch,
    natal: p.name,
    decadal: decadalNameAt ? decadalNameAt(idx(p.branch)) : null,
    annual: annualNameAt(idx(p.branch)),
  }));

  const nameAt = { decadal: decadalNameAt, annual: annualNameAt };

  return {
    ok: true,
    value: {
      lunarYear,
      ganzhi: [pillar.stem, pillar.branch],
      nominalAge,
      mingGong: pillar.branch,
      decadal: d && decadalStem ? { ...d, stem: decadalStem } : null,
      overlay,
      sihua: {
        natal: hits(chart, chart.ganzhi.year[0], nameAt),
        decadal: decadalStem ? hits(chart, decadalStem, nameAt) : null,
        annual: hits(chart, pillar.stem, nameAt),
      },
    },
  };
}

/**
 * 由一個國曆日子排流年。
 *
 * **年界跟 R-001（正月初一）** —— 所以 2026-01-15 仲係乙巳年，唔係丙午年。
 * 呢個同八字用立春唔同，亦都係最容易出錯嘅一格。
 */
export function annualOnSolarDate(
  chart: Chart,
  y: number,
  m: number,
  d: number,
): Result<AnnualChart> {
  const lunar = lunarFromSolarDate(y, m, d);
  if (!lunar.ok) return lunar;
  return annual(chart, lunar.value.y);
}

/**
 * 一個宮位喺三層分別叫乜 —— 畀推理器直接查。
 *
 * 「本命財帛、大限夫妻、流年官祿」呢種話係年度章嘅骨，
 * 所以要查得快，唔使每次 scan 成個 overlay。
 */
export function overlayAt(a: AnnualChart, branch: Branch): PalaceOverlay | null {
  return a.overlay.find((o) => o.branch === branch) ?? null;
}

/**
 * 三層都指住同一個宮嗰啲位 —— 即係本命、大限、流年同名。
 *
 * 規範 §16 講嘅「三層同向」入面，宮位重疊係其中一個結構條件。
 * 呢度**只回事實**：邊幾個宮三層同名。點解讀係 C8 嘅事。
 */
export function alignedPalaces(a: AnnualChart): PalaceOverlay[] {
  return a.overlay.filter((o) => o.decadal !== null && o.natal === o.decadal && o.decadal === o.annual);
}
