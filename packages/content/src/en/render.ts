import tmRaw from './tm.json';
import { OLD_WATCH_LEADS, WATCH_LEADS } from '../watch-lead';
import { LINK_REFS } from '../link';
import { JI_WATCH, PAIR_PLAIN } from '../palace-plain';
import { BRANCH_TOPICS, FILL_VERB, MAJOR, slotPattern } from '../branch';
import { AREA_EN, AREA_ON_EN, PALACE_EN, STAR_EN, cap, listEn, star, starFirst } from './terms';
import { factTemplate } from './facts';
import { timeTemplate } from './time';

/* ───────────────────────────────────────────────────────────
 * 英文版：由砌好嘅中文章逐句譯（2026-10-05 · 試做命宮）
 *
 * 點解唔另寫一套英文砌法：中文嗰邊揀乜講、剷邊句重複、點樣截長短，全部係內容決定（assemble.ts
 * 幾百行）。英文另寫一次就會兩邊走樣。所以英文只管「點講」：
 *
 *   一、資料句（基塊、修飾語、生活場景⋯）→ 翻譯表（`tm.json` 嘅 sentences）
 *   二、程式砌出嚟嘅句（「你的命宮坐天同、天梁。」）→ 下面嘅模板，入面嗰截再查翻譯表（clauses）
 *
 * 譯唔到嘅句唔會靜靜雞出中文：回 `missing`，測試列晒出嚟。
 * ─────────────────────────────────────────────────────────── */

const TM = tmRaw as { sentences: Record<string, string>; clauses: Record<string, string> };

/* 雙星整合版（palace-plain.ts，2026-10-11）：英文跟條目一齊存，喺度併入翻譯表 */
for (const x of PAIR_PLAIN) {
  TM.sentences[x.summary] = x.en.summary;
  TM.sentences[x.watch] = x.en.watch;
  TM.sentences[x.life] = x.en.life;
}
for (const w of Object.values(JI_WATCH)) TM.sentences[w.zh] = w.en;

export type Rendered = { text: string; missing: string[] };

/*
 * 泛稱填實（branch.ts `fillSlots`，2026-10-12）：中文〔〕填咗盤上嘅星，英文〔〕跟住填同一批星。
 * 每句模板記低：比對式、英文模板、每個〔〕嘅原本泛稱（填唔到就照出）、前面嘅主星（「天同化祿」寫成「化祿」嗰陣用）。
 */
type Slot = { re: RegExp; en: string; phrases: string[]; owners: (string | undefined)[] };
const SLOTS: Slot[] = [];
const SLOT_HUA: Record<string, string> = { 祿: 'Abundance', 權: 'Authority', 科: 'Recognition', 忌: 'Obstruction' };
const SLOT_STARS = Object.keys(STAR_EN).sort((a, b) => b.length - a.length).join('|');
const SLOT_ITEM = `(?:(?:${SLOT_STARS})?化[祿權科忌]|${SLOT_STARS})`;
const SLOT_ITEMS = `${SLOT_ITEM}(?:(?:、|，又見)${SLOT_ITEM})*`;

function slotOf(zh: string, en: string): Slot {
  const phrases: string[] = [];
  const owners: (string | undefined)[] = [];
  const re = new RegExp(`(${FILL_VERB})?〔([^〕]+)〕`, 'g');
  for (let m = re.exec(zh); m; m = re.exec(zh)) {
    phrases.push(`${m[1] ?? ''}${m[2]}`);
    const before = zh.slice(0, m.index);
    owners.push(MAJOR.find((x) => before.endsWith(x) && !MAJOR.some((y) => before.slice(0, -x.length).endsWith(y))));
  }
  /*
   * 兩個〔〕貼住（「會到〔吉化〕又見〔輔佐吉星〕」）用任意字比對會切錯位，所以每格只准係
   * 原本泛稱，或者真星名／四化組成嘅清單。
   */
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = zh.split(re).filter((_x, i) => i % 3 === 0).map(esc);
  const body = parts.map((p, i) => (i < phrases.length ? `${p}(${esc(phrases[i]!)}|(?:${FILL_VERB})?${SLOT_ITEMS})` : p)).join('');
  return { re: new RegExp(`^${body}$`), en, phrases, owners };
}

