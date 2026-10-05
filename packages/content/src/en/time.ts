import rulesRaw from '../daxian/rules.json';
import { ageRange, ageStart, agePoint, palaceEn } from './facts';
import { AREA_EN, AREA_ON_EN, BRANCH_EN, STEM_EN, cnNum, listEn, ordinalWord, star } from './terms';

/* ───────────────────────────────────────────────────────────
 * 英文版：時間章（一生十二步、這十年、這一年 · 2026-10-05）
 *
 * 呢三章幾乎全部係 daxian.ts、liunian.ts 砌出嚟嘅句：數字、干支、宮名、星名，
 * 加上一句句有出處嘅資料句（四化、方面、結論句）。資料句入翻譯表；
 * 呢度逐款對返中文嘅砌法。
 *
 * 回看過去（lookBack）講嘅係已經過咗嘅年份，英文用過去式；其餘用現在式。
 * ─────────────────────────────────────────────────────────── */

export type TimeHelpers = {
  /** 翻譯表整句 */
  tm: (zh: string) => string | null;
  lower: (en: string) => string;
  /** 剝走「Keep in mind that」之類嘅轉接語 */
  strip: (en: string) => string;
};

const HUA_EN: Record<string, string> = { 祿: 'Abundance', 權: 'Authority', 科: 'Recognition', 忌: 'Obstruction' };

function starsEn(zh: string, missing: string[]): string {
  return listEn(
    zh.split('、').map((x) => {
      const en = star(x);
      if (!en) missing.push(x);
      return en ?? `〔${x}〕`;
    }),
  );
}

/** daxian.ts starsOf()：「坐天機」「沒有主星，借對宮的天同、天梁」「沒有主星」→ 英文尾巴（前面加逗號） */
const SEAT = '坐[^；。（）]+|沒有主星，借對宮的[^；。（）]+|沒有主星';
function seat(zh: string, missing: string[]): string {
  let m = /^坐(.+)$/.exec(zh);
  if (m) return `, shaped by ${starsEn(m[1]!, missing)}`;
  m = /^沒有主星，借對宮的(.+)$/.exec(zh);
  if (m) return `, which has no major star and borrows ${starsEn(m[1]!, missing)} from the opposite palace`;
  return ', which has no major star';
}
/** 依據括號入面：「官祿宮坐太陰」→ holds Tai Yin */
function seatVerb(zh: string, missing: string[]): string {
  let m = /^坐(.+)$/.exec(zh);
  if (m) return `holds ${starsEn(m[1]!, missing)}`;
  m = /^沒有主星，借對宮的(.+)$/.exec(zh);
  if (m) return `has no major star and borrows ${starsEn(m[1]!, missing)} from the opposite palace`;
  return 'has no major star';
}

function pal(zh: string, missing: string[]): string {
  const en = palaceEn(zh);
  if (!en) missing.push(zh);
  return en ?? `〔${zh}〕`;
}
function areaEn(zh: string, missing: string[]): string {
  const en = AREA_EN[zh]?.[0];
  if (!en) missing.push(zh);
  return en ?? `〔${zh}〕`;
}
function huaList(zh: string, missing: string[]): { text: string; many: boolean } {
  const items = zh.split('、').map((x) => {
    const m = /^(\S{2})化(\S)$/.exec(x);
    if (m && star(m[1]!) && HUA_EN[m[2]!]) return `${star(m[1]!)} turning to ${HUA_EN[m[2]!]}`;
    missing.push(x);
    return `〔${x}〕`;
  });
  return { text: listEn(items), many: items.length > 1 };
}
const n = (zh: string) => cnNum(zh);

/* ── 分四方面（daxian.ts TONE）：主語係「these ten years」（眾數）或「this year」 ── */
const TONES: [string, (year: boolean) => string][] = [
  ['有發揮的空間，也要多扛一點', (y) => `give${y ? 's' : ''} you room to make your mark, and ask${y ? 's' : ''} you to carry a little more`],
  ['比較順', (y) => `run${y ? 's' : ''} relatively smoothly`],
  ['容易得到認可', (y) => `tend${y ? 's' : ''} to bring recognition`],
  ['要多留神', (y) => `call${y ? 's' : ''} for extra care`],
];
function tonesEn(zh: string, year: boolean): string | null {
  const out: string[] = [];
  let rest = zh;
  while (rest) {
    const t = TONES.find(([k]) => rest.startsWith(k));
    if (!t) return null;
    out.push(t[1](year));
    rest = rest.slice(t[0].length).replace(/^，也/, '');
  }
  return out.length > 1 ? `${out.slice(0, -1).join(', ')}, and also ${out.at(-1)}` : out[0]!;
}
const AREA_LABELS = ['工作上', '錢方面', '感情上', '心境上'];

