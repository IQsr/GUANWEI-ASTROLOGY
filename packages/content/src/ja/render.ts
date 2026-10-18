import tmRaw from './tm.json';
import slotsRaw from './slots.json';
import { OLD_WATCH_LEADS, WATCH_LEADS } from '../watch-lead';
import { LINK_REFS } from '../link';
import { FILL_VERB, MAJOR, OR_VERB, stripOr } from '../branch';
import { AREA_JA, AREA_ON_JA, HUA_JA, PALACE_JA, listJa, starJa } from './terms';
import { factTemplate } from './facts';
import { YOUTH_PREFIX, unyouth } from '../youth';
import { timeTemplate } from './time';

/* ───────────────────────────────────────────────────────────
 * 日文版：由砌好嘅中文章逐句譯（2026-10-15 起）
 *
 * 同英文（en/render.ts）一樣嘅分工：中文決定講乜，日文只管點講。
 *   一、資料句 → 翻譯表（`tm.json` 嘅 sentences；煞星嗰截、牽動嗰截 → clauses）
 *   二、原文分支規則入面有〔泛稱〕｛或｝「會照的」嘅句 → `slots.json`，盤上填咗乜星，日文跟住填
 *   三、程式砌出嚟嘅句（「你的命宮坐天同、天梁。」）→ 下面嘅模板
 *
 * 同英文唔同嘅地方：
 *   - 星名、宮名本身係漢字，填格只係換新字體（祿→禄），唔使譯
 *   - 「要留意的是」嗰類轉接語跟中文嗰款譯（中文已經輪換過），翻譯表只存後面嗰句
 *   - 日文唔使主語：「它⋯」翻譯表寫「この星⋯」，主星換名嗰陣換做星名
 *
 * 譯唔到嘅句唔會靜靜雞出中文：回 `missing`，測試列晒出嚟。
 * ─────────────────────────────────────────────────────────── */

const TM = tmRaw as unknown as { sentences: Record<string, string>; clauses: Record<string, string> };
const RULES = (slotsRaw as unknown as { rules: Record<string, string> }).rules;

export type Rendered = { text: string; missing: string[] };

const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** 日文模板拎走記號：「〔吉星〕を見て」→「吉星を見て」 */
const plainJa = (ja: string) => ja.replace(/[〔〕｛｝]/g, '');

/* ── 泛稱填實（branch.ts `fillSlots`／`fillOr`）────────────────── */

type Slot = { re: RegExp; ja: string; kinds: ('slot' | 'or')[]; phrases: string[]; owners: (string | undefined)[]; head: string; tail: string };
const SLOTS: Slot[] = [];
const SLOT_STARS = [...new Set([...MAJOR, '左輔', '右弼', '文昌', '文曲', '天魁', '天鉞', '祿存', '天馬', '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫', '天刑'])]
  .sort((a, b) => b.length - a.length)
  .join('|');
const SLOT_ITEM = `(?:(?:${SLOT_STARS})?化[祿權科忌]|${SLOT_STARS})`;
const SLOT_ITEMS = `${SLOT_ITEM}(?:(?:、|，又見)${SLOT_ITEM})*`;
const OR_ITEM = `(?:(?:${SLOT_STARS})?化[祿權科忌]|${SLOT_STARS}|[子丑寅卯辰巳午未申酉戌亥])`;
const OR_ITEMS = `(?:${OR_VERB})?${OR_ITEM}(?:(?:、|，又(?:${OR_VERB})?)${OR_ITEM})*`;

