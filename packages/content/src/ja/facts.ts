import { cnNum } from '../en/terms';
import { BRANCHES, ELEMENTS, HOUR_RANGE_JA, PALACE_JA, STEMS, kanjiNum, listJa, placeJa, starJa } from './terms';

/* ───────────────────────────────────────────────────────────
 * 日文版：宮位章以外嘅程式句（2026-10-15 起，對照 en/facts.ts）
 *
 * 序、身宮與五行局、性格的骨架入面程式填數字、干支、日子砌出嚟嘅句。
 * 日文保留数え年（詞彙表：日本紫微斗数本身用数え年），干支、地支照寫漢字。
 * 譯唔到就回 null，交返 render.ts 繼續試翻譯表。
 * ─────────────────────────────────────────────────────────── */

const isBranch = (x: string) => BRANCHES.includes(x) && x.length === 1;
const isStem = (x: string) => STEMS.includes(x) && x.length === 1;

/** 数え年：「数え四十八歳」→ 數字用阿拉伯（日文橫排慣例） */
export const kazoe = (n: number) => `数え${n}歳`;
export const kazoeRange = (a: number, b: number) => `数え${a}〜${b}歳`;

/** 「福德宮」「財帛」→ 福徳宮 */
export const palaceJaOf = (zh: string) => PALACE_JA[zh.replace(/宮$/, '')] ?? PALACE_JA[zh] ?? null;

export function starsJa(zh: string, missing: string[]): string {
  return listJa(
    zh.split('、').map((x) => {
      const ja = starJa(x);
      if (!ja) missing.push(x);
      return ja ?? `〔${x}〕`;
    }),
  );
}

/** 「，坐天相」「，宮內沒有主星」「，宮內沒有主星，借對宮的天機、巨門來看」→ 日文尾巴（接喺「〜宮」後面） */
function seatJa(rest: string, missing: string[]): string | null {
  if (rest === '') return 'にあります';
  let m = /^，坐(.+)$/.exec(rest);
  if (m) return `にあり、${starsJa(m[1]!, missing)}が入っています`;
  if (rest === '，宮內沒有主星') return 'にあり、その宮には主星がありません';
  m = /^，宮內沒有主星，借(?:對宮|對面\S+?宮)的(.+)來看$/.exec(rest);
  if (m) return `にあり、その宮には主星がないので、向かいの宮の${starsJa(m[1]!, missing)}を借りて読みます`;
  return null;
}