/* ── 互動（daxian/rules.json）：本命或大限嘅化 × 呢段時期嘅化 ── */
const RULE_EN: Record<string, string> = {
  'dx.rule.stack.祿': '{S} turns to Abundance {where}, and to Abundance again {span}; the two stack up, and greatly strengthen what it means for your income.',
  'dx.rule.stack.權': '{S} turns to Authority {where}, and to Authority again {span}: power stacked this heavily can draw pushback.',
  'dx.rule.lu_to_ji': '{S} turns to Abundance {where}, but to Obstruction {span}: money may bring trouble, or your usual ways of earning may weaken.',
  'dx.rule.ji_to_lu': '{S} turns to Obstruction {where}, but to Abundance {span}: what used to work against you may turn in your favour during this period.',
  'dx.rule.quan_to_ji': '{S} turns to Authority {where}, but to Obstruction {span}: take care not to stand out so much that you draw fire, or let a high position become a precarious one.',
  'dx.rule.ji_to_quan': '{S} turns to Obstruction {where}, but to Authority {span}: watch for the forces that hold you back gaining ground.',
  'dx.rule.ke_to_ji': '{S} turns to Recognition {where}, but to Obstruction {span}: the higher your profile, the more disputes it can draw.',
};
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RULES = (rulesRaw as { rules: { id: string; text: string }[] }).rules.map((r) => ({
  id: r.id,
  re: new RegExp(
    `^${esc(r.text)
      .replace(esc('{star}'), '(\\S{2})')
      .replace('在你本命', '(在你本命|在這十年的大限)')
      .replace(/這十年(又|卻)/, '這(十年|一年)$1')}$`,
  ),
}));