function slotOf(zh: string, ja: string): Slot {
  const kinds: ('slot' | 'or')[] = [];
  const phrases: string[] = [];
  const owners: (string | undefined)[] = [];
  const re = new RegExp(`(${FILL_VERB})?〔([^〕]+)〕|｛([^｝]+)｝`, 'g');
  let body = '';
  let at = 0;
  for (let m = re.exec(zh); m; m = re.exec(zh)) {
    const before = stripOr(zh.slice(0, m.index));
    body += esc(stripOr(zh.slice(at, m.index)));
    at = m.index + m[0].length;
    owners.push(MAJOR.find((x) => before.endsWith(x) && !MAJOR.some((y) => before.slice(0, -x.length).endsWith(y))));
    if (m[3] !== undefined) {
      kinds.push('or');
      phrases.push(m[3]);
      body += `(${esc(m[3])}|${OR_ITEMS})`;
    } else {
      kinds.push('slot');
      phrases.push(`${m[1] ?? ''}${m[2]}`);
      body += `(${esc(phrases.at(-1)!)}|(?:${FILL_VERB})?${SLOT_ITEMS})`;
    }
  }
  body += esc(stripOr(zh.slice(at)));
  const head = stripOr(zh.slice(0, zh.search(/〔|｛/))).replace(new RegExp(`(?:${FILL_VERB})$`), '');
  const tail = stripOr(zh.slice(Math.max(zh.lastIndexOf('〕'), zh.lastIndexOf('｝')) + 1));
  return { re: new RegExp(`^${body}$`), ja, kinds, phrases, owners, head, tail };
}

/** 一粒：「天機化祿」→「天機化禄」；「化祿」（自己嘅化）→「化禄」；星名、地支照用 */
function itemJa(it: string, own: boolean): string | null {
  let m = /^化(\S)$/.exec(it);
  if (m && HUA_JA[m[1]!]) return own ? HUA_JA[m[1]!]! : HUA_JA[m[1]!]!;
  m = /^(\S{2})化(\S)$/.exec(it);
  if (m && starJa(m[1]!) && HUA_JA[m[2]!]) return `${starJa(m[1]!)}${HUA_JA[m[2]!]}`;
  if (/^[子丑寅卯辰巳午未申酉戌亥]$/.test(it)) return it;
  return starJa(it);
}

/** 〔〕填咗嘅一截（「見左輔、天鉞」「化祿，又見左輔」）→「左輔・天鉞」「化禄、さらに左輔」；冇填就 null */
function slotJa(seg: string, phrase: string, owner: string | undefined): string | null {
  if (seg === phrase) return null;
  const body = seg.replace(new RegExp(`^(${FILL_VERB})`), '');
  const [own, ...more] = body.split('，又見');
  const head = own!.split('、').map((x) => itemJa(x, Boolean(owner)));
  const rest = more.join('、').split('、').filter(Boolean).map((x) => itemJa(x, false));
  if ([...head, ...rest].some((x) => !x)) return null;
  return rest.length ? `${listJa(head as string[])}、さらに${listJa(rest as string[])}` : listJa(head as string[]);
}

/** ｛｝填咗嘅一截（「火星、鈴星」「天機化祿，又有祿存」「卯」）→ 日文；認唔到就 null */
function orJa(seg: string): string | null {
  const out: string[] = [];
  for (const raw of seg.split(/，又|、/)) {
    const x = itemJa(raw.replace(new RegExp(`^(?:${OR_VERB})`), ''), false);
    if (!x) return null;
    out.push(x);
  }
  return listJa(out);
}

function fillJa(slot: Slot, m: RegExpExecArray): string {
  const idx = { slot: slot.kinds.flatMap((k, i) => (k === 'slot' ? [i] : [])), or: slot.kinds.flatMap((k, i) => (k === 'or' ? [i] : [])) };
  const n = { slot: 0, or: 0 };
  return slot.ja.replace(/〔([^〕]+)〕|｛([^｝]+)｝/g, (_all, generic: string | undefined, orig: string | undefined) => {
    if (orig !== undefined) {
      const k = idx.or[n.or++]!;
      const seg = m[k + 1]!;
      return seg === slot.phrases[k] ? orig : (orJa(seg) ?? orig);
    }
    const k = idx.slot[n.slot++]!;
    return slotJa(m[k + 1]!, slot.phrases[k]!, slot.owners[k]) ?? generic!;
  });
}