export function factTemplate(s: string, missing: string[]): string | null {
  /* 序 · 生辰：國曆一九九九年十二月二十二日，戌時，生於香港。 */
  let m = /^國曆(\S+?)年(\S+?)月(\S+?)日，(\S)時，生於(.+)。$/.exec(s);
  if (m) {
    const [y, mo, d] = [cnNum(m[1]!), cnNum(m[2]!), cnNum(m[3]!)];
    const place = placeJa(m[5]!);
    if (!place) missing.push(m[5]!);
    if (!y || !mo || !d || !isBranch(m[4]!)) return null;
    return `西暦${y}年${mo}月${d}日、${m[4]}の刻（${HOUR_RANGE_JA[m[4]!]}）、${place ?? `〔${m[5]}〕`}の生まれです。`;
  }

  /* 序 · 農曆：農曆己丑年正月廿六。／農曆壬申年閏六月初四。 */
  m = /^農曆(\S)(\S)年(閏)?(正|\S{1,2}?)月(\S{2})。$/.exec(s);
  if (m) {
    const mo = m[4] === '正' ? 1 : cnNum(m[4]!);
    const d = cnNum(m[5]!);
    if (!isStem(m[1]!) || !isBranch(m[2]!) || !mo || !d) return null;
    return `旧暦では${m[1]}${m[2]}の年、${m[3] ? '閏' : ''}${mo}月${d}日です。`;
  }

  /* 序 · 盤面：五行局是水二局。 */
  m = /^五行局是(\S)(\S)局。$/.exec(s);
  if (m && ELEMENTS.includes(m[1]!) && cnNum(m[2]!)) return `五行局は${m[1]}${kanjiNum(cnNum(m[2]!)!)}局です。`;

  /* 序 · 盤面：命宮在子，身宮在午。 */
  m = /^命宮在(\S)，身宮在(\S)。$/.exec(s);
  if (m && isBranch(m[1]!) && isBranch(m[2]!)) {
    return m[1] === m[2] ? `命宮と身宮は、どちらも${m[1]}にあります。` : `命宮は${m[1]}に、身宮は${m[2]}にあります。`;
  }

  /* 身宮與五行局 · 你是水二局。 */
  m = /^你是(\S)(\S)局。$/.exec(s);
  if (m && ELEMENTS.includes(m[1]!) && cnNum(m[2]!)) return `あなたは${m[1]}${kanjiNum(cnNum(m[2]!)!)}局です。`;

  /* 大限由虛歲二歲起，每十年一步。 */
  m = /^大限由虛歲(\S+?)歲起，每十年一步。$/.exec(s);
  if (m && cnNum(m[1]!)) return `大限は${kazoe(cnNum(m[1]!)!)}から始まり、十年ごとに一段ずつ進みます。`;

  /* 寫這本書時（二〇二六年），你虛歲四十八，正行第五個大限（四十六至五十五歲），落在財帛宮，坐天機。 */
  m = /^寫這本書時（(\S+?)年），你虛歲(\S+?)，正行第(\S+?)個大限（(\S+?)至(\S+?)歲），落在(\S+?宮)(，.+)?。$/.exec(s);
  if (m) {
    const [y, age, k, a, b] = [m[1], m[2], m[3], m[4], m[5]].map((x) => cnNum(x!));
    const pal = palaceJaOf(m[6]!);
    const seat = seatJa(m[7] ?? '', missing);
    if (!y || !age || !k || !a || !b || !pal || seat === null) return null;
    return `この本を書いた時点（${y}年）で、あなたは${kazoe(age)}、${kanjiNum(k)}番目の大限（${kazoeRange(a, b)}）を歩いています。この大限は${pal}${seat}。`;
  }

  /* 寫這本書時（⋯年），你虛歲十，第一個大限從虛歲十二歲開始，落在兄弟宮，坐太陽。 */
  m = /^寫這本書時（(\S+?)年），你虛歲(\S+?)，第一個大限從虛歲(\S+?)歲開始，落在(\S+?宮)(，.+)?。$/.exec(s);
  if (m) {
    const [y, age, a] = [m[1], m[2], m[3]].map((x) => cnNum(x!));
    const pal = palaceJaOf(m[4]!);
    const seat = seatJa(m[5] ?? '', missing);
    if (!y || !age || !a || !pal || seat === null) return null;
    return `この本を書いた時点（${y}年）で、あなたは${kazoe(age)}です。最初の大限は${kazoe(a)}から始まり、${pal}${seat}。`;
  }

  /* 下一個大限從虛歲八十二歲開始，轉到財帛宮。 */
  m = /^下一個大限從虛歲(\S+?)歲開始，轉到(\S+?宮)。$/.exec(s);
  if (m && cnNum(m[1]!) && palaceJaOf(m[2]!)) return `次の大限は${kazoe(cnNum(m[1]!)!)}から始まり、${palaceJaOf(m[2]!)}に移ります。`;

  /* 你的身宮落在福德宮，坐天相。／你的身宮和命宮在同一宮，坐巨門。 */
  m = /^你的身宮落在(\S+?宮)(，.+)?。$/.exec(s);
  if (m && palaceJaOf(m[1]!)) {
    const seat = seatJa(m[2] ?? '', missing);
    if (seat !== null) return `あなたの身宮は${palaceJaOf(m[1]!)}${seat}。`;
  }
  m = /^你的身宮和命宮在同一宮(，.+)?。$/.exec(s);
  if (m) {
    const seat = seatJa(m[1] ?? '', missing);
    if (seat !== null) return `あなたの身宮は命宮と同じ宮${seat}。`;
  }

  /* 身宮組合：你命宮坐貪狼，身宮又見七殺、破軍，再會煞星：⋯。 */
  m = /^你命宮坐貪狼，身宮又見(.+?)，再會煞星：你的欲望和衝勁都重，最好給它們找一個正當的出口。$/.exec(s);
  if (m) return `命宮に貪狼があり、身宮にはさらに${starsJa(m[1]!, missing)}を見て、そのうえ煞星と会っています。欲も勢いも強いので、まっとうな出口を見つけてあげるのがいちばんです。`;

  /* 性格的骨架 · 你的命宮在子，坐巨門。／宮內沒有主星，借對宮的太陰、太陽來讀。 */
  m = /^你的命宮在(\S)，坐(.+)。$/.exec(s);
  if (m && isBranch(m[1]!)) return `あなたの命宮は${m[1]}にあり、${starsJa(m[2]!, missing)}が入っています。`;
  m = /^你的命宮在(\S)，宮內沒有主星，借(?:對宮|對面遷移宮)的(.+)來讀。$/.exec(s);
  if (m && isBranch(m[1]!)) return `あなたの命宮は${m[1]}にあり、主星がないので、向かいの遷移宮の${starsJa(m[2]!, missing)}を借りて読みます。`;

  /* 性格的骨架 · 細讀講到嘅大限幾多歲、行過未（branch.ts decadeNote） */
  m = /^這一步在虛歲(\S+?)至(\S+?)歲(，你已經走過，可以對照當時的經歷|，也已經走過|，你正走在這一步)?。$/.exec(s);
  if (m && cnNum(m[1]!) && cnNum(m[2]!)) {
    const tail = !m[3] ? '' : m[3] === '，也已經走過' ? '。これもすでに通り過ぎています' : m[3].includes('已經走過') ? '。すでに通り過ぎているので、当時の経験と照らし合わせてみてください' : '。いまちょうどこの段階を歩いています';
    return `この段階は${kazoeRange(cnNum(m[1]!)!, cnNum(m[2]!)!)}です${tail}。`;
  }
  m = /^這幾步在虛歲(.+)。$/.exec(s);
  if (m) {
    const items = m[1]!.split('、').map((x) => {
      const p = /^(\S+?)至(\S+?)歲(（已走過）|（正在走）)?$/.exec(x);
      const [a, b] = p ? [cnNum(p[1]!), cnNum(p[2]!)] : [null, null];
      if (!p || !a || !b) return null;
      const note = p[3] === '（已走過）' ? '（通過済み）' : p[3] === '（正在走）' ? '（いま歩いている段階）' : '';
      return `${kazoeRange(a, b)}${note}`;
    });
    if (items.every(Boolean)) return `これらの段階は${items.join('、')}です。`;
  }

  /* 性格的骨架 · 兩邊都冇訊號 */
  m = /^你的盤上，「(.+?)」和「(.+?)」兩頭的訊號都不明顯，沒有一邊特別重。$/.exec(s);
  if (m) return `あなたの命盤では、「${poleJa(m[1]!, missing)}」と「${poleJa(m[2]!, missing)}」のどちらの兆しもはっきりせず、どちらかが特に重いということはありません。`;

  /* 推力（說你偏向 X，是因為盤上有 Y） */
  m = /^說你偏向(\S+?)，是因為你的盤上有([^；]+?)；偏向(\S+?)的也有，是([^；]+?)，但比較少。$/.exec(s);
  if (m) return `あなたが${poleJa(m[1]!, missing)}に傾くと言えるのは、命盤に${evJa(m[2]!, missing)}があるからです。${poleJa(m[3]!, missing)}に傾く要素として${evJa(m[4]!, missing)}もありますが、そちらは少なめです。`;
  m = /^說你偏向(\S+?)，是因為你的盤上有([^；]+?)；偏向(\S+?)的，你的盤上沒有。$/.exec(s);
  if (m) return `あなたが${poleJa(m[1]!, missing)}に傾くと言えるのは、命盤に${evJa(m[2]!, missing)}があるからです。${poleJa(m[3]!, missing)}に傾く要素は、命盤にはありません。`;
  m = /^說你偏向(\S+?)，是因為你的盤上有([^；]+?)。$/.exec(s);
  if (m) return `あなたが${poleJa(m[1]!, missing)}に傾くと言えるのは、命盤に${evJa(m[2]!, missing)}があるからです。`;
  m = /^兩邊在你的盤上都有根據：偏向(\S+?)的是(.+?)，偏向(\S+?)的是(.+?)。$/.exec(s);
  if (m) return `どちらの側にも命盤上の根拠があります。${poleJa(m[1]!, missing)}に傾けているのは${evJa(m[2]!, missing)}、${poleJa(m[3]!, missing)}に傾けているのは${evJa(m[4]!, missing)}です。`;
  m = /^另一邊，你的盤上有(.+?)，偏向(\S+?)；兩邊相抵，所以說你兩面都有。$/.exec(s);
  if (m) return `一方で、命盤には${evJa(m[1]!, missing)}もあり、${poleJa(m[2]!, missing)}に傾けています。両側が打ち消し合うので、あなたには両方の面があると言えます。`;

  /* 推力（舊寫法，舊書照用） */
  m = /^這樣看，是因為你的盤上兩邊都有：(.+?)，推你偏向(\S+?)；(.+?)，推你偏向(\S+?)。$/.exec(s);
  if (m) return `そう見えるのは、命盤に両方があるからです。${evJa(m[1]!, missing)}があなたを${poleJa(m[2]!, missing)}へ、${evJa(m[3]!, missing)}が${poleJa(m[4]!, missing)}へと押しています。`;
  m = /^這樣看，是因為你的盤上有(.+?)，推你偏向(\S+?)；也有(.+?)，推你偏向(\S+?)，只是力量較小。$/.exec(s);
  if (m) return `そう見えるのは、命盤に${evJa(m[1]!, missing)}があり、あなたを${poleJa(m[2]!, missing)}へ押しているからです。${evJa(m[3]!, missing)}も${poleJa(m[4]!, missing)}へ押していますが、力は小さめです。`;
  m = /^這樣看，是因為你的盤上也有([^；]+?)，推你偏向([^；\s]+?)。$/.exec(s);
  if (m) return `そう見えるのは、命盤に${evJa(m[1]!, missing)}もあり、あなたを${poleJa(m[2]!, missing)}へ押しているからです。`;
  m = /^這樣看，是因為你的盤上有([^；]+?)，推你偏向([^；\s]+?)。$/.exec(s);
  if (m) return `そう見えるのは、命盤に${evJa(m[1]!, missing)}があり、あなたを${poleJa(m[2]!, missing)}へ押しているからです。`;
  m = /^這樣看，是因為你的盤上有(.+?)，推你偏向(\S+?)；推你偏向(\S+?)的，一樣也沒有。$/.exec(s);
  if (m) return `そう見えるのは、命盤に${evJa(m[1]!, missing)}があり、あなたを${poleJa(m[2]!, missing)}へ押しているからです。${poleJa(m[3]!, missing)}へ押す要素は、ひとつもありません。`;

  return null;
}

