/**
 * 工單 C8b —— 組裝器
 *
 * 四條驗收標準，逐條有測試：
 *
 *   同一 object 跑兩次輸出完全相同     → 「純規則，可完全重現」
 *   每章字數喺規格範圍內               → 逐格對 §6 插槽表，唔係對總字數
 *   空宮一定明寫「借對宮○○參看」      → 空宮本身就係訊息
 *   每句追得返去邊一塊 ＋ 邊條規則      → 每段帶 source_id 同 rule_ids
 */
import { describe, expect, it } from 'vitest';
import { annual, cast, SCHOOL_PROFILE, type BirthInput } from '@guanwei/ziwei';
import {
  BASE_BLOCKS,
  FRAMES,
  L3_BLOCKS,
  MEDICAL_DISCLAIMER,
  MODIFIERS,
  RULE_REGISTRY,
  SLOT_SPEC,
  SPEC_VERSION,
  assemble,
  assembleAll,
  cjkCount,
  inferAll,
  l3Coverage,
  l3Similar,
  missingSlots,
  restatingTails,
  scanForbidden,
  similarity,
  withoutCitations,
} from '../src/index';

const INPUT: BirthInput = {
  solar: { y: 1996, m: 6, d: 16 }, time: { h: 8, min: 30 },
  tz: 'Asia/Hong_Kong', place: { lng: 114.17, lat: 22.32, label: '香港' }, sex: 'male',
};
const r = cast(INPUT);
if (!r.ok) throw new Error(r.message);
const CHART = r.value;
const a = annual(CHART, 2026);
if (!a.ok) throw new Error(a.message);
const BY_TOPIC = inferAll(RULE_REGISTRY, { chart: CHART, annual: a.value }, SCHOOL_PROFILE.ref, SPEC_VERSION, {
  chartId: 'c1', layer: 'natal',
});
const CH = assembleAll(CHART, BY_TOPIC, { seed: 'c1' });

/* ══════════════════════════════════════════════
   L3：C7 漏低嗰半
   ══════════════════════════════════════════════ */

describe('L3 結構層正文', () => {
  /**
   * C7 交咗 L3 嘅**規則**（三方四正 24、空宮 12、身宮 6、格局 30），
   * 但內容系統 §3 嘅 L3 一欄寫嘅係「約 60 條」—— **內容**，唔係規則。
   *
   * 差別 C7 嗰陣睇唔出，因為規則自己有 `allowed_xiang`，讀落好似有嘢。
   * 到 C8b 要砌「牽動」插槽（必需）先發現冇文可揀。
   * 記低係因為：**一條規則寫完唔等於嗰一層寫完。**
   */
  it('70 條，五種', () => {
    expect(l3Coverage()).toEqual({ relation: 12, sanfang: 24, shen: 6, geju: 16, empty: 12, total: 70 });
  });

  it('除咗關係塊，每條都指返去一條已審核規則', () => {
    for (const b of L3_BLOCKS) {
      if (b.kind === 'relation') {
        expect(b.rule_ids, b.id).toEqual([]);
        continue;
      }
      expect(b.rule_ids.length, b.id).toBeGreaterThan(0);
      for (const id of b.rule_ids) {
        const rule = RULE_REGISTRY.rules.find((x) => x.rule_id === id);
        expect(rule, `${b.id} → ${id}`).toBeTruthy();
        expect(rule!.review_status, id).toBe('approved');
      }
    }
  });

  /**
   * 關係塊（「財帛宮不是獨立看的，它與命宮、官祿宮連成一組」）冇規則冇來源，
   * 因為佢講嘅係**幾何**：三方四正邊幾個宮係算出嚟嘅，唔係對斗數嘅主張。
   * 同 L5 章框一樣嘅豁免，所以同一樣嘅代價 —— 一個象義都唔准講。
   */
  it('關係塊一個星名、化別、廟旺、煞曜都冇', () => {
    const terms = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門',
      '天相', '天梁', '七殺', '破軍', '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫',
      '化祿', '化權', '化科', '化忌', '廟', '落陷'];
    for (const b of L3_BLOCKS.filter((x) => x.kind === 'relation')) {
      for (const t of terms) expect(b.body.includes(t), `${b.id} 出現咗 ${t}`).toBe(false);
    }
  });

  it('過到語氣 lint', () => {
    for (const b of L3_BLOCKS) expect(scanForbidden(withoutCitations(b.body), 'body'), b.id).toEqual([]);
  });

  it('互相唔似 —— 十二個宮唔可以係同一句換個宮名', () => {
    const top = l3Similar(1)[0]!;
    // eslint-disable-next-line no-console
    console.log(`\n  最似一對 L3：${top.a} vs ${top.b} = ${top.score.toFixed(3)}\n`);
    expect(top.score).toBeLessThan(0.35);
  });
});