/*
 * 骨架章「會照的X」換成真宮名（branch.ts `placeHui`）：日文模板寫「三方四正の」，填咗宮名就換做「財帛宮・官禄宮の」。
 */
type Hui = { re: RegExp; ja: string };
const HUI: Hui[] = [];
const HUI_JA = '三方四正の';
const palaceJa = (x: string) => PALACE_JA[x] ?? PALACE_JA[x.replace(/宮$/, '')];

function huiNames(zh: string): string | null {
  const names = zh.split('和').map(palaceJa);
  return names.some((x) => !x) ? null : `${listJa(names as string[])}の`;
}

for (const [zh, ja] of Object.entries(RULES)) {
  /* 拎走｛｝就係舊句（R-008：已出嘅書存嘅係呢句），未填嘅句一樣 */
  TM.sentences[stripOr(zh)] ??= plainJa(ja);
  if (/[〔｛]/.test(zh)) SLOTS.push(slotOf(zh, ja));
  if (zh.includes('會照的')) HUI.push({ re: new RegExp(`^${esc(stripOr(zh)).replace('會照的', '(會照|[^，。]+?宮)的')}$`), ja: plainJa(ja) });
}

/* ── 轉接語：中文輪換過，日文跟住嗰款（翻譯表只存「要留意的是：」後面嗰句）── */
const WATCH_JA: Record<string, string> = {
  '要留意的是：': 'ただし、',
  '要留意的是，': 'ただし、',
  '不過，': 'とはいえ、',
  但: 'けれど、',
  只是: 'ただ、',
  '另一面是：': 'その一方で、',
  而且: 'それに、',
};

/** 一句中文喺翻譯表嘅日文（冇就 null） */
export function tmSentence(zh: string): string | null {
  const direct = TM.sentences[zh];
  if (direct === undefined) return null;
  return zh.startsWith(WATCH_LEADS[0]) ? WATCH_JA[WATCH_LEADS[0]] + direct : direct;
}

function lookupSentence(s: string): string | null {
  const direct = tmSentence(s);
  if (direct) return direct;
  /* 細讀例外句（assemble.ts `bridgeExceptions`，2026-10-18）：「不過，同宮有鈴星，⋯」 */
  const but = /^(?:不過，|但)(.+)$/.exec(s);
  if (but) {
    const rest = lookupSentence(but[1]!);
    if (rest) return `${s.startsWith('但') ? 'けれど、' : 'とはいえ、'}${rest}`;
  }
  for (const slot of SLOTS) {
    if (!s.startsWith(slot.head) || !s.endsWith(slot.tail)) continue;
    const m = slot.re.exec(s);
    if (m) return fillJa(slot, m);
  }
  for (const h of HUI) {
    const m = h.re.exec(s);
    if (m) return m[1] === '會照' ? h.ja : h.ja.replace(HUI_JA, huiNames(m[1]!) ?? HUI_JA);
  }
  /* 「會照的｛…｝」兩樣都填咗（「遷移宮的火星」）：宮名換返「會照的」對模板，日文再換宮名 */
  for (const m of s.matchAll(/([^，。；：]+?宮(?:和[^，。；：]+?宮)*)的/g)) {
    for (let i = 0; i < m[1]!.length; i++) {
      const names = huiNames(m[1]!.slice(i));
      if (!names) continue;
      const back = `${s.slice(0, m.index! + i)}會照的${s.slice(m.index! + m[0].length)}`;
      for (const slot of SLOTS) {
        if (!back.startsWith(slot.head) || !back.endsWith(slot.tail)) continue;
        const mm = slot.re.exec(back);
        if (mm) return fillJa(slot, mm).replace(HUI_JA, names);
      }
    }
  }
  /* 轉接語輪換過嘅結論段：日文開頭跟中文嗰款 */
  const lead = [...WATCH_LEADS.slice(1), ...OLD_WATCH_LEADS].find((l) => s.startsWith(l));
  if (lead) {
    const body = TM.sentences[WATCH_LEADS[0] + s.slice(lead.length)];
    if (body) return WATCH_JA[lead] + body;
  }
  /* 「天機：⋯」 */
  const pre = /^(\S{2})：(.+)$/.exec(s);
  if (pre && starJa(pre[1]!)) {
    const rest = TM.sentences[pre[2]!];
    /* 譯文本身有「この星」就換做星名；冇就用「天機の場合、」帶起 */
    if (rest) return rest.includes('この星') ? rest.replace('この星', starJa(pre[1]!)!) : `${starJa(pre[1]!)}の場合、${rest}`;
  }
  /* 「天同改造的成本高⋯」（原句「它改造的成本高⋯」）：「この星」換做星名 */
  const head = s.slice(0, 2);
  if (starJa(head)) {
    const asIt = TM.sentences[`它${s.slice(2)}`];
    if (asIt) return /^(この星|それ)/.test(asIt) ? asIt.replace(/^(この星|それ)/, starJa(head)!) : `${starJa(head)}は、${asIt}`;
  }
  /* 「改造的成本高，但對廉貞而言⋯」（原句句中「它」，assemble.ts `withSubject` 2026-10-18）：同「天機：」一樣處理 */
  for (const m of s.matchAll(new RegExp(MAJOR.join('|'), 'g'))) {
    const rest = TM.sentences[s.slice(0, m.index) + '它' + s.slice(m.index! + m[0].length)];
    if (rest) return rest.includes('この星') ? rest.replace('この星', starJa(m[0])!) : `${starJa(m[0])}の場合、${rest}`;
  }
  return null;
}

