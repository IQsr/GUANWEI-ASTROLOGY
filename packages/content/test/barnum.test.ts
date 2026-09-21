/**
 * 工單 C10 —— 巴納姆測試（機器嗰半）
 *
 * 內容系統 §8 講嘅巴納姆測試要八至十個真人。呢批測試唔取代佢 ——
 * 佢哋做嘅係**唔好浪費嗰八個人嘅時間**：
 * 一對重疊九成嘅書，唔使搵人試都知分唔開。
 *
 * ⚠ 呢度最緊要嗰一條，係分得開「內容太薄」同「兩副盤本來就似」。
 * 第二種唔係病，而且喺嗰度製造差異先至係講大話。
 */
import { describe, expect, it } from 'vitest';
import { annual, cast, SCHOOL_PROFILE, type BirthInput, type Chart } from '@guanwei/ziwei';
import {
  RULE_REGISTRY,
  SPEC_VERSION,
  assembleAll,
  chartSignature,
  inferAll,
  overlap,
  overlapStats,
  barnumPair,
  markingSheet,
  participantPack,
  readerEdition,
  sentencesOf,
  sameSkeleton,
  sharedShare,
  sihuaModifier,
  toBookText,
  uniquenessBySlot,
  universalSentences,
  type BookText,
} from '../src/index';
import type { Chapter } from '../src/assemble';

/** 一百二十個生辰，鋪開喺五十年、十二個月、廿八日、廿四個時辰。確定性。 */
function sample(i: number): BirthInput {
  return {
    solar: { y: 1960 + (i * 7) % 50, m: 1 + (i * 5) % 12, d: 1 + (i * 11) % 28 },
    time: { h: (i * 3) % 24, min: 0 },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: i % 2 ? 'male' : 'female',
  };
}

const N = 120;
const CHARTS: Chart[] = [];
const BOOKS: BookText[] = [];
const CHAPTERS: Chapter[][] = [];
for (let i = 0; i < N; i++) {
  const r = cast(sample(i));
  if (!r.ok) continue;
  const a = annual(r.value, 2026);
  if (!a.ok) continue;
  const by = inferAll(RULE_REGISTRY, { chart: r.value, annual: a.value }, SCHOOL_PROFILE.ref, SPEC_VERSION, {
    chartId: `c${i}`, layer: 'natal',
  });
  const ch = assembleAll(r.value, by, { seed: `c${i}` });
  CHARTS.push(r.value);
  CHAPTERS.push(ch);
  BOOKS.push(toBookText(`c${i}`, ch));
}

describe('一百二十本書', () => {
  it('全部排得出，而且冇兩本完全一樣', () => {
    expect(BOOKS.length).toBe(N);
    const texts = new Set(BOOKS.map((b) => b.sentences.join('')));
    expect(texts.size).toBe(N);
  });

  it('重疊分佈', () => {
    const s = overlapStats(BOOKS, 0.8);
    // eslint-disable-next-line no-console
    console.log(
      `\n  ${s.pairs} 對書　中位 ${(s.median * 100).toFixed(0)}%　` +
        `九成位 ${(s.p90 * 100).toFixed(0)}%　最高 ${(s.max * 100).toFixed(0)}%　` +
        `≥80% 有 ${s.aboveThreshold} 對（${((s.aboveThreshold / s.pairs) * 100).toFixed(1)}%）\n`,
    );
    /* 中位低過六成 = 一個讀者見到嘅嘢，有超過四成係陌生人本書冇嘅。 */
    expect(s.median).toBeLessThan(0.6);
    /* 分唔開嗰批要係少數。佢哋唔係零 —— 見下面「盤似所以書似」。 */
    expect(s.aboveThreshold / s.pairs).toBeLessThan(0.02);
  });
});