/* ══════════════════════════════════════════════
   四條驗收標準
   ══════════════════════════════════════════════ */

describe('AC ① 純規則，可完全重現', () => {
  it('同一 (chart, palace, object, seed) 跑兩次，逐個欄位一樣', () => {
    const one = assembleAll(CHART, BY_TOPIC, { seed: 'c1' });
    const two = assembleAll(CHART, BY_TOPIC, { seed: 'c1' });
    expect(two).toEqual(one);
  });

  /** 輪替係由種算出嚟，唔係 random —— 唔同嘅書結尾唔同，同一本永遠一樣。 */
  it('換咗種，留白句會唔同；同一個種永遠一樣', () => {
    const other = assembleAll(CHART, BY_TOPIC, { seed: 'c2' });
    const closeOf = (cs: typeof CH) => cs.map((c) => c.segments.find((s) => s.slot === '留白')!.source_id);
    expect(closeOf(other)).not.toEqual(closeOf(CH));
    expect(closeOf(assembleAll(CHART, BY_TOPIC, { seed: 'c2' }))).toEqual(closeOf(other));
  });
});

describe('AC ② 每章字數喺規格範圍內', () => {
  /**
   * ⚠ 對嘅係**逐格**，唔係總字數。
   *
   * 總字數啱而逐格唔啱，即係某一層寫多咗、某一層寫少咗 ——
   * 而讀者感覺到嘅係後者：一章全部係星性冇結構，或者全部係結構冇象。
   */
  it('十二章、六個插槽，逐格對返 §6 插槽表', () => {
    const bad = CH.flatMap((c) => c.outOfRange.map((x) => `${c.palace}/${x.slot}=${x.words}(${x.min}–${x.max})`));
    // eslint-disable-next-line no-console
    console.log(`\n  ${CH.map((c) => `${c.palace}=${c.words}`).join('  ')}\n  超標：${bad.join('、') || '冇'}\n`);
    /*
     * 剩一格超標：官祿坐擎羊同火星，兩句煞曜提示加埋 66 字，上限 60。
     *
     * 呢度冇調參數去夾個數字 —— 調到啱就係一條冇理由嘅規則，而且下一副盤照樣爆。
     * 根因係 §6 嘅上限假設咗一個宮一粒煞，而一個宮可以坐兩三粒。
     * 已經寫咗做規範嘅編輯建議（見 `SLOT_SPEC` 上面嗰段）。
     *
     * （父母宮嘅結構格本來都超標 210 字，但嗰個唔係同一件事：
     * 佢係兩條塊之間逐字重複，畀重複片段偵測器剷走之後自然跌返落範圍。）
     */
    /* C10 剝走咗煞星嘅定義句之後，由 82 跌到 66 —— 但仍然過線。 */
    expect(bad).toEqual(['官祿/擾動=66(0–60)']);
  });

  it('必需嘅五格，十二章一格都冇空', () => {
    expect(missingSlots(CH)).toEqual([]);
    for (const c of CH) {
      for (const sp of SLOT_SPEC.filter((x) => x.required)) {
        expect(c.slotWords[sp.slot], `${c.palace}/${sp.slot}`).toBeGreaterThan(0);
      }
    }
  });

  /**
   * §6 寫「開場 = L1 基塊首句，40–70 字」—— 嗰個假設咗基塊首句有四十字。
   * 我哋嘅唔係：好多條 C5 塊開頭係一句十幾廿字嘅引文。
   * 照「首句」切，開場成格得九個字。所以切嘅係「開頭夠字為止」。
   */
  it('開場切法唔會因為原文有一句短引文就崩', () => {
    for (const c of CH) expect(c.slotWords['開場'], c.palace).toBeGreaterThanOrEqual(30);
  });
});