/* ── 回看過去（daxian.ts lookBack；過去式） ── */
const TURN_EG: Record<string, string> = {
  '像是升學、畢業或出來工作': 'such as moving up in school, graduating or starting work',
  '像是轉工、轉行、搬屋或成家': 'such as changing jobs or careers, moving house or starting a family',
  '像是工作崗位、住處或家庭角色有了變化': 'such as a change in your role at work, where you lived or your place in the family',
};
const EVENT_EN: Record<string, string> = {
  '身體上要付出的比平時多，不少人在這樣的年份要停下來休養一段時間': 'your body asked more of you than usual; in years like this, many people have to stop and rest for a while',
  '出入、出行要格外小心，容易有磕碰，或者行程上的波折': 'getting about and travelling called for extra care, with knocks or setbacks along the way more likely',
  '容易捲入是非爭拗，有些事要靠白紙黑字、找人評理才解決': 'you were more easily drawn into disputes, and some could only be settled in writing or by bringing in someone to judge',
  '有一筆錢走得比預期多，事後回想，當時可以多留一手': 'a sum of money went out faster than you expected, and looking back, you could have held more in reserve',
  '感情上經歷過一段考驗，可能是聚少離多，或者一段關係走到要做決定的時候': 'love went through a test, perhaps time apart, or a relationship reaching the point of a decision',
};
const GIST_EN: Record<string, string> = {
  /* 化忌嗰方面 */
  '你自己的狀態起伏較大': 'your own state went up and down more',
  '像是對自己的方向沒把握，想法反反覆覆': 'for example, you felt unsure of your direction, and your thinking kept changing',
  '朋輩之間的事比較費心': 'dealings with peers took more effort',
  '像是和兄弟姊妹、同學或合伙人有爭拗，或者要替他們分擔': 'for example, disputes with siblings, classmates or partners, or having to share their burdens',
  '感情上牽掛較多，容易有摩擦': 'there was more worry and friction in love',
  '像是吵得比平時多、聚少離多，或者一段關係走到要做決定的時候': 'for example, more arguments than usual, more time apart, or a relationship reaching the point of a decision',
  '後輩或手上的作品比較費心': 'the next generation or your own work took more effort',
  '像是為子女或下屬操心，或者自己的作品、計劃遲遲未有成果': 'for example, worrying about children or juniors, or your own work and plans taking a long time to bear fruit',
  '錢方面支出或周轉比較吃緊': 'money was tighter, with bigger outgoings or cash-flow strain',
  '像是有一筆大開支、收入一時不穩，或者借出去的錢收不回': 'for example, a large expense, unsteady income for a while, or money you lent not coming back',
  '身心負荷較重，容易覺得累': 'the load on your body and mind was heavier, and you tired easily',
  '像是長時間加班、作息被打亂，總覺得睡不夠': 'for example, long hours of overtime, a disrupted routine, never feeling you had enough sleep',
  '在外奔走較多，環境變化大': 'you were out and about more, and your surroundings changed a lot',
  '像是常要出差、搬到新的城市，或者在外面遇到的事不如預期': 'for example, frequent business trips, moving to a new city, or things away from home not going as expected',
  '人際來往比較費心': 'relationships with people took more effort',
  '像是朋友之間有誤會、被人拖累，或者團隊裡的人事比較麻煩': 'for example, misunderstandings between friends, being dragged down by others, or difficult people issues in a team',
  '工作上變動較多，事情不容易照計劃走': "work changed a lot, and things didn't easily go to plan",
  '像是轉工、換部門或換上司，或者手上的項目推倒重來': 'for example, changing jobs, departments or bosses, or a project being scrapped and started again',
  '住處或家裡的事變動較多': 'there were more changes at home or in where you lived',
  '像是搬屋、裝修，或者家裡有事要你分心處理': 'for example, moving house, renovating, or family matters needing your attention',
  '心事較多，不容易靜下來': 'you had more on your mind and found it hard to settle',
  '像是心裡有放不下的事，夜裡想個不停': "for example, something you couldn't let go of, turning things over at night",
  '和長輩或上司之間要交代的事較多': 'there was more to answer for with elders or bosses',
  '像是和父母意見不合、和上司關係緊張，或者要替長輩處理事情': 'for example, disagreements with parents, tension with a boss, or having to handle things for older relatives',
  /* 化祿嗰方面 */
  '你自己的狀態比較順': 'things went relatively well for you',
  '像是做事特別順手，或者開始了一件後來證明值得的事': 'for example, work felt especially smooth, or you started something that later proved worthwhile',
  '朋輩之間比較得力': 'your peers were a real help',
  '像是得到兄弟姊妹、同學或合伙人幫忙': 'for example, help from siblings, classmates or partners',
  '感情上比較順': 'love went relatively smoothly',
  '像是遇到合拍的人、關係穩定下來，或者一起計劃將來': 'for example, meeting someone well matched, a relationship settling down, or planning a future together',
  '後輩或手上的作品有起色': 'the next generation or your own work picked up',
  '像是子女或下屬帶來好消息，或者自己的作品有了成果': 'for example, good news from children or juniors, or your own work bearing fruit',
  '錢方面有轉機': 'money took a turn for the better',
  '像是加薪、有額外收入，或者一筆錢的安排做對了': 'for example, a pay rise, extra income, or a decision about money that turned out right',
  '身心比較鬆得下來': 'body and mind could ease off more',
  '像是作息回到正軌，整個人比之前輕鬆': 'for example, your routine getting back on track and feeling lighter than before',
  '在外的機會較多': 'there were more opportunities away from home',
  '像是出外工作、讀書或旅行帶來機會': 'for example, work, study or travel away from home bringing opportunities',
  '人際上有助力': 'people around you gave you support',
  '像是認識到後來幫得上忙的人': 'for example, meeting someone who later proved a real help',
  '工作上有轉機': 'work took a turn for the better',
  '像是升職、轉到更合適的工作，或者手上的事得到認可': 'for example, a promotion, a move to a better-suited job, or recognition for what you were doing',
  '住處或家裡的事有好的安排': 'home matters were well arranged',
  '像是搬到更合適的地方、置業，或者家裡的事安頓下來': 'for example, moving somewhere more suitable, buying property, or family matters settling down',
  '心境比較安穩': 'your state of mind was steadier',
  '像是心情安定，有時間做自己喜歡的事': 'for example, feeling settled, with time for things you enjoy',
  '和長輩或上司之間比較順': 'things went relatively smoothly with elders or bosses',
  '像是得到長輩或上司提攜': 'for example, being helped along by an elder or a boss',
};