/** 中文填咗嘅一截（「見左輔、天鉞」「化祿，又見左輔」）→ 英文星名清單；冇填（照泛稱）就 null */
function slotEn(seg: string, phrase: string, owner: string | undefined): string | null {
  if (seg === phrase) return null;
  const body = seg.replace(new RegExp(`^(${FILL_VERB})`), '');
  const items = body.split(/，又見|、/).filter(Boolean);
  const out: string[] = [];
  for (const it of items) {
    let m = /^化(\S)$/.exec(it);
    if (m && owner && SLOT_HUA[m[1]!]) { out.push(`its own ${SLOT_HUA[m[1]!]}`); continue; }
    m = /^(\S{2})化(\S)$/.exec(it);
    if (m && star(m[1]!) && SLOT_HUA[m[2]!]) { out.push(`${star(m[1]!)} in ${SLOT_HUA[m[2]!]}`); continue; }
    if (star(it)) { out.push(star(it)!); continue; }
    return null;
  }
  return listEn(out);
}

/*
 * 骨架章「會照的X」換成真宮名（branch.ts `placeHui`）：英文「in your trine／four directions／meeting your chart」
 * 換成「in your Wealth Palace」。宮名對唔到就照原句。
 */
type Hui = { re: RegExp; en: string };
const HUI: Hui[] = [];
const escRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function huiEn(h: Hui, m: RegExpExecArray): string {
  if (m[1] === '會照') return h.en;
  const names = m[1]!.split('和').map((x) => PALACE_EN[x.replace(/宮$/, '')]);
  if (names.some((x) => !x)) return h.en;
  return h.en.replace(/in your (?:trine|four directions)|meeting your chart/, `in your ${listEn(names as string[])}`);
}

function fillEn(slot: Slot, m: RegExpExecArray): string {
  let i = 0;
  const out = slot.en.replace(/〔([^〕]+)〕/g, (_all, generic: string) => {
    const k = i++;
    return slotEn(m[k + 1]!, slot.phrases[k]!, slot.owners[k]) ?? generic;
  });
  /* 「meets Lu and 〔helper stars〕」填完係「Lu and Zuo Fu and You Bi」：頭一個 and 改逗號 */
  return out.replace(/ and ([A-Z][a-z]+ [A-Z][a-z]+) and /, ', $1 and ');
}

/** 一句中文喺翻譯表嘅英文（冇就 null）。出處註（citation.ts）用嚟配英文句。 */
export function tmSentence(zh: string): string | null {
  return TM.sentences[zh] ?? null;
}

const sentencesOf = (t: string) => (t.match(/[^。！？]*[。！？]|[^。！？]+/g) ?? []).map((s) => s.trim()).filter(Boolean);

/* 原文分支（branch.ts）：一條規則可以有兩句，逐句對返英文 */
for (const t of BRANCH_TOPICS)
  for (const r of t.rules) {
    const zh = sentencesOf(r.text);
    const en = r.en.match(/[^.!?]+[.!?]+/g)?.map((x) => x.trim()) ?? [r.en];
    if (zh.length === en.length) zh.forEach((z, i) => (TM.sentences[z] = en[i]!));
    /* 泛稱填實（branch.ts `fillSlots`）：中文填咗盤上嘅星，英文照模板句 */
    if (zh.length === en.length) zh.forEach((z, i) => z.includes('〔') && SLOTS.push(slotOf(z, en[i]!)));
    if (zh.length === en.length)
      zh.forEach((z, i) => z.includes('會照的') && HUI.push({ re: new RegExp(`^${escRe(z).replace('會照的', '(會照|[^，。]+?宮)的')}$`), en: en[i]! }));
    else TM.sentences[r.text] = r.en;
    if (r.tail && r.tailEn) TM.sentences[r.tail] = r.tailEn;
  }

/** 一截（冇句號）：查 clauses */
function clause(zh: string, missing: string[]): string {
  const en = TM.clauses[zh];
  if (en) return en;
  missing.push(zh);
  return `〔${zh}〕`;
}

