import { annual, type Chart } from '@guanwei/ziwei';
import { DECADE_SLUG } from './daxian';
import { GUJIA_SLUG } from './xingxi-chapters';
import { YEAR_SLUG } from './liunian';

/* ───────────────────────────────────────────────────────────
 * 後生讀者（2026-10-18 · Issac：「十八歲讀者唔好當已婚有仔女、工作同錢講法改返讀書年代、骨架標籤收返」）
 *
 * 抽咗五本十八歲左右嘅書（docs/young-books-2026-10-18.md）：書寫「你們夫妻和美」「你的婚期較遲」、
 * 這十年寫「管理能力強，適合帶團隊」「簽字、承諾之前多問一句」、骨架寫「你偏向陰暗」「你偏向消極」。
 * 年少（虛歲十三或以下，free.ts）只係剷咗生活格；十四至二十四歲冇處理。
 *
 * 做法係喺成書嗰陣逐句過一次，唔改原文：
 *   一、講婚姻、講子女嘅句（約二百幾句，分散喺細讀、結論、生活）——前面加「說到將來的婚姻／子女，」。
 *       句意照留（書係咁講），只係講明係將來。
 *   二、這十年、這一年講伴侶嘅句 ——「如果你有伴侶，」。十八歲唔一定有。
 *   三、宮位章最後嗰段生活場景（官祿、財帛、遷移、田宅、子女：部門主管、買樓、出差、教孩子）——「將來，」。
 *   四、這十年、這一年：「工作上」改「讀書和打工上」；借貸、簽字嗰幾句改細路講法。
 *   五、骨架：十五個重嘅偏向名（陰暗、消極、空想⋯）換輕啲嘅講法，再加一句「這是傾向，不是定局」。
 *
 * 英文、日文：後生句全部有自己嘅譯文（翻譯表、偏向名、時間章模板）；`unyouth()` 只剝句頭前綴。
 * 出處註用 `adultOf()` 認返大人原句先配。
 * ─────────────────────────────────────────────────────────── */

/** 虛歲二十四或以下（實歲約二十三：大學畢業前） */
export const YOUTH_MAX_AGE = 24;

export function isYouthReader(chart: Chart, year: number): boolean {
  const a = annual(chart, year);
  return a.ok && a.value.nominalAge <= YOUTH_MAX_AGE;
}

export const YOUTH_PREFIX = {
  說到將來的婚姻: { en: 'When it comes to a future marriage', ja: '将来の結婚について言えば' },
  說到將來的子女: { en: 'When it comes to future children', ja: '将来の子どもについて言えば' },
  如果你有伴侶: { en: 'If you have a partner', ja: 'パートナーがいるなら' },
  將來: { en: 'Later on', ja: '将来' },
} as const;
type Prefix = keyof typeof YOUTH_PREFIX;

const MARRIAGE = /婚|夫妻和美|你們夫妻|夫妻關係|夫妻可以|夫妻只宜|夫妻.{0,6}合作|各自發展事業|配偶/;
const CHILDREN = /你的子女(?!宮)|子女之間|和子女|你帶的子女|兩代/;
const PARTNER = /伴侶|你們/;

/** 偏向名：重 → 輕。輕嘅唔可以撞其他星系嘅偏向名（`unyouth` 要認得返） */
export const YOUTH_LEAN: Record<string, string> = {
  陰暗: '內斂',
  沉鬱: '深藏',
  消極: '觀望',
  空想: '多想',
  盲動: '多試',
  莽撞: '求變',
  躁進: '心急',
  虛浮: '重表現',
  偏執: '執著',
  偏枯: '配合失衡',
  短慮: '快決',
  尖銳: '直言',
  強勢: '主導',
  為己: '自保',
  疑慮: '多防',
  孤立: '獨行',
  停滯: '慢熱',
};
export const YOUTH_LEAN_NOTE = '你還年輕，這裡說的是盤上的傾向，不是定局；路怎樣走，仍然在你。';