/* ── 程式砌出嚟嘅句 ────────────────────────────────────── */

function clause(zh: string, missing: string[]): string {
  const ja = TM.clauses[zh];
  if (ja) return ja;
  missing.push(zh);
  return `〔${zh}〕`;
}

/** 「天同、天梁」→「天同・天梁」 */
function starsList(zh: string, missing: string[]): string {
  return listJa(
    zh.split('、').map((s) => {
      const ja = starJa(s);
      if (!ja) missing.push(s);
      return ja ?? `〔${s}〕`;
    }),
  );
}

/* 牽動開頭（link.ts LINK_HEADS，2026-10-13 起自己一句） */
const LINK_HEAD_SENTENCES: Record<string, string> = {
  '你生活的其他部分，也帶著這一面的影子。': '暮らしのほかの部分にも、この一面の影が差しています。',
  '這一面，在你生活的別處也有回響。': 'この一面は、暮らしの別のところにも響いています。',
  '換到別的場合，這一面也在。': '場面が変わっても、この一面は消えません。',
  '這種性子，不會只停在一處。': 'こうした気性は、一か所にとどまりません。',
  '同一股力量，也走到了別的地方。': '同じ力が、別の場所にも及んでいます。',
  '這一面也和你生活裡的其他事情相連。': 'この一面は、暮らしのほかの事柄ともつながっています。',
  '同一種底色，也延伸到你生活的別處。': '同じ地の色が、暮らしの別のところにも広がっています。',
  '這一面不只出現在這裡。': 'この一面は、ここだけに現れるわけではありません。',
  '別的方面，也和這一面連在一起。': 'ほかの面も、この一面と結びついています。',
  '同樣的性子，在別處也看得到。': '同じ気性は、別のところでも見られます。',
  '這一面也牽動著你生活的其他部分。': 'この一面は、暮らしのほかの部分も動かしています。',
  '把眼光放遠一點，這一面還連著別處。': '少し視野を広げると、この一面はほかの場所ともつながっています。',
};

