/**
 * 工單 B13 —— 流派設定
 *
 * 呢啲測試大部分係**防盜鈴**，唔係功能測試：
 * 佢哋嘅工作係喺有人改咗規則、四化表或者引擎版本嗰陣爆，
 * 逼佢哋去更新版本同重跑對照，而唔係靜靜雞出一批新盤。
 */
import { describe, expect, it } from 'vitest';
import {
  ENGINE_VERSION,
  SCHOOL_PROFILE,
  SIHUA_META,
  sihuaOfStem,
  buildSchoolProfile,
  cast,
  missingFeatures,
  type BirthInput,
} from '../src/index';

const SAMPLE: BirthInput = {
  solar: { y: 1996, m: 6, d: 16 },
  time: { h: 8, min: 30 },
  tz: 'Asia/Hong_Kong',
  place: { lng: 114.17, lat: 22.32, label: '香港' },
  sex: 'male',
};

describe('流派設定（規範 §10、§17）', () => {
  it('ref 形如 id@fingerprint，而且唔係 latest', () => {
    expect(SCHOOL_PROFILE.ref).toMatch(/^zhongzhou-v1@[0-9a-f]{16}$/);
    expect(SCHOOL_PROFILE.ref).not.toContain('latest');
    expect(SCHOOL_PROFILE.id).not.toBe('latest');
  });

  it('帶住引擎版本、萬年曆 checksum 同七條規則', () => {
    expect(SCHOOL_PROFILE.engineVersion).toBe(ENGINE_VERSION);
    expect(SCHOOL_PROFILE.tablesChecksum).toHaveLength(64);
    expect(SCHOOL_PROFILE.rules.registry).toHaveLength(7);
    expect(SCHOOL_PROFILE.rules.registry[0]).toContain('R-001');
    expect(SCHOOL_PROFILE.rules.sihuaSet).toBe('zhongzhou');
  });

  it('戊、庚、壬都標咗 disputed —— 唔好靜靜雞當冇爭議', () => {
    expect(SCHOOL_PROFILE.sihua.disputedStems).toEqual(['戊', '庚', '壬']);
  });

  /**
   * 聲明同資料唔准各講各話。
   *
   * 「宣稱跟某流派，實際混用另一個版本」正正係我哋批評緊競品嗰件事。
   * 所以嗰句聲明唔可以係一段人手維護嘅市場文案 ——
   * 佢入面提到嘅每一個具體值，都要喺 sihua.json 度核得返。
   */
  it('流派聲明同四化表對得返', () => {
    const d = SCHOOL_PROFILE.declaration;
    const geng = sihuaOfStem('庚')!;
    // 聲明講庚干採中州派「陽武府同」—— 資料要真係咁
    expect(d).toContain('庚干採中州派');
    expect(d).toContain('陽武府同');
    expect(`${geng.祿}化祿、${geng.權}化權、${geng.科}化科、${geng.忌}化忌`).toBe(
      '太陽化祿、武曲化權、天府化科、天同化忌',
    );
    expect(d).toContain('太陽化祿、武曲化權、天府化科、天同化忌');
    // 聲明講其餘以通行本為底 —— 壬干就唔可以係中州派嘅天府
    expect(d).toContain('通行本');
    expect(sihuaOfStem('壬')!.科).toBe('左輔');
    // 聲明唔准淨係寫「中州派」三個字就算
    expect(d.length).toBeGreaterThan(40);
  });

  /**
   * 兩個決定都要有完整記錄，包括**否決咗乜**。
   *
   * 淨係記「我哋揀咗 X」係冇用嘅 —— 過幾個月冇人記得當時比較過啲乜。
   * 要記得低嘅係：揀咗、否決咗、點解、代價。
   */
  it('庚同壬兩個決定都有完整記錄，連代價都寫咗', () => {
    for (const stem of ['庚', '壬'] as const) {
      const dec = (SIHUA_META.disputed[stem] as unknown as { decision?: Record<string, string> })
        .decision;
      expect(dec, stem).toBeTruthy();
      for (const k of ['date', 'by', 'chose', 'rejected', 'reason', 'cost']) {
        expect(dec![k], `${stem}.${k}`).toBeTruthy();
      }
    }
  });

  it('廟旺表嘅核實狀態帶埋出嚟', () => {
    // 兩個實作核過，唔係文本出處。要 verified 要工單 B5。
    expect(SCHOOL_PROFILE.brightness.verification).toBe('two-implementations');
  });
});

describe('功能狀態：「唔用」同「未做」要分得開', () => {
  it('自化、飛化、向心離心 = disabled（三合派唔用，係選擇）', () => {
    for (const f of ['自化', '飛化', '向心離心']) {
      expect(SCHOOL_PROFILE.features[f], f).toBe('disabled');
    }
  });

  it('流年、流年四化、大限四化、疊宮 = enabled（工單 B15 做咗）', () => {
    for (const f of ['流年', '流年四化', '大限四化', '限流疊宮']) {
      expect(SCHOOL_PROFILE.features[f], f).toBe('enabled');
    }
  });

  it('流曜、小限、流月流日 = not-implemented（仲係缺口）', () => {
    for (const f of ['流曜', '小限', '流月流日']) {
      expect(SCHOOL_PROFILE.features[f], f).toBe('not-implemented');
    }
  });

  it('三方四正同空宮借星 = enabled（工單 B14 做咗）', () => {
    expect(SCHOOL_PROFILE.features['三方四正']).toBe('enabled');
    expect(SCHOOL_PROFILE.features['空宮借星']).toBe('enabled');
  });

  it('missingFeatures() 淨係列 not-implemented，唔列 disabled', () => {
    const missing = missingFeatures(SCHOOL_PROFILE);
    expect(missing).toContain('流曜');
    expect(missing).not.toContain('自化');
    expect(missing).not.toContain('流年');
  });

  /**
   * 呢條之前寫住「流年一日未做，年度章一日寫唔到」，而且叫人爆咗之後
   * 要改埋內容線嘅假設。B15 做完，佢爆咗，而家反過嚟寫：
   *
   * **§16 嘅年度門檻而家滿足得到喇** —— 流年群同大限核心支持兩樣都有得出。
   * 剩低嘅唔係引擎缺口，係內容缺口（C2 規則庫、C8 推理器）。
   *
   * 但留意：未起運嗰幾年（虛歲 < 五行局數）仲係冇大限層，
   * 嗰啲年份嘅年度章照樣寫唔到 —— 見 test/annual.test.ts。
   */
  it('年度章嘅引擎前提齊晒：流年、流年四化、大限四化、疊宮', () => {
    const missing = missingFeatures(SCHOOL_PROFILE);
    for (const f of ['流年', '流年四化', '大限四化', '限流疊宮']) {
      expect(missing, f).not.toContain(f);
    }
  });
});

