/**
 * 工單 C7 —— L3 結構層 + L5 章框
 *
 * 呢個檔案守兩件事：
 *
 *   一、結構層有冇令門檻**真係**動咗（唔係加多幾條規則當有進展）
 *   二、章框有冇偷偷講命理（佢係全本書唯一冇來源要求嘅一層）
 */
import { describe, expect, it } from 'vitest';
import { cast, annual, SCHOOL_PROFILE, type BirthInput } from '@guanwei/ziwei';
import {
  FRAMES,
  GEJU,
  MEDICAL_DISCLAIMER,
  PALACE_ANCHORS,
  RULE_REGISTRY,
  chapterFooter,
  closeFor,
  cjkCount,
  emptyPalaceLine,
  emptyPalaceRules,
  frameStats,
  gejuRules,
  isWhitelistedTransition,
  mostSimilarCloses,
  openFor,
  rejectedGeju,
  runRegistry,
  sanFangRules,
  scanForbidden,
  shenGongRules,
  transitionFor,
  withoutCitations,
} from '../src/index';

const PALACES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'] as const;

const input: BirthInput = {
  solar: { y: 1996, m: 6, d: 16 }, time: { h: 8, min: 30 },
  tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'male',
};
const r = cast(input);
if (!r.ok) throw new Error(r.message);
const a = annual(r.value, 2026);
if (!a.ok) throw new Error(a.message);
const OUT = runRegistry(RULE_REGISTRY, { chart: r.value, annual: a.value }, SCHOOL_PROFILE.ref);

describe('L3 結構層', () => {
  it('三方四正十二宮齊，每宮壓力／支持各一', () => {
    expect(sanFangRules()).toHaveLength(24);
    for (const p of PALACES) {
      const mine = sanFangRules().filter((x) => String(x.rule_id).startsWith(`sanfang.${p}-`));
      expect(mine, p).toHaveLength(2);
    }
  });

  it('空宮十二宮齊，身宮六宮齊', () => {
    expect(emptyPalaceRules()).toHaveLength(12);
    /* 身宮只可能落命、夫妻、財帛、遷移、官祿、福德 —— 排盤幾何嘅直接後果。 */
    expect(shenGongRules()).toHaveLength(6);
    const where = shenGongRules().map((x) => String(x.rule_id).split('.')[2]);
    expect(where.sort()).toEqual(['命宮', '夫妻', '官祿', '財帛', '福德', '遷移'].sort());
  });

  it('結構層規則全部係 structural 角色 —— 佢哋驗證，唔下結論', () => {
    for (const x of [...sanFangRules(), ...emptyPalaceRules(), ...shenGongRules()]) {
      expect(x.role, String(x.rule_id)).toBe('structural');
    }
  });

  /**
   * 格局唔同：一個格局係一個**有名有姓嘅結論**，所以佢係 core。
   * 但代價係佢要引得出賦文 —— 引唔出就停喺 needs_review，連行都唔行。
   */
  it('格局係 core，而且每條 approved 都引得出原文', () => {
    for (const x of gejuRules()) expect(x.role, String(x.rule_id)).toBe('core');
    const approved = GEJU.filter((g) => g.status === 'approved');
    expect(approved.length).toBe(16);
    for (const g of approved) {
      expect(g.sources.length, g.id).toBeGreaterThan(0);
      expect(g.allowed_xiang.length, g.id).toBeGreaterThan(0);
    }
  });

  /**
   * ⚠ 九個永久拒絕嘅格局。
   *
   * 《全書》太微賦記錄低嘅唯一象義就係 §19 硬閘禁止嘅嘢 ——
   * 呢啲唔係「證據唔夠」，係任何證據都解鎖唔到。
   * 所以佢哋唔係 needs_review，係 rejected：人手覆核都唔會令佢哋出得街。
   */
  it('九個格局永久拒絕，一條規則都唔會出', () => {
    expect(rejectedGeju()).toHaveLength(9);
    const rejected = new Set(rejectedGeju().map((g) => g.id));
    for (const x of gejuRules()) {
      const id = String(x.rule_id).split('.')[1]!;
      expect(rejected.has(id), String(x.rule_id)).toBe(false);
    }
  });

  it('規則庫總數 352，approved 347', () => {
    expect(RULE_REGISTRY.rules).toHaveLength(352);
    expect(RULE_REGISTRY.approved).toHaveLength(347);
  });
});

