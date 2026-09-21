/**
 * 工單 C3 —— L0 詞條
 *
 * 呢批測試唔核「寫得啱唔啱」（嗰個要人讀）。佢哋核三樣機器核得到嘅：
 *   字數合唔合規格
 *   引文喺原文搵唔搵得返
 *   我哋有冇喺文字入面踩咗自己立嘅禁令
 */
import { describe, expect, it } from 'vitest';
import {
  CORPUS,
  LEXICON,
  LEXICON_TARGET,
  LexiconEntry,
  cjkCount,
  citationRef,
  distinctBooks,
  hasError,
  lexiconCoverage,
  lexiconOf,
  scanForbidden,
  singleBookEntries,
} from '../src/index';

describe('語料庫', () => {
  it('《全書》三卷嘅引文段落都入咗 repo', () => {
    const p = CORPUS.quanshu!.passages;
    expect(Object.keys(p).filter((k) => k.startsWith('star.'))).toHaveLength(14);
    expect(Object.keys(p).filter((k) => k.startsWith('palace.'))).toHaveLength(12);
    expect(p['attrs.table']).toBeTruthy();
    expect(p['sihua.verse']).toBeTruthy();
  });

  it('每段都有章節、行號同原文', () => {
    for (const [k, v] of Object.entries(CORPUS.quanshu!.passages)) {
      expect(v.chapter, k).toBeTruthy();
      expect(v.lines, k).toHaveLength(2);
      expect(v.text.length, k).toBeGreaterThan(20);
    }
  });
});