/** 「天同、天梁」→「Tian Tong and Tian Liang」 */
function starsList(zh: string, missing: string[]): string {
  return listEn(
    zh.split('、').map((s) => {
      const en = star(s);
      if (!en) missing.push(s);
      return en ?? `〔${s}〕`;
    }),
  );
}

/** 六煞各自改咗啲乜（一本書每粒煞只出現一次，所以唔會重複讀到）。 */
const SHA_ADDS: Record<string, string> = {
  火星: 'adding heat and speed',
  鈴星: 'adding a slow, hidden heat',
  擎羊: 'adding a blunt, cutting edge',
  陀羅: 'slowing things down so they linger',
  地空: 'adding a streak of the ideal over the practical',
  地劫: 'making gains harder to hold on to',
};

/* 2026-10-13 起嘅牽動開頭（link.ts LINK_HEADS）：自己一句 */
const LINK_HEAD_SENTENCES: Record<string, string> = {
  "你生活的其他部分，也帶著這一面的影子。": "Other parts of your life carry a shadow of this side too.",
  "這一面，在你生活的別處也有回響。": "This side of you echoes elsewhere in your life.",
  "換到別的場合，這一面也在。": "Move to another setting and this side of you is still there.",
  "這種性子，不會只停在一處。": "This temperament doesn't stay in one place.",
  "同一股力量，也走到了別的地方。": "The same force reaches other places too.",
  "這一面也和你生活裡的其他事情相連。": "This side of you is linked to other things in your life as well.",
  "同一種底色，也延伸到你生活的別處。": "The same pattern carries into other parts of your life.",
  "這一面不只出現在這裡。": "This side of you doesn't show up only here.",
  "別的方面，也和這一面連在一起。": "Other areas are tied to this side of you too.",
  "同樣的性子，在別處也看得到。": "The same temperament can be seen elsewhere too.",
  "這一面也牽動著你生活的其他部分。": "This side of you also pulls on other parts of your life.",
  "把眼光放遠一點，這一面還連著別處。": "Look a little further and this side of you connects to others.",
};

/* 牽動格開頭四款（link.ts 嘅 HEADS），英文各自一款。2026-10-05 起開頭唔再列一次範疇 */
const LINK_HEADS: [string, string][] = [
  ['同一種底色，延伸到盤上別處', 'The same pattern carries into other parts of the chart.'],
  ['放在整張盤看', 'Seen across the whole chart, the picture fills out.'],
  ['這一面也受其他幾宮牽動', 'Other parts of the chart pull on this side of you as well.'],
  ['在別的地方，這一面是這樣出現的', 'Elsewhere in the chart, this side of you shows up like this.'],
];

/** 牽動格最後一截：「家裡是天梁，見〈田宅〉那一章」／「家裡是天梁、朋輩之間是太陽，各自那一章另有細講」 */
function refPart(part: string, missing: string[]): string | null {
  const m = new RegExp(`^(.+)，(?:見〈([^〉]+)〉那一章|${LINK_REFS.join('|')})$`).exec(part);
  if (!m) return null;
  const pairs = m[1]!.split('、').map((x, i) => {
    const mm = /^(.+)是(\S{2})$/.exec(x);
    const on = mm ? AREA_ON_EN[mm[1]!] : undefined;
    const st = mm ? star(mm[2]!) : null;
    if (!on || !st) {
      missing.push(x);
      return `〔${x}〕`;
    }
    return `${i === 0 ? on : lowerFirst(on)} it is ${st}`;
  });
  if (!m[2]) return `${listEn(pairs)}, each covered in its own chapter.`;
  const p = PALACE_EN[m[2]];
  if (!p) missing.push(m[2]);
  return `${listEn(pairs)} (see the ${p ?? m[2]} chapter).`;
}

/**
 * 資料句，連組裝時改過頭嘅版本（assemble.ts `withSubject`）：
 *   「天同：不搶、不計較⋯。」→「Tian Tong: 」＋ 原句
 *   「天同改造的成本高⋯。」（原句「它改造的成本高⋯。」）→ 原句譯文，開頭 It 換星名
 */
