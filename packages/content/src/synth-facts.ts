import { BRANCH_EN, PALACE_EN, STAR_EN, listEn } from './en/terms';
import { PALACE_JA, STAR_JA, listJa } from './ja/terms';

/*
 * 綜合判讀層證據句（「那一年的財帛宮巨門坐午宮，與煞曜同度。」）英日譯（2026-11-10，Issac：英日版跟返新版本）。
 *
 * 證據句由卡嘅 because 經 concrete() 砌成，星名宮位每盤唔同，翻譯表做唔晒；呢度按短語規則拆句再拼。
 * 格式係盤面註記：「That year's Wealth Palace: Ju Men in Wu, with harsh stars in the same palace.」，唔使處理時態。
 * 認唔到任何一截就成句回 null（呼叫方略過呢句，判斷同例子照出），唔好估。
 */
type Tr = { en: string; ja: string };
const STARS = Object.keys(STAR_EN).sort((a, b) => b.length - a.length).join('|');
const S = `(?:${STARS})`;
const L = `(${S}(?:、${S})*)`; // 星名清單
const B = '([子丑寅卯辰巳午未申酉戌亥])';
const H = '([祿權科忌])';
const PAL: Record<string, string> = { 命: '命宮', 兄弟: '兄弟', 夫妻: '夫妻', 子女: '子女', 財帛: '財帛', 疾厄: '疾厄', 遷移: '遷移', 交友: '僕役', 僕役: '僕役', 事業: '官祿', 官祿: '官祿', 田宅: '田宅', 福德: '福德', 父母: '父母' };
const P = `(${Object.keys(PAL).sort((a, b) => b.length - a.length).join('|')})宮`;
const HUA_EN: Record<string, string> = { 祿: 'Abundance', 權: 'Authority', 科: 'Recognition', 忌: 'Obstruction' };
const HUA_JA: Record<string, string> = { 祿: '化禄', 權: '化権', 科: '化科', 忌: '化忌' };
const GROUP: Record<string, Tr> = {
  煞曜: { en: 'harsh stars', ja: '煞星' }, 吉曜: { en: 'helpful stars', ja: '吉星' }, 輔佐吉曜: { en: 'supporting helpful stars', ja: '補佐の吉星' },
  吉化: { en: 'favourable transformations', ja: '吉化' }, 化忌: { en: 'an Obstruction', ja: '化忌' }, 祿馬: { en: 'Lu Cun or an Abundance with Tian Ma', ja: '禄馬' },
};

const sEn = (zh: string) => STAR_EN[zh]?.pinyin ?? null;
const sJa = (zh: string) => STAR_JA[zh]?.kanji ?? null;
const palEn = (zh: string) => PALACE_EN[PAL[zh]!] ?? null;
const palJa = (zh: string) => PALACE_JA[PAL[zh]!] ?? null;
const bEn = (b: string) => BRANCH_EN[b]!;
/** 星名清單，或者「煞曜、吉曜」呢類組名 */
function list(zh: string): Tr | null {
  const or = /或/.test(zh);
  const ALL = new RegExp(S, 'g');
  // 「武曲七殺」冇分隔都拆得開
  const parts = zh.split(/、|及|和|與|或/).filter(Boolean).flatMap((p) => (GROUP[p] || STAR_EN[p] || /化/.test(p) || p.match(ALL)?.join('') !== p ? [p] : p.match(ALL)!));
  const en: string[] = [], ja: string[] = [];
  for (const p of parts) {
    const g = GROUP[p];
    if (g) { en.push(g.en); ja.push(g.ja); continue; }
    const hua = /^(.+?)(本命)?化([祿權科忌])$/.exec(p);
    const huaOf = /^(本命)?化([祿權科忌])的(.+)$/.exec(p); // 化忌的天機
    const [st, natal, h] = hua ? [hua[1]!, hua[2], hua[3]!] : huaOf ? [huaOf[3]!, huaOf[1], huaOf[2]!] : [p, undefined, undefined];
    const e = sEn(st), j = sJa(st);
    if (!e || !j) return null;
    if (h) { en.push(`${e} in ${HUA_EN[h]}${natal ? ' (natal)' : ''}`); ja.push(`${natal ? '本命' : ''}${HUA_JA[h]}の${j}`); continue; }
    en.push(e); ja.push(j);
  }
  if (!parts.length) return null;
  return or ? { en: en.length > 1 ? `${en.slice(0, -1).join(', ')} or ${en.at(-1)}` : en[0]!, ja: ja.join('または') } : { en: listEn(en), ja: listJa(ja) };
}
const huaTail = (natal: string | undefined, h: string): Tr => ({ en: `in ${HUA_EN[h]}${natal ? ' (natal)' : ''}`, ja: `${natal ? '本命' : ''}${HUA_JA[h]}` });

