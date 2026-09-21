import { describe, expect, it } from 'vitest';
import { cast } from '@guanwei/ziwei';
import {
  SLOT_FOCUS,
  branchIndexOf,
  chartStateAt,
  focusOf,
  paragraphs,
  resolveSlot,
} from '@/lib/suidu';

/**
 * 隨讀（工單 F2）
 *
 * 呢度測嘅係「邊一段亮邊一格」。量真嘢（個盤真係亮咗）喺 `check-juan.mjs`。
 */

const CHART = (() => {
  const r = cast({
    solar: { y: 1996, m: 6, d: 16 },
    time: { h: 8, min: 30 },
    tz: 'Asia/Hong_Kong',
    place: { lng: 114.17, lat: 22.32, label: '香港' },
    sex: 'male',
  });
  if (!r.ok) throw new Error(r.code);
  return r.value;
})();

describe('邊一格亮邊一格', () => {
  it('講緊呢一宮嘅段落，亮本宮', () => {
    for (const slot of ['開場', '結構', '擾動', '正文']) {
      expect(focusOf(slot), slot).toBe('palace');
    }
  });

  it('牽動講緊三方四正，所以連對宮三合一齊亮', () => {
    expect(focusOf('牽動')).toBe('sanfang');
  });

  /**
   * ⚠ 留白係「交返畀讀者」嗰一句（內容 §5 三分結構）。
   * 喺嗰一刻仲亮住一格盤，就係喺一句「留返畀你自己驗證」下面
   * 繼續指住個盤 —— 講埋唔應該講嘅嘢。
   */
  it('章首同留白乜都唔亮', () => {
    for (const slot of ['章首', '留白']) {
      expect(focusOf(slot), slot).toBe('none');
    }
  });

  it('序嗰幾格都唔亮 —— 嗰一章一個命理判斷都冇', () => {
    for (const slot of ['生辰', '盤面', '體系']) {
      expect(focusOf(slot), slot).toBe('none');
    }
  });

  /** 唔認得嘅格寧願唔亮，唔好亂亮。 */
  it('唔喺表入面嘅一律唔亮', () => {
    expect(focusOf('乜嘢格')).toBe('none');
    expect(focusOf('')).toBe('none');
  });

  it('表本身唔可以有第四種值', () => {
    for (const [slot, v] of Object.entries(SLOT_FOCUS)) {
      expect(['palace', 'sanfang', 'none', 'keep'], slot).toContain(v);
    }
  });
});

describe('宮名 → 地支索引', () => {
  /** ⚠ 唔可以靠章序推：目錄次序命宮行先，地支索引係盤面次序。 */
  it('十二宮各自搵得返一個索引，冇重複', () => {
    const all = CHART.palaces.map((p) => branchIndexOf(CHART, p.name));
    expect(all.every((i) => i !== null && i >= 0 && i < 12)).toBe(true);
    expect(new Set(all).size).toBe(12);
  });

  it('命宮嗰個索引對得返 chart.mingGong', () => {
    const i = branchIndexOf(CHART, '命宮')!;
    expect(CHART.palaces[CHART.palaces.findIndex((p) => p.name === '命宮')]!.branch).toBe(
      CHART.mingGong,
    );
    expect(i).toBeGreaterThanOrEqual(0);
  });

  it('唔認得嘅宮名回 null', () => {
    expect(branchIndexOf(CHART, '冇呢個宮')).toBeNull();
  });
});

describe('一段落 → 盤面狀態', () => {
  it('開場：亮本宮，唔亮三方', () => {
    const s = chartStateAt(CHART, '命宮', '開場');
    expect(s.selected).not.toBeNull();
    expect(s.relations).toBe(false);
  });

  it('牽動：亮本宮 ＋ 三方', () => {
    expect(chartStateAt(CHART, '命宮', '牽動').relations).toBe(true);
  });

  it('留白同未知段落：乜都唔亮', () => {
    expect(chartStateAt(CHART, '命宮', '留白').selected).toBeNull();
    expect(chartStateAt(CHART, '命宮', null).selected).toBeNull();
  });
});

describe('⚠ body 同 slots 對唔上就唔猜', () => {
  it('對得上就逐段配返', () => {
    const out = paragraphs('a\n\nb\n\nc', ['開場', '牽動', '留白']);
    expect(out.map((p) => p.slot)).toEqual(['開場', '牽動', '留白']);
    expect(out.map((p) => p.text)).toEqual(['a', 'b', 'c']);
  });

  /**
   * 猜嘅話個盤會喺錯嘅段落亮錯嘅格，而讀者唔會知佢睇緊嘅係錯嘅。
   * **一個亮錯格嘅盤，比一個唔亮嘅盤差。**
   */
  it('對唔上就全部回 null，唔會錯位配', () => {
    const out = paragraphs('a\n\nb\n\nc', ['開場', '留白']);
    expect(out).toHaveLength(3);
    expect(out.every((p) => p.slot === null)).toBe(true);
  });

  it('冇 slots 都唔會爆', () => {
    expect(paragraphs('a\n\nb', []).every((p) => p.slot === null)).toBe(true);
  });

  it('空段落唔算一段', () => {
    expect(paragraphs('a\n\n\n\nb', ['開場', '留白']).map((p) => p.text)).toEqual(['a', 'b']);
  });
});

describe('⚠ 過場句唔熄個盤', () => {
  /**
   * 過場係一道橋（內容 §7：「≤25 字，唔帶新資訊」）—— 佢唔換題目。
   * 當佢做 `none` 嘅話，由「結構」捲去「牽動」之間個盤會熄一熄再著返 ——
   * 視覺 §2：「一個視窗入面同時郁緊嘅嘢唔可以多過一樣。」
   */
  it('過場係 keep，唔係 none', () => {
    expect(focusOf('過場')).toBe('keep');
  });

  it('捲到過場嗰陣，保住上一段', () => {
    expect(resolveSlot('過場', '結構')).toBe('結構');
    expect(resolveSlot('過場', '牽動')).toBe('牽動');
  });

  it('唔係過場就照換', () => {
    expect(resolveSlot('牽動', '結構')).toBe('牽動');
    expect(resolveSlot('留白', '牽動')).toBe('留白');
  });

  /** 一開頭就撞到過場（前面冇嘢好保）→ 唔亮，唔係亮返上一章。 */
  it('前面冇嘢好保就唔亮', () => {
    expect(resolveSlot('過場', null)).toBeNull();
    expect(chartStateAt(CHART, '命宮', '過場').selected).toBeNull();
  });

  it('捲出咗所有段落之外，保住最後嗰一段', () => {
    expect(resolveSlot(null, '留白')).toBe('留白');
  });
});