describe('L5 章框', () => {
  it('開場 12、過場 12、收束 48', () => {
    expect(frameStats()).toEqual({ open: 12, transition: 12, close: 48, total: 72 });
  });

  /**
   * **章框係全本書唯一冇來源要求嘅一層**，理由係佢冇對斗數作出任何主張。
   * 呢個豁免嘅代價就係呢條測試：一個星名都唔准出現。
   *
   * 一句「天梁在此宜守」放喺留白句度，就係一條冇出處嘅象義斷言，
   * 而且係喺全章最後、讀者最記得嗰個位置。
   */
  it('⚠ 章框一個字都唔准講命理', () => {
    const terms = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰',
      '貪狼', '巨門', '天相', '天梁', '七殺', '破軍', '擎羊', '陀羅', '火星', '鈴星',
      '地空', '地劫', '化祿', '化權', '化科', '化忌', '廟', '落陷'];
    for (const f of FRAMES) {
      for (const t of terms) expect(f.text.includes(t), `${f.id} 出現咗 ${t}`).toBe(false);
    }
  });

  it('章框過到語氣 lint', () => {
    for (const f of FRAMES) {
      expect(scanForbidden(withoutCitations(f.text), 'body'), f.id).toEqual([]);
    }
  });

  /**
   * 錨詞閘：一句「邊一宮都啱」嘅留白句，就係一句「邊個人都啱」嘅話。
   * 相似度捉唔到佢（佢同其他宮嗰句可以完全唔似），所以要另一道閘。
   */
  it('每條收束句最少中一個本宮錨詞', () => {
    for (const f of FRAMES.filter((x) => x.kind === 'close')) {
      const anchors = PALACE_ANCHORS[f.palace!]!;
      expect(anchors.some((x) => f.text.includes(x)), `${f.id}：${anchors.join('／')}`).toBe(true);
    }
  });

  it('收束句互相唔似 —— 最似一對都要低過 0.35', () => {
    const top = mostSimilarCloses(1)[0]!;
    // eslint-disable-next-line no-console
    console.log(`\n  最似一對收束句：${top.a} vs ${top.b} = ${top.score.toFixed(3)}\n`);
    expect(top.score).toBeLessThan(0.35);
  });

  it('留白句 25–45 字、對住讀者講；開場導語 30–50 字', () => {
    for (const f of FRAMES.filter((x) => x.kind === 'close')) {
      const w = cjkCount(f.text);
      expect(w >= 25 && w <= 45, `${f.id}=${w}`).toBe(true);
      expect(/你|自己/.test(f.text), f.id).toBe(true);
    }
    for (const f of FRAMES.filter((x) => x.kind === 'open')) {
      const w = cjkCount(f.text);
      expect(w >= 30 && w <= 50, `${f.id}=${w}`).toBe(true);
    }
  });

  /** 內容系統 §5：高風險宮嘅導語一定要喺章首講清楚本章唔做乜。 */
  it('高風險宮嘅導語明寫本章唔做乜', () => {
    const must: Record<string, string[]> = {
      疾厄: ['不涉病名', '不涉診斷', '不作任何風險分級'],
      夫妻: ['不預測婚姻成敗', '不代伴侶發言'],
      子女: ['不推斷'],
      父母: ['不由你的盤推論家人'],
      財帛: ['不談金額'],
    };
    for (const [palace, phrases] of Object.entries(must)) {
      const t = openFor(palace).text;
      for (const p of phrases) expect(t.includes(p), `${palace} 少咗「${p}」`).toBe(true);
    }
  });

  it('疾厄章末有固定免責句，其餘宮冇', () => {
    expect(chapterFooter('疾厄')).toBe(MEDICAL_DISCLAIMER);
    for (const p of PALACES) if (p !== '疾厄') expect(chapterFooter(p), p).toBeNull();
  });

  it('空宮一定明寫借邊個對宮', () => {
    expect(emptyPalaceLine('田宅', ['天梁'])).toContain('借對宮天梁參看');
    expect(emptyPalaceLine('田宅', ['天梁'])).toContain('無主星');
    /* 對宮都空係排得出嚟嘅（紫微在巳／亥，四個空宮），唔可以 crash。 */
    expect(emptyPalaceLine('田宅', [])).toContain('無主星');
  });
});