/** 首截（宮名後面）：講宮內有乜 */
const HEAD: [RegExp, (m: RegExpExecArray) => Tr | null][] = [
  [new RegExp(`^(?:有|由)?${L}(?:坐守|獨坐|同守)?$`), (m) => { const l = list(m[1]!); return l && { en: l.en, ja: `${l.ja}が入る` }; }],
  [new RegExp(`^(?:有|由)?${L}(?:坐|同坐)${B}宮$`), (m) => { const l = list(m[1]!); return l && { en: `${l.en} in ${bEn(m[2]!)}`, ja: `${l.ja}が${m[2]}宮に入る` }; }],
  [new RegExp(`^${L}獨坐${B}宮$`), (m) => { const l = list(m[1]!); return l && { en: `${l.en} alone in ${bEn(m[2]!)}`, ja: `${l.ja}が${m[2]}宮に単独で入る` }; }],
  [new RegExp(`^在${B}宮$`), (m) => ({ en: `in ${bEn(m[1]!)}`, ja: `${m[1]}宮にある` })],
  [new RegExp(`^(?:有|由)?${L}(?:與|、)${L}(?:同度|同宮|同會)$`), (m) => { const a = list(m[1]!), b = list(m[2]!); return a && b && { en: `${a.en} with ${b.en}`, ja: `${a.ja}と${b.ja}が同宮` }; }],
  [new RegExp(`^${L}(?:與|、)${L}同坐${B}宮$`), (m) => { const a = list(m[1]!), b = list(m[2]!); return a && b && { en: `${a.en} with ${b.en} in ${bEn(m[3]!)}`, ja: `${a.ja}と${b.ja}が${m[3]}宮に同宮` }; }],
  [new RegExp(`^${L}與${L}相對$`), (m) => { const a = list(m[1]!), b = list(m[2]!); return a && b && { en: `${a.en}, facing ${b.en} in the opposite palace`, ja: `${a.ja}が入り、向かいの宮の${b.ja}と向き合う` }; }],
  [new RegExp(`^${L}(?:會照|會見|在三方四正會見)(.+)$`), (m) => { const a = list(m[1]!), b = list(m[2]!.replace(/^(.+?)(本命)?化([祿權科忌])$/, '$1$2化$3')); return a && b && { en: `${a.en}, linked with ${b.en}`, ja: `${a.ja}に${b.ja}が会照` }; }],
  [new RegExp(`^(?:有)?(${S})(本命)?化${H}$`), (m) => { const t = huaTail(m[2], m[3]!); return { en: `${sEn(m[1]!)} ${t.en}`, ja: `${sJa(m[1]!)}${t.ja}` }; }],
  [new RegExp(`^(${S})化${H}、化${H}$`), (m) => ({ en: `${sEn(m[1]!)} in ${HUA_EN[m[2]!]} and ${HUA_EN[m[3]!]}`, ja: `${sJa(m[1]!)}${HUA_JA[m[2]!]}・${HUA_JA[m[3]!]}` })],
  [new RegExp(`^(${S})(?:坐${B}宮)?落陷$`), (m) => ({ en: `${sEn(m[1]!)}${m[2] ? ` in ${bEn(m[2])}` : ''}, at its weakest`, ja: `${sJa(m[1]!)}${m[2] ? `が${m[2]}宮に入り` : 'が'}陥る` })],
  [new RegExp(`^(${S})入廟$`), (m) => ({ en: `${sEn(m[1]!)}, at its strongest`, ja: `${sJa(m[1]!)}が廟に入る` })],
  [new RegExp(`^(${S})得${L}夾宮$`), (m) => { const b = list(m[2]!); return b && { en: `${sEn(m[1]!)}, flanked by ${b.en}`, ja: `${sJa(m[1]!)}を${b.ja}が挟む` }; }],
  [new RegExp(`^(${S})沒有吉化$`), (m) => ({ en: `${sEn(m[1]!)}, with no favourable transformation`, ja: `${sJa(m[1]!)}に吉化なし` })],
  [new RegExp(`^(${S})三方四正見(.+)$`), (m) => { const b = list(m[2]!); return b && { en: `${sEn(m[1]!)}, with ${b.en} in its four directions`, ja: `${sJa(m[1]!)}の三方四正に${b.ja}` }; }],
];