/** 大人句 → 後生句（成句或一截）。次序：長嘅先。 */
const SWAPS: [string, string][] = [
  ['簽字、承諾之前多問一句', '答應別人之前多問一句'],
  ['大額支出和借貸先多想一步', '大額支出先多想一步'],
  ['借貸、合作都容易得到別人信任', '和人合作都容易得到別人信任'],
  ['你容易停滯：', '你偏向慢熱：'],
  ...Object.entries(YOUTH_LEAN).map(([a, b]) => [`偏向${a}`, `偏向${b}`] as [string, string]),
];
const PERIOD_WORK: [string, string] = ['工作上，', '讀書和打工上，'];

const LIFE_LATER = new Set(['官祿', '財帛', '遷移', '田宅', '子女']);
const sentencesOf = (t: string) => t.match(/[^。！？]*[。！？]|[^。！？]+/g) ?? [];

/** 句頭：給你的話嘅「其他可以倚仗的：一、」「最要記住的一點：」，加方面（「感情上，」） */
const HEAD = /^((?:其他(?:可以倚仗|要記住)的：)?[一二三四五]、|最可以倚仗的一點：|最要記住的一點：)?([^，。：、]{1,6}(?:上|方面|時|裡|之間)，)?/;

function prefixed(s: string, p: Prefix): string {
  const m = HEAD.exec(s)!;
  const lead = m[1] ?? '';
  return `${lead}${p}，${s.slice(m[0].length)}`;
}

/** `said`：呢段已經加過嘅前綴 —— 同一段連住幾句講婚姻，只喺第一句講「說到將來的婚姻」 */
function youthSentence(s: string, chapter: string, slot: string, firstOfSlot: boolean, said: Set<Prefix>): string {
  let out = s;
  for (const [a, b] of SWAPS) out = out.split(a).join(b);
  const period = chapter === DECADE_SLUG || chapter === YEAR_SLUG;
  if (period && slot === '工作') out = out.split(PERIOD_WORK[0]).join(PERIOD_WORK[1]);
  const once = (p: Prefix) => {
    if (said.has(p)) return out;
    said.add(p);
    return prefixed(out, p);
  };
  if (MARRIAGE.test(out)) return once('說到將來的婚姻');
  if (CHILDREN.test(out)) return once('說到將來的子女');
  if (period && PARTNER.test(out)) return once('如果你有伴侶');
  if (slot === '生活' && firstOfSlot && LIFE_LATER.has(chapter)) return `將來，${out}`;
  return out;
}

export type YouthChapter = { slug: string; segments: { slot: string; text: string }[] };

/** 成本書過一次。`slug`：宮位章用宮名（「官祿」），其他用章名。 */
export function youthPass<C extends YouthChapter>(chapters: C[]): C[] {
  return chapters.map((c) => ({
    ...c,
    segments: c.segments.map((seg) => {
      const said = new Set<Prefix>();
      const text = sentencesOf(seg.text)
        .map((s, i) => youthSentence(s, c.slug, seg.slot, i === 0, said))
        .join('');
      return { ...seg, text: c.slug === GUJIA_SLUG && seg.slot === '偏向' ? `${text}${YOUTH_LEAN_NOTE}` : text };
    }),
  }));
}

/** 出處註：認返大人原句（換過嘅偏向名、借貸講法、前綴全部還原） */
export function adultOf(s: string): string {
  let rest = s;
  for (const [a, b] of [...SWAPS, PERIOD_WORK]) rest = rest.split(b).join(a);
  return unyouth(rest).rest;
}

/**
 * 英文、日文讀嗰陣：剝走句頭前綴（「說到將來的婚姻，」），前綴另譯，後面照翻譯表。
 * 給你的話清單嘅前綴喺「一、」後面：留喺句入面，listItem 當方面（AREA_ON）譯。
 */
export function unyouth(s: string): { prefix: Prefix | null; rest: string } {
  for (const p of Object.keys(YOUTH_PREFIX) as Prefix[]) {
    if (s.startsWith(`${p}，`)) return { prefix: p, rest: s.slice(p.length + 1) };
  }
  return { prefix: null, rest: s };
}
