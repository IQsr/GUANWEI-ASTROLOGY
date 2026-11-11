import { BRANCH_EN, PALACE_EN, STAR_EN, STEM_EN, listEn } from './en/terms';
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
  化祿: { en: 'an Abundance', ja: '化禄' }, 化權: { en: 'an Authority', ja: '化権' }, 化科: { en: 'a Recognition', ja: '化科' },
  煞忌: { en: 'harsh stars or an Obstruction', ja: '煞星・化忌' }, 昌曲: { en: 'Wen Chang and Wen Qu', ja: '文昌・文曲' }, 左右: { en: 'Zuo Fu and You Bi', ja: '左輔・右弼' },
};

const sEn = (zh: string) => STAR_EN[zh]?.pinyin ?? null;
const sJa = (zh: string) => STAR_JA[zh]?.kanji ?? null;
const palEn = (zh: string) => PALACE_EN[PAL[zh]!] ?? null;
const palJa = (zh: string) => PALACE_JA[PAL[zh]!] ?? null;
const bEn = (b: string) => BRANCH_EN[b]!;
/** 星名清單，或者「煞曜、吉曜」呢類組名 */
function list(zh: string): Tr | null {
  // 「擎羊、陀羅、地空、地劫一類煞曜」
  const kind = /^(.+)一類煞曜$/.exec(zh);
  if (kind) { const l = list(kind[1]!); return l && { en: `harsh stars such as ${l.en.replace(/ and ([^,]+)$/, ' or $1')}`, ja: `${l.ja}などの煞星` }; }
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
  [new RegExp(`^坐${L}$`), (m) => { const l = list(m[1]!); return l && { en: l.en, ja: `${l.ja}が入る` }; }],
  [new RegExp(`^(${S})得祿$`), (m) => ({ en: `${sEn(m[1]!)} with an Abundance or Lu Cun`, ja: `${sJa(m[1]!)}が禄を得る` })],
  [new RegExp(`^(${S})(?:獨)?坐${B}宮(入廟|落陷)$`), (m) => ({ en: `${sEn(m[1]!)} in ${bEn(m[2]!)}, at its ${m[3] === '入廟' ? 'strongest' : 'weakest'}`, ja: `${sJa(m[1]!)}が${m[2]}宮に入り、${m[3] === '入廟' ? '廟に入る' : '陥る'}` })],
  [new RegExp(`^(${S})(?:獨)?坐${B}宮並化${H}$`), (m) => ({ en: `${sEn(m[1]!)} in ${bEn(m[2]!)}, in ${HUA_EN[m[3]!]}`, ja: `${sJa(m[1]!)}が${m[2]}宮に入り、${HUA_JA[m[3]!]}` })],
  [new RegExp(`^(${S})的三方四正(不見|見)(.+)$`), (m) => { const b = list(m[3]!); return b && (m[2] === '見' ? { en: `${sEn(m[1]!)}, with ${b.en} in its four directions`, ja: `${sJa(m[1]!)}の三方四正に${b.ja}` } : { en: `${sEn(m[1]!)}, with no ${b.en.replace(' and ', ' or ')} in its four directions`, ja: `${sJa(m[1]!)}の三方四正に${b.ja}なし` }); }],
  [new RegExp(`^(${S})與(${S})同坐$`), (m) => ({ en: `${sEn(m[1]!)} with ${sEn(m[2]!)}`, ja: `${sJa(m[1]!)}と${sJa(m[2]!)}が同宮` })],
  [new RegExp(`^(${S})與(.+?)同度$`), (m) => { const b = list(m[2]!); return b && { en: `${sEn(m[1]!)} with ${b.en}`, ja: `${sJa(m[1]!)}と${b.ja}が同宮` }; }],
  [new RegExp(`^(?:有|由)?${L}(?:坐守|獨坐|同守)?$`), (m) => { const l = list(m[1]!); return l && { en: l.en, ja: `${l.ja}が入る` }; }],
  [new RegExp(`^(?:有|由)?${L}(?:坐|同坐)${B}宮$`), (m) => { const l = list(m[1]!); return l && { en: `${l.en} in ${bEn(m[2]!)}`, ja: `${l.ja}が${m[2]}宮に入る` }; }],
  [new RegExp(`^${L}獨坐${B}宮$`), (m) => { const l = list(m[1]!); return l && { en: `${l.en} alone in ${bEn(m[2]!)}`, ja: `${l.ja}が${m[2]}宮に単独で入る` }; }],
  [new RegExp(`^在${B}宮$`), (m) => ({ en: `in ${bEn(m[1]!)}`, ja: `${m[1]}宮にある` })],
  [new RegExp(`^(?:有|由)?${L}(?:與|、)${L}(?:同度|同宮|同會|同坐)$`), (m) => { const a = list(m[1]!), b = list(m[2]!); return a && b && { en: `${a.en} with ${b.en}`, ja: `${a.ja}と${b.ja}が同宮` }; }],
  [new RegExp(`^${L}(?:與|、)${L}同坐${B}宮$`), (m) => { const a = list(m[1]!), b = list(m[2]!); return a && b && { en: `${a.en} with ${b.en} in ${bEn(m[3]!)}`, ja: `${a.ja}と${b.ja}が${m[3]}宮に同宮` }; }],
  [new RegExp(`^${L}與${L}相對$`), (m) => { const a = list(m[1]!), b = list(m[2]!); return a && b && { en: `${a.en}, facing ${b.en} in the opposite palace`, ja: `${a.ja}が入り、向かいの宮の${b.ja}と向き合う` }; }],
  [new RegExp(`^${L}(?:會照|會見|在三方四正會見|會)(.+)$`), (m) => { const a = list(m[1]!), b = list(m[2]!.replace(/^(.+?)(本命)?化([祿權科忌])$/, '$1$2化$3')); return a && b && { en: `${a.en}, linked with ${b.en}`, ja: `${a.ja}に${b.ja}が会照` }; }],
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
  [new RegExp(`^並化${H}(?:、化${H})?$`), (m) => ({ en: `in ${HUA_EN[m[1]!]}${m[2] && m[2] !== m[1] ? ` and ${HUA_EN[m[2]]}` : ''}`, ja: `${HUA_JA[m[1]!]}${m[2] && m[2] !== m[1] ? `・${HUA_JA[m[2]]}` : ''}` })],
  [new RegExp(`^與${L}同會$`), (m) => { const b = list(m[1]!); return b && { en: `linked with ${b.en}`, ja: `${b.ja}と会う` }; }],
  [new RegExp(`^(${S})得祿或化科$`), (m) => ({ en: `${sEn(m[1]!)} with an Abundance, Lu Cun or a Recognition`, ja: `${sJa(m[1]!)}が禄を得るか化科` })],
  [/^有(.+)$/, (m) => { const l = list(m[1]!); return l && { en: l.en, ja: `${l.ja}がある` }; }],
  [/^(?:並且)?得祿$/, () => ({ en: 'with an Abundance or Lu Cun', ja: '禄を得る' })],
  [/^天馬不在.+?或對宮$/, () => ({ en: 'but Tian Ma is neither in this palace nor opposite', ja: '天馬は本宮にも対宮にもない' })],
  [/^未成「祿馬交馳」$/, () => ({ en: 'so the "Abundance and Horse in motion" pairing is not formed', ja: '「禄馬交馳」にはならない' })],
  [/^即「祿馬交馳」$/, () => ({ en: 'forming "Abundance and Horse in motion"', ja: '「禄馬交馳」となる' })],
  [/^沒有其他主星同宮$/, () => ({ en: 'with no other major star in the palace', ja: 'ほかの主星は同宮しない' })],
  [/^三方四正(?:還有其他|雖然見)煞曜$/, () => ({ en: 'with harsh stars in its four directions too', ja: '三方四正にも煞星' })],
  [new RegExp(`^(並|另有|或)?與?(.+?)(?:同度|同宮)$`), (m) => { if (m[2]!.startsWith('沒有')) return null; const b = list(m[2]!.replace(/^與/, '')); return b && { en: `${m[1] === '或' ? 'or ' : ''}with ${b.en} in the same palace`, ja: `${m[1] === '或' ? 'または' : ''}${b.ja}と同宮` }; }],
  [new RegExp(`^沒有(.+?)(?:或化科)?同度$`), (m) => { const b = list(m[1]!); return b && { en: `with no ${b.en.replace(' and ', ' or ')} in the same palace`, ja: `${b.ja}とは同宮しない` }; }],
  [new RegExp(`^(?:與對宮的|與廟旺的|與|${S}又與)?(.+?)相對$|^對宮(?:為|是)(.+)$`), (m) => { const z = m[1] ?? m[2]!; const b = list(z); return b && { en: `facing ${/廟旺/.test(m[0]) ? 'a strong ' : ''}${b.en} in the opposite palace`, ja: `向かいの宮の${/廟旺/.test(m[0]) ? '廟旺の' : ''}${b.ja}と向き合う` }; }],
  [new RegExp(`^三方四正(?:又|雖|同時|雖然)?見(.+)$`), (m) => { const b = list(m[1]!.replace(/或化祿$/, '')); return b && { en: `with ${b.en}${/或化祿$/.test(m[1]!) ? ' or an Abundance' : ''} in its four directions`, ja: `三方四正に${b.ja}${/或化祿$/.test(m[1]!) ? 'または化禄' : ''}` }; }],
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
  [/^對宮(.+?)(?:同度)?$/, (m) => { const b = list(m[1]!); return b && { en: `facing ${b.en} in the opposite palace`, ja: `向かいの宮に${b.ja}` }; }],
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
  [new RegExp(`^(${S})化${H}，與本命(?:的(${S})化祿|祿存)(同宮|相對)$`), (m, yr) => ({
    en: `${yr.en}, ${sEn(m[1]!)} turned to ${HUA_EN[m[2]!]}, ${m[4] === '同宮' ? 'in the same palace as' : 'facing'} your natal ${m[3] ? `${sEn(m[3])} in Abundance` : 'Lu Cun'}.`,
    ja: `${yr.ja}は${sJa(m[1]!)}が${HUA_JA[m[2]!]}し、本命の${m[3] ? `${sJa(m[3])}化禄` : '禄存'}と${m[4] === '同宮' ? '同宮します' : '向き合います'}。` })],
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
    return { en: `In your birth chart, ${sEn(m[1]!)} turns to ${HUA_EN[m[2]!]}; ${YR[m[3]!]!.en.toLowerCase()}, ${sEn(m[4]!)} ${m[3] === '今年' ? 'turns' : 'turned'} to ${HUA_EN[m[5]!]}.`, ja: `本命では${sJa(m[1]!)}${HUA_JA[m[2]!]}、${YR[m[3]!]!.ja}は${sJa(m[4]!)}${HUA_JA[m[5]!]}${m[3] === '今年' ? 'です' : 'でした'}。` };
  if ((m = new RegExp(`^這十年(${S})化${H}，(那一年|今年)(${S})卻?化${H}$`).exec(s)))
    return { en: `For this decade, ${sEn(m[1]!)} turns to ${HUA_EN[m[2]!]}, but ${YR[m[3]!]!.en.toLowerCase()}, ${sEn(m[4]!)} ${m[3] === '今年' ? 'turns' : 'turned'} to ${HUA_EN[m[5]!]}.`, ja: `この十年は${sJa(m[1]!)}${HUA_JA[m[2]!]}ですが、${YR[m[3]!]!.ja}は${sJa(m[4]!)}が${HUA_JA[m[5]!]}${m[3] === '今年' ? 'します' : 'でした'}。` };
  if ((m = new RegExp(`^你的命宮是${L}(?:獨)?坐${B}${B}?；(那一年|今年)的命宮走到(${S})獨坐的宮位$`).exec(s))) {
    const l = list(m[1]!); if (!l) return null;
    return { en: `Your Life Palace holds ${l.en} in ${bEn(m[2]!)}${m[3] ? ` or ${bEn(m[3])}` : ''}; ${YR[m[4]!]!.en.toLowerCase()}'s Life Palace moved to a palace held by ${sEn(m[5]!)} alone.`, ja: `あなたの命宮は${m[2]}${m[3] ?? ''}の${l.ja}で、${YR[m[4]!]!.ja}の命宮は${sJa(m[5]!)}が単独で入る宮に巡りました。` };
  }
  if ((m = new RegExp(`^這十年(${S})化${H}$`).exec(s))) return { en: `This decade, ${sEn(m[1]!)} turns to ${HUA_EN[m[2]!]}.`, ja: `この十年は${sJa(m[1]!)}${HUA_JA[m[2]!]}です。` };
  if ((m = new RegExp(`^(${S})化${H}是本命帶來的$`).exec(s))) return { en: `${sEn(m[1]!)}'s ${HUA_EN[m[2]!]} comes from your birth chart.`, ja: `${sJa(m[1]!)}の${HUA_JA[m[2]!]}は本命によるものです。` };
  if ((m = new RegExp(`^這一點看的是(那一年|今年)${P}對宮（(?:那一年|今年)的${P}）的${L}(?:(本命)?化${H})?((?:，[^，]+)*)$`).exec(s))) {
    const l = list(m[4]!); if (!l) return null;
    const t = m[6] ? huaTail(m[5], m[6]) : null;
    const mods: Tr[] = [];
    for (const x of m[7]!.split('，').filter(Boolean)) { const y = piece(MOD, x); if (!y) return null; mods.push(y); }
    return { en: `This is based on ${l.en}${t ? ` ${t.en}` : ''} in ${YR[m[1]!]!.en.toLowerCase()}'s ${palEn(m[3]!)}, opposite the ${palEn(m[2]!)}${mods.map((y) => `, ${y.en}`).join('')}.`, ja: `この点の根拠は、${YR[m[1]!]!.ja}の${palJa(m[2]!)}の向かい（${palJa(m[3]!)}）にある${l.ja}${t ? t.ja : ''}です${mods.length ? `（${mods.map((y) => y.ja).join('、')}）` : ''}。` };
  }
  const yr = /^(那一年|今年)/.exec(s);
  if (yr) {
    const rest = s.slice(yr[1]!.length);
    // 今年（這一年章）用現在式：規則按回看寫成過去式
    const now = (t: Tr): Tr => (yr[1] === '今年' ? { ...t, en: t.en.replace(/\bturned to\b/g, 'turns to').replace(/\bfell in\b/g, 'falls in') } : t);
    for (const [re, f] of [...WHOLE.slice(1), WHOLE[0]!]) { const w = re.exec(rest); const t = w && f(w, YR[yr[1]!]!); if (t) return now(t); }
  }
  /* 借對宮（初階第9篇借星安宮）：財帛宮冇主星，連對宮整組星一齊睇 */
  if ((m = new RegExp(`^你的${P}沒有主星，要連同對宮${P}整組星曜一起看：(.+?)(?:，加上${P}本身的(.+))?$`).exec(s))) {
    const a = list(m[3]!), b = m[5] ? list(m[5]) : null; if (!a || (m[5] && !b)) return null;
    return { en: `Your ${palEn(m[1]!)} has no major star of its own, so the stars in the opposite ${palEn(m[2]!)} are read with it: ${a.en}${b ? `, plus its own ${b.en}` : ''}.`, ja: `あなたの${palJa(m[1]!)}には主星がないので、向かいの${palJa(m[2]!)}の星をまとめて見ます：${a.ja}${b ? `、それに${palJa(m[1]!)}自身の${b.ja}` : ''}。` };
  }
  if ((m = new RegExp(`^這(一|兩)點看的是對宮${P}的([^，]+)((?:，[^，]+)*)$`).exec(s))) {
    const h = piece(HEAD, m[3]!.replace(/^(.+?)(本命)?化([祿權科忌])$/, '有$1$2化$3')) ?? (list(m[3]!) && { en: list(m[3]!)!.en, ja: list(m[3]!)!.ja }); if (!h) return null;
    const mods: Tr[] = []; for (const x of m[4]!.split('，').filter(Boolean)) { const t = piece(MOD, x); if (!t) return null; mods.push(t); }
    return { en: `${m[1] === '一' ? 'This point is' : 'These points are'} based on the opposite ${palEn(m[2]!)}: ${[h.en, ...mods.map((t) => t.en)].join(', ')}.`, ja: `${m[1] === '一' ? 'この点' : 'この二点'}の根拠は向かいの${palJa(m[2]!)}です：${[h.ja, ...mods.map((t) => t.ja)].join('、')}。` };
  }
  if ((m = new RegExp(`^你的${P}連同借入的${P}星曜，(.+)$`).exec(s))) {
    const mods: Tr[] = []; for (const x of m[3]!.split('，')) { const t = piece(MOD, x); if (!t) return null; mods.push(t); }
    return { en: `Your ${palEn(m[1]!)}, counting the stars borrowed from the ${palEn(m[2]!)}: ${mods.map((t) => t.en).join(', ')}.`, ja: `あなたの${palJa(m[1]!)}（借りた${palJa(m[2]!)}の星を含む）：${mods.map((t) => t.ja).join('、')}。` };
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
  個人發展: { en: 'your own development', ja: '自分自身の歩み' }, '兄弟姊妹、平輩、合作夥伴': { en: 'dealings with siblings, peers and business partners', ja: '兄弟姉妹・同輩・共同事業の相手との関係' },
  '伴侶、感情': { en: 'your relationship and love life', ja: 'パートナーとの関係や恋愛' }, '子女、親近的後輩': { en: 'dealings with children and younger people close to you', ja: '子どもや身近な後輩との関係' },
  收入: { en: 'income', ja: '収入' }, '考試、進修': { en: 'exams and further study', ja: '試験や学び' }, 身體: { en: 'your health', ja: '体' }, 外出: { en: 'time away from home', ja: '外出' },
  '朋友、一般往來的下屬': { en: 'dealings with friends and people who work for you', ja: '友人や部下との関係' }, 工作: { en: 'work', ja: '仕事' },
  '家宅、物業': { en: 'home and property', ja: '家や不動産' }, '心情、享受': { en: 'your mood and pleasures', ja: '気持ちや楽しみ' }, '長輩、上司': { en: 'dealings with elders and superiors', ja: '目上の人や上司との関係' },
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
const TR: Record<string, Tr> = { ...(trRaw as Record<string, Tr>) };
// 多句條目（「甲。乙。」）：翻譯模組逐句查，所以句數對得上就逐句加返
for (const [zh, t] of Object.entries(trRaw as Record<string, Tr>)) {
  const z = zh.split(/(?<=。)/).filter(Boolean), e = t.en.split(/(?<=[.!?])\s+/), j = t.ja.split(/(?<=。)/).filter(Boolean);
  if (z.length > 1 && z.length === e.length && z.length === j.length) z.forEach((s, i) => { TR[s] ??= { en: e[i]!, ja: j[i]! }; });
}
/** 綜合判讀層一句（固定句、會變嘅判斷、證據句）→ 英日；認唔到 null */
const synthOne = (zh: string): Tr | null => TR[zh] ?? synthClaim(zh) ?? synthJoined(zh) ?? synthYearLine(zh) ?? synthFact(zh);
/** 綜合判讀層一句 → 英日；認唔到 null。這一年章「明年」段係今年卡將「今年」換「明年」（synthesis/index.ts），譯法照換 */
export const synthSentence = (zh: string): Tr | null => {
  const t = synthOne(zh); if (t || !zh.includes('明年')) return t;
  const n = synthOne(zh.replaceAll('明年', '今年')); if (!n) return null;
  return { en: n.en.replace(/\bThis year\b/g, 'Next year').replace(/\bthis year\b/g, 'next year'), ja: n.ja.replaceAll('今年', '来年') };
};

/* 綜合判讀層砌出嚟嘅合併句（synthesis/index.ts）：「甲；不過乙。」（主線加限制）、「一是…」「二是…」（兩個相反條件），甲乙都係原卡句 */
const lowerFirst = (s: string) => (/^[A-Z][a-z]+ [A-Z]|^I\b/.test(s) ? s :s.charAt(0).toLowerCase() + s.slice(1));
function synthJoined(zh: string): Tr | null {
  const but = /^(.+?)；不過(.+)$/.exec(zh);
  if (but) {
    const a = TR[but[1]! + '。'], b = TR[but[2]!];
    return a && b ? { en: `${a.en.replace(/\.$/, '')}; however, ${lowerFirst(b.en)}`, ja: `${a.ja}ただし、${b.ja}` } : null;
  }
  const nth = /^(一|二)是(.+)$/.exec(zh);
  if (nth) {
    const t = TR[nth[2]!]; if (!t) return null;
    return { en: `${nth[1] === '一' ? 'First' : 'Second'}, ${lowerFirst(t.en)}`, ja: `${nth[1] === '一' ? 'ひとつは、' : 'もうひとつは、'}${t.ja}` };
  }
  return null;
}

/** 條件句（「If you had a partner at the time,」／「当時パートナーがいたなら、」）後面嗰句：唔再重複「That year,」／「その年は、」 */
export function afterCondition(locale: 'en' | 'ja', prev: string | undefined, text: string): string {
  // 其餘句首轉細楷（「According to …」→「according to …」）；星名等專有名詞（「Tian Ji …」）lowerFirst 唔郁
  if (locale === 'en') return !prev?.endsWith(',') ? text : text.startsWith('That year, ') ? text.slice('That year, '.length) : lowerFirst(text);
  return prev?.endsWith('、') ? text.replace(/^その年は、/, '') : text;
}

/* ── 這一年章（2026-11-11）：程式砌嘅句（synthesis/index.ts 嘅總覽、訊號句、段首、建議、運限）；底子句查固定句表 ── */
const BUCKET: Record<string, Tr> = {
  有轉好機會的是: { en: 'likely to go better', ja: '好転のチャンスがあるのは' },
  '有機會、同時要防的是': { en: 'chances and risks together', ja: 'チャンスと同時に用心が要るのは' },
  '要放慢、多留神的是': { en: 'worth slowing down and taking more care over', ja: 'ペースを落として気をつけたいのは' },
};
const VERDICT: Record<string, Tr> = {
  機會和風險落在同一宮: { en: 'brings both chances and risks', ja: 'チャンスとリスクが両方あります' },
  要留神的訊號集中在這一宮: { en: 'needs extra care', ja: '特に注意が要ります' },
  有利的訊號集中在這一宮: { en: 'looks favourable', ja: '有利な流れです' },
};
const BRIDGE: Record<string, Tr> = {
  今年在這方面好壞並見: { en: 'This year brings both good and bad here.', ja: '今年はこの面で良し悪しが入り交じります。' },
  今年是在這個底子上的變化: { en: 'This year builds on that tendency.', ja: '今年はこの傾向の上に変化が加わります。' },
  今年這方面同樣較順: { en: 'This area also tends to go fairly smoothly this year.', ja: '今年もこの面は比較的順調です。' },
  今年這方面同樣要留神: { en: 'This area needs care again this year.', ja: '今年もこの面には注意が要ります。' },
  '底子雖有不足，今年這方面卻有轉好的地方': { en: 'That tendency has its weak points, but this year things improve somewhat here.', ja: '土台には弱さがありますが、今年はこの面に好転するところがあります。' },
  '底子雖好，今年這方面卻有不利的變化': { en: 'That tendency is a good one, but this year brings some unfavourable changes here.', ja: '土台は良いものの、今年はこの面に不利な変化があります。' },
};
const topicTr = (zh: string) => TOPIC_TR[zh] ?? null;
/* 英文訊號句（2026-11-11 審稿：「dealings with … needs」單複數錯）：話題放句尾，唔使夾動詞 */
const VERDICT_EN: Record<string, (t: string) => string> = {
  機會和風險落在同一宮: (t) => `This year brings both chances and risks for ${t}.`,
  要留神的訊號集中在這一宮: (t) => `This year, take extra care with ${t}.`,
  有利的訊號集中在這一宮: (t) => `This year looks favourable for ${t}.`,
};
const WHEN: Record<string, Tr> = { 這十年: { en: "this decade's", ja: 'この十年の' }, 今年: { en: "this year's", ja: '今年の' }, 明年: { en: "next year's", ja: '来年の' }, 那一年: { en: "that year's", ja: 'その年の' } };
/* 今年卡會變嘅判斷（cards.json syn.year.*：{palaceTopic}{topics}{star}{what}） */
const topicsTr = (zh: string): Tr | null => { const ts = zh.split('方面，以及').map(topicTr); if (!ts.every(Boolean)) return null; return ts.length === 1 ? ts[0]! : { en: listEn(ts.map((t) => t!.en)), ja: ts.map((t) => t!.ja).join('、') }; };
const whatTr = (zh: string): Tr | null => {
  const m = new RegExp(`^(這十年的|你本命|本命的?)(${S})化祿$`).exec(zh);
  if (m) return m[1] === '這十年的' ? { en: `this decade's ${sEn(m[2]!)} Abundance`, ja: `この十年の${sJa(m[2]!)}化禄` } : { en: `your natal ${sEn(m[2]!)} Abundance`, ja: `本命の${sJa(m[2]!)}化禄` };
  if (/^這十年(大限)?的祿存$/.test(zh)) return { en: "this decade's Lu Cun", ja: 'この十年の禄存' };
  if (/^(你)?本命(的)?祿存$/.test(zh)) return { en: 'your natal Lu Cun', ja: '本命の禄存' };
  return null;
};
const LU_EN: [RegExp, (m: RegExpExecArray) => Tr | null][] = [
  [/^有(.+)相疊$/, (m) => { const w = whatTr(m[1]!); return w && { en: `it is reinforced by ${w.en}`, ja: `${w.ja}と重なる` }; }],
  [/^和(.+)相疊（力量很輕）$/, (m) => { const w = whatTr(m[1]!); return w && { en: `it is reinforced, though only slightly, by ${w.en}`, ja: `${w.ja}とわずかに重なる` }; }],
  [/^落在弱地，多名聲、少實利$/, () => ({ en: 'it sits in a weak position, so it brings more reputation than money', ja: '弱地にあるため名声は得ても実利は少ない' })],
  [/^遇上(.+)$/, (m) => { const l = list(m[1]!); return l && { en: `it meets ${l.en}`, ja: `${l.ja}に出会う` }; }],
];
const luSay = (zh: string): Tr | null => { const xs = zh.split('，又').map((x) => piece(LU_EN, x)); return xs.every(Boolean) ? { en: listEn(xs.map((x) => x!.en)), ja: xs.map((x) => x!.ja).join('うえに、') } : null; };
function synthYearClaim(zh: string): Tr | null {
  let m: RegExpExecArray | null, t: Tr | null;
  if ((m = /^今年和(.+)有關的錢，較容易因財惹麻煩，或者原本的進財能力減弱。$/.exec(zh)) && (t = topicTr(m[1]!)))
    return { en: `This year, money matters connected with ${t.en} are more likely to cause trouble, or the income linked to them may fall.`, ja: `今年は、${t.ja}に関わるお金が問題になったり、本来の稼ぐ力が弱まったりしやすくなります。` };
  if ((m = new RegExp(`^今年和(.+)有關的錢，這十年原本靠(${S})帶來的進財之力會減弱，也較容易因財惹麻煩。$`).exec(zh)) && (t = topicTr(m[1]!)))
    return { en: `This year, the income connected with ${t.en} that ${sEn(m[2]!)} has brought you this decade may fall, and money there is more likely to cause trouble.`, ja: `今年は、この十年${sJa(m[2]!)}がもたらしてきた、${t.ja}に関わる収入が減り、お金の問題も起こりやすくなります。` };
  if ((m = /^(.+)方面原本不利的地方，今年有機會轉為有利。$/.exec(zh)) && (t = topicTr(m[1]!)))
    return { en: `What has been unfavourable in ${t.en} may turn favourable this year.`, ja: `${t.ja}の面でもともと不利だったところが、今年は有利に転じる可能性があります。` };
  if ((m = /^(.+)方面，這十年原本不利的地方，今年有機會轉為有利。$/.exec(zh)) && (t = topicTr(m[1]!)))
    return { en: `What has been unfavourable in ${t.en} this decade may turn favourable this year.`, ja: `${t.ja}の面で、この十年もともと不利だったところが、今年は有利に転じる可能性があります。` };
  if ((m = new RegExp(`^今年(${S})化祿給你帶來的進財機會，多是名聲、面子上的好處，實際到手有限。$`).exec(zh)))
    return { en: `This year, the earning chances ${sEn(m[1]!)}'s Abundance brings you are mostly about reputation and appearances; what actually reaches your pocket is limited.`, ja: `今年${sJa(m[1]!)}の化禄がもたらす収入の機会は、名声や体面の面が大きく、実際に手元に入るものは限られます。` };
  if ((m = /^今年在(.+)方面得到的好處，會打折扣。$/.exec(zh)) && (t = topicTr(m[1]!)))
    return { en: `This year, the gains you make in ${t.en} will be discounted.`, ja: `今年${t.ja}の面で得る利益は、割り引いて考える必要があります。` };
  if ((m = /^今年在(.+)方面，容易主動去改一些不必改的東西，結果欲進反退。$/.exec(zh)) && (t = topicTr(m[1]!)))
    return { en: `This year, in ${t.en}, you may be tempted to change things that do not need changing, and lose ground as a result.`, ja: `今年は${t.ja}について、変える必要のないことまで自分から変えたくなり、かえって裏目に出やすくなります。` };
  if ((m = new RegExp(`^今年(.+)方面要防受人壓制，(${S})化權在這裏不算喜事。$`).exec(zh)) && (t = topicTr(m[1]!)))
    return { en: `This year, in ${t.en}, watch out for being held down by others; ${sEn(m[2]!)}'s Authority here is not good news.`, ja: `今年は${t.ja}の面で人に抑えつけられないよう用心してください。ここでの${sJa(m[2]!)}化権は喜ばしいものではありません。` };
  if ((m = new RegExp(`^今年(${S})化祿有(.+)相疊，財源較順。$`).exec(zh)) && (t = whatTr(m[2]!)))
    return { en: `This year, ${sEn(m[1]!)}'s Abundance stacks with ${t.en}, and income comes more smoothly.`, ja: `今年は${sJa(m[1]!)}の化禄が${t.ja}と重なり、収入の流れがよりスムーズです。` };
  if ((m = new RegExp(`^今年(${S})化祿和(.+)相疊，有些助力，但力量很輕，不宜因此估高今年的進財。$`).exec(zh)) && (t = whatTr(m[2]!)))
    return { en: `This year, ${sEn(m[1]!)}'s Abundance stacks with ${t.en}, which helps a little, but the effect is light; do not count on higher income because of it.`, ja: `今年は${sJa(m[1]!)}の化禄が${t.ja}と重なり、多少の助けにはなりますが力は弱く、これで今年の収入を高く見積もらないほうがよいでしょう。` };
  if ((m = /^今年你在(.+)方面，要防因事破財。$/.exec(zh)) && (t = topicsTr(m[1]!)))
    return { en: `This year, in ${t.en}, guard against losing money over some matter.`, ja: `今年は${t.ja}の面で、何かの事情でお金を失わないよう用心してください。` };
  if ((m = /^今年你在(.+)方面，較多阻滯。$/.exec(zh)) && (t = topicsTr(m[1]!)))
    return { en: `This year, things may not go as smoothly as you would like with ${t.en}.`, ja: `今年は${t.ja}が、思うように進みにくくなります。` };
  if ((m = new RegExp(`^今年你在(.+)方面，仍受這十年(${S})化忌的阻滯。$`).exec(zh)) && (t = topicTr(m[1]!)))
    return { en: `This year, ${t.en} may still meet obstacles, because ${sEn(m[2]!)} turns to Obstruction for this decade.`, ja: `今年も${t.ja}は、この十年の${sJa(m[2]!)}化忌の影響で、思うように進みにくい状態が続きます。` };
  if ((m = new RegExp(`^今年(${S})化祿給你的進財，(.+?)(?:，但(.+?))?，(實際得益要打折扣|財源較順)。$`).exec(zh))) {
    const a = luSay(m[2]!), b = m[3] ? luSay(m[3]) : null; if (!a || (m[3] && !b)) return null;
    const end = m[4] === '財源較順' ? { en: 'This year, income tends to come more smoothly', ja: '今年は収入の流れが比較的スムーズです' } : { en: 'This year, expect less real income than it first appears', ja: '今年は、見かけほど実際の収入は増えないと考えておきましょう' };
    return { en: `${end.en}. ${sEn(m[1]!)} turns to Abundance for you: ${a.en}${b ? `, but ${b.en}` : ''}.`, ja: `${end.ja}。${sJa(m[1]!)}が化禄しますが、${a.ja}${b ? `うえに、${b.ja}` : ''}ためです。` };
  }
  return null;
}
function synthYearLine(zh: string): Tr | null {
  let m: RegExpExecArray | null;
  const c = synthYearClaim(zh); if (c) return c;
  if (zh === '下面逐項講原因。') return { en: 'The reasons follow, one by one.', ja: '以下、項目ごとに理由を説明します。' };
  if ((m = /^今年整體來看：(.+)。$/.exec(zh))) {
    const en: string[] = [], ja: string[] = [];
    for (const part of m[1]!.split('；')) {
      const b = Object.keys(BUCKET).find((k) => part.startsWith(k)); if (!b) return null;
      const ts = [...part.slice(b.length).matchAll(/「([^」]+)」/g)].map((x) => topicTr(x[1]!));
      if (!ts.length || ts.some((t) => !t)) return null;
      en.push(`${BUCKET[b]!.en}: ${ts.map((t) => `"${t!.en}"`).join(', ')}`); ja.push(`${BUCKET[b]!.ja}${ts.map((t) => `「${t!.ja}」`).join('')}`);
    }
    return { en: `This year at a glance — ${en.join('; ')}.`, ja: `今年の全体像：${ja.join('；')}。` };
  }
  if ((m = /^今年在(.+)方面，(.+)。$/.exec(zh)) && topicTr(m[1]!) && VERDICT[m[2]!])
    return { en: VERDICT_EN[m[2]!]!(topicTr(m[1]!)!.en), ja: `今年の${topicTr(m[1]!)!.ja}は、${VERDICT[m[2]!]!.ja}。` };
  if ((m = /^今年涉及(.+)的出錢、合夥，先小額、條款寫清楚再落實。$/.exec(zh)) && topicTr(m[1]!))
    return { en: `This year, when money or partnerships involve ${topicTr(m[1]!)!.en}, start small and put the terms in writing before you commit.`, ja: `今年、${topicTr(m[1]!)!.ja}に関わるお金の支出や共同事業は、まず小さく始め、条件を書面にしてから進めてください。` };
  if ((m = /^今年(.+)方面想作大改動時，先想清楚不改會怎樣，再決定。$/.exec(zh)) && topicTr(m[1]!))
    return { en: `This year, before making a big change in ${topicTr(m[1]!)!.en}, think through what happens if you leave things as they are, then decide.`, ja: `今年、${topicTr(m[1]!)!.ja}について大きく変えたくなったときは、今のまま続けた場合も考えたうえで決めてください。` };
  /* 段首：今年你的財帛宮在丑宮，坐廉貞、七殺。／是空宮（，要連同對宮…） */
  if ((m = new RegExp(`^今年你的${P}在${B}宮，(?:坐${L}|是空宮(?:，要連同對宮${B}宮整組星曜一起看：(.+?)(?:，加上本宮的(.+))?)?)。$`).exec(zh))) {
    const pe = palEn(m[1]!), pj = palJa(m[1]!); if (!pe || !pj) return null;
    const at = { en: `This year your ${pe} is in ${bEn(m[2]!)}`, ja: `今年のあなたの${pj}は${m[2]}宮にあり` };
    if (m[3]) { const l = list(m[3]); return l && { en: `${at.en}, holding ${l.en}.`, ja: `${at.ja}、${l.ja}が入ります。` }; }
    if (!m[4]) return { en: `${at.en}, and it is empty.`, ja: `${at.ja}、空宮です。` };
    const a = list(m[5]!), b = m[6] ? list(m[6]) : null; if (!a || (m[6] && !b)) return null;
    return { en: `${at.en}. It has no major star of its own, so the stars in the opposite palace, ${bEn(m[4])}, are read with it: ${a.en}${b ? `, plus its own ${b.en}` : ''}.`, ja: `${at.ja}、主星がないため、向かいの${m[4]}宮の星もあわせて見ます：${a.ja}${b ? `、それに本宮の${b.ja}` : ''}。` };
  }
  /* 你本命財帛宮坐天機、太陰，底子是：…；今年… */
  if ((m = new RegExp(`^你本命${P}坐${L}(?:，底子是：(.+?)(?:；(${Object.keys(BRIDGE).join('|')}))?)?。$`).exec(zh))) {
    const pe = palEn(m[1]!), pj = palJa(m[1]!), l = list(m[2]!); if (!pe || !pj || !l) return null;
    const head = { en: `In your birth chart, the ${pe} holds ${l.en}.`, ja: `本命の${pj}には${l.ja}が入ります。` };
    if (!m[3]) return head;
    const base = TR[m[3] + '。']; if (!base) return null;
    const br = m[4] ? BRIDGE[m[4]]! : null;
    return { en: `${head.en} Your birth chart points to this: ${base.en}${br ? ` ${br.en}` : ''}`, ja: `${head.ja}もともとの傾向として、${base.ja}${br ? br.ja : ''}` };
  }
  /* 運限：這一章用到的運限：你今年虛歲28，行26至35歲的丙子大限（本命夫妻宮）。 */
  if ((m = new RegExp(`^這一章用到的運限：你今年虛歲(\\d+)，行(\\d+)至(\\d+)歲的([甲乙丙丁戊己庚辛壬癸])${B}大限（本命${P}）。$`).exec(zh))) {
    const pe = palEn(m[6]!), pj = palJa(m[6]!); if (!pe || !pj) return null;
    const n = +m[1]!, a = +m[2]!, b = +m[3]!;
    return { en: `Periods used in this chapter: this year you are ${n - 2} or ${n - 1} (${n} by Chinese reckoning), in the ${STEM_EN[m[4]!]} ${bEn(m[5]!)} ten-year period (roughly ages ${a - 1} to ${b - 1}; ${a}–${b} by Chinese reckoning), which sits in your natal ${pe}.`,
      ja: `この章で使う運限：今年あなたは数え${n}歳で、${a}〜${b}歳の${m[4]}${m[5]}大限（本命の${pj}）を歩んでいます。` };
  }
  if ((m = new RegExp(`^這十年的四化是(${S})化祿、(${S})化權、(${S})化科、(${S})化忌；今年的四化是(${S})化祿、(${S})化權、(${S})化科、(${S})化忌。$`).exec(zh))) {
    const x = m;
    const four = (i: number): Tr => ({ en: `${sEn(x[i]!)} turns to Abundance, ${sEn(x[i + 1]!)} to Authority, ${sEn(x[i + 2]!)} to Recognition and ${sEn(x[i + 3]!)} to Obstruction`, ja: `${sJa(x[i]!)}化禄・${sJa(x[i + 1]!)}化権・${sJa(x[i + 2]!)}化科・${sJa(x[i + 3]!)}化忌` });
    return { en: `This decade, ${four(1).en}. This year, ${four(5).en}.`, ja: `この十年の四化は${four(1).ja}、今年の四化は${four(5).ja}です。` };
  }
  /* 這十年太陰化忌在酉宮，今年這一宮是你的田宅宮。 */
  if ((m = new RegExp(`^這十年(${S})化${H}在${B}宮，今年這一宮是你的${P}。$`).exec(zh))) {
    const pe = palEn(m[4]!), pj = palJa(m[4]!); if (!pe || !pj) return null;
    return { en: `This decade's ${sEn(m[1]!)} ${HUA_EN[m[2]!]} sits in ${bEn(m[3]!)}, which is this year's ${pe}.`, ja: `この十年の${sJa(m[1]!)}${HUA_JA[m[2]!]}は${m[3]}宮にあり、今年はその宮があなたの${pj}です。` };
  }
  /* 今年太陰化忌落在戌宮，正沖這十年太陽化祿所在的今年兄弟宮。 */
  if ((m = new RegExp(`^今年(${S})化忌落在${B}宮，正沖(這十年|你本命)(${S})化祿所在的(?:今年)?${P}。$`).exec(zh))) {
    const pe = palEn(m[5]!), pj = palJa(m[5]!); if (!pe || !pj) return null;
    const who = m[3] === '這十年' ? { en: "this decade's", ja: 'この十年の' } : { en: 'your natal', ja: '本命の' };
    return { en: `This year's ${sEn(m[1]!)} Obstruction falls in ${bEn(m[2]!)}, directly opposite ${who.en} ${sEn(m[4]!)} Abundance in this year's ${pe}.`, ja: `今年の${sJa(m[1]!)}化忌は${m[2]}宮に落ち、${who.ja}${sJa(m[4]!)}化禄がある今年の${pj}を正面から沖します。` };
  }
  /* 今年天機化祿落在亥宮，與地空、地劫同宮。 */
  if ((m = new RegExp(`^今年(${S})化${H}落在${B}宮，與${L}同宮。$`).exec(zh))) {
    const l = list(m[4]!); if (!l) return null;
    return { en: `This year's ${sEn(m[1]!)} ${HUA_EN[m[2]!]} falls in ${bEn(m[3]!)}, in the same palace as ${l.en}.`, ja: `今年の${sJa(m[1]!)}${HUA_JA[m[2]!]}は${m[3]}宮に落ち、${l.ja}と同宮します。` };
  }
  /* 你的命宮是巨門獨坐子午；這十年的命宮走到紫微、破軍的宮位（，而且廉貞化忌）。 */
  if ((m = new RegExp(`^你(?:的)?命宮(?:是)?${L}(?:獨)?坐${B}${B}?；(這十年|今年|明年|那一年)的命宮走到(?:${L}的|(${S})獨坐的)宮位(?:，而且(${S})化${H})?。$`).exec(zh))) {
    const l = list(m[1]!), t = m[5] ? list(m[5]) : null; if (!l || (m[5] && !t)) return null;
    const w = WHEN[m[4]!]!, to = t ? { en: `held by ${t.en}`, ja: `${t.ja}が入る` } : { en: `held by ${sEn(m[6]!)} alone`, ja: `${sJa(m[6]!)}が単独で入る` };
    const hua = m[7] ? { en: `, with ${sEn(m[7])} in ${HUA_EN[m[8]!]}`, ja: `。しかも${sJa(m[7])}${HUA_JA[m[8]!]}です` } : { en: '', ja: '' };
    return { en: `Your Life Palace holds ${l.en} in ${bEn(m[2]!)}${m[3] ? ` or ${bEn(m[3])}` : ''}; ${w.en} Life Palace moves to a palace ${to.en}${hua.en}.`, ja: `あなたの命宮は${m[2]}${m[3] ?? ''}の${l.ja}で、${w.ja}命宮は${to.ja}宮に巡ります${hua.ja}。` };
  }
  return null;
}

/* 這一年章小標題（synthesis/index.ts ANNUAL_PALACES 嘅 slot、明年段「2027 年」、運限段） */
const HEADING: Record<string, Tr> = {
  今年的錢: { en: 'Money this year', ja: '今年のお金' }, 今年的工作: { en: 'Work this year', ja: '今年の仕事' }, 今年的感情: { en: 'Relationships this year', ja: '今年の恋愛・パートナー' },
  今年的身體: { en: 'Health this year', ja: '今年の体' }, 今年的家宅: { en: 'Home and property this year', ja: '今年の家・不動産' }, 今年的心境: { en: 'Your state of mind this year', ja: '今年の心持ち' },
  今年在外: { en: 'Away from home this year', ja: '今年の外出' }, '今年與子女、後輩': { en: 'Children and younger people this year', ja: '今年の子ども・後輩との関係' },
  '今年與平輩、夥伴': { en: 'Peers and partners this year', ja: '今年の同輩・仲間との関係' }, '今年與朋友、下屬': { en: 'Friends and subordinates this year', ja: '今年の友人・部下との関係' },
  '今年與長輩、上司': { en: 'Elders and superiors this year', ja: '今年の目上の人・上司との関係' }, 這一章用到的運限: { en: 'Periods used in this chapter', ja: 'この章で使う運限' },
};
export function synthHeading(zh: string): Tr | null {
  const y = /^(\d{4}) 年$/.exec(zh);
  return y ? { en: y[1]!, ja: `${y[1]}年` } : HEADING[zh] ?? null;
}
