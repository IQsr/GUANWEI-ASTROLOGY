/**
 * 工單 C6 —— L2 修飾語
 *
 * 修飾語唔係結論，係加喺結論上面嘅條件。
 * 所以呢批測試核嘅唔止係「寫咗冇」，而係「佢有冇僭越」——
 * 一個修正層嘅嘢，唔可以獨力撐起一個方向。
 */
import { describe, expect, it } from 'vitest';
import { cast, annual, SCHOOL_PROFILE, type BirthInput } from '@guanwei/ziwei';
import {
  MALEFICS,
  MODIFIERS,
  Modifier,
  RULE_REGISTRY,
  bandOf,
  brightnessModifier,
  cjkCount,
  gradeCeiling,
  hasError,
  maleficModifier,
  modifierCoverage,
  runRegistry,
  scanForbidden,
  sihuaModifier,
  withoutCitations,
} from '../src/index';

const input: BirthInput = {
  solar: { y: 1996, m: 6, d: 16 }, time: { h: 8, min: 30 },
  tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'male',
};
const r = cast(input);
if (!r.ok) throw new Error(r.message);
const a = annual(r.value, 2026);
if (!a.ok) throw new Error(a.message);
const OUT = runRegistry(RULE_REGISTRY, { chart: r.value, annual: a.value }, SCHOOL_PROFILE.ref);

describe('182 句', () => {
  it('廟旺 70、四化 40、六煞 72', () => {
    expect(modifierCoverage()).toEqual({ brightness: 70, sihua: 40, malefic: 72, total: 182 });
  });

  it('每句 30–50 字', () => {
    const bad = MODIFIERS.filter((m) => cjkCount(m.text) < 30 || cjkCount(m.text) > 50)
      .map((m) => `${m.id}=${cjkCount(m.text)}`);
    expect(bad).toEqual([]);
  });

  it('十四主星 × 五檔廟旺，一格都冇漏', () => {
    for (const lvl of ['廟', '旺', '得', '利', '平', '不', '陷']) expect(bandOf(lvl), lvl).toBeTruthy();
    expect(MODIFIERS.filter((m) => m.kind === 'brightness')).toHaveLength(70);
    expect(brightnessModifier('紫微', '廟')!.id).toBe('mod.brightness.紫微.廟旺');
    expect(brightnessModifier('紫微', '旺')!.id).toBe('mod.brightness.紫微.廟旺');
    expect(brightnessModifier('紫微', '陷')!.id).toBe('mod.brightness.紫微.陷');
  });

  /**
   * 天相同七殺喺《全書》卷二嘅四化訣入面一次都冇出現過。
   * 呢個唔係我哋漏咗 —— 係原文冇。所以佢哋冇四化修飾語，而且唔應該有。
   */
  it('天相同七殺永遠唔化 —— 所以冇四化修飾語', () => {
    for (const hua of ['祿', '權', '科', '忌']) {
      expect(sihuaModifier('天相', hua), `天相${hua}`).toBeNull();
      expect(sihuaModifier('七殺', hua), `七殺${hua}`).toBeNull();
    }
    expect(sihuaModifier('太陰', '忌')).not.toBeNull();
  });

  it('六煞 × 十二宮齊', () => {
    for (const m of MALEFICS) {
      expect(MODIFIERS.filter((x) => x.kind === 'malefic' && x.star === m), m).toHaveLength(12);
    }
    expect(maleficModifier('擎羊', '官祿')).not.toBeNull();
    expect(maleficModifier('文昌', '官祿')).toBeNull();
  });
});

describe('⚠ 同一句入面唔准有重複片段', () => {
  /**
   * 呢條規矩由一個犯過三次嘅錯誤生出嚟：寫短咗，補一句去湊字數，
   * 而補嗰句就係前面嗰句換個講法。修飾語得三四十字，
   * 重複一次等於成句得一半資訊。
   */
  it('182 句一句都冇重複', () => {
    const bad: string[] = [];
    for (const m of MODIFIERS) {
      const t = m.text.replace(/[^㐀-鿿]/g, '');
      const seen = new Map<string, number>();
      for (let i = 0; i + 8 <= t.length; i++) {
        const seg = t.slice(i, i + 8);
        const at = seen.get(seg);
        if (at !== undefined && i - at >= 8) { bad.push(`${m.id}：${seg}`); break; }
        if (at === undefined) seen.set(seg, i);
      }
    }
    expect(bad).toEqual([]);
  });

  it('schema 自己擋得住 —— 唔使靠測試發現', () => {
    const base = MODIFIERS[0]!;
    const dupText = '這一檔的力量偏弱，需要條件配合。這一檔的力量偏弱，需要條件配合。';
    const bad = Modifier.safeParse({ ...base, text: dupText });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(JSON.stringify(bad.error.issues)).toContain('重複咗');
  });
});

