/**
 * 關鍵字標記（2026-10-14 · 樣板揀咗「色墨」）
 *
 * 用戶：重點唔係整句加粗，係**關鍵字層面** —— 〈要留神〉、月份、主題字。
 * 讀者掃一眼就知：邊度順、邊度要留神、幾月、講緊乜。
 *
 * 四類：
 *   shen 留神：要多留神、順中有阻、阻滯、不利、挫折、別勉強、不宜、要留意的是
 *   shun 順　：最順、比較順、轉為有利、增加的機會、見到回報、順利、愉快
 *   yue  月份：逐月嗰段嘅「二月：」（只標有冒號嘅，即係逐月清單）
 *   ti   主題：工作、錢、感情、心境、朋輩⋯⋯ **只喺有 shen／shun 嘅分句入面先標**，
 *              唔係見到就標 —— 否則成版都係記號。
 *
 * 字詞表由 60 本隨機書數過（scratchpad books60.json）：「要多留神」138、「比較順／較順」約 200、
 * 「最順」150、「要留意的是」180、月份清單 204。單獨一個「留意」有 367 次，多數係
 * 「要留意它⋯」嘅句中用法，太嘈，唔標。
 *
 * 喺顯示嗰陣先標，唔寫落 DB（舊書一樣有）。繁簡都標；英文未做（英文段落冇記號）。
 * 2026-10-14 取代咗「每章第一段結論句加粗」（lib/key-sentence.ts，已刪）。
 * 樣式：色墨（globals.css `.wen .guan-*`）—— 留神朱砂、順靛、月份金褐、主題加重。
 */

export type MarkKind = 'shen' | 'shun' | 'yue' | 'ti';
export type Mark = { start: number; end: number; kind: MarkKind };

/* 長嘅放前面：「比較順」唔好俾「較順」食咗 */
const SHEN = ['要多留神', '要留神', '順中有阻', '順逆並見', '多些阻滯', '要留意的是', '阻滯', '不利', '挫折', '別勉強', '不宜'];
const SHUN = ['轉為有利', '增加的機會', '見到回報', '比較順', '最順', '較順', '順利', '有利', '愉快'];
const TI = [
  '在外表現', '外面的機會', '手上的作品', '朋友圈', '工作', '感情', '心境', '人際', '健康', '身體', '作息',
  '朋輩', '後輩', '晚輩', '長輩', '上司', '兄弟', '子女', '伴侶', '家裡', '名分', '進修', '考試', '錢',
];
/*
 * 簡體版：閱讀頁嘅簡體係 server 用 OpenCC 轉好先送落嚟（lib/hans.ts），
 * 呢個檔喺 client 行，唔好拉 OpenCC 落瀏覽器 —— 所以直接寫低轉好嘅字。
 * ⚠ `test/guanjian.test.ts` 量住：同 `hans()` 轉出嚟一樣，改繁體表要一齊改。
 */
export const SHEN_HANS = ['要多留神', '要留神', '顺中有阻', '顺逆并见', '多些阻滞', '要留意的是', '阻滞', '不利', '挫折', '别勉强', '不宜'];
export const SHUN_HANS = ['转为有利', '增加的机会', '见到回报', '比较顺', '最顺', '较顺', '顺利', '有利', '愉快'];
export const TI_HANS = [
  '在外表现', '外面的机会', '手上的作品', '朋友圈', '工作', '感情', '心境', '人际', '健康', '身体', '作息',
  '朋辈', '后辈', '晚辈', '长辈', '上司', '兄弟', '子女', '伴侣', '家里', '名分', '进修', '考试', '钱',
];
export { SHEN, SHUN, TI };
const MONTH = /(?:正|十一|十二|二|三|四|五|六|七|八|九|十)月(?=：)/g;

/* 繁簡兩套一齊搵；長嘅放前面 */
const alt = (...lists: readonly (readonly string[])[]) =>
  new RegExp(
    [...new Set(lists.flat())]
      .sort((a, b) => b.length - a.length)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|'),
    'g',
  );
const SHEN_RE = alt(SHEN, SHEN_HANS);
const SHUN_RE = alt(SHUN, SHUN_HANS);
const TI_RE = alt(TI, TI_HANS);

function find(text: string, re: RegExp, kind: MarkKind, from = 0, to = text.length): Mark[] {
  const out: Mark[] = [];
  const part = text.slice(from, to);
  re.lastIndex = 0;
  for (let m = re.exec(part); m; m = re.exec(part)) out.push({ start: from + m.index, end: from + m.index + m[0].length, kind });
  return out;
}

/** 一段字入面嘅記號，按位置排好、互不重疊（先到先得：留神 > 順 > 月份 > 主題） */
export function keywordMarks(text: string): Mark[] {
  const verdicts = [...find(text, SHEN_RE, 'shen'), ...find(text, SHUN_RE, 'shun')];
  const months = find(text, MONTH, 'yue');

  /* 主題字：只喺有判語嘅分句（以 ，。；：！？ 分）入面標 */
  const topics: Mark[] = [];
  const clause = /[^，。；：！？\n]+/g;
  for (let c = clause.exec(text); c; c = clause.exec(text)) {
    const a = c.index;
    const b = a + c[0].length;
    if (verdicts.some((v) => v.start >= a && v.end <= b)) topics.push(...find(text, TI_RE, 'ti', a, b));
  }

  const taken: Mark[] = [];
  for (const m of [...verdicts, ...months, ...topics]) {
    if (!taken.some((t) => m.start < t.end && t.start < m.end)) taken.push(m);
  }
  return taken.sort((x, y) => x.start - y.start);
}