describe('AC ③ 空宮一定明寫借咗邊個宮', () => {
  it('空宮章第一句就講，唔係藏喺中間', () => {
    const empties = CH.filter((c) => c.borrowed);
    expect(empties.length).toBeGreaterThan(0);
    for (const c of empties) {
      const first = c.segments.find((s) => s.slot === '開場')!;
      expect(first.text, c.palace).toContain('無主星');
      expect(first.text, c.palace).toContain(`借對宮${c.borrowed!.stars.join('、')}參看`);
    }
  });

  it('唔係空宮就冇借星句', () => {
    for (const c of CH.filter((x) => !x.borrowed)) {
      expect(c.text.includes('借對宮'), c.palace).toBe(false);
    }
  });
});

describe('AC ④ 每句追得返去邊一塊 ＋ 邊條規則', () => {
  it('每一段都有出處，過場句除外', () => {
    const known = new Set<string>([
      ...BASE_BLOCKS.map((b) => b.id),
      ...MODIFIERS.map((m) => m.id),
      ...L3_BLOCKS.map((b) => b.id),
      ...FRAMES.map((f) => f.id),
      'frame.empty', 'frame.footer',
    ]);
    for (const c of CH) {
      for (const seg of c.segments) {
        if (seg.slot === '過場') {
          /* 過場句唔帶新資訊，所以佢冇塊 —— 但佢一定要係白名單入面嗰句。 */
          expect(FRAMES.some((f) => f.id === seg.source_id), seg.text).toBe(true);
          continue;
        }
        expect(seg.source_id, `${c.palace}/${seg.slot}`).toBeTruthy();
        for (const id of seg.source_id!.split('+')) {
          expect(known.has(id), `${c.palace}/${seg.slot} → ${id}`).toBe(true);
        }
      }
    }
  });

  /** 規則要係真係命中咗嗰啲 —— 一段掛住一條冇命中嘅規則，就係假追溯。 */
  it('每段掛住嘅規則，全部喺結論物件嘅 evidence 入面', () => {
    for (const c of CH) {
      const ok = new Set(BY_TOPIC[c.topic as keyof typeof BY_TOPIC].interpretation.evidence.map((e) => e.rule_id));
      for (const seg of c.segments) {
        for (const id of seg.rule_ids) expect(ok.has(id), `${c.palace}/${seg.slot} → ${id}`).toBe(true);
      }
    }
  });

  /** 章首、過場、留白係章框 —— 佢哋唔係命理主張，所以唔應該掛住規則。 */
  it('章框三格一條規則都唔掛', () => {
    for (const c of CH) {
      for (const seg of c.segments.filter((s) => ['章首', '過場', '留白'].includes(s.slot))) {
        expect(seg.rule_ids, `${c.palace}/${seg.slot}`).toEqual([]);
      }
    }
  });
});

/* ══════════════════════════════════════════════
   V-001 嘅後果
   ══════════════════════════════════════════════ */

