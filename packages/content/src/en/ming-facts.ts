import { BRANCH_EN, PALACE_EN, listEn, star } from './terms';
import { HUA_EN } from './facts';

/**
 * 新版命宮、性格的骨架（reader-backed-v1）入面按盤面填字嘅句（2026-11-12 英文第一批）。
 * 句型嚟自 `free-ming-systems.ts` `systemMingReading` 同 `free-ming-reader.ts`；固定句照舊入 tm.json。
 * 譯唔到（星名、宮名、地支對唔上）就回 null，由上層當缺譯處理，唔會半譯。
 */
const S = '紫微|天機|太陽|武曲|天同|廉貞|天府|太陰|貪狼|巨門|天相|天梁|七殺|破軍|文昌|文曲|左輔|右弼|天魁|天鉞|祿存|天馬|擎羊|陀羅|火星|鈴星|地空|地劫';
const B = '[子丑寅卯辰巳午未申酉戌亥]';
const P = '命|兄弟|夫妻|子女|財帛|疾厄|遷移|僕役|交友|官祿|田宅|福德|父母';
const ALIAS: Record<string, string> = { 交友: '僕役' };

const stars = (list: string): string | null => {
  const xs = list.split('、').map(star);
  return xs.every(Boolean) ? listEn(xs as string[]) : null;
};
const palace = (zh: string): string | null => { const k = ALIAS[zh.replace(/宮$/, '')] ?? zh.replace(/宮$/, ''); return PALACE_EN[k] ?? PALACE_EN[`${k}宮`] ?? null; };
const hua = (s: string, h: string): string | null => (star(s) && HUA_EN[h] ? `${star(s)} turning to ${HUA_EN[h]}` : null);

export function mingFact(s: string): string | null {
  let m: RegExpExecArray | null;
  /* 你的命宮是天同坐酉宮。／你的命宮是武曲、貪狼同坐丑宮。 */
  if ((m = new RegExp(`^你的命宮是((?:${S})(?:、(?:${S}))*)(同)?坐(${B})宮。$`).exec(s))) {
    const l = stars(m[1]!);
    return l ? `Your Life Palace holds ${l}${m[2] ? ' together' : ''} in ${BRANCH_EN[m[3]!]}.` : null;
  }
  /* 你的命宮在酉，沒有主星，借對宮卯的太陽、天梁來讀。 */
  if ((m = new RegExp(`^你的命宮在(${B})，沒有主星，借對宮(${B})的((?:${S})(?:、(?:${S}))*)來讀。$`).exec(s))) {
    const l = stars(m[3]!);
    return l ? `Your Life Palace, in ${BRANCH_EN[m[1]!]}, holds no major star, so it is read through ${l} from the opposite palace in ${BRANCH_EN[m[2]!]}.` : null;
  }
  /* 命宮四方實際坐曜的本命四化有：遷移宮太陽化忌、財帛宮武曲化祿。 */
  if ((m = /^命宮四方實際坐曜的本命四化有：(.+)。$/.exec(s))) {
    const items = m[1]!.split('、').map((x) => {
      const r = new RegExp(`^(${P})宮?(${S})化([祿權科忌])$`).exec(x);
      const pal = r && palace(r[1]!), h = r && hua(r[2]!, r[3]!);
      return pal && h ? `${h} in your ${pal}` : null;
    });
    return items.every(Boolean) ? `In your Life Palace and its linked palaces, the birth-chart transformations are: ${listEn(items as string[])}.` : null;
  }
  /* 命宮同度的配曜另見右弼、天馬。 */
  if ((m = new RegExp(`^命宮同度的配曜另見((?:${S})(?:、(?:${S}))*)。$`).exec(s))) {
    const l = stars(m[1]!);
    return l ? `Your Life Palace also holds ${l}.` : null;
  }
  /* 本盤命宮有破軍化權。 */
  if ((m = new RegExp(`^本盤(${P})宮?有(${S})化([祿權科忌])。$`).exec(s))) {
    const pal = palace(m[1]!), h = hua(m[2]!, m[3]!);
    return pal && h ? `In your chart, your ${pal} has ${h}.` : null;
  }
  /* 本宮見天機化忌。／本宮有天梁化祿。 */
  if ((m = new RegExp(`^本宮(?:見|有)(${S})化([祿權科忌])。$`).exec(s))) {
    const h = hua(m[1]!, m[2]!);
    return h ? `This palace has ${h}.` : null;
  }
  /* 本宮有貪狼化祿、祿存。（化曜同配曜混合清單） */
  if ((m = new RegExp(`^本宮有((?:${S})(?:化[祿權科忌])?(?:、(?:${S})(?:化[祿權科忌])?)+)。$`).exec(s))) {
    const xs = m[1]!.split('、').map((x) => { const r = new RegExp(`^(${S})(?:化([祿權科忌]))?$`).exec(x); return r ? (r[2] ? hua(r[1]!, r[2]) : star(r[1]!)) : null; });
    return xs.every(Boolean) ? `This palace has ${listEn(xs as string[])}.` : null;
  }
  /* 本宮有祿存。／本宮同度擎羊。 */
  if ((m = new RegExp(`^本宮(?:有|同度)((?:${S})(?:、(?:${S}))*)。$`).exec(s))) {
    const l = stars(m[1]!);
    return l ? `${l} also ${m[1]!.includes('、') ? 'sit' : 'sits'} in this palace.` : null;
  }
  return null;
}
