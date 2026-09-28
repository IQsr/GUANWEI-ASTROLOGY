/**
 * 牽動格：講呢張盤嘅三方四正坐咗乜（2026-09）
 *
 * 以前牽動格頭一句係一條固定嘅關係塊：
 *   「命宮與遷移宮正對，又與財帛宮、官祿宮連成一組：你是誰、你怎樣賺…四件事要一起讀。
 *    單看一宮會得出沒有條件的結論。」
 * 每本書一模一樣，講嘅係三方四正係乜，唔係**你嘅**三方四正有乜。Issac 話空泛。
 *
 * 而家改為：對宮同兩個三合宮，逐個講嗰度坐嘅星一句 ——
 *   「在遷移宮，太陽在陌生環境反而更自在；在財帛宮，天機賺取資源的方式靠腦不靠本；…」
 *
 * ⚠ 呢一句**冇新嘅象義**。每一截都係嗰粒星喺嗰個宮嘅基塊第一句（有出處、已審），
 * 抽出開頭嗰截。完整嘅講法喺嗰一宮自己嗰章 —— 呢度係一個預告，唔係重複一次。
 * 抽唔到一截像樣嘅（例如頭一句係引文），就用 `GIST` 人手寫嘅一截，一樣係由嗰條基塊撮出嚟。
 */
import { sanFangPalaces, type Chart, type Palace } from '@guanwei/ziwei';
import { BASE_BLOCKS } from './baseblock-data';
import { cjkCount } from './lexicon';

const MAJOR = new Set(BASE_BLOCKS.map((b) => b.star));

function sentences(s: string): string[] {
  return (s.match(/[^。！？]*[。！？](?:[」』])?|[^。！？]+$/g) ?? []).filter((x) => x.trim());
}

/** 宮名點寫：僕役正文叫交友宮（同章首一致）。 */
export function palaceLabel(name: string): string {
  if (name === '僕役') return '交友宮';
  return name.endsWith('宮') ? name : `${name}宮`;
}

/**
 * 人手撮嘅一截。只限自動抽唔到嘅格；內容一定要喺嗰條基塊入面講過。
 * key = 星.宮
 */
const GIST: Record<string, string> = {
  '紫微.命宮': '紫微把標準直接架在自己身上',
  '紫微.兄弟': '紫微在平輩之間習慣有上有下',
  '紫微.財帛': '紫微處理資源的方式偏向維持體面',
  '紫微.疾厄': '紫微的消耗來自把事情攬上身之後不肯放手',
  '紫微.遷移': '紫微在陌生場合的表現，很看有沒有人同行',
  '紫微.僕役': '紫微在群體裡自然被推到中心',
  '紫微.田宅': '紫微對居所要合乎自己的標準',
  '紫微.福德': '紫微的安定來自事情處在自己認可的狀態',
  '天府.夫妻': '天府把關係當作要守住的東西',
  '天府.疾厄': '天府的消耗來自長期的警覺',
  '天府.遷移': '天府在陌生環境裡不搶先，先觀察',
  '天府.僕役': '天府在群體裡是被信任的那一個',
  '天府.田宅': '天府把住處與長期基地看得比多數人重',
  '天府.福德': '天府要知道還有餘裕，才放鬆得下來',
  '太陽.福德': '太陽的安定來自有事可做、有人可顧',
  '太陰.田宅': '太陰對住處的要求是安靜、可控、屬於自己',
  '武曲.財帛': '武曲處理資源的方式是主動經營',
  '天同.田宅': '天同對居所只有一個要求：要舒服',
  '天同.福德': '天同的安定門檻低，有一段沒有人催的時間就夠',
  '天梁.遷移': '天梁在陌生環境往往遇到願意提攜它的人',
  '七殺.田宅': '七殺的歸屬感不來自空間，來自正在做的事',
  '七殺.福德': '七殺需要有一件硬仗在打',
  '巨門.福德': '巨門的安定要等到疑問被解決',
};

/** 「X在平輩關係裡的方式：它照料，但不宣告」—— 頭一截係標題，真正嘅內容喺冒號後面。 */
const HEADING = /的(位置|方式|姿態|模式|角色|態度|濃度|距離|節奏|摩擦點|投入方式|給予方式|濃度變化|相處方式|安定條件)$/;

/** 一粒星喺一個宮嘅一截講法。抽唔到就回 null（嗰個宮就唔講，唔好估）。 */
export function gistOf(star: string, palace: string): string | null {
  const manual = GIST[`${star}.${palace}`];
  if (manual) return manual;
  const block = BASE_BLOCKS.find((b) => b.star === star && b.palace === palace);
  if (!block) return null;

  const ss = sentences(block.body);
  const first = ss.find((s) => s.includes(star)) ?? ss[0]!;
  const colon = first.indexOf('：');
  let head = (colon === -1 ? first : first.slice(0, colon)).replace(/[。！？]$/, '');
  if (head.includes(star)) head = head.slice(head.indexOf(star));

  let g: string;
  if ((HEADING.test(head) || !head.includes(star)) && colon !== -1) {
    g = first.slice(colon + 1).split(/——|。/)[0]!.replace(/^它/, star);
    if (!g.includes(star)) g = `${star}${g}`;
  } else {
    g = head.split(/——|；/)[0]!;
  }
  /* 「太陽在命，基調是向外的」前面已經有「在命宮，」—— 唔好講兩次「在命」 */
  g = g.replace(new RegExp(`^${star}在命，?(的)?基調`), `${star}的基調`);
  if (cjkCount(g) > 28) g = g.split('，')[0]!;
  if (!g.includes(star) || cjkCount(g) < 6) return null;
  return g;
}

/** 一個宮嘅領銜主星；空宮就借對宮嘅。 */
function leadStar(chart: Chart, p: Palace): string | null {
  const own = p.stars.find((s) => MAJOR.has(s.name));
  if (own) return own.name;
  const opp = p.borrowsFrom ? chart.palaces.find((x) => x.branch === p.borrowsFrom) : undefined;
  return opp?.stars.find((s) => MAJOR.has(s.name))?.name ?? null;
}

/**
 * 牽動格嘅頭一段。回 null = 呢個宮嘅三方四正搵唔齊（唔應該發生）。
 *
 * 次序：對宮先（正對，最要一起讀），然後兩個三合宮。
 */
export function linkLine(chart: Chart, p: Palace): { text: string; sources: string[] } | null {
  const four = sanFangPalaces(chart.palaces, p.branch);
  if (four.length !== 4) return null;
  const [, a, dui, b] = four as [Palace, Palace, Palace, Palace];

  const head = `${palaceLabel(p.name)}與${palaceLabel(dui.name)}正對，又與${palaceLabel(a.name)}、${palaceLabel(b.name)}連成一組。`;
  const parts: string[] = [];
  const sources: string[] = [];
  for (const q of [dui, a, b]) {
    const star = leadStar(chart, q);
    const g = star ? gistOf(star, q.name) : null;
    if (!g || !star) continue;
    parts.push(`在${palaceLabel(q.name)}，${g}`);
    sources.push(`base.${star}.${q.name}`);
  }
  return { text: parts.length ? `${head}${parts.join('；')}。` : head, sources };
}