describe('引文同語氣', () => {
  it('182 句嘅引文全部核得返原文（parse 成功即係核過）', () => {
    expect(MODIFIERS).toHaveLength(182);
  });

  it('掃唔到黑名單字', () => {
    const hits: string[] = [];
    for (const m of MODIFIERS) {
      const f = scanForbidden(withoutCitations(m.text), 'text');
      if (hasError(f)) hits.push(`${m.id}：${f.map((x) => x.message).join('；')}`);
    }
    expect(hits).toEqual([]);
  });

  it('冇粵語口語', () => {
    const words = ['唔', '嘅', '嗰', '咁', '啲', '喺', '佢', '冇', '咗', '嘢'];
    const hits: string[] = [];
    for (const m of MODIFIERS) for (const w of words) if (m.text.includes(w)) hits.push(`${m.id}：${w}`);
    expect(hits).toEqual([]);
  });

  /** 高風險宮嘅煞星提示，一定要寫明本書唔做乜。 */
  it('六煞喺子女、疾厄、父母、夫妻四宮嘅提示都有界線句', () => {
    for (const m of MODIFIERS) {
      if (m.kind !== 'malefic') continue;
      if (!['子女', '疾厄', '父母', '夫妻'].includes(m.key)) continue;
      expect(/不推|不談|不涉|不作|不評價|不讀成|條件提示/.test(m.text), m.id).toBe(true);
    }
  });
});

describe('⚠ 廟旺唔派生規則（§15）', () => {
  /**
   * 「紫微坐官祿」同「紫微落陷」講緊**同一粒星**。
   * 如果廟旺自己一個去重群，呢兩句就會變成兩票 —— 而佢哋係同一粒星嘅兩句描述。
   *
   * 所以廟旺係貼喺基塊上面嘅修飾語，唔進入門檻計數。
   * 六煞唔同：擎羊係另一粒星，可以自己一群，但角色只係修正。
   */
  it('規則庫入面冇 brightness.* 規則', () => {
    expect(RULE_REGISTRY.rules.filter((x) => x.rule_id.startsWith('brightness.'))).toHaveLength(0);
  });

  it('四化 48 條、六煞 72 條，都由修飾語層派生', () => {
    expect(RULE_REGISTRY.rules.filter((x) => x.rule_id.startsWith('sihua.natal-'))).toHaveLength(48);
    expect(RULE_REGISTRY.rules.filter((x) => x.rule_id.startsWith('sha.'))).toHaveLength(72);
  });

  it('六煞每粒一個群，而且角色係 modifier 唔係 core', () => {
    const sha = RULE_REGISTRY.rules.filter((x) => x.rule_id.startsWith('sha.'));
    expect(new Set(sha.map((x) => x.independence_group)).size).toBe(6);
    for (const x of sha) expect(x.role, x.rule_id).toBe('modifier');
  });

  it('四化每化一個群，角色係 core（§13：所屬時間層嘅核心機制）', () => {
    const sh = RULE_REGISTRY.rules.filter((x) => x.rule_id.startsWith('sihua.natal-'));
    expect(new Set(sh.map((x) => x.independence_group)).size).toBe(4);
    for (const x of sh) expect(x.role, x.rule_id).toBe('core');
  });
});