/* 牽動格舊開頭（link.ts HEADS_OLD） */
const LINK_HEADS: [string, string][] = [
  ['同一種底色，延伸到盤上別處', '同じ地の色が、命盤のほかの場所にも広がっています。'],
  ['放在整張盤看', '命盤全体で見ると、像がはっきりしてきます。'],
  ['這一面也受其他幾宮牽動', 'この一面は、ほかのいくつかの宮にも動かされています。'],
  ['在別的地方，這一面是這樣出現的', '命盤の別の場所では、この一面はこう現れます。'],
];

/** 牽動格最後一截：「家裡是天梁，見〈田宅〉那一章」／「家裡是天梁、朋輩之間是太陽，各自那一章另有細講」 */
function refPart(part: string, missing: string[]): string | null {
  const m = new RegExp(`^(.+)，(?:見〈([^〉]+)〉那一章|${LINK_REFS.join('|')})$`).exec(part);
  if (!m) return null;
  const pairs = m[1]!.split('、').map((x) => {
    const mm = /^(.+)是(\S{2})$/.exec(x);
    const on = mm ? AREA_ON_JA[mm[1]!] : undefined;
    const st = mm ? starJa(mm[2]!) : null;
    if (!on || !st) {
      missing.push(x);
      return `〔${x}〕`;
    }
    return `${on}${st}`;
  });
  if (!m[2]) return `${pairs.join('、')}が関わっていて、それぞれの章で詳しく触れています。`;
  const p = palaceJa(m[2]);
  if (!p) missing.push(m[2]);
  return `${pairs.join('、')}が関わっています（〈${p ?? m[2]}〉の章を参照）。`;
}

/**
 * 給你的話嘅一項：書入面講過嘅一句（結論、長處、或者剝走「要留意的是：」嘅提醒），前面可能加咗方面（「工作上，」）。
 * 日文用返原句譯文；翻譯表「要留意的是：」嗰類本身只存後面嗰句，唔使再剝。
 */
function listItem(zh: string, missing: string[]): string | null {
  let area = '';
  let body = zh;
  const c = zh.indexOf('，');
  if (c > 0 && AREA_ON_JA[zh.slice(0, c)]) {
    area = `${AREA_ON_JA[zh.slice(0, c)]}、`;
    body = zh.slice(c + 1);
  }
  const ja = TM.sentences[body] ?? TM.sentences[`要留意的是：${body}`];
  if (!ja) {
    missing.push(zh);
    return null;
  }
  if (!area) return ja;
  /*
   * 句子頭一截已經用「は／では」講明同一方面，就唔再加方面（2026-10-16 第二輪審稿）：
   * 「お金の面では、お金の管理では秩序を重んじます」—— 以前淨係完全相同先省。
   * 方面詞後面要跟助詞（「外」唔會撞「外見は」，「心」唔會撞「心身」）。
   */
  const key = area
    .slice(0, -1)
    .replace(/(の面では|とのあいだでは|を育てるときは|の輪では|では)$/, '')
    .replace(/の人$/, '');
  const head = ja.split(/[、。]/)[0] ?? '';
  if (ja.startsWith(area.slice(0, -1)) || (new RegExp(`${key}(?:の|で|は|と|に)`).test(head) && /は/.test(head))) return ja;
  return `${area}${ja}`;
}