describe('收束句輪替（工單 C7 驗收標準）', () => {
  /** C8b 驗收標準：同一 object 跑兩次輸出完全相同。所以輪替唔准用 random。 */
  it('同一本書永遠揀返同一句', () => {
    for (const p of PALACES) {
      expect(closeFor(p, RULE_REGISTRY.ref).id).toBe(closeFor(p, RULE_REGISTRY.ref).id);
    }
  });

  /**
   * ⚠ 真正要避嘅唔係「一本書入面十二章結尾同一句」（每宮各自寫，本來就唔同），
   * 而係**兩個讀者攞到一模一樣嘅結尾**。
   * 一句人人都收到嘅留白句，就係一句人人都啱嘅話。
   */
  it('唔同嘅書揀到唔同句 —— 每宮四條全部去得到', () => {
    for (const p of PALACES) {
      const seen = new Set<string>();
      for (let i = 0; i < 400; i++) seen.add(closeFor(p, `chart-${i}`).id);
      expect(seen.size, `${p} 得 ${seen.size} 句輪替得到`).toBe(4);
    }
  });

  it('一本書入面十二章唔會全部揀同一個編號', () => {
    const idx = PALACES.map((p) => closeFor(p, 'chart-0').id.split('.').pop());
    expect(new Set(idx).size).toBeGreaterThan(1);
  });
});

describe('過場白名單 —— AI 收尾檢查閘', () => {
  /**
   * 內容系統 §7：AI 收尾准「生成過場句（≤25 字，唔帶新資訊）」。
   *
   * 但「生成」係一個做唔到驗證嘅字眼 —— 事後判一句 AI 寫嘅嘢係咪過場句，
   * 冇得驗。所以呢度改成：**AI 唔准作過場句，只可以由呢個 bank 揀。**
   * bank 就係檢查閘嘅白名單，兩者同一份資料，唔會走音。
   */
  it('白名單就係我哋寫過嘅過場句，唔係一個另外維護嘅 list', () => {
    for (const f of FRAMES.filter((x) => x.kind === 'transition')) {
      expect(isWhitelistedTransition(f.text), f.id).toBe(true);
    }
    expect(isWhitelistedTransition('這一年你的事業會有轉機。')).toBe(false);
    expect(isWhitelistedTransition('接著要看它牽動到哪裡')).toBe(false); // 差一個句號都唔算
  });

  it('每個插槽接口都有過場句', () => {
    for (const [from, to] of [['開場', '結構'], ['結構', '牽動'], ['牽動', '擾動'], ['擾動', '留白'], ['牽動', '留白']] as const) {
      expect(transitionFor(from, to, 'chart-0'), `${from}→${to}`).not.toBeNull();
    }
  });

  it('過場句唔帶數字 —— 數字就係新資訊', () => {
    for (const f of FRAMES.filter((x) => x.kind === 'transition')) {
      expect(/\d/.test(f.text), f.id).toBe(false);
      expect(cjkCount(f.text), f.id).toBeLessThanOrEqual(25);
    }
  });
});

describe('C7 解鎖咗乜', () => {
  /**
   * C6 交嗰陣 career 得四個群、零結構群，所以停喺順／慎。
   * C7 加咗官祿自己嘅三方四正之後，佢過到 §16 門檻四。
   *
   * 呢條測試嘅重點唔係「career 上到 2」，而係**呢一票由邊度嚟**：
   * 結構驗證群係唯一一種湊唔到嘅票 —— 修正層拎唔到，重述同一粒星亦都拎唔到。
   */
  it('career 嘅結構驗證群來自官祿自己嘅三方四正，唔係命宮', () => {
    const hit = OUT.filter((o) => o.status === 'matched' && o.rule.rule_id.startsWith('sanfang.官祿'));
    expect(hit.length).toBeGreaterThan(0);
    for (const o of hit) expect(o.rule.independence_group).toBe('sanfang.官祿');
  });

  it('身宮規則共用一群 —— 一個人得一個身宮，唔可以拎兩票', () => {
    const shen = OUT.filter((o) => o.status === 'matched' && o.rule.rule_id.startsWith('structure.shen'));
    expect(new Set(shen.map((o) => o.rule.independence_group)).size).toBeLessThanOrEqual(1);
  });
});
