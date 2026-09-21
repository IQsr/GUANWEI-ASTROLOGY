/**
 * 工單 C4 —— L1 基塊
 *
 * 三樣機器核得到嘅嘢：
 *   字數同 cell 級來源
 *   引文喺原文搵唔搵得返
 *   **七十二條互相似唔似** —— 呢個係機器版嘅巴納姆測試
 */
import { describe, expect, it } from 'vitest';
import {
  BASE_BLOCKS,
  BaseBlock,
  C4_STARS,
  C5_STARS,
  PALACE_TOPIC,
  baseBlockOf,
  baseCoverage,
  cjkCount,
  hasError,
  mostSimilar,
  scanForbidden,
  similarity,
  withoutCitations,
  lexiconOf,
} from '../src/index';

const PAL = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];

describe('七十二格', () => {
  it('十四主星 × 十二宮 = 168 格，一格都冇漏', () => {
    expect(BASE_BLOCKS).toHaveLength(168);
    for (const s of [...C4_STARS, ...C5_STARS]) {
      for (const p of PAL) expect(baseBlockOf(s, p), `${s}.${p}`).not.toBeNull();
    }
  });

  it('每粒星十二條，每個宮十四條 —— 矩陣係滿嘅', () => {
    for (const s of [...C4_STARS, ...C5_STARS]) {
      expect(BASE_BLOCKS.filter((b) => b.star === s), s).toHaveLength(12);
    }
    for (const p of PAL) {
      expect(BASE_BLOCKS.filter((b) => b.palace === p), p).toHaveLength(14);
    }
  });

  it('每條 120–150 字', () => {
    const bad = BASE_BLOCKS.filter((b) => cjkCount(b.body) < 120 || cjkCount(b.body) > 150)
      .map((b) => `${b.id}=${cjkCount(b.body)}`);
    expect(bad).toEqual([]);
  });

  it('每個宮都對得返一個主題', () => {
    for (const b of BASE_BLOCKS) expect(PALACE_TOPIC[b.palace], b.id).toBeTruthy();
  });

  it('進度：168 / 168，十四主星齊', () => {
    const c = baseCoverage();
    expect(c).toEqual({ done: 168, target: 168, c4: 72, c5: 96 });
  });
});

describe('⚠ 至少一個 cell 級來源', () => {
  /**
   * 星級同宮級來源撐唔起一個交集結論。
   *
   * 「紫微屬土」講緊紫微，「兄弟宮講平輩」講緊兄弟宮 ——
   * 兩條加埋都冇講過「紫微喺兄弟宮」。
   * 冇 cell 級來源，呢條基塊就係我哋自己砌出嚟嘅。
   */
  it('七十二條全部有 cell 級來源', () => {
    for (const b of BASE_BLOCKS) {
      expect(b.sources.some((s) => s.scope === 'cell'), b.id).toBe(true);
    }
  });

  it('淨係星級來源 → parse 唔到', () => {
    const b = BASE_BLOCKS[0]!;
    const bad = { ...b, sources: b.sources.map((s) => ({ ...s, scope: 'star' as const })) };
    const r = BaseBlock.safeParse(bad);
    expect(r.success).toBe(false);
    if (!r.success) expect(JSON.stringify(r.error.issues)).toContain('cell 級來源');
  });

  it('引文抄錯一個字 → parse 唔到', () => {
    const b = BASE_BLOCKS[0]!;
    const bad = {
      ...b,
      sources: [{ ...b.sources[0]!, quote: b.sources[0]!.quote.replace(/.$/, '龘') }, b.sources[1]!],
    };
    expect(BaseBlock.safeParse(bad).success).toBe(false);
  });
});