/** 程式砌出嚟嘅句。認唔到回 null。 */
function template(s: string, missing: string[]): string | null {
  const fact = factTemplate(s, missing);
  if (fact) return fact;
  const time = timeTemplate(s, missing, { tm: (zh) => TM.sentences[zh] ?? null });
  if (time) return time;

  /* 這十年／這一年嘅建議段（daxian.ts adviceSegment；亦出現喺給你的話） */
  const adv = /^這(一年|十年)最值得做的事：(.+)。$/.exec(s);
  if (adv) {
    const sp = adv[1] === '一年' ? 'この一年' : 'この十年';
    const areaJa = (zh: string) => {
      const ja = AREA_JA[zh];
      if (!ja) missing.push(zh);
      return ja ?? `〔${zh}〕`;
    };
    const parts = adv[2]!.split('；').map((part) => {
      let pm = /^(\S+?)方面是這(?:一年|十年)最順的地方，值得多花心思$/.exec(part);
      if (pm) return `${areaJa(pm[1]!)}の面は${sp}いちばん順調なところなので、もう少し心を注ぐ価値があります`;
      pm = /^(\S+?)方面的決定，多花一點時間再定，(急著要答覆的事，先放一晚|簽字、承諾之前多問一句)$/.exec(part);
      if (pm) {
        const tail = pm[2]!.startsWith('急') ? '急いで返事を求められることは、ひと晩おきましょう' : '署名や約束の前に、もうひとつ質問しましょう';
        return `${areaJa(pm[1]!)}にかかわる決断は少し時間をかけて決め、${tail}`;
      }
      if (part === '這方面有得著也有牽掛，進一步之前，先想好退路') return 'この面には得るものも気がかりもあるので、一歩進む前に、退路を考えておきましょう';
      missing.push(part);
      return `〔${part}〕`;
    });
    return `${sp}いちばんする価値のあること。${parts.map((x) => `${x}。`).join('')}`;
  }

  /* 給你的話：「你可以倚仗的：一、⋯。」「二、⋯。」「你要記住的：一、⋯。」（epilogue.ts） */
  /* 2026-10-17：第一段揀咗最具體嘅一樣長処同提醒，清單改叫「其他⋯」 */
  const top = /^(最可以倚仗的一點|最要記住的一點)：(.+)$/.exec(s);
  if (top) {
    const item = listItem(top[2]!, missing);
    if (item === null) return null;
    return `${top[1] === '最可以倚仗的一點' ? 'いちばん頼れるもの' : 'いちばん覚えておきたいこと'}：${item}`;
  }
  const li = /^(?:(你可以倚仗的|你要記住的|其他可以倚仗的|其他要記住的)：)?([一二三])、(.+)$/.exec(s);
  if (li) {
    const item = listItem(li[3]!, missing);
    if (item === null) return null;
    const HEAD: Record<string, string> = { 你可以倚仗的: 'あなたが頼れるもの。', 你要記住的: '覚えておきたいこと。', 其他可以倚仗的: 'ほかに頼れるもの。', 其他要記住的: 'ほかに覚えておきたいこと。' };
    const head = li[1] ? HEAD[li[1]]! : '';
    return `${head}${li[2]}つ目：${item}`;
  }

  /* 開場事實：你的命宮坐天同、天梁。 */
  let m = /^你的(\S+?)坐(.+)。$/.exec(s);
  if (m && palaceJa(m[1]!)) return `あなたの${palaceJa(m[1]!)}には${starsList(m[2]!, missing)}が入っています。`;

  /* 空宮（frame.ts emptyPalaceLine） */
  if (s === '此宮無主星，對宮亦無主星，兩宮同看。') return 'この宮にも向かいの宮にも主星がないので、二つの宮をあわせて読みます。';
  m = /^此宮無主星，借對宮(.+)參看。$/.exec(s);
  if (m) return `この宮には主星がないので、向かいの宮の${starsList(m[1]!, missing)}を借りて読みます。`;
  m = /^你的(\S+?宮)沒有主星，借對面(\S+?宮)的(.+)來讀。$/.exec(s);
  if (m && palaceJa(m[1]!) && palaceJa(m[2]!)) return `あなたの${palaceJa(m[1]!)}には主星がないので、向かいの${palaceJa(m[2]!)}の${starsList(m[3]!, missing)}を借りて読みます。`;

  /* 煞星：「加上擎羊同宮，⋯。」「再加上陀羅，⋯。」；舊講法「同宮還有火星：⋯。」「還有鈴星：⋯。」 */
  /* 方向相反嘅第二粒煞（assemble.ts OPPOSED_SHA）：「不過同宮還有火星，拉向另一邊：⋯。」 */
  const opp = /^不過同宮還有(\S{2})，拉向另一邊：(.+)。$/.exec(s);
  if (opp) {
    const name = starJa(opp[1]!);
    if (!name) missing.push(opp[1]!);
    return `ただ、同じ宮には${name ?? `〔${opp[1]}〕`}もあり、反対の方向にも引っ張られます。${clause(opp[2]!, missing)}。`;
  }
  const sha = /^(?:加上(\S{2})同宮|再加上(\S{2}))，(.+)。$/.exec(s) ?? /^(?:同宮還有(\S{2})|還有(\S{2}))：(.+)。$/.exec(s);
  if (sha) {
    const name = starJa((sha[1] ?? sha[2])!);
    if (!name) missing.push((sha[1] ?? sha[2])!);
    const body = clause(sha[3]!, missing);
    /* 後半自己已經有「ので」：前半改「あり、」，免得一句兩個「ので」（2026-10-16 五盤通讀） */
    const so = body.includes('ので') ? 'あり' : 'あるので';
    return sha[1] ? `さらに${name}が同じ宮に${so}、${body}。` : `そのうえ${name}も${so}、${body}。`;
  }

  if (LINK_HEAD_SENTENCES[s]) return LINK_HEAD_SENTENCES[s]!;
  /* 牽動嘅幾截自己一句：「感情上，⋯；心境上，⋯。」 */
  if (s.endsWith('。') && !s.includes('：')) {
    const ps = s.slice(0, -1).split('；');
    const done = ps.map((part) => {
      const c = part.indexOf('，');
      const on = c > 0 ? AREA_ON_JA[part.slice(0, c)] : undefined;
      const body = c > 0 ? TM.clauses[part.slice(c + 1)] : undefined;
      return on && body ? `${on}、${body}。` : null;
    });
    if (done.every(Boolean)) return done.join('');
    const ref = refPart(s.slice(0, -1), missing);
    if (ref) return ref;
  }

  /* 牽動舊講法：開頭：在外時，⋯；工作上，⋯。 */
  const colon = s.indexOf('：');
  if (colon > 0 && s.endsWith('。')) {
    const h = LINK_HEADS.find(([zh]) => zh === s.slice(0, colon));
    if (h) {
      const parts = s
        .slice(colon + 1, -1)
        .split('；')
        .map((part) => {
          const ref = refPart(part, missing);
          if (ref) return ref;
          const c = part.indexOf('，');
          const on = AREA_ON_JA[part.slice(0, c)];
          if (c < 0 || !on) {
            missing.push(part);
            return `〔${part}〕`;
          }
          return `${on}、${clause(part.slice(c + 1), missing)}。`;
        });
      return [h[1], ...parts].join('');
    }
  }
  return null;
}