function lookupSentence(s: string): string | null {
  const direct = TM.sentences[s];
  if (direct) return direct;
  for (const slot of SLOTS) {
    const m = slot.re.exec(s);
    if (m) return fillEn(slot, m);
  }
  for (const h of HUI) {
    const m = h.re.exec(s);
    if (m) return huiEn(h, m);
  }
  /* 結論段輪換過嘅轉接語（assemble.ts `WATCH_LEADS`）：翻譯表只存「要留意的是：」嗰款 */
  const lead = [...WATCH_LEADS.slice(1), ...OLD_WATCH_LEADS].find((l) => s.startsWith(l));
  if (lead) {
    const watched = TM.sentences[WATCH_LEADS[0] + s.slice(lead.length)];
    if (watched) return watched;
  }
  const pre = /^(\S{2})：(.+)$/.exec(s);
  if (pre && star(pre[1]!)) {
    const rest = TM.sentences[pre[2]!];
    /*
     * 「天機：…」中文係標籤寫法；英文寫成「Tian Ji: Roles that…」似筆記，唔似一句話（2026-10-14 · 英文在地化）。
     * 改做「With Tian Ji, roles that…」：句首細寫，除非開頭本身係星名（「Tian Tong …」兩個大寫字）。
     */
    if (rest) {
      const body = /^[A-Z][a-z]+ [A-Z]/.test(rest) || /^I\b/.test(rest) ? rest : rest.charAt(0).toLowerCase() + rest.slice(1);
      return `With ${star(pre[1]!)}, ${body}`;
    }
  }
  const head = s.slice(0, 2);
  if (star(head)) {
    const asIt = TM.sentences[`它${s.slice(2)}`];
    if (asIt) return asIt.replace(/^Its\b/, `${star(head)}'s`).replace(/^It\b/, star(head)!);
  }
  return null;
}