/** 之後各截：附加條件 */
const MOD: [RegExp, (m: RegExpExecArray) => Tr | null][] = [
  [new RegExp(`^(並|另有|或)?與?(.+?)(?:同度|同宮)$`), (m) => { if (m[2]!.startsWith('沒有')) return null; const b = list(m[2]!.replace(/^與/, '')); return b && { en: `${m[1] === '或' ? 'or ' : ''}with ${b.en} in the same palace`, ja: `${m[1] === '或' ? 'または' : ''}${b.ja}と同宮` }; }],
  [new RegExp(`^沒有(.+?)(?:或化科)?同度$`), (m) => { const b = list(m[1]!); return b && { en: `with no ${b.en.replace(' and ', ' or ')} in the same palace`, ja: `${b.ja}とは同宮しない` }; }],
  [new RegExp(`^(?:與對宮的|與廟旺的|與|${S}又與)?(.+?)相對$|^對宮(?:為|是)(.+)$`), (m) => { const z = m[1] ?? m[2]!; const b = list(z); return b && { en: `facing ${/廟旺/.test(m[0]) ? 'a strong ' : ''}${b.en} in the opposite palace`, ja: `向かいの宮の${/廟旺/.test(m[0]) ? '廟旺の' : ''}${b.ja}と向き合う` }; }],
  [new RegExp(`^三方四正(?:又|雖|同時)?見(.+)$`), (m) => { const b = list(m[1]!.replace(/或化祿$/, '')); return b && { en: `with ${b.en}${/或化祿$/.test(m[1]!) ? ' or an Abundance' : ''} in its four directions`, ja: `三方四正に${b.ja}${/或化祿$/.test(m[1]!) ? 'または化禄' : ''}` }; }],
  [new RegExp(`^三方四正(?:不見|沒有)(.+?)(?:照會)?$`), (m) => { const b = list(m[1]!); return b && { en: `with no ${b.en.replace(' and ', ' or ')} in its four directions`, ja: `三方四正に${b.ja}なし` }; }],
  [/^三方四正吉曜與煞曜交集$/, () => ({ en: 'with helpful and harsh stars mixed in its four directions', ja: '三方四正に吉星と煞星が交じる' })],
  [new RegExp(`^(?:並|也|又|同時|而且)?(?:會見|會照|會到|會|見|又見)(.+)$`), (m) => { const b = list(m[1]!.replace(/化([祿權科忌])、化([祿權科忌])$/, '化$1')); return b && { en: `meeting ${b.en}`, ja: `${b.ja}と会う` }; }],
  [new RegExp(`^(${S})(本命)?化${H}$`), (m) => { const t = huaTail(m[2], m[3]!); return { en: `${sEn(m[1]!)} ${t.en}`, ja: `${sJa(m[1]!)}${t.ja}` }; }],
  [new RegExp(`^並且本命化${H}$`), (m) => ({ en: `in ${HUA_EN[m[1]!]} (natal)`, ja: `本命${HUA_JA[m[1]!]}` })],
  [new RegExp(`^宮位不在${B}、${B}$`), (m) => ({ en: `not in ${bEn(m[1]!)} or ${bEn(m[2]!)}`, ja: `${m[1]}・${m[2]}宮ではない` })],
  [new RegExp(`^是(${S})落陷的位置$`), (m) => ({ en: `where ${sEn(m[1]!)} is at its weakest`, ja: `${sJa(m[1]!)}が陥る位置` })],
  [new RegExp(`^(${S})落陷$`), (m) => ({ en: `${sEn(m[1]!)} at its weakest`, ja: `${sJa(m[1]!)}が陥る` })],
  [new RegExp(`^(?:而且)?(${S})也?沒有化${H}$`), (m) => ({ en: `${sEn(m[1]!)} not in ${HUA_EN[m[2]!]}`, ja: `${sJa(m[1]!)}は${HUA_JA[m[2]!]}しない` })],
  [new RegExp(`^(${S})三方四正見(.+)$`), (m) => { const b = list(m[2]!); return b && { en: `${sEn(m[1]!)} with ${b.en} in its four directions`, ja: `${sJa(m[1]!)}の三方四正に${b.ja}` }; }],
  [new RegExp(`^或${L}化${H}$`), (m) => { const b = list(m[1]!); return b && { en: `or ${b.en} in ${HUA_EN[m[2]!]}`, ja: `または${b.ja}${HUA_JA[m[2]!]}` }; }],
  [/^屬(落陷|入廟)$/, (m) => (m[1] === '落陷' ? { en: 'at its weakest', ja: '陥る' } : { en: 'at its strongest', ja: '廟に入る' })],
  [/^不見(.+)$/, (m) => { const b = list(m[1]!); return b && { en: `with no ${b.en.replace(' and ', ' or ')}`, ja: `${b.ja}を見ない` }; }],
  [new RegExp(`^對宮${L}$`), (m) => { const b = list(m[1]!); return b && { en: `facing ${b.en} in the opposite palace`, ja: `向かいの宮の${b.ja}と向き合う` }; }],
  [new RegExp(`^由${L}(?:與|、)${L}同度$`), (m) => { const a = list(m[1]!), b = list(m[2]!); return a && b && { en: `held by ${a.en} with ${b.en}`, ja: `${a.ja}と${b.ja}が同宮` }; }],
  [/^三方四正(?:會見|會)(.+)$/, (m) => { const b = list(m[1]!); return b && { en: `with ${b.en} in its four directions`, ja: `三方四正に${b.ja}` }; }],
  [/^形成祿馬配合$/, () => ({ en: 'forming the Abundance–Horse pairing', ja: '禄馬の組み合わせとなる' })],
  [new RegExp(`^落在${B}宮$`), (m) => ({ en: `in ${bEn(m[1]!)}`, ja: `${m[1]}宮に入る` })],
  [new RegExp(`^(${S})有吉化$`), (m) => ({ en: `${sEn(m[1]!)} with a favourable transformation`, ja: `${sJa(m[1]!)}に吉化あり` })],
];