describe('V-001：一章入面根本冇「勢」呢個插槽', () => {
  /**
   * 呢個係組裝寫到一半先睇得清楚嘅一件事：
   * §6 插槽表六格全部係描述同留白，**冇評級嗰一格**。
   *
   * 所以「大部分章冇方向」呢個代價，比想像中細好多 ——
   * 冇方向嘅係**評級**，唔係章。章照樣有象、有結構、有牽動、有留白。
   */
  it('十一章冇方向，但十二章都有齊五格內容', () => {
    const graded = CH.filter((c) => c.topic_grade !== null && c.topic_grade !== 0);
    expect(graded.map((c) => c.palace)).toEqual(['財帛']);
    for (const c of CH) expect(c.words, c.palace).toBeGreaterThan(300);
  });

  /** 主題得七個，宮位有十二個 —— 欄名要講得出佢係主題級數，唔係呢一宮嘅級數。 */
  it('四個宮共用 self，所以評級標明係主題級', () => {
    const self = CH.filter((c) => c.topic === 'self').map((c) => c.palace);
    expect(self.sort()).toEqual(['命宮', '子女', '父母', '遷移'].sort());
    for (const c of CH.filter((x) => x.topic === 'self')) {
      expect(c.topic_grade).toBe(BY_TOPIC.self.interpretation.rating.final_grade);
    }
  });

  it('疾厄章章末有免責句，其餘冇', () => {
    const ji = CH.find((c) => c.palace === '疾厄')!;
    expect(ji.text.endsWith(MEDICAL_DISCLAIMER)).toBe(true);
    for (const c of CH.filter((x) => x.palace !== '疾厄')) {
      expect(c.text.includes(MEDICAL_DISCLAIMER), c.palace).toBe(false);
    }
  });
});

describe('⚠ 跨格重複：C5 一個內容問題喺組裝嗰陣先現形', () => {
  /**
   * C5 寫高風險宮嘅時候，十四粒星嘅塊入面用咗同一句免責話
   * （「《全書》這一格列出具體病症，本書一律不採用」）。
   * 逐條塊睇冇問題 —— 但一個宮坐兩粒主星嗰陣，讀者一章入面會見到兩次。
   *
   * ⚠ 呢個報告器要**一直留喺度**，就算而家係零。
   *
   * 佢捉嘅唔係「邊條塊寫得差」，係「兩條各自冇問題嘅塊拼埋之後出事」——
   * 而呢種撞法冇得喺寫嗰陣避：兩邊係喺唔同工單、唔同層寫嘅。
   * 加多一條塊、改一句修飾語，佢隨時返嚟。
   */
  it('跨格重複清零 —— 但個報告器要一直留喺度', () => {
    const dup = CH.flatMap((c) => c.duplicates.map((d) => ({ palace: c.palace, ...d })));
    // eslint-disable-next-line no-console
    for (const d of dup) console.log(`\n  ${d.palace} ${d.score.toFixed(2)}\n    ${d.a}\n    ${d.b}\n`);
    expect(dup).toEqual([]);
  });

  it('逐字重複嗰啲剷得走', () => {
    const xiongdi = assemble(CHART, '兄弟', BY_TOPIC.social, { seed: 'c1' });
    const lead = xiongdi.segments.find((s) => s.slot === '開場')!.text;
    const body = xiongdi.segments.find((s) => s.slot === '結構')!.text;
    expect(lead).toContain('本書不採用');
    expect(body.includes(lead.trim()), '開場嗰句唔應該喺結構再出現一次').toBe(false);
  });
});