/** 程式砌出嚟嘅句。認唔到回 null。 */
function template(s: string, missing: string[]): string | null {
  const fact = factTemplate(s, missing);
  if (fact) return fact;
  const time = timeTemplate(s, missing, { tm: (zh) => TM.sentences[zh] ?? null, lower: lowerFirst, strip: stripOpener });
  if (time) return time;

  /* 這十年／這一年嘅建議段（daxian.ts adviceSegment；亦出現喺給你的話）：化祿嗰方面、化忌嗰方面、同一方面 */
  const adv = /^這(一年|十年)最值得做的事：(.+)。$/.exec(s);
  if (adv) {
    const year = adv[1] === '一年';
    const span = year ? 'this year' : 'these ten years';
    const areaEn = (zh: string) => {
      const en = AREA_EN[zh]?.[0];
      if (!en) missing.push(zh);
      return en ?? `〔${zh}〕`;
    };
    const parts = adv[2]!.split('；').map((part) => {
      let pm = /^(\S+?)方面是這(?:一年|十年)最順的地方，值得多花心思$/.exec(part);
      if (pm) return `when it comes to ${areaEn(pm[1]!)}, ${span} run${year ? 's' : ''} most smoothly, so it's worth giving it extra thought`;
      pm = /^(\S+?)方面的決定，多花一點時間再定，(急著要答覆的事，先放一晚|簽字、承諾之前多問一句)$/.exec(part);
      if (pm) {
        const tail = pm[2]!.startsWith('急') ? 'and let anything that needs an urgent answer wait a night' : 'and ask one more question before you sign or commit to anything';
        return `with decisions about ${areaEn(pm[1]!)}, take a little more time, ${tail}`;
      }
      if (part === '這方面有得著也有牽掛，進一步之前，先想好退路') return 'it brings gains and worries alike, so before you go further, work out your way back';
      missing.push(part);
      return `〔${part}〕`;
    });
    return `The most worthwhile thing to do ${year ? 'this year' : 'in these ten years'}: ${parts.join('; ')}.`;
  }

  /* 給你的話：「你可以倚仗的：一、⋯。」「二、⋯。」「你要記住的：一、⋯。」（epilogue.ts） */
  const li = /^(?:(你可以倚仗的|你要記住的)：)?([一二三])、(.+)$/.exec(s);
  if (li) {
    const item = listItem(li[3]!, missing);
    if (item === null) return null;
    const nth = { 一: 'first', 二: 'second', 三: 'third' }[li[2]!]!;
    const head = li[1] === '你可以倚仗的' ? 'What you can rely on: ' : li[1] === '你要記住的' ? 'What to keep in mind: ' : '';
    return head ? `${head}${nth}, ${item}` : `${cap(nth)}, ${item}`;
  }

  /* 開場事實：你的命宮坐天同、天梁。 */
  let m = /^你的(\S+?)坐(.+)。$/.exec(s);
  if (m && PALACE_EN[m[1]!.replace(/宮$/, '')] !== undefined) {
    return `Your ${PALACE_EN[m[1]!.replace(/宮$/, '')]} is shaped by ${starsList(m[2]!, missing)}.`;
  }
  if (m && PALACE_EN[m[1]!]) return `Your ${PALACE_EN[m[1]!]} is shaped by ${starsList(m[2]!, missing)}.`;

  /* 空宮（frame.ts emptyPalaceLine） */
  if (s === '此宮無主星，對宮亦無主星，兩宮同看。') return 'Neither this palace nor the one opposite holds a major star, so the two are read together.';
  m = /^此宮無主星，借對宮(.+)參看。$/.exec(s);
  if (m) return `This palace holds no major star of its own, so it is read through ${starsList(m[1]!, missing)} in the opposite palace.`;
  /* 2026-10-13 起：「你的僕役宮沒有主星，借對面兄弟宮的太陽、太陰來讀。」 */
  m = /^你的(\S+?宮)沒有主星，借對面(\S+?宮)的(.+)來讀。$/.exec(s);
  const pe = (x: string) => PALACE_EN[x] ?? PALACE_EN[x.replace(/宮$/, '')];
  if (m && pe(m[1]!) && pe(m[2]!)) return `Your ${pe(m[1]!)} holds no major star of its own, so it is read through ${starsList(m[3]!, missing)} in the ${pe(m[2]!)} opposite.`;

  /* 擾動：同宮還有火星：⋯。／還有鈴星：⋯。
   * 睇稿指南第 13 節：煞星唔好得一個標籤 —— 先講佢改咗啲乜，後面嗰截（逐宮寫）講落地點樣。 */
  /* 2026-10-13 起：「加上擎羊同宮，⋯。」「再加上陀羅，⋯。」—— 同舊講法一樣譯 */
  const sha = /^(?:加上(\S{2})同宮|再加上(\S{2}))，(.+)。$/.exec(s);
  m = sha ? ['', sha[1] ? '同宮還有' : '還有', (sha[1] ?? sha[2])!, sha[3]!] as unknown as RegExpExecArray : /^(同宮還有|還有)(\S{2})：(.+)。$/.exec(s);
  if (m) {
    const name = starFirst(m[2]!);
    if (!name) missing.push(m[2]!);
    const body = clause(m[3]!, missing);
    const adds = SHA_ADDS[m[2]!];
    if (!adds) return m[1] === '同宮還有' ? `Also in this palace is ${name}: ${body}.` : `And ${name}: ${body}.`;
    return m[1] === '同宮還有' ? `${name} also sits here, ${adds}: ${body}.` : `${name} is here too, ${adds}: ${body}.`;
  }

  if (LINK_HEAD_SENTENCES[s]) return LINK_HEAD_SENTENCES[s]!;
  /* 2026-10-13 起：牽動嘅幾截自己一句：「感情上，⋯；心境上，⋯。」 */
  if (s.endsWith('。') && !s.includes('：')) {
    const ps = s.slice(0, -1).split('；');
    const done = ps.map((part) => {
      const c = part.indexOf('，');
      const on = c > 0 ? AREA_ON_EN[part.slice(0, c)] : undefined;
      return on ? `${on}, ${lowerFirst(clause(part.slice(c + 1), []))}` : null;
    });
    if (done.every(Boolean) && ps.every((part) => !/〔/.test(clause(part.slice(part.indexOf('，') + 1), [])))) {
      return done.map((d) => `${d}.`).join(' ');
    }
  }
  /* 牽動：三個宮都講過，淨係得指返句（冇開頭） */
  if (s.endsWith('。') && !s.includes('：')) {
    const ref = refPart(s.slice(0, -1), missing);
    if (ref) return cap(ref);
  }

  /* 牽動：開頭：在外時，⋯；工作上，⋯；錢方面，⋯。 */
  const colon = s.indexOf('：');
  if (colon > 0 && s.endsWith('。')) {
    const head = s.slice(0, colon);
    const h = LINK_HEADS.find(([zh]) => zh === head);
    if (h) {
      const parts = s
        .slice(colon + 1, -1)
        .split('；')
        .map((part) => {
          const ref = refPart(part, missing);
          if (ref) return ref;
          const c = part.indexOf('，');
          const on = AREA_ON_EN[part.slice(0, c)];
          if (c < 0 || !on) {
            missing.push(part);
            return `〔${part}〕`;
          }
          return `${on}, ${lowerFirst(clause(part.slice(c + 1), missing))}.`;
        });
      return [h[1], ...parts].join(' ');
    }
  }
  return null;
}