function lookPart(zh: string, missing: string[]): string {
  let m = /^你走進第(\S+?)個大限，生活的重心換了方向，(.+)$/.exec(zh);
  if (m && n(m[1]!) && TURN_EG[m[2]!]) return `you entered your ${ordinalWord(n(m[1]!)!)} ten-year stage, and the centre of your life shifted, ${TURN_EG[m[2]!]}`;
  if (EVENT_EN[zh]) return EVENT_EN[zh]!;
  m = /^同一年，(.+)$/.exec(zh);
  if (m && GIST_EN[m[1]!]) return `in the same year, ${GIST_EN[m[1]!]}`;
  if (GIST_EN[zh]) return GIST_EN[zh]!;
  /* 方面 ＋ 例子：「工作上變動較多，事情不容易照計劃走，像是轉工⋯」—— 喺「，像是」切開 */
  const i = zh.indexOf('，像是');
  if (i > 0 && GIST_EN[zh.slice(0, i)] && GIST_EN[zh.slice(i + 1)]) return `${GIST_EN[zh.slice(0, i)]}, ${GIST_EN[zh.slice(i + 1)]}`;
  missing.push(zh);
  return `〔${zh}〕`;
}

export function timeTemplate(s: string, missing: string[], h: TimeHelpers): string | null {
  /* ── 一生十二步 ── */
  let m = /^你的大限由虛歲(\S+?)歲起，每十年換一步；寫這本書時（(\S+?)年），你(走到第(\S+?)步|還未起步)。$/.exec(s);
  if (m && n(m[1]!) && n(m[2]!)) {
    const where = m[4] ? `you were on the ${ordinalWord(n(m[4])!)} step` : "you hadn't reached the first step yet";
    return `Your ten-year stages begin at ${ageStart(n(m[1]!)!)} and move on every ten years; when this book was written (${n(m[2]!)}), ${where}.`;
  }
  m = /^你命盤裡的關鍵大限是(.+)：這幾步的得失，對你一生影響特別大。$/.exec(s);
  if (m) {
    const steps = m[1]!.split('、').map((x) => /^第(\S+?)步$/.exec(x)?.[1]).map((x) => (x && n(x) ? ordinalWord(n(x)!) : null));
    if (steps.every(Boolean)) {
      const one = steps.length === 1;
      return `The key ${one ? 'stage' : 'stages'} in your chart ${one ? 'is' : 'are'} the ${listEn(steps as string[])} ${one ? 'step' : 'steps'}: what you gain and lose ${one ? 'there' : 'in them'} shapes your life more than anything else.`;
    }
  }
  m = new RegExp(`^第(\\S+?)步　(\\S+?)至(\\S+?)歲　(\\S+?宮)，(${SEAT})。$`).exec(s);
  if (m && n(m[1]!) && n(m[2]!) && n(m[3]!)) {
    return `Step ${n(m[1]!)} — ${ageRange(n(m[2]!)!, n(m[3]!)!)} — your ${pal(m[4]!, missing)}${seat(m[5]!, missing)}.`;
  }
  if (s === '關鍵大限。') return 'A key stage.';
  if (s === '寫這本書時，你在這一步。') return 'You were on this step when this book was written.';
  m = /^之後的大限從虛歲(\S+?)歲起，這裡不再細列。$/.exec(s);
  if (m && n(m[1]!)) return `The stages after that begin at ${ageStart(n(m[1]!)!)} and aren't listed here.`;

  /* ── 回看過去 ── */
  m = /^(回看你走過的路：)?(\S+?)年（(\S)(\S)年，你虛歲(\S+?)），(.+)。$/.exec(s);
  if (m && n(m[2]!) && n(m[5]!) && STEM_EN[m[3]!] && BRANCH_EN[m[4]!]) {
    const when = `${n(m[2]!)} (a ${STEM_EN[m[3]!]} ${BRANCH_EN[m[4]!]} year, when you were ${agePoint(n(m[5]!)!)})`;
    const pre = m[1] ? "Looking back on the road you've walked: " : '';
    const hm = /^(是你命盤裡關鍵的一年|同樣是關鍵的一年)(?:：(.+))?$/.exec(m[6]!);
    const body = (hm ? (hm[2] ?? '') : m[6]!) ;
    const parts = body ? body.split('；').map((p) => lookPart(p, missing)).join('; ') : '';
    if (hm) {
      const was = hm[1]!.startsWith('同樣') ? 'was another key year in your chart' : 'was a key year in your chart';
      return `${pre}${when} ${was}${parts ? `: ${parts}` : ''}.`;
    }
    return `${pre}${pre ? 'in' : 'In'} ${when}, ${parts}.`;
  }

  /* ── 這十年 · 結論 ── */
  m = /^寫這本書時（(\S+?)年），你虛歲(\S+?)，正行第(\S+?)個大限（(\S+?)至(\S+?)歲）。$/.exec(s);
  if (m && [1, 2, 3, 4, 5].every((i) => n(m![i]!))) {
    const [y, age, k, a, b] = [1, 2, 3, 4, 5].map((i) => n(m![i]!)!);
    return `When this book was written (${y}), you were ${agePoint(age!)} (${age} by Chinese reckoning), in your ${ordinalWord(k!)} ten-year stage (${ageRange(a!, b!)}).`;
  }
  m = /^寫這本書時（(\S+?)年），你虛歲(\S+?)，第一個大限從虛歲(\S+?)歲開始。$/.exec(s);
  if (m && n(m[1]!) && n(m[2]!) && n(m[3]!)) {
    return `When this book was written (${n(m[1]!)}), you were ${agePoint(n(m[2]!)!)} (${n(m[2]!)} by Chinese reckoning); your first ten-year stage begins at ${ageStart(n(m[3]!)!)}.`;
  }
  m = /^這(十年|一年)，你的(\S+?)比較順，(\S+?)要多留神。$/.exec(s);
  if (m) {
    const span = m[1] === '十年' ? 'Over these ten years' : 'This year';
    return `${span}, it's smoother going for ${areaEn(m[2]!, missing)}, and more care is needed with ${areaEn(m[3]!, missing)}.`;
  }
  m = /^這(十年|一年)，你的(\S+?)起伏較大，有得著，也有牽掛。$/.exec(s);
  if (m) {
    const span = m[1] === '十年' ? 'Over these ten years' : 'This year';
    return `${span}, ${areaEn(m[2]!, missing)} go${['錢', '朋輩'].includes(m[2]!) ? '' : 'es'} through bigger ups and downs, with gains and worries alike.`;
  }
  m = new RegExp(`^這個大限落在你的(\\S+?宮)，(${SEAT})，宮干是(\\S)。$`).exec(s);
  if (m && STEM_EN[m[3]!]) return `This stage falls in your ${pal(m[1]!, missing)}${seat(m[2]!, missing)}, and its palace stem is ${STEM_EN[m[3]!]}.`;

  /* ── 這一年 · 結論、流年命宮、明年 ── */
  m = /^寫這本書的(\S+?)年是(\S)(\S)年，你虛歲(\S+?)。$/.exec(s);
  if (m && n(m[1]!) && n(m[4]!) && STEM_EN[m[2]!] && BRANCH_EN[m[3]!]) {
    return `${n(m[1]!)}, the year this book was written, was a ${STEM_EN[m[2]!]} ${BRANCH_EN[m[3]!]} year, and you were ${agePoint(n(m[4]!)!)} (${n(m[4]!)} by Chinese reckoning).`;
  }
  m = new RegExp(`^這一年的流年命宮在(\\S)，落在你本命的(\\S+?宮)(?:，也就是這十年大限的(\\S+?宮))?，(${SEAT})。$`).exec(s);
  if (m && BRANCH_EN[m[1]!]) {
    const dec = m[3] ? `, and this decade's ${pal(m[3], missing)}` : '';
    return `This year's Life Palace sits in ${BRANCH_EN[m[1]!]}: your birth chart's ${pal(m[2]!, missing)}${dec}${seat(m[4]!, missing)}.`;
  }
  m = new RegExp(`^(\\S+?)年是(\\S)(\\S)年，流年命宮轉到(\\S)，落在你本命的(\\S+?宮)，(${SEAT})(?:；那一年(\\S{2})化祿、(\\S{2})化忌)?。$`).exec(s);
  if (m && n(m[1]!) && STEM_EN[m[2]!] && BRANCH_EN[m[3]!] && BRANCH_EN[m[4]!]) {
    const hua = m[7] && m[8] ? `; that year ${starsEn(m[7], missing)} turns to Abundance and ${starsEn(m[8], missing)} to Obstruction` : '';
    return `${n(m[1]!)} is a ${STEM_EN[m[2]!]} ${BRANCH_EN[m[3]!]} year: the year's Life Palace moves to ${BRANCH_EN[m[4]!]}, your birth chart's ${pal(m[5]!, missing)}${seat(m[6]!, missing)}${hua}.`;
  }
  m = new RegExp(`^下一個大限從虛歲(\\S+?)歲開始，轉到(\\S+?宮)，(${SEAT})(?:；那十年(\\S{2})化祿、(\\S{2})化忌)?。$`).exec(s);
  if (m && n(m[1]!)) {
    const hua = m[4] && m[5] ? `; in that decade, ${starsEn(m[4], missing)} turns to Abundance and ${starsEn(m[5], missing)} to Obstruction` : '';
    return `The next stage begins at ${ageStart(n(m[1]!)!)} and moves to your ${pal(m[2]!, missing)}${seat(m[3]!, missing)}${hua}.`;
  }

  /* ── 這十年／這一年裡，＋星系偏向 ── */
  m = /^這(十年|一年)裡，(.+)$/.exec(s);
  if (m && h.tm(m[2]!)) return `${m[1] === '十年' ? 'During these ten years' : 'This year'}, ${h.lower(h.tm(m[2]!)!)}`;

  /* ── 分四方面 ── */
  m = /^(工作上|錢方面|感情上|心境上)，這(十年|一年)(.+)。$/.exec(s);
  if (m) {
    const year = m[2] === '一年';
    const span = year ? 'this year' : 'these ten years';
    const on = AREA_ON_EN[m[1]!]!;
    const tones = tonesEn(m[3]!, year);
    if (tones) return `${on}, ${span} ${tones}.`;
    const en = h.tm(`${m[3]}。`);
    if (en) {
      /* 結論句本身已經以方面開頭（「At work you're⋯」）就剝走 */
      const body = en.toLowerCase().startsWith(on.toLowerCase()) ? en.slice(on.length).replace(/^,?\s*/, '') : en;
      return `${on}, ${year ? 'this year' : 'over these ten years'}, ${h.lower(body)}`;
    }
  }
  m = /^這(十年|一年)，(.+)$/.exec(s);
  if (m && h.tm(m[2]!)) return `${m[1] === '十年' ? 'Over these ten years' : 'This year'}, ${h.lower(h.tm(m[2]!)!)}`;
  m = /^只是(.+)$/.exec(s);
  if (m && h.tm(`要留意的是：${m[1]}`)) return `That said, ${h.lower(h.strip(h.tm(`要留意的是：${m[1]}`)!))}`;

  /* 依據：（依據：大限的官祿宮坐太陰；文昌化科落在這裡。） */
  m = new RegExp(`^（依據：(大限|流年)的(\\S+?宮)(${SEAT})(?:；(.+)落在這裡)?。）$`).exec(s);
  if (m) {
    const layer = m[1] === '大限' ? "the decade's" : "the year's";
    const hits = m[4] ? huaList(m[4], missing) : null;
    const fall = hits ? `; ${hits.text} ${hits.many ? 'fall' : 'falls'} here` : '';
    return `(Basis: ${layer} ${pal(m[2]!, missing)} ${seatVerb(m[3]!, missing)}${fall}.)`;
  }

  /* 四化各自的意思：天機化權（在這一年的命宮）：⋯ */
  m = /^(四化各自的意思：)?(\S{2})化(\S)(?:（在這(十年|一年)的(\S+?)）)?：(.+)$/.exec(s);
  if (m && star(m[2]!) && HUA_EN[m[3]!] && h.tm(m[6]!)) {
    const where = m[5] ? ` (in ${m[4] === '十年' ? "this decade's" : "this year's"} ${pal(m[5], missing)})` : '';
    return `${m[1] ? 'What each transformation means: ' : ''}${star(m[2]!)} turns to ${HUA_EN[m[3]!]}${where}: ${h.lower(h.tm(m[6]!)!)}`;
  }

  /* 互動 */
  for (const r of RULES) {
    const rm = r.re.exec(s);
    if (!rm || !star(rm[1]!)) continue;
    const where = rm[2] === '在你本命' ? 'in your birth chart' : 'in your ten-year stage';
    const span = rm[3] === '十年' ? 'in these ten years' : 'this year';
    return RULE_EN[r.id]!.replace('{S}', star(rm[1]!)!).replace('{where}', where).replace('{span}', span);
  }

  return null;
}