describe('⚠ 書似，係因為盤似，唔係因為內容薄', () => {
  /**
   * 呢條係成個 C10 機器測量嘅重點。
   *
   * 紫微落宮只有十二種，而紫微落咗邊就決定晒其餘十三粒主星同一百六十八格廟旺。
   * 加埋命宮落宮（又十二種）—— **每一百四十四個人就有一個同你骨架一模一樣**。
   *
   * 佢本書同你本一定好似。呢個唔係病：喺嗰度硬製造差異先至係講大話。
   */
  it('重疊最高嗰批，全部係骨架一樣嘅盤', () => {
    const high: [number, number, number][] = [];
    for (let i = 0; i < BOOKS.length; i++) {
      for (let j = i + 1; j < BOOKS.length; j++) {
        const v = overlap(BOOKS[i]!, BOOKS[j]!);
        if (v >= 0.8) high.push([i, j, v]);
      }
    }
    expect(high.length).toBeGreaterThan(0);
    const explained = high.filter(([i, j]) => sameSkeleton(CHARTS[i]!, CHARTS[j]!));
    // eslint-disable-next-line no-console
    console.log(`\n  重疊 ≥80% 有 ${high.length} 對，其中 ${explained.length} 對骨架一樣\n`);
    expect(explained.length / high.length).toBeGreaterThan(0.9);
  });

  /**
   * 骨架唔同嘅一對先至係要擔心嗰啲 —— 兩副真係唔同嘅盤，出到兩本似嘅書。
   *
   * 呢度唔釘一個「一定要低過 0.8」嘅數，因為 0.8 係我自己揀嘅線，
   * 而啱啱過線嗰一兩對唔代表出咗事。釘嘅係**最壞嗰個個案有幾壞**。
   */
  it('骨架唔同嘅一對，最壞重疊都有限', () => {
    let worst = { i: 0, j: 0, v: 0 };
    for (let i = 0; i < BOOKS.length; i++) {
      for (let j = i + 1; j < BOOKS.length; j++) {
        if (sameSkeleton(CHARTS[i]!, CHARTS[j]!)) continue;
        const v = overlap(BOOKS[i]!, BOOKS[j]!);
        if (v > worst.v) worst = { i, j, v };
      }
    }
    // eslint-disable-next-line no-console
    console.log(`\n  骨架唔同而最似嘅一對：c${worst.i} vs c${worst.j} = ${(worst.v * 100).toFixed(0)}%\n`);
    expect(worst.v).toBeLessThan(0.85);
  });

  it('簽名一樣嘅盤，本書要一樣 —— 唔准為咗唔似而唔似', () => {
    const bySig = new Map<string, number[]>();
    CHARTS.forEach((c, i) => {
      const k = chartSignature(c);
      bySig.set(k, [...(bySig.get(k) ?? []), i]);
    });
    for (const idx of bySig.values()) {
      if (idx.length < 2) continue;
      for (let k = 1; k < idx.length; k++) {
        expect(overlap(BOOKS[idx[0]!]!, BOOKS[idx[k]!]!)).toBeGreaterThan(0.95);
      }
    }
  });
});

describe('人人都有嗰啲句：係章框，唔係命理', () => {
  /**
   * 一本書大約三成字係每本書都有。呢個數本身唔係要清零 ——
   * 章框（章首、過場、留白）同 L3 關係塊係逐宮固定嘅，本來就應該一樣。
   *
   * 「這一章讀財帛宮，不談金額」對邊個讀者都要一字不改，
   * 否則個界線就變成有時嚴有時鬆。
   *
   * ⚠ 要睇嘅係：**呢啲句入面有冇一句係命理主張。**
   * 有嘅話，即係我哋寫咗一句對邊個都啱嘅斷語 —— 嗰個先係巴納姆。
   */
  it('人人都有嗰啲句，冇一句提到星、化、廟旺', () => {
    const uni = universalSentences(BOOKS);
    const share = sharedShare(BOOKS[0]!, BOOKS);
    // eslint-disable-next-line no-console
    console.log(`\n  ${uni.length} 句人人都有，佔一本書 ${(share * 100).toFixed(0)}% 嘅字\n`);
    expect(uni.length).toBeGreaterThan(0);
    const terms = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門',
      '天相', '天梁', '七殺', '破軍', '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫',
      '化祿', '化權', '化科', '化忌'];
    for (const s of uni) {
      for (const t of terms) expect(s.includes(t), `人人都有嘅句提到 ${t}：「${s}」`).toBe(false);
    }
    /* 三成上下。高過一半就代表章框食咗成本書。 */
    expect(share).toBeLessThan(0.4);
  });

  it('差異來自實質嗰幾格 —— 章框同關係塊本來就唔負責分辨', () => {
    const u = uniquenessBySlot(CHAPTERS[0]!, BOOKS[1]!);
    // eslint-disable-next-line no-console
    console.log(
      `\n  ${Object.entries(u).map(([k, v]) => `${k} ${((v.unique / v.total) * 100).toFixed(0)}%`).join('　')}\n`,
    );
    /* 開場同結構係讀者judge緊嗰兩格 —— 佢哋要接近全獨有。 */
    expect(u['開場']!.unique / u['開場']!.total).toBeGreaterThan(0.9);
    expect(u['結構']!.unique / u['結構']!.total).toBeGreaterThan(0.85);
    /* 章首同過場係固定句庫，零獨有係設計，唔係問題。 */
    expect(u['章首']!.unique).toBe(0);
  });
});

describe('⚠ C10 捉到嘅真 bug：三分一生年四化冇出現喺書入面', () => {
  /**
   * 度一百二十本書嗰陣，最似一對重疊 96%。追落去：
   * 嗰兩副盤紫微、命宮、身宮全部一樣（所以骨架一樣，預咗似），
   * **但四化完全唔同** —— 戊干 vs 壬干，四粒星冇一粒重疊。
   *
   * 四化唔同而書一樣，即係四化冇寫出嚟。度返：只有 **68%** 出現過。
   *
   * 原因係組裝器將四化同廟旺一樣只貼「領銜嗰粒星」。
   * 落喺同座星、或者落喺左輔文昌呢啲輔星嘅化，永遠輪唔到。
   *
   * 而生年四化係兩副盤之間**最大嗰個差異來源**（十干 × 邊粒星）。
   * 改咗之後：99%。
   */
  it('生年四化差唔多全部睇得到', () => {
    let total = 0;
    let seen = 0;
    CHARTS.forEach((chart, i) => {
      const text = CHAPTERS[i]!.map((c) => c.text).join('');
      for (const p of chart.palaces) {
        for (const s of p.stars) {
          if (!s.sihua) continue;
          total++;
          const m = sihuaModifier(s.name, s.sihua);
          if (m && text.includes(m.text)) seen++;
        }
      }
    });
    // eslint-disable-next-line no-console
    console.log(`\n  生年四化 ${total} 個，出現喺書入面 ${seen}（${((seen / total) * 100).toFixed(0)}%）\n`);
    expect(seen / total).toBeGreaterThan(0.95);
  });
});