/**
 * 給你的話嘅一項：書入面講過嘅一句（結論、長處、或者剝走「要留意的是：」嘅提醒），
 * 前面可能加咗方面（「工作上，」）。英文用返原句譯文，剝走轉接語，細楷開頭接喺「first, 」後面。
 */
function listItem(zh: string, missing: string[]): string | null {
  let area = '';
  let body = zh;
  const c = zh.indexOf('，');
  if (c > 0 && AREA_ON_EN[zh.slice(0, c)]) {
    area = `${lowerFirst(AREA_ON_EN[zh.slice(0, c)]!)}, `;
    body = zh.slice(c + 1);
  }
  const direct = TM.sentences[body];
  const watched = TM.sentences[`要留意的是：${body}`];
  const en = direct ?? (watched ? stripOpener(watched) : null);
  if (!en) {
    missing.push(zh);
    return null;
  }
  /* 原句本身已經以方面開頭（「At work you're⋯」）就唔再加 */
  if (area && en.toLowerCase().startsWith(area.slice(0, -2).toLowerCase())) return lowerFirst(en);
  return `${area}${lowerFirst(en)}`;
}

/** 「Keep in mind that X」→「X」；「Keep in mind not to X」→「don't X」；其他（Keep in mind which⋯）照留 */
function stripOpener(en: string): string {
  const notTo = /^Keep in mind not to (.+)$/.exec(en);
  if (notTo) return `don't ${notTo[1]}`;
  const m = /^(?:The catch: |The cost: |The risk is that |Keep in mind that,? |Keep in mind: |The catch is that |The trade-off is that |But |Watch that,? )(.+)$/.exec(en);
  return m ? m[1]! : en;
}