function piece(rules: typeof HEAD, zh: string): Tr | null {
  for (const [re, f] of rules) { const m = re.exec(zh); const t = m && f(m); if (t) return t; }
  // 「而天同本命化忌」「反而會吉化」「並有火星同度」：連接詞唔影響意思
  const bare = zh.replace(/^(?:反而|而且|而|並有|且)/, '');
  return bare !== zh ? piece(rules, bare) : null;
}

/** 整句（唔係「X的Y宮…」格式）嘅規則 */
const WHOLE: [RegExp, (m: RegExpExecArray, yr: Tr) => Tr | null][] = [
  /* 那一年文昌化科，落在午宮，是文昌落陷的位置 */
  [new RegExp(`^(${S})化${H}((?:，[^，]+)+)$`), (m, yr) => {
    const mods: Tr[] = [];
    for (const x of m[3]!.slice(1).split('，')) { const t = piece(MOD, x); if (!t) return null; mods.push(t); }
    return { en: `${yr.en}: ${sEn(m[1]!)} in ${HUA_EN[m[2]!]}, ${mods.map((t) => t.en).join(', ')}.`, ja: `${yr.ja}：${sJa(m[1]!)}${HUA_JA[m[2]!]}、${mods.map((t) => t.ja).join('、')}。` };
  }],
  [new RegExp(`^(${S})化${H}，與這十年(大限)?的(${S})(化祿)?(同宮|相對)，成「疊祿」$`), (m, yr) => ({
    en: `${yr.en}, ${sEn(m[1]!)} turned to ${HUA_EN[m[2]!]}, ${m[6] === '同宮' ? 'in the same palace as' : 'facing'} ${m[5] ? `this decade's ${sEn(m[4]!)} in Abundance` : `this decade's ${sEn(m[4]!)}`}: a "stacked Abundance".`,
    ja: `${yr.ja}は${sJa(m[1]!)}が${HUA_JA[m[2]!]}し、この十年の${sJa(m[4]!)}${m[5] ? '化禄' : ''}と${m[6] === '同宮' ? '同宮' : '向き合い'}、「畳禄」となります。` })],
  [new RegExp(`^(${S})化祿落在${B}宮，屬子午卯酉四個「弱地」之一$`), (m, yr) => ({
    en: `${yr.en}, ${sEn(m[1]!)}'s Abundance fell in ${bEn(m[2]!)}, one of the four "weak positions" (Zi, Wu, Mao, You).`,
    ja: `${yr.ja}の${sJa(m[1]!)}化禄は${m[2]}宮に落ち、子午卯酉の四つの「弱地」のひとつです。` })],
  [new RegExp(`^(${S})(卻)?化${H}$`), (m, yr) => ({ en: `${yr.en}, ${sEn(m[1]!)} turned to ${HUA_EN[m[3]!]}.`, ja: `${yr.ja}は${sJa(m[1]!)}が${HUA_JA[m[3]!]}します。` })],
];

