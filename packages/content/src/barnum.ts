/**
 * 巴納姆測量（工單 C10 嘅機器嗰半）
 *
 * 出處：內容系統 §8「巴納姆測試（最重要）」
 *
 * ── 點解要有機器嗰半 ──
 *
 * §8 講嘅巴納姆測試係：畀每個人睇兩本 —— 自己嗰本同一本隨機抽嘅 ——
 * 分唔到就代表文案太空泛。目標八成人一睇就分到。
 *
 * 呢個係唯一測得到「啲字有冇料」嘅方法，但佢貴（要八至十個真人）
 * 而且慢（讀完一本書先答得到）。所以先做得到嘅一半要先做：
 *
 *   **攞一百幾本由唔同命盤排出嚟嘅書，量佢哋之間有幾多字係一樣。**
 *
 * 一對書如果重疊九成，唔使搵人試都知分唔開。
 * 呢個測量唔會取代真人測試 —— 佢只係令真人測試唔好浪費喺一啲
 * 我哋自己度一度就知會失敗嘅嘢上面。
 *
 * ── 一個好緊要嘅分別 ──
 *
 * 兩本書似，有兩個完全唔同嘅原因：
 *
 *   一、內容太薄 —— 我哋寫嘅嘢對邊個都啱。**呢個係病。**
 *   二、兩副盤本來就似 —— 紫微同命宮落宮一樣，十四主星同廟旺就全部一樣。
 *       **呢個唔係病，而且喺呢度製造差異先至係講大話。**
 *
 * 所以 `chartSignature()` 同 `overlap()` 要一齊睇。
 * 一對高重疊嘅書，如果盤嘅簽名都一樣，噉個系統係啱嘅。
 */
import type { Chart } from '@guanwei/ziwei';
import type { Chapter } from './assemble';

export type BookText = {
  id: string;
  /** 逐句。三個字以下唔計 —— 標點碎片唔係句。 */
  sentences: string[];
  byPalace: Record<string, string>;
};

export function sentencesOf(text: string): string[] {
  return (text.match(/[^。！？]*[。！？]|[^。！？]+$/g) ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length > 3);
}

export function toBookText(id: string, chapters: Chapter[]): BookText {
  return {
    id,
    sentences: chapters.flatMap((c) => sentencesOf(c.text)),
    byPalace: Object.fromEntries(chapters.map((c) => [c.palace, c.text])),
  };
}

/**
 * `a` 入面有幾多句，喺 `b` 度都搵得到。
 *
 * 唔用相似度，用**逐句比對** —— 因為讀者感覺到嘅就係「呢句我喺另一本都見過」。
 * 半句似唔會令人覺得撞，成句一樣先會。
 */
export function overlap(a: BookText, b: BookText): number {
  if (a.sentences.length === 0) return 0;
  const B = new Set(b.sentences);
  let hit = 0;
  for (const s of a.sentences) if (B.has(s)) hit++;
  return hit / a.sentences.length;
}

export type OverlapStats = {
  pairs: number;
  median: number;
  p90: number;
  max: number;
  /** 重疊 ≥ 門檻嗰批 —— 呢批係真人試度會失敗嗰啲。 */
  aboveThreshold: number;
};

export function overlapStats(books: BookText[], threshold = 0.8): OverlapStats {
  const all: number[] = [];
  for (let i = 0; i < books.length; i++) {
    for (let j = i + 1; j < books.length; j++) all.push(overlap(books[i]!, books[j]!));
  }
  all.sort((x, y) => x - y);
  const q = (p: number) => all[Math.min(all.length - 1, Math.floor(all.length * p))] ?? 0;
  return {
    pairs: all.length,
    median: q(0.5),
    p90: q(0.9),
    max: all[all.length - 1] ?? 0,
    aboveThreshold: all.filter((v) => v >= threshold).length,
  };
}

/**
 * 每一本書都有嗰啲句。
 *
 * ⚠ 呢個數本身**唔係一個要清零嘅數**。
 * 章框（章首、過場、留白句庫）同 L3 關係塊係逐宮固定嘅，
 * 佢哋本來就應該人人都一樣 —— 一句「這一章讀財帛宮，不談金額」
 * 對邊個讀者都要一字不改，否則個界線就變成有時嚴有時鬆。
 *
 * 要睇嘅係：**呢啲句入面有冇一句係命理主張。**
 * 有嘅話，即係我哋寫咗一句對邊個都啱嘅斷語 —— 嗰個先係巴納姆。
 */