/* 句中嘅星名、專有名詞唔好細楷 */
const lowerFirst = (s: string) => (/^(Tian|Tai|Zi|Wu|Lian|Tan|Ju|Qi|Po|Huo|Ling|Di|Qing|Tuo|Lu|Zuo|You Bi|Wen)\b/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

/*
 * 轉接語成本書輪流用（2026-10-05，睇稿指南第 5 節）
 *
 * 「要留意的是」譯做 The catch／Watch that／Keep in mind that⋯，每句固定一款，
 * 一本書十幾句就會見到同一個開頭出好多次。翻譯表照存一款；呢度喺砌書嗰陣
 * 剝走原本嗰款，換做成本書用得最少、而且唔同上一次嘅一款。後面嗰截句唔郁。
 */
const OPENER = /^(The catch: |The cost: |The risk is that |Watch that |Keep in mind that |Keep in mind: )(.+)$/;
const VARIANTS = [
  'The catch is that ',
  'The trade-off is that ',
  'The other side of this is that ',
  'What complicates this is that ',
  'Keep in mind that ',
  'The risk is that ',
] as const;
/* 2026-10-14：「Watch that」唔再輪換 —— 後面接祈使句（Stay too long⋯）就讀唔通 */
/* 唔用「But」：翻譯表本身好多句已經用 But 開頭（生活場景等），再輪多一個就會連續兩句 But。
   唔用「The difficulty is that」：留畀翻譯表嗰八句「難處是⋯」，輪換用咗會同下一章撞款 */

/** 一本書嘅英文狀態：轉接語用咗幾多次、上一次用咗邊款。 */
export type BookState = { used: Map<string, number>; last: string | null };
export const newBookState = (): BookState => ({ used: new Map(), last: null });

/**
 * 輪換一句嘅轉接語。`avoid` = 呢章翻譯表本身已經用咗嘅開頭（例如基塊句「The difficulty is that⋯」）——
 * 輪換唔揀佢哋，唔係前後兩句會撞款。
 */
function rotateOpener(sentence: string, st: BookState, avoid: ReadonlySet<string>): string {
  const m = OPENER.exec(sentence);
  if (!m) {
    /* 翻譯表本身已經用咗某一款開頭：照計數 */
    const natural = VARIANTS.find((v) => sentence.startsWith(v));
    if (natural) {
      st.used.set(natural, (st.used.get(natural) ?? 0) + 1);
      st.last = natural;
    }
    return sentence;
  }
  const clause = m[2]!;
  const pool = VARIANTS.filter((v) => v !== st.last && !avoid.has(v));
  const pick = [...pool].sort((a, b) => (st.used.get(a) ?? 0) - (st.used.get(b) ?? 0))[0]!;
  st.used.set(pick, (st.used.get(pick) ?? 0) + 1);
  st.last = pick;
  const body = clause.startsWith(',') ? clause : lowerFirst(clause);
  return clause.startsWith(',') ? `${pick.trimEnd()}${body}` : `${pick}${body}`;
}

/** 一段譯成英文句（未輪換轉接語）。 */
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

function paragraphSentences(zh: string, missing: string[]): string[] {
  return joinBrackets(sentencesOf(zh)).map((s) => lookupSentence(s) ?? template(s, missing) ?? (missing.push(s), `〔${s}〕`));
}

/** 一段（可以幾句）。單獨用嗰陣當呢段自己一本書。 */
export function renderParagraph(zh: string): Rendered {
  return renderChapter(zh);
}

/*
 * 主星第一次出現加意思（2026-10-05，睇稿回饋：英文讀者唔知 Tian Tong 係乜）：
 * 「Tian Tong」→「Tian Tong (the Contented)」，一章一次。輔星煞星喺模板度已經加咗。
 */
const MAJORS = Object.values(STAR_EN).slice(0, 14);
function glossFirst(text: string): string {
  let out = text;
  for (const { pinyin, gloss } of MAJORS) {
    /* 唔加喺「Tian Ji's」嗰種所有格度：「Tian Ji (the Strategist)'s」好難讀，留畀下一次出現 */
    const re = new RegExp(`\\b${pinyin}\\b(?! \\()(?!'s)`);
    if (re.test(out)) out = out.replace(re, `${pinyin} (${gloss})`);
  }
  return out;
}

/**
 * 成章（段落用空行分）。砌成本書就由頭到尾傳同一個 `st`，轉接語先會輪得開。
 * 兩步：先譯晒成章，搵出呢章本身用咗嘅開頭；再輪換，避開佢哋。
 */
const PARA = String.fromCharCode(10, 10);

export function renderChapter(zh: string, st: BookState = newBookState()): Rendered {
  const r = renderParagraphs(zh.split(PARA), st);
  return { text: r.paras.join(PARA), missing: r.missing };
}

/**
 * 逐段譯，段數同輸入一樣（網站要靠段數對返每段嘅格名，見 apps/web `lib/suidu.ts` paragraphs()）。
 * 主星第一次出現加意思係成章計，所以先合埋做一次，再切返開。
 */
export function renderParagraphs(zhParas: readonly string[], st: BookState = newBookState()): { paras: string[]; missing: string[] } {
  const missing: string[] = [];
  const paras = zhParas.map((p) => paragraphSentences(p, missing));
  const avoid = new Set(paras.flat().flatMap((en) => (OPENER.test(en) ? [] : VARIANTS.filter((v) => en.startsWith(v)))));
  const SEP = String.fromCharCode(0);
  const joined = glossFirst(paras.map((ss) => ss.map((en) => rotateOpener(en, st, avoid)).join(' ')).join(SEP));
  return { paras: joined.split(SEP), missing };
}

/** 翻譯表入面所有英文（畀英文 lint 掃） */
export const allEnglish = (): string[] => [...Object.values(TM.sentences), ...Object.values(TM.clauses)];