/** 一句證據句 → 英日；認唔到 null */
export function synthFact(zh: string): Tr | null {
  if (/。./.test(zh)) {
    const parts = zh.split(/(?<=。)/).filter(Boolean).map(synthFact);
    return parts.every(Boolean) ? { en: parts.map((p) => p!.en).join(' '), ja: parts.map((p) => p!.ja).join('') } : null;
  }
  const s = zh.replace(/。$/, '');
  let m: RegExpExecArray | null;
  const YR: Record<string, Tr> = { 那一年: { en: 'That year', ja: 'その年' }, 今年: { en: 'This year', ja: '今年' } };
  /* 你本命X化忌，那一年X化祿 */
  if ((m = new RegExp(`^你本命(${S})化${H}，(那一年|今年)(${S})化${H}$`).exec(s)))
    return { en: `In your birth chart ${sEn(m[1]!)} is in ${HUA_EN[m[2]!]}; ${YR[m[3]!]!.en.toLowerCase()} ${sEn(m[4]!)} turned to ${HUA_EN[m[5]!]}.`, ja: `本命では${sJa(m[1]!)}${HUA_JA[m[2]!]}、${YR[m[3]!]!.ja}は${sJa(m[4]!)}${HUA_JA[m[5]!]}です。` };
  if ((m = new RegExp(`^這十年(${S})化${H}，(那一年|今年)(${S})卻化${H}$`).exec(s)))
    return { en: `This decade ${sEn(m[1]!)} is in ${HUA_EN[m[2]!]}, but ${YR[m[3]!]!.en.toLowerCase()} ${sEn(m[4]!)} turned to ${HUA_EN[m[5]!]}.`, ja: `この十年は${sJa(m[1]!)}${HUA_JA[m[2]!]}ですが、${YR[m[3]!]!.ja}は${sJa(m[4]!)}が${HUA_JA[m[5]!]}します。` };
  if ((m = new RegExp(`^你的命宮是${L}(?:獨)?坐${B}${B}；(那一年|今年)的命宮走到(${S})獨坐的宮位$`).exec(s))) {
    const l = list(m[1]!); if (!l) return null;
    return { en: `Your Life Palace holds ${l.en} in ${bEn(m[2]!)} or ${bEn(m[3]!)}; ${YR[m[4]!]!.en.toLowerCase()}'s Life Palace moved to a palace held by ${sEn(m[5]!)} alone.`, ja: `あなたの命宮は${m[2]}${m[3]}の${l.ja}で、${YR[m[4]!]!.ja}の命宮は${sJa(m[5]!)}が単独で入る宮に巡りました。` };
  }
  if ((m = new RegExp(`^這十年(${S})化${H}$`).exec(s))) return { en: `This decade, ${sEn(m[1]!)} turns to ${HUA_EN[m[2]!]}.`, ja: `この十年は${sJa(m[1]!)}${HUA_JA[m[2]!]}です。` };
  if ((m = new RegExp(`^(${S})化${H}是本命帶來的$`).exec(s))) return { en: `${sEn(m[1]!)}'s ${HUA_EN[m[2]!]} comes from your birth chart.`, ja: `${sJa(m[1]!)}の${HUA_JA[m[2]!]}は本命によるものです。` };
  if ((m = new RegExp(`^這一點看的是(那一年|今年)${P}對宮（(?:那一年|今年)的${P}）的${L}(?:(本命)?化${H})?((?:，[^，]+)*)$`).exec(s))) {
    const l = list(m[4]!); if (!l) return null;
    const t = m[6] ? huaTail(m[5], m[6]) : null;
    const mods: Tr[] = [];
    for (const x of m[7]!.split('，').filter(Boolean)) { const y = piece(MOD, x); if (!y) return null; mods.push(y); }
    return { en: `This point reads ${l.en}${t ? ` ${t.en}` : ''} in ${YR[m[1]!]!.en.toLowerCase()}'s ${palEn(m[3]!)}, opposite the ${palEn(m[2]!)}${mods.map((y) => `, ${y.en}`).join('')}.`, ja: `この点は、${YR[m[1]!]!.ja}の${palJa(m[2]!)}の向かい（${palJa(m[3]!)}）の${l.ja}${t ? t.ja : ''}を見ています${mods.length ? `（${mods.map((y) => y.ja).join('、')}）` : ''}。` };
  }
  const yr = /^(那一年|今年)/.exec(s);
  if (yr) {
    const rest = s.slice(yr[1]!.length);
    for (const [re, f] of [...WHOLE.slice(1), WHOLE[0]!]) { const w = re.exec(rest); const t = w && f(w, YR[yr[1]!]!); if (t) return t; }
  }
  /* X的Y宮：首截 + 附加 */
  const head = new RegExp(`^(那一年|今年|你)的${P}(.*)$`).exec(s);
  if (!head) return null;
  const subj = head[1] === '你' ? { en: `Your ${palEn(head[2]!)}`, ja: `あなたの${palJa(head[2]!)}` } : { en: `${YR[head[1]!]!.en}'s ${palEn(head[2]!)}`, ja: `${YR[head[1]!]!.ja}の${palJa(head[2]!)}` };
  if (!palEn(head[2]!) || !palJa(head[2]!)) return null;
  const [first, ...more] = head[3]!.split('，');
  const h = piece(HEAD, first!);
  if (!h) return null;
  const mods: Tr[] = [];
  for (const x of more) { const t = piece(MOD, x); if (!t) return null; mods.push(t); }
  // 日文：後面仲有附加條件，首截用連用形（入る→入り）
  const hj = mods.length ? h.ja.replace(/(入|陥)る$/, '$1り') : h.ja;
  return { en: `${subj.en}: ${[h.en, ...mods.map((t) => t.en)].join(', ')}.`, ja: `${subj.ja}：${[hj, ...mods.map((t) => t.ja)].join('、')}。` };
}