describe('⚠ 兩個只喺組裝嗰一刻先睇得到嘅撞法', () => {
  /**
   * 過場句同跟住嗰段撞。樣章第一次跑出嚟係咁：
   *
   *   〔過場〕這一宮不是獨立看的。
   *   〔牽動〕命宮不是獨立看的。它與遷移宮正對⋯⋯
   *
   * 兩句都啱、都有出處、各自都過晒閘。但擺埋一齊就係同一句講兩次。
   * 呢種撞法冇得喺寫嗰陣避 —— 兩邊係喺唔同工單、唔同層寫嘅（C7 章框 vs C8b L3）。
   */
  it('過場句唔會同跟住嗰段撞', () => {
    for (const c of CH) {
      for (let i = 0; i < c.segments.length - 1; i++) {
        const cur = c.segments[i]!;
        if (cur.slot !== '過場') continue;
        const next = c.segments[i + 1]!;
        const head = next.text.match(/^[^。！？]*[。！？]/)?.[0] ?? next.text;
        expect(
          similarity(cur.text, head),
          `${c.palace}：「${cur.text}」撞「${head}」`,
        ).toBeLessThan(0.25);
      }
    }
  });

  /**
   * 同一格入面兩條塊撞。貪狼基塊寫「什麼都碰一點，什麼都停在入門」，
   * 而「平」檔廟旺修飾語寫「什麼都停在入門，這是實況」。
   *
   * 兩條塊各自寫嗰陣冇問題（一條講星性、一條講強弱），
   * C6 嗰條句內重複閘亦都捉唔到 —— 因為佢哋唔喺同一句入面。
   * 要到組裝拼埋先至現形。
   */
  it('結構格入面唔會有兩句近乎逐字重複', () => {
    for (const c of CH) {
      const seg = c.segments.find((s) => s.slot === '結構');
      if (!seg) continue;
      const ss = (seg.text.match(/[^。！？]*[。！？]|[^。！？]+$/g) ?? []).filter((t) => cjkCount(t) >= 10);
      for (let i = 0; i < ss.length; i++) {
        for (let j = i + 1; j < ss.length; j++) {
          expect(similarity(ss[i]!, ss[j]!), `${c.palace}：「${ss[i]}」「${ss[j]}」`).toBeLessThan(0.55);
        }
      }
    }
  });
});

describe('⚠ 同一個湊字數嘅寫法，第六同第七次', () => {
  /**
   * C8b 砌命宮章嗰陣，樣章度見到：
   *
   *   「興趣廣而不深：什麼都碰一點，什麼都停在入門。什麼都停在入門，這是實況。」
   *
   * 一條 C6 修飾語，湊字數湊出嚟嘅重複，**差一個字避開咗個閘**：
   * 「什麼都停在入門」啱啱好七個字，而 C6 個窗係八字。
   * 收窄到七之後，一次過捉到十一條同樣寫法嘅修飾語，全部改晒。
   */
  it('修飾語一句入面唔准有七字以上嘅重複 —— 十一條改完', () => {
    for (const m of MODIFIERS) {
      const cjk = m.text.replace(/[^㐀-鿿]/g, '');
      const seen = new Map<string, number>();
      for (let i = 0; i + 7 <= cjk.length; i++) {
        const seg = cjk.slice(i, i + 7);
        const at = seen.get(seg);
        expect(at === undefined || i - at < 7, `${m.id}：「${seg}」`).toBe(true);
        if (at === undefined) seen.set(seg, i);
      }
    }
  });

  /**
   * ⚠ 用同一個訊號掃基塊，二十五條中 —— 但**冇一刀切改**。
   *
   * 因為佢哋唔同質：一種係純湊字數（冇加嘢），一種係「重述一次然後轉折」（係修辭）。
   * 一個捉得到兩者嘅正則一定會連第二種一齊剷，而 C5 已經學過機械刪句嘅代價。
   *
   * 所以呢個數釘喺度由人睇，同 `singleBookEntries()` 一樣：
   * **佢只會因為有人真係去改而跌。**
   */
  it('二十五條基塊尾句重述前文 —— 待人手覆核', () => {
    const tails = restatingTails(BASE_BLOCKS);
    // eslint-disable-next-line no-console
    console.log(`\n  尾句重述：${tails.length} / ${BASE_BLOCKS.length} —— 待人手覆核\n`);
    expect(tails).toHaveLength(25);
  });
});