describe('事件禁則寫死喺流派層面（規範 §19）', () => {
  it('死亡、疾病、事故、生育、犯罪、外遇全部喺禁止清單', () => {
    const joined = SCHOOL_PROFILE.prohibited.join('｜');
    for (const k of ['死亡', '疾病', '意外', '生育', '犯罪', '外遇']) {
      expect(joined, k).toContain(k);
    }
  });

  it('事件概率同重大決策指令都禁', () => {
    const joined = SCHOOL_PROFILE.prohibited.join('｜');
    expect(joined).toContain('事件概率');
    expect(joined).toContain('重大決策指令');
  });
});

describe('fingerprint 係變更偵測器', () => {
  it('引擎版本一變，fingerprint 就變', () => {
    const a = buildSchoolProfile('zhongzhou-v1', '0.2.0');
    const b = buildSchoolProfile('zhongzhou-v1', '0.3.0');
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });

  it('id 一變，fingerprint 就變', () => {
    const a = buildSchoolProfile('zhongzhou-v1', ENGINE_VERSION);
    const b = buildSchoolProfile('zhongzhou-v2', ENGINE_VERSION);
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });

  it('同樣輸入永遠出同樣 fingerprint', () => {
    const a = buildSchoolProfile('zhongzhou-v1', ENGINE_VERSION);
    const b = buildSchoolProfile('zhongzhou-v1', ENGINE_VERSION);
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  /**
   * 防盜鈴：改咗 DEFAULT_RULES、四化表、廟旺表或者萬年曆，呢條就會爆。
   *
   * 爆咗唔好淨係改個數 —— 要問返自己：
   *   1. 係咪應該 bump school_profile id（zhongzhou-v2）？
   *   2. 舊盤點算？（引擎 plan §9：舊盤唔自動重算）
   *   3. docs/rules.md 同 engine-divergence.md 更新咗未？
   */
  it('fingerprint 冇無端變過', () => {
    expect(SCHOOL_PROFILE.fingerprint).toBe('4f66c68baf4b17cf');
  });

  /**
   * 變更紀錄（每次呢個常數改咗都要加一行，連埋上面三條問題嘅答案）
   *
   * eae55d2e3f574312 → 4cc1a11ce7d0b4f8　（2026-09，工單 B17）
   *   改咗乜：sihua.json 加咗 disputed.戊 同 disputed.壬。
   *   1. bump id 去 v2？ 唔使 —— **冇一個盤嘅輸出變過**，四化值一粒都冇改，
   *      改嘅係「我哋知唔知呢個干有爭議」呢個 metadata。id 留 zhongzhou-v1，
   *      ref 靠 fingerprint 分得開新舊。
   *   2. 舊盤點算？ 唔使動。輸出相同。
   *   3. docs 更新咗未？ rules.md R-003 重寫咗（由「庚干四化」變「天干四化（庚·戊·壬）」）。
   *
   *   ⚠ 但係下一次就未必咁易：如果 B5 證實中州派戊用唔同星、壬用天府，
   *      嗰次改嘅係**值**，五分之一嘅盤會變 —— 嗰次一定要 bump 去 zhongzhou-v2。
   *
   * 4cc1a11ce7d0b4f8 → 4f66c68baf4b17cf　（2026-09，工單 B15）
   *   改咗乜：流年／流年四化／大限四化／限流疊宮 由 not-implemented 轉 enabled；
   *          新增 流曜／小限 兩個 not-implemented；ENGINE_VERSION 0.2.0 → 0.3.0。
   *   1. bump id 去 v2？ 唔使 —— **規則一條都冇改**（R-001…R-008 同四化表原封不動），
   *      本命盤嘅宮位、星曜、四化逐格一樣。改嘅係引擎做得到幾多嘢。
   *      id 認嘅係流派，fingerprint 認嘅係確切設定。
   *   2. 舊盤點算？ 唔使重算 —— 盤嘅內容冇變。但舊盤嘅 meta 會帶住舊 ref，
   *      即係「嗰本書排出嚟嗰陣，引擎仲未識流年」。呢個正正係 R-008 想保住嘅資訊。
   *   3. docs 更新咗未？ voice.md 缺口二劃咗走，rules.md 流派設定段更新咗。
   */
});

describe('每個盤帶住流派設定', () => {
  it('cast() 嘅 meta 有 schoolProfile', () => {
    const r = cast(SAMPLE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.meta.schoolProfile).toBe(SCHOOL_PROFILE.ref);
  });

  it('引擎版本 bump 咗 0.3.0（B15 加咗流年層）', () => {
    expect(ENGINE_VERSION).toBe('0.3.0');
  });
});