describe('詞條規格', () => {
  it('三十五條齊：十四主星、十二宮、四化、五行局', () => {
    expect(LEXICON).toHaveLength(35);
    expect(LEXICON.filter((e) => e.kind === 'star')).toHaveLength(14);
    expect(LEXICON.filter((e) => e.kind === 'palace')).toHaveLength(12);
    expect(LEXICON.filter((e) => e.kind === 'sihua')).toHaveLength(4);
    expect(LEXICON.filter((e) => e.kind === 'ju')).toHaveLength(5);
  });

  /** 詞條係畀讀者睇嘅，用繁體書面語。粵語留返喺 repo 文件同註釋。 */
  it('詞條正文冇粵語口語', () => {
    const words = ['唔', '嘅', '嗰', '咁', '啲', '喺', '佢', '冇', '咗', '嘢'];
    const hits: string[] = [];
    for (const e of LEXICON) {
      for (const w of words) {
        if (e.summary.includes(w) || e.full.includes(w)) hits.push(`${e.id}：${w}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('摘要 150–200 字，全文 400–600 字', () => {
    const bad = LEXICON.filter(
      (e) =>
        cjkCount(e.summary) < 150 || cjkCount(e.summary) > 200 ||
        cjkCount(e.full) < 400 || cjkCount(e.full) > 600,
    ).map((e) => `${e.id} 摘要${cjkCount(e.summary)} 全文${cjkCount(e.full)}`);
    expect(bad).toEqual([]);
  });

  it('每條至少兩個來源', () => {
    for (const e of LEXICON) expect(e.sources.length, e.id).toBeGreaterThanOrEqual(2);
  });

  it('see_also 全部指到存在嘅詞條 —— 冇死連結', () => {
    const dead: string[] = [];
    for (const e of LEXICON) {
      for (const ref of e.see_also) {
        if (!lexiconOf(ref)) dead.push(`${e.id} → ${ref}`);
      }
    }
    expect(dead).toEqual([]);
  });

  it('冇詞條指返自己', () => {
    for (const e of LEXICON) expect(e.see_also, e.id).not.toContain(e.id);
  });
});

describe('⚠ 引文要喺原文逐字搵得返', () => {
  /**
   * 呢條係成個 C3 嘅核心。
   *
   * 「每條兩個來源」如果只係寫兩行書名，等於冇 —— 冇人核得到。
   * 所以 schema 要求每個 source 帶 passage_id 同 quote，
   * 而 zod 會落去語料庫逐字搵。下面呢兩條係反向證明：
   * 抄錯一個字、指錯一段，都會 parse 失敗。
   */
  const good = LEXICON[0]!;

  it('三十五條詞條全部通過引文核對（parse 成功就即係核過）', () => {
    expect(LEXICON).toHaveLength(35);
    // 每條都真係指住語料庫入面一段存在嘅原文
    for (const e of LEXICON) {
      for (const src of e.sources) {
        expect(CORPUS[src.corpus]!.passages[src.passage_id], `${e.id} → ${src.passage_id}`).toBeTruthy();
      }
    }
  });

  it('引文抄錯一個字就 parse 唔到', () => {
    const broken = {
      ...good,
      sources: [
        { ...good.sources[0]!, quote: good.sources[0]!.quote.replace(/.$/, '龘') },
        good.sources[1]!,
      ],
    };
    const r = LexiconEntry.safeParse(broken);
    expect(r.success).toBe(false);
    if (!r.success) expect(JSON.stringify(r.error.issues)).toContain('引文喺');
  });

  it('指去一段唔存在嘅原文就 parse 唔到', () => {
    const r = LexiconEntry.safeParse({
      ...good,
      sources: [{ ...good.sources[0]!, passage_id: 'star.唔存在' }, good.sources[1]!],
    });
    expect(r.success).toBe(false);
  });

  it('citationRef 出到人睇得明嘅出處', () => {
    const ref = citationRef(good.sources[0]!);
    expect(ref).toContain('紫微斗數全書');
    expect(ref).toContain('卷一');
  });
});

describe('詞條文字要守自己立嘅禁令', () => {
  it('摘要同全文都掃唔到黑名單字', () => {
    const hits: string[] = [];
    for (const e of LEXICON) {
      for (const [field, text] of [['summary', e.summary], ['full', e.full]] as const) {
        const f = scanForbidden(text, field);
        if (hasError(f)) hits.push(`${e.id}.${field}：${f.map((x) => x.message).join('；')}`);
      }
    }
    expect(hits).toEqual([]);
  });

  /**
   * 古書嘅重語（「數中之惡曜」、「骨肉參商」）可以喺 quote 出現，
   * 但唔可以喺我哋自己寫嘅字度出現而冇交代。
   * 呢條係抽樣：七殺條文引咗重語，但一定同時寫咗我哋點處理。
   */
  it('引咗古書重語嘅詞條，一定寫埋我哋點讀', () => {
    const sha = lexiconOf('star.七殺')!;
    expect(sha.full).toContain('惡曜');
    expect(sha.full).toContain('不會把七殺寫成凶險');
  });
});

describe('進度同誠實度', () => {
  it('三十五條齊，L0 詞條寫完', () => {
    const c = lexiconCoverage();
    expect(c.done).toBe(35);
    expect(c.target).toBe(35);
    for (const r of c.rows) expect(r.done, r.kind).toBe(r.target);
    expect(LEXICON_TARGET.palace).toBe(12);
  });

  /**
   * ⚠ 十四條全部靠《全書》一本書。
   *
   * 兩個來源係兩**篇**（諸星問答論、分屬表），唔係兩本書 ——
   * 即係兩個文本位置、一個證人。一本書錯咗，兩條引文一齊錯。
   * 呢條測試唔係要佢變綠，係要令呢件事一直睇得見。
   * 攞到第二本書（工單 B5）之後，呢個數應該跌。
   */
  it('單一證人嘅詞條數目 —— 而家係全部三十五條', () => {
    const single = singleBookEntries();
    // eslint-disable-next-line no-console
    console.log(`\n  ${single.length} / ${LEXICON.length} 條詞條只靠一本書（《全書》）。第二本書係工單 B5。\n`);
    expect(single).toHaveLength(35);
    for (const e of single) expect(distinctBooks(e)).toEqual(['紫微斗數全書']);
  });

  /**
   * 高風險宮位一定要寫明本書唔做乜。
   *
   * 疾厄、子女、父母、夫妻四宮係規範第十九節硬閘所在。
   * 古書喺呢四宮嘅斷語最重，亦都係最容易被抄落去嘅地方。
   */
  it('四個高風險宮位都明寫咗禁止延伸', () => {
    const must: [string, string[]][] = [
      ['palace.疾厄', ['第十九節', '不作臨床風險評級']],
      ['palace.子女', ['生育結果', '硬閘']],
      ['palace.父母', ['第十九節', '不在這一張上']],
      ['palace.夫妻', ['夫妻宮有忌不等於離婚']],
    ];
    for (const [id, needles] of must) {
      const e = lexiconOf(id)!;
      const text = e.summary + e.full;
      for (const w of needles) expect(text, `${id} 要提到「${w}」`).toContain(w);
    }
  });
});