/* ── 成章 ─────────────────────────────────────────────── */

const sentencesOf = (t: string) => (t.match(/[^。！？]*[。！？]|[^。！？]+/g) ?? []).map((x) => x.trim()).filter(Boolean);

/* 時間章嘅「（依據：⋯。）」：句號喺括號入面，切句會將「）」切咗去下一句 —— 黐返上一句 */
function joinBrackets(ss: string[]): string[] {
  const out: string[] = [];
  for (const s of ss) {
    if (s.startsWith('）') && out.length) {
      out[out.length - 1] += '）';
      const rest = s.slice(1).trim();
      if (rest) out.push(rest);
    } else out.push(s);
  }
  return out;
}

/* ── 「この星」指邊粒（2026-10-16）──────────────────────────
 *
 * 翻譯表將「它」譯做「この星」。上一句啱啱講完嗰粒星就咁留低係自然日文；
 * 但掃 3,000 張盤見到 169 款句係指代唔清：上一句講緊擎羊（「この星」會讀成擎羊）、
 * 或者成段之前未提過星（疾厄「この星に役立つのは⋯」）。
 * 規則：「它」指嘅係段入面佢之前最後一粒主星／輔星（冇就上一段、再冇就段入面之後第一粒）；
 * 星嘅頭一句有時自己一段（「武曲本就是財帛主，這是它最順的一格。」），所以上一段排先；
 * 上一段係「你的X宮坐／借⋯來讀」就攞頭一粒（下面先講嗰粒）。
 * 由上一句開頭到「它」之間最後提到嘅星唔係佢，就換做星名。 */