/* ── 星系兩頭（xingxi/systems.json poles） ── */
const POLE_JA: Record<string, string> = {
  物質: '物質', 精神: '精神', 順從: '従順', 叛逆: '反逆', 理智: '理性', 感情: '情', 收斂: '収めること', 發揮: '発揮',
  欲望強: '強い欲', 欲望淡: '淡い欲', 明朗: '明るさ', 陰暗: '暗さ', 偏剛: '剛さ', 剛柔相濟: '剛柔の両立', 祥和: '穏やかさ',
  孤獨: '孤独', 理想: '理想', 空想: '空想', 機變: '機転', 機謀: '策略', 動盪: '揺れ', 安定: '安定', 局面大: '大きな局面',
  謹慎: '慎重さ', 有目標: '目標のあること', 盲動: 'やみくもな動き', 物欲: '物欲', 英華內斂: '才気を内に秘めること', 疑慮: '疑い',
  優雅: '優雅さ', 隨俗: '世の流れに合わせること', 浪漫: 'ロマン', 原則: '原則', 決斷: '決断', 短慮: '考えの浅さ',
  從容: 'ゆとり', 負擔重: '重い負担', 陽剛: '陽の剛さ', 陰柔: '陰の柔らかさ', 主動: '能動', 被動: '受け身',
  意志堅強: '強い意志', 意志薄弱: '弱い意志', 堅忍: '粘り強さ', 躁進: '焦り', 深沉: '奥深さ', 衝動: '衝動',
  剛毅: '剛毅', 柔軟: '柔らかさ', 正直: '正直さ', 精明: '抜け目のなさ', 威權: '威厳', 孤高: '孤高',
  精神充實: '満ちた心', 精神空虛: '空虚な心', 進取: '進取', 因循: '惰性', 積極: '積極', 消極: '消極', 果敢: '果断',
  莽撞: '向こう見ず', 上進: '向上', 停滯: '停滞', 受激發: '刺激で伸びること', 多阻: '多い妨げ', 開創: '開拓',
  因人成事: '人の力で事を成すこと', 融和: '和やかさ', 奮發: '奮起', 多波折: '多い曲折', 豁達: 'おおらかさ',
  易半途: '途中で止まりやすさ', 善於適應: '適応の上手さ', 反其道: '逆張り', 沉穩: '落ち着き', 虛浮: '浮つき', 謙和: '謙虚さ',
  保守: '保守', 情緒: '感情', 重情: '情の厚さ', 決絕: 'きっぱりさ', 穩定: '安定', 浮蕩: '浮つき', 多焦慮: '多い不安',
  敏感: '敏感さ', 踏實: '堅実さ', 調和: '調和', 偏執: 'こだわり', 統籌: '全体を見渡すこと', 偏於一端: '一方への偏り',
  開朗: '明るさ', 沉鬱: '沈み', 情感: '情', 穩重: '落ち着き', 浮動: '落ち着きのなさ', 權威: '権威', 強勢: '強気',
  為公: '公のため', 為己: '自分のため', 多思慮: '考えすぎ', 有度: '節度', 野心: '野心', 得助: '助けを得ること',
  孤立: '孤立', 有原則: '原則のあること', 重情面: '情と体面', 明斷: '明晰な判断', 尖銳: '鋭さ',
};
export const poleKeysJa = () => Object.keys(POLE_JA);