/* 會隨盤變嘅回看判斷句（今年卡 {star}／{palaceTopic}／{what}）：其餘判斷句由 en/ja synth.json 逐句對照 */
const TOPIC_TR: Record<string, Tr> = {
  個人發展: { en: 'your own development', ja: '自分自身の歩み' }, '兄弟姊妹、平輩、合作夥伴': { en: 'siblings, peers and partners in joint ventures', ja: '兄弟姉妹・同輩・共同事業の相手' },
  '伴侶、感情': { en: 'your partner and relationships', ja: 'パートナーや恋愛' }, '子女、親近的後輩': { en: 'children and younger people close to you', ja: '子どもや身近な後輩' },
  收入: { en: 'income', ja: '収入' }, 身體: { en: 'your health', ja: '体' }, 外出: { en: 'time away from home', ja: '外出' },
  '朋友、一般往來的下屬': { en: 'friends and the people who work under you', ja: '友人や付き合いのある部下' }, 工作: { en: 'work', ja: '仕事' },
  '家宅、物業': { en: 'home and property', ja: '家や不動産' }, '心情、享受': { en: 'your mood and pleasures', ja: '気持ちや楽しみ' }, '長輩、上司': { en: 'elders and superiors', ja: '目上の人や上司' },
};
export function synthClaim(zh: string): Tr | null {
  let m: RegExpExecArray | null;
  if ((m = new RegExp(`^那一年(${S})化祿有這十年(?:的(${S})化祿|大限的祿存)相疊，財源較順。$`).exec(zh)))
    return { en: `That year, ${sEn(m[1]!)}'s Abundance stacked with ${m[2] ? `this decade's ${sEn(m[2])} in Abundance` : "this decade's Lu Cun"}, and income came more smoothly.`, ja: `その年は${sJa(m[1]!)}の化禄が、この十年の${m[2] ? `${sJa(m[2])}化禄` : '禄存'}と重なり、収入の流れがよりスムーズでした。` };
  if ((m = /^那一年和(.+)有關的錢，較容易因財惹麻煩，或者原本的進財能力減弱。$/.exec(zh)) && TOPIC_TR[m[1]!])
    return { en: `That year, money tied to ${TOPIC_TR[m[1]!]!.en} was more likely to bring trouble, or your usual ways of earning from it weakened.`, ja: `その年は${TOPIC_TR[m[1]!]!.ja}に関わるお金が面倒を招きやすく、またはもともとの稼ぐ力が弱まりやすい時期でした。` };
  if ((m = new RegExp(`^那一年和(.+)有關的錢，這十年原本靠(${S})帶來的進財之力會減弱，也較容易因財惹麻煩。$`).exec(zh)) && TOPIC_TR[m[1]!])
    return { en: `That year, the income ${sEn(m[2]!)} brought you this decade through ${TOPIC_TR[m[1]!]!.en} weakened, and money there was more likely to bring trouble.`, ja: `その年は、この十年${sJa(m[2]!)}がもたらしていた${TOPIC_TR[m[1]!]!.ja}に関わる収入が弱まり、お金が面倒を招きやすくなりました。` };
  if ((m = new RegExp(`^那一年(${S})化祿給你帶來的進財機會，多是名聲、面子上的好處，實際到手有限。$`).exec(zh)))
    return { en: `That year, the earning chances ${sEn(m[1]!)}'s Abundance brought you were mostly about reputation and appearances; what actually reached your pocket was limited.`, ja: `その年に${sJa(m[1]!)}の化禄がもたらした収入の機会は、名声や体面の面が大きく、実際に手元に入るものは限られていました。` };
  return null;
}

/* 固定句（判斷、例子、條件、全書、收尾）：Codex 起稿、人手核（tmp/lookback-intl），中文原句做 key */
import trRaw from './synth-tr.json';
const TR = trRaw as Record<string, Tr>;
/** 綜合判讀層一句（固定句、會變嘅判斷、證據句）→ 英日；認唔到 null */
export const synthSentence = (zh: string): Tr | null => TR[zh] ?? synthClaim(zh) ?? synthFact(zh);