export function universalSentences(books: BookText[]): string[] {
  if (books.length === 0) return [];
  const freq = new Map<string, number>();
  for (const b of books) for (const s of new Set(b.sentences)) freq.set(s, (freq.get(s) ?? 0) + 1);
  return [...freq.entries()].filter(([, n]) => n === books.length).map(([s]) => s).sort();
}

/** 一本書入面，有幾多**字**係人人都有。 */
export function sharedShare(book: BookText, books: BookText[]): number {
  const universal = new Set(universalSentences(books));
  let shared = 0;
  let total = 0;
  for (const s of book.sentences) {
    total += s.length;
    if (universal.has(s)) shared += s.length;
  }
  return total === 0 ? 0 : shared / total;
}

/** 逐格睇差異由邊度嚟。 */
export function uniquenessBySlot(a: Chapter[], b: BookText): Record<string, { unique: number; total: number }> {
  const B = new Set(b.sentences);
  const out: Record<string, { unique: number; total: number }> = {};
  for (const c of a) {
    for (const seg of c.segments) {
      out[seg.slot] ??= { unique: 0, total: 0 };
      for (const s of sentencesOf(seg.text)) {
        out[seg.slot]!.total++;
        if (!B.has(s)) out[seg.slot]!.unique++;
      }
    }
  }
  return out;
}

/**
 * 一副本命盤嘅「簽名」—— 兩副盤簽名一樣，本書就應該一樣。
 *
 * ⚠ 呢個 function 存在嘅理由，係要分開「內容太薄」同「兩副盤本來就似」。
 *
 * 紫微落宮只有十二種，而紫微落咗邊就決定晒其餘十三粒主星 ——
 * 連帶一百六十八格廟旺都定咗。加埋命宮落宮（又十二種），
 * 成本書大約七成嘅字就已經定咗。
 *
 * 所以**每一百四十四個人入面，就有一個人同你嘅主星同廟旺一模一樣**。
 * 佢本書同你本一定好似 —— 而佢個盤本來就同你似。
 */
export function chartSignature(chart: Chart): string {
  const ziwei = chart.palaces.find((p) => p.stars.some((s) => s.name === '紫微'))?.branch ?? '?';
  const hua = chart.palaces
    .flatMap((p) => p.stars.filter((s) => s.sihua).map((s) => `${s.name}${s.sihua}@${p.name}`))
    .sort()
    .join(',');
  const sha = chart.palaces
    .flatMap((p) =>
      p.stars
        .filter((s) => ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'].includes(s.name))
        .map((s) => `${s.name}@${p.name}`),
    )
    .sort()
    .join(',');
  return `紫${ziwei}|命${chart.mingGong}|身${chart.shenGong}|${hua}|${sha}`;
}

const MAJORS = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府',
  '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'];

/**
 * 「邊粒主星落邊個宮名」—— 成本書最厚嗰一層（168 條基塊）就係由佢決定。
 *
 * ⚠ 呢個映射**只得十二種**。
 *
 * 紫微落邊個地支，決定晒其餘十三粒主星（兩系鏡對）；
 * 而宮名由命宮落邊個地支決定。兩樣一齊轉，所以真正話事嘅係
 * **「紫微地支 − 命宮地支」呢個差**，唔係兩個絕對位置。
 *
 * 即係話：**每十二個人就有一個，同你嘅「星坐邊個宮」完全一樣。**
 * 佢本書入面一百六十八條基塊，同你嗰本一模一樣。
 *
 * （廟旺唔同：佢睇絕對地支，所以有一百四十四種。
 * 所以兩個差一樣但絕對位置唔同嘅人，基塊一樣而廟旺唔同。）
 *
 * 呢個唔係我哋內容薄，係斗數本命盤嘅資訊量本來就係咁。
 * 分辨要靠上面幾層 —— 四化（十干）、六煞、身宮、空宮、格局。
 * **所以 C10 捉到嗰個「三分一四化冇寫出嚟」先至咁嚴重。**
 */
export function starPalaceMap(chart: Chart): string {
  return chart.palaces
    .map((p) => `${p.name}:${p.stars.filter((s) => MAJORS.includes(s.name)).map((s) => s.name).sort().join('')}`)
    .sort()
    .join('|');
}

/** 兩副盤嘅骨架（邊粒星坐邊個宮名）係咪一樣。一樣就註定兩本書好似。 */
export function sameSkeleton(a: Chart, b: Chart): boolean {
  return starPalaceMap(a) === starPalaceMap(b);
}