function poleJa(zh: string, missing: string[]): string {
  const ja = POLE_JA[zh];
  if (!ja) missing.push(zh);
  return ja ?? `〔${zh}〕`;
}

const HUA: Record<string, string> = { 祿: '化禄', 權: '化権', 科: '化科', 忌: '化忌' };

/** 證據清單（xingxi.ts evidence()）：「武曲化祿、紫微同宮見左輔、右弼、命宮在丑」 */
function evJa(zh: string, missing: string[]): string {
  const items: string[][] = [];
  for (const t of zh.split('、')) {
    if (starJa(t) && items.length && !/化.$/.test(items.at(-1)![0]!)) items.at(-1)!.push(t);
    else items.push([t]);
  }
  return items
    .map(([head, ...more]) => {
      const names = (first: string) => starsJa([first, ...more].join('、'), missing);
      let m = /^(\S{2})化(\S)$/.exec(head!);
      if (m && starJa(m[1]!) && HUA[m[2]!]) return `${starJa(m[1]!)}${HUA[m[2]!]}`;
      m = /^(\S{2})同宮見(\S{2})$/.exec(head!);
      if (m && starJa(m[1]!)) return `${starJa(m[1]!)}と同じ宮の${names(m[2]!)}`;
      m = /^命宮見(\S{2})$/.exec(head!);
      if (m) return `命宮の${names(m[1]!)}`;
      m = /^三方四正會(\S{2})$/.exec(head!);
      if (m) return `三方四正の${names(m[1]!)}`;
      m = /^命宮在(\S)$/.exec(head!);
      if (m && isBranch(m[1]!)) return `${m[1]}にある命宮`;
      m = /^主星在(\S)$/.exec(head!);
      if (m && isBranch(m[1]!)) return `${m[1]}にある主星`;
      missing.push(head!);
      return `〔${head}〕`;
    })
    .join('、');
}