const ANY_STAR = new RegExp(SLOT_STARS, 'g');
/* 「它」可以指化科嘅文昌、文曲、左輔、右弼（「文昌化科⋯它修飾的是呈現方式」）；煞星唔算 */
const MAJOR_RE = new RegExp([...MAJOR, '文昌', '文曲', '左輔', '右弼'].join('|'), 'g');
const lastOf = (re: RegExp, t: string) => [...t.matchAll(re)].pop()?.[0];
const firstOf = (re: RegExp, t: string) => t.match(new RegExp(re.source))?.[0];

function resolveKonoHoshi(ja: string, ss: string[], i: number, carry: string | undefined): string {
  if (!ja.includes('この星')) return ja;
  const s = ss[i]!;
  const at = s.includes('它') ? s.indexOf('它') : 0;
  const before = ss.slice(0, i).join('') + s.slice(0, at);
  const star = lastOf(MAJOR_RE, before) ?? carry ?? firstOf(MAJOR_RE, ss.slice(i).join(''));
  const name = star && starJa(star);
  if (!name) return ja;
  const near = (ss[i - 1] ?? '') + s.slice(0, at);
  return lastOf(ANY_STAR, near) === star ? ja : ja.replaceAll('この星', name);
}

function paragraphJa(zh: string, missing: string[], carry?: string): string {
  const ss = joinBrackets(sentencesOf(zh));
  return ss
    .map((zhS, i) => {
      /* 後生讀者（youth.ts）：認返大人原句；句頭前綴另譯 */
      const { prefix, rest: s } = unyouth(zhS);
      /* clash.ts 加嘅「不過，／但」：模板句（四化、運限）都要譯得到 */
      const turn = /^(不過，|但)(.+)$/.exec(s);
      const turned = turn && !TM.sentences[s] ? (lookupSentence(turn[2]!) ?? template(turn[2]!, missing)) : null;
      const ja = turned ? `${turn![1] === '但' ? 'けれど、' : 'とはいえ、'}${turned}` : (lookupSentence(s) ?? template(s, missing));
      if (ja === null) return (missing.push(zhS), `〔${zhS}〕`);
      const out = resolveKonoHoshi(ja, ss, i, carry);
      return prefix ? `${YOUTH_PREFIX[prefix].ja}、${out}` : out;
    })
    .join('');
}

const PARA = String.fromCharCode(10, 10);

/** 逐段譯，段數同輸入一樣（網站要靠段數對返每段嘅格名） */
export function renderParagraphs(zhParas: readonly string[]): { paras: string[]; missing: string[] } {
  const missing: string[] = [];
  let carry: string | undefined;
  const paras = zhParas.map((p) => {
    const out = paragraphJa(p, missing, carry);
    carry = (/宮坐|來讀/.test(p) ? firstOf(MAJOR_RE, p) : lastOf(MAJOR_RE, p)) ?? carry;
    return out;
  });
  return { paras, missing };
}

export function renderChapter(zh: string): Rendered {
  const r = renderParagraphs(zh.split(PARA));
  return { text: r.paras.join(PARA), missing: r.missing };
}

/** 翻譯表入面所有日文（畀日文 lint 掃） */
export const allJapanese = (): string[] => [...Object.values(TM.sentences), ...Object.values(TM.clauses), ...Object.values(RULES).map(plainJa)];