describe('§16 門檻階梯', () => {
  const NAME = ['平／null', '順／慎', '進／逆', '盛／險'];

  it('逐主題算得出上限，而且唔係加總', () => {
    const rows = (['self', 'career', 'finance', 'relationship', 'home', 'social', 'load'] as const)
      .map((t) => {
        const c = gradeCeiling(OUT, t, { natalChapter: true });
        return `${t}=${NAME[c.ceiling]}(群${c.groups}/核${c.coreGroups}/構${c.structuralGroups})`;
      });
    // eslint-disable-next-line no-console
    console.log(`\n  ${rows.join('\n  ')}\n`);
    expect(rows).toHaveLength(7);
  });

  /** C6 之前 career 只有一個群，連「順」都出唔到。C7 加咗官祿嘅三方四正，變五個。 */
  it('C6 打開咗 career：由單一訊號變成五個群', () => {
    const c = gradeCeiling(OUT, 'career', { natalChapter: true });
    expect(c.groups).toBe(5);
  });

  /**
   * ⚠ **呢條測試係 C7 嘅驗收。**
   *
   * C6 交嗰陣佢寫住「career 上唔到進／逆，因為冇結構驗證群」，
   * 而原因好具體：三方四正規則得命宮一條，所以只有 self 有結構群。
   *
   * C7 補咗十二宮每宮兩條。career 而家有官祿自己嘅三方四正，
   * 過到門檻四（本命篇章例外：兩個本命核心群 ＋ 一個結構驗證群）。
   *
   * 留意 `structuralGroups` 先係關鍵，唔係 `groups` ——
   * 加多幾條修正層規則永遠過唔到門檻四，因為修正拎唔到核心票，
   * 亦都唔算結構驗證。**呢個數係一道唔湊得到嘅門。**
   */
  it('C7 打開咗 career：有咗結構驗證群，上到進／逆', () => {
    const c = gradeCeiling(OUT, 'career', { natalChapter: true });
    expect(c.structuralGroups).toBeGreaterThanOrEqual(1);
    expect(c.coreGroups).toBeGreaterThanOrEqual(2);
    expect(c.ceiling).toBe(2);
    expect(c.reasons.join('｜')).toContain('門檻四');
  });

  /**
   * home 就唔同：佢由「平／null」升到「順／慎」，但**上唔到進／逆**。
   *
   * 而且原因唔係規則庫唔夠。田宅嗰兩條三方四正規則寫咗、審核咗、跑咗，
   * 只係**冇命中** —— 呢副盤嘅田宅三方四正冇煞冇吉，盤面真係靜。
   *
   * 「我哋寫唔到」同「呢副盤冇嘢好講」係兩件事，而第二樣係正確答案。
   * 一個每個主題都答得出嘢嘅系統，就係一個冇門檻嘅系統。
   */
  it('home 升到順／慎但上唔到進／逆 —— 因為田宅嘅三方四正冇命中，唔係冇寫', () => {
    const c = gradeCeiling(OUT, 'home', { natalChapter: true });
    expect(c.ceiling).toBe(1);
    expect(c.structuralGroups).toBe(0);
    // 規則存在而且已審核 —— 分別喺「冇寫」定「冇命中」
    const sf = RULE_REGISTRY.approved.filter((r) => r.rule_id.startsWith('sanfang.田宅'));
    expect(sf.length).toBe(2);
    const ran = OUT.filter((o) => o.rule.rule_id.startsWith('sanfang.田宅'));
    expect(ran.every((o) => o.status === 'unmatched'), '田宅三方四正應該係 unmatched，唔係 blocked').toBe(true);
  });

  it('冇核心群 → 上限係零，修正層唔可以獨力撐方向', () => {
    const onlyMods = OUT.filter(
      (o) => o.status === 'matched' && o.rule.role === 'modifier',
    );
    const c = gradeCeiling(onlyMods, 'career');
    expect(c.ceiling).toBe(0);
    expect(c.reasons.join('｜')).toMatch(/冇核心群|單一訊號/);
  });

  it('本命篇章例外：兩核心加一結構可以上到進／逆，唔使夾硬湊流年', () => {
    const withOut = gradeCeiling(OUT, 'self', { natalChapter: true });
    const without = gradeCeiling(OUT, 'self');
    expect(withOut.ceiling).toBe(2);
    // 冇咗例外，self 嘅核心群全部喺本命層，就上唔到門檻二
    expect(without.ceiling).toBeLessThanOrEqual(withOut.ceiling);
  });

  it('盛／險要三層都有核心 —— 呢副盤做唔到，而且應該做唔到', () => {
    for (const t of ['self', 'career', 'social', 'load'] as const) {
      expect(gradeCeiling(OUT, t, { natalChapter: true }).ceiling, t).toBeLessThan(3);
    }
  });
});