describe('⚠ 反巴納姆：168 條互相比對', () => {
  /**
   * 呢個唔係風格檢查，係內容檢查。
   *
   * 如果 base.紫微.財帛 同 base.武曲.財帛 似到可以互換，
   * 噉其中一條就冇講到「呢粒星」，只講咗「呢個宮」——
   * 而宮嘅嘢 L0 詞條已經講咗，基塊重複一次等於冇寫。
   *
   * 一條可以搬去第二格用嘅塊，對讀者嚟講就係一句人人都啱嘅話。
   */
  const LIMIT = 0.35;

  it(`最似嘅一對都要低過 ${LIMIT}`, () => {
    const top = mostSimilar(BASE_BLOCKS, 5);
    // eslint-disable-next-line no-console
    console.log(
      `\n  最似嘅五對：\n` +
        top.map((p) => `    ${p.score.toFixed(3)}  ${p.a}  vs  ${p.b}`).join('\n') + '\n',
    );
    expect(top[0]!.score).toBeLessThan(LIMIT);
  });

  it('同一個宮、唔同星 —— 一定要分得開', () => {
    const bad: string[] = [];
    for (const p of PAL) {
      const blocks = BASE_BLOCKS.filter((b) => b.palace === p);
      for (let i = 0; i < blocks.length; i++) {
        for (let j = i + 1; j < blocks.length; j++) {
          const s = similarity(blocks[i]!.body, blocks[j]!.body);
          if (s >= LIMIT) bad.push(`${blocks[i]!.id} vs ${blocks[j]!.id} = ${s.toFixed(3)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('同一粒星、唔同宮 —— 一樣要分得開', () => {
    const bad: string[] = [];
    for (const st of [...C4_STARS, ...C5_STARS]) {
      const blocks = BASE_BLOCKS.filter((b) => b.star === st);
      for (let i = 0; i < blocks.length; i++) {
        for (let j = i + 1; j < blocks.length; j++) {
          const s = similarity(blocks[i]!.body, blocks[j]!.body);
          if (s >= LIMIT) bad.push(`${blocks[i]!.id} vs ${blocks[j]!.id} = ${s.toFixed(3)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  /**
   * ⚠ 呢條係由一個真 bug 生出嚟嘅。
   *
   * 寫基塊嗰陣分兩步：先寫正文，再補字數。補嗰步喺八條塊度
   * 加咗一句同結尾意思重複嘅說話 —— 字數夠咗，但讀落係同一句講兩次。
   * 相似度檢查捉唔到佢，因為佢係**同一條塊入面**重複，唔係兩條之間。
   */
  it('一條基塊入面唔准有重複片段', () => {
    const dup: string[] = [];
    for (const b of BASE_BLOCKS) {
      const t = b.body.replace(/[^㐀-鿿]/g, '');
      const seen = new Map<string, number>();
      for (let i = 0; i + 12 <= t.length; i++) {
        const seg = t.slice(i, i + 12);
        const at = seen.get(seg);
        if (at !== undefined && i - at >= 12) { dup.push(`${b.id}：「${seg}」`); break; }
        if (at === undefined) seen.set(seg, i);
      }
    }
    expect(dup).toEqual([]);
  });

  it('similarity 本身啱用：同一段文字 = 1，完全唔同 ≈ 0', () => {
    const a = BASE_BLOCKS[0]!.body;
    expect(similarity(a, a)).toBe(1);
    expect(similarity('甲乙丙丁戊己庚辛', '子丑寅卯辰巳午未')).toBe(0);
  });
});

describe('基塊文字要守自己立嘅禁令', () => {
  /**
   * 掃之前先拎走**核得返原文**嘅引文。
   *
   * 「天府出外遇貴人扶」入面有「外遇」兩個字，但嗰個係「出外／遇貴人」。
   * 古人寫過嘅可以引，我哋自己寫嘅一律要掃 —— 條件係逐字喺語料庫搵得返。
   */
  it('掃唔到黑名單字（引文除外，而引文要核得返原文）', () => {
    const hits: string[] = [];
    for (const b of BASE_BLOCKS) {
      const f = scanForbidden(withoutCitations(b.body), 'body');
      if (hasError(f)) hits.push(`${b.id}：${f.map((x) => x.message).join('；')}`);
    }
    expect(hits).toEqual([]);
  });

  it('引號收埋一句唔係原文嘅嘢，仍然掃得到', () => {
    const fake = '這一格的重點是「命中注定要走這條路」，其餘不論。';
    expect(withoutCitations(fake)).toContain('命中注定');
    expect(hasError(scanForbidden(withoutCitations(fake), 'body'))).toBe(true);
  });

  it('冇粵語口語 —— 基塊係讀者睇嘅', () => {
    const words = ['唔', '嘅', '嗰', '咁', '啲', '喺', '佢', '冇', '咗', '嘢'];
    const hits: string[] = [];
    for (const b of BASE_BLOCKS) {
      for (const w of words) if (b.body.includes(w)) hits.push(`${b.id}：${w}`);
    }
    expect(hits).toEqual([]);
  });

  /**
   * 四個高風險宮嘅二十四條基塊，一定要明寫本書唔做乜。
   * 古書喺呢四宮嘅斷語最重，亦都係最容易被抄落去嘅地方。
   */
  it('高風險宮位嘅基塊都寫咗「本書不採用」', () => {
    const risky = ['子女', '疾厄', '父母', '夫妻'];
    const missing: string[] = [];
    for (const b of BASE_BLOCKS) {
      if (!risky.includes(b.palace)) continue;
      if (!/不採用|不推斷|不作推斷|不描述|不作任何|禁止推斷|一概不採/.test(b.body)) missing.push(b.id);
    }
    expect(missing).toEqual([]);
  });
});

describe('同 L0 詞條接得返', () => {
  it('每條基塊嘅星同宮都有對應詞條', () => {
    for (const b of BASE_BLOCKS) {
      expect(lexiconOf(`star.${b.star}`), b.id).not.toBeNull();
      expect(lexiconOf(`palace.${b.palace}`), b.id).not.toBeNull();
    }
  });

  /**
   * 基塊唔應該重複詞條講過嘅嘢。
   * 呢條係抽樣核對：基塊同佢對應嘅星曜詞條唔可以太似。
   */
  it('基塊同星曜詞條分得開 —— 唔係抄多次', () => {
    const bad: string[] = [];
    for (const b of BASE_BLOCKS) {
      const entry = lexiconOf(`star.${b.star}`)!;
      const s = similarity(b.body, entry.full);
      if (s >= 0.3) bad.push(`${b.id} vs star.${b.star} = ${s.toFixed(3)}`);
    }
    expect(bad).toEqual([]);
  });
});
