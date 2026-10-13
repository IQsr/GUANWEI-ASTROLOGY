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

/** 宮名點寫：「命宮」照寫，其餘加「宮」。僕役正文亦叫僕役宮（2026-09-30 定，同章名一致）。 */
export function palaceLabel(name: string): string {
  return name.endsWith('宮') ? name : `${name}宮`;
}

/**
 * 人手撮嘅一截。只限自動抽唔到嘅格；內容一定要喺嗰條基塊入面講過。
 * key = 星.宮
 */
const GIST: Record<string, string> = {
  /* 2026-10-13：基塊開頭由「X在親密關係裡的方式：它⋯」改做「在親密關係裡，X⋯」，撮要照舊（凍結改之前嘅結果） */
  '紫微.子女': '紫微傾向於給出標準，而不是給出空間',
  '天府.兄弟': '天府是接得住的那一個',
  '天府.子女': '天府給的是環境而不是要求',
  '太陽.兄弟': '太陽是出面的那一個，也是先掏出來的那一個',
  '太陽.夫妻': '太陽習慣用照顧代替表達',
  '太陽.子女': '太陽給得多，而且給得明亮',
  '太陰.兄弟': '太陰照料，但不宣告',
  '太陰.子女': '太陰照顧細節，注意對方的狀態多於對方的成績',
  '武曲.夫妻': '武曲用做事表達在意',
  '武曲.子女': '武曲給標準也給資源，但不太給耐性',
  '天機.兄弟': '天機是居中的那一個',
  '天機.夫妻': '天機想得多、調整得快，願意為對方改變做法',
  '天機.子女': '天機擅長教方法而不是教內容',
  '天同.兄弟': '天同是最容易相處的那一個',
  '天同.夫妻': '天同求安穩多於求熱烈，願意遷就，也不太把小事放在心上',
  '天同.子女': '天同給空間而不給壓力',
  '廉貞.兄弟': '廉貞對朋友分得很清楚，認定的就全力以赴，沒認定的連客套也懶',
  '廉貞.子女': '廉貞投入極深，也把自己的原則整套交出去',
  '廉貞.田宅': '廉貞要的是合乎自己規格的空間，寧可推翻重來也不將就',
  '貪狼.兄弟': '貪狼容易建立連結，也容易讓連結停在淺處',
  '貪狼.子女': '貪狼把好玩的東西帶給對方',
  '巨門.夫妻': '巨門要把事情講清楚，不喜歡含糊帶過',
  '巨門.子女': '巨門教的是怎麼想，而不是怎麼做',
  '巨門.田宅': '巨門在意的是條件講不講得清',
  '天相.兄弟': '天相是協調的那一個，把不同的意見接上，讓場面不至於難看',
  '天相.夫妻': '天相重視相處的規矩',
  '天相.子女': '天相給的是規矩與示範',
  '天梁.兄弟': '天梁是被依靠的那一個',
  '天梁.夫妻': '天梁照顧、承擔、把難處接過來，很自然地站在給予的一方',
  '天梁.子女': '天梁給的是保護與原則',
  '天梁.福德': '天梁需要覺得自己做的事是對的',
  '七殺.夫妻': '七殺把承擔當作表達，情緒上的交流則相當節制',
  '七殺.子女': '七殺要求對方自己站起來，不太提供緩衝',
  '七殺.僕役': '七殺靠結果說話，不靠關係',
  '破軍.夫妻': '破軍投入時全力以赴',
  '破軍.子女': '破軍鼓勵對方走自己的路，甚至樂見對方推翻它的做法',
  '紫微.命宮': '紫微把標準直接架在自己身上',
  '天府.命宮': '天府的溫和是有底的那種',
  '紫微.兄弟': '紫微在平輩之間習慣有上有下',
  '紫微.財帛': '紫微處理資源的方式偏向維持體面',
  '紫微.疾厄': '紫微的消耗來自把事情攬上身之後不肯放手',
  '紫微.遷移': '紫微在陌生場合的表現，很看有沒有人同行',
  '紫微.僕役': '紫微在群體裡自然被推到中心',
  '紫微.田宅': '紫微對居所要合乎自己的標準',
  '紫微.官祿': '紫微的做事方式是先立標準再推進',
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
  '天同.田宅': '天同對居所只有一個要求，就是要舒服',
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
 * 宮 → 生活嘅一面（直白，2026-09-29）：[列舉用嘅名詞, 句頭]。
 *
 * 以前寫「命宮與遷移宮正對，又與官祿宮、財帛宮連成一組。在遷移宮，⋯」——
 * 讀者要先識宮名同「正對、三合」先讀得明。而家直接講生活嘅邊一面。
 */
export const AREA: Record<string, [string, string]> = {
  命宮: ['性格', '性格上'],
  兄弟: ['朋輩', '朋輩之間'],
  夫妻: ['感情', '感情上'],
  子女: ['後輩', '帶後輩時'],
  財帛: ['錢', '錢方面'],
  疾厄: ['身心負荷', '身心上'],
  遷移: ['在外表現', '在外時'],
  僕役: ['朋友圈', '朋友圈裡'],
  官祿: ['工作', '工作上'],
  田宅: ['家', '家裡'],
  福德: ['心境', '心境上'],
  父母: ['長輩關係', '對長輩時'],
};

/** 牽動格指返幾章嗰截嘅講法（en/render.ts `refPart` 認呢幾款） */
export const LINK_REFS = ['各自那一章另有細講', '前面各自那一章已經細談', '各有一章細講過'] as const;

/** 牽動格開頭（2026-10-13 起，一句完整嘅話；en/render.ts 認） */
export const LINK_HEADS = [
  '同一種底色，也延伸到你生活的別處。',
  '這一面不只出現在這裡。',
  '別的方面，也和這一面連在一起。',
  '同樣的性子，在別處也看得到。',
  '這一面也牽動著你生活的其他部分。',
  '把眼光放遠一點，這一面還連著別處。',
  '你生活的其他部分，也帶著這一面的影子。',
  '這一面，在你生活的別處也有回響。',
  '換到別的場合，這一面也在。',
  '這種性子，不會只停在一處。',
  '同一股力量，也走到了別的地方。',
  '這一面也和你生活裡的其他事情相連。',
] as const;

/**
 * 牽動格嘅頭一段。回 null = 呢個宮嘅三方四正搵唔齊（唔應該發生）。
 *
 * 次序：對宮先（正對，最牽動），然後兩個三合宮。
 *
 * ⚠ 全書每宮嗰截只詳講一次（2026-09-30）。每個宮會喺三章嘅牽動格出現（佢嘅對宮同兩個三合宮），
 * 以前三次都係同一句 —— 量過一本書平均有 12 句重複。而家 `used` 記住邊截講過：
 * 第一次（跟閱讀次序）講一截，之後淨係講「見〈財帛〉那一章」。宮同宮之間有牽連呢件事照講，
 * 只係唔再重複講嗰一宮本身。唔畀 `used`（單獨砌一章）就三截都講。
 */
export function linkLine(
  chart: Chart,
  p: Palace,
  used?: Set<string>,
): { text: string; sources: string[] } | null {
  const four = sanFangPalaces(chart.palaces, p.branch);
  if (four.length !== 4) return null;
  const [, a, dui, b] = four as [Palace, Palace, Palace, Palace];

  const parts: string[] = [];
  const names: string[] = [];
  const sources: string[] = [];
  /* 講過嘅：[「家裡是天梁」, 章名] */
  const seen: [string, string][] = [];
  for (const q of [dui, a, b]) {
    const star = leadStar(chart, q);
    const g = star ? gistOf(star, q.name) : null;
    const area = AREA[q.name];
    if (!g || !star || !area) continue;
    names.push(area[0]);
    const key = `link.${q.name}`;
    if (used?.has(key)) {
      seen.push([`${area[1]}是${star}`, q.name]);
      continue;
    }
    used?.add(key);
    parts.push(`${area[1]}，${g}`);
    sources.push(`base.${star}.${q.name}`);
  }
  if (!names.length) return null;
  /*
   * 「家裡是天梁、朋輩之間是太陽，各自那一章另有細講」—— 星名照講，呢張盤嘅嘢唔好收埋。
   * 2026-10-05 睇稿指南第 10 節：以前寫「分別見〈田宅〉〈兄弟〉兩章」，似技術文件；
   * 得一個先點名邊章，兩個以上就唔逐章列。
   */
  /* 2026-10-11 內容審查：「各自那一章另有細講」一本書出十次，跟宮位次序輪三款 */
  const ORDER_REF = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];
  const many = LINK_REFS[Math.max(0, ORDER_REF.indexOf(p.name)) % LINK_REFS.length]!;
  const ref = seen.length
    ? `${seen.map((x) => x[0]).join('、')}，${seen.length === 1 ? `見〈${seen[0]![1]}〉那一章` : many}`
    : '';
  /*
   * 開頭四款輪流用（2026-10-02）：以前十二章都係「這一面也和你的⋯連在一起」，一本書出十二次。
   * 跟宮位次序輪，所以同一本書每款大約出三次，而且同一張盤永遠一樣。
   *
   * 2026-10-05 睇稿指南第 9 節：開頭唔再先列一次「性格、工作和錢」，因為後面每截
   * 本身就以「工作上，⋯」起頭 —— 同一張清單講兩次。開頭淨係交代「接住講其他宮」。
   */
  /*
   * 2026-10-13（讀者 feedback：似 AI）：開頭唔再係「⋯：」標籤，改做一句完整嘅話；
   * 「家裡是天梁，各自那一章另有細講」嗰類指返其他章嘅尾巴剷走（講完一次就夠，讀落似目錄）；
   * 三個宮前面都講過、冇新嘢 —— 成段唔出。舊講法（HEADS_OLD、LINK_REFS）英文照認。
   */
  /* 每款一本書最多用一次（記喺 `used`）；用晒就唔加開頭 —— 同一句一本書出兩次就係模板 */
  const ORDER = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];
  const start = Math.max(0, ORDER.indexOf(p.name)) % LINK_HEADS.length;
  const rotated = [...LINK_HEADS.slice(start), ...LINK_HEADS.slice(0, start)];
  const head = used ? (rotated.find((h) => !used.has(`head.${h}`)) ?? '') : rotated[0]!;
  void ref;
  if (!parts.length) return null;
  if (head) used?.add(`head.${head}`);
  return { text: `${head}${parts.join('；')}。`, sources };
}