describe('真人測試材料', () => {
  const mine = CHAPTERS[0]!;
  const theirs = CHAPTERS[7]!;

  /**
   * ⚠ 測試用嘅版本一定唔可以有出處標註。
   * 見到「base.貪狼.命宮」就知道呢章講貪狼 ——
   * 而個測試問嘅係「你分唔分得出邊本係你」，唔係「你認唔認得出標籤」。
   */
  it('讀者版冇出處、冇插槽名、冇評級', () => {
    const md = readerEdition(mine);
    for (const leak of ['base.', 'mod.', 'l3.', 'frame.', '[章首]', '[結構]', '[留白]',
      'grade', 'topic_', 'sanfang.', 'geju.', 'rule_id', 'source_id']) {
      expect(md.includes(leak), `讀者版漏咗 ${leak}`).toBe(false);
    }
    expect(md).toContain('## 命宮');
    /* 僕役喺正文一律叫交友宮（C3 決定） */
    expect(md.includes('僕役')).toBe(false);
    expect(md).toContain('## 交友');
  });

  it('標記表逐句一行，唔係逐章', () => {
    const sheet = markingSheet(mine, 'P1');
    const lines = sheet.split('\n').filter((l) => /^\s*\d+\. /.test(l));
    expect(lines.length).toBeGreaterThan(50);
    expect(sheet).toContain('似我 ☐');
    /* 標「唔似我」先係最有用嘅答案 —— 指示要講明，否則個表會收到一堆客氣嘅「似我」。 */
    expect(sheet).toContain('標「唔似我」對我哋最有用');
  });

  /**
   * ⚠ 第一次印出嚟嘅標記表，第一句係「這一章讀命宮，也就是你出發時的位置」。
   * 叫人標佢「似我／唔似我」係冇意思 —— 佢唔係一句關於你嘅說話。
   *
   * 章框同留白唔入標記表，否則個表會收到一堆冇意義嘅格，
   * 而嗰啲格會溝淡真正有用嗰批嘅比例。
   */
  it('章框唔入標記表 —— 佢哋唔係講緊讀者', () => {
    const sheet = markingSheet(mine, 'P1');
    const numbered = sheet.split('\n').filter((l) => /^\s*\d+\. /.test(l)).join('\n');
    expect(numbered.includes('這一章讀'), '章首入咗標記表').toBe(false);
    for (const t of ['接著要看它牽動到哪裡', '這一宮不是獨立看的', '說到這裡，剩下的交回給你']) {
      expect(numbered.includes(t), `過場句「${t}」入咗標記表`).toBe(false);
    }
    /* 留白有自己一節，問「想唔想答」—— 因為佢係一條問題，唔係一句斷語。 */
    expect(sheet).toContain('每章結尾嗰條問題');
    expect(sheet).toContain('想答 ☐');
    expect(numbered.includes('值得自己驗證的是')).toBe(false);
  });

  /**
   * 兩本都要用同一個標題（甲／乙），而且要打亂次序 ——
   * 否則參加者係喺分辨排版，唔係喺分辨內容。
   */
  it('巴納姆兩本書：冇名、冇出生資料、次序打亂', () => {
    const a = barnumPair(mine, theirs, false);
    const b = barnumPair(mine, theirs, true);
    expect(a.answer).toBe('甲');
    expect(b.answer).toBe('乙');
    expect(a.sheet).toContain('# 甲');
    expect(a.sheet).toContain('# 乙');
    /*
     * 冇年份、冇生辰、冇「第幾號參加者」—— 佢哋全部係認得出邊本嘅捷徑。
     * 只掃書身，唔掃指示（指示嗰度本來就會提到「冇出生資料」）。
     */
    const bodies = a.sheet.slice(a.sheet.indexOf('# 甲'));
    expect(/\d{4}/.test(bodies), '書身唔應該有年份').toBe(false);
    for (const leak of ['出生', '生辰', '時辰', '男性', '女性', 'c0', 'c7']) {
      expect(bodies.includes(leak), `書身漏咗 ${leak}`).toBe(false);
    }
    /* 「分唔到」要係一個寫得出嘅答案 —— 唔畀寫就會收到一堆靠估嘅答案。 */
    expect(a.sheet).toContain('分唔到 ☐');
  });

  it('同一個參加者跑兩次，材料完全一樣', () => {
    const one = participantPack('P1', mine, theirs, false);
    const two = participantPack('P1', mine, theirs, false);
    expect(two).toEqual(one);
  });
});
