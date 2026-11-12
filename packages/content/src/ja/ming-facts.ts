import { HUA_JA, PALACE_JA, listJa, starJa } from './terms';

/**
 * 新版命宮、性格的骨架（reader-backed-v1）入面按盤面填字嘅句（2026-11-12 日文第一批，對照 en/ming-facts.ts）。
 * 句型嚟自 `free-ming-systems.ts` `systemMingReading` 同 `free-ming-reader.ts`；固定句入 ming-reader.json。
 * 譯唔到（星名、宮名、地支對唔上）就回 null，由上層當缺譯處理，唔會半譯。
 * 地支「子」嘅宮照寫「子宮」，出街前由 render.ts `clearJa` 改「子の宮」。
 */
const S = '紫微|天機|太陽|武曲|天同|廉貞|天府|太陰|貪狼|巨門|天相|天梁|七殺|破軍|文昌|文曲|左輔|右弼|天魁|天鉞|祿存|天馬|擎羊|陀羅|火星|鈴星|地空|地劫';
const B = '[子丑寅卯辰巳午未申酉戌亥]';
const P = '命|兄弟|夫妻|子女|財帛|疾厄|遷移|僕役|交友|官祿|田宅|福德|父母';
const ALIAS: Record<string, string> = { 交友: '僕役' };

const stars = (list: string): string | null => {
  const xs = list.split('、').map(starJa);
  return xs.every(Boolean) ? listJa(xs as string[]) : null;
};
const palace = (zh: string): string | null => {
  const k = ALIAS[zh.replace(/宮$/, '')] ?? zh.replace(/宮$/, '');
  return PALACE_JA[k] ?? PALACE_JA[`${k}宮`] ?? null;
};
const hua = (s: string, h: string): string | null => (starJa(s) && HUA_JA[h] ? `${starJa(s)}${HUA_JA[h]}` : null);

export function mingFact(s: string): string | null {
  let m: RegExpExecArray | null;
  /* 你的命宮是天同坐酉宮。／你的命宮是武曲、貪狼同坐丑宮。 */
  if ((m = new RegExp(`^你的命宮是((?:${S})(?:、(?:${S}))*)(同)?坐(${B})宮。$`).exec(s))) {
    const l = stars(m[1]!);
    return l ? `あなたの命宮は${m[3]}宮にあり、${l}が${m[2] ? '同じ宮に' : ''}入っています。` : null;
  }
  /* 你的命宮在酉，沒有主星，借對宮卯的太陽、天梁來讀。 */
  if ((m = new RegExp(`^你的命宮在(${B})，沒有主星，借對宮(${B})的((?:${S})(?:、(?:${S}))*)來讀。$`).exec(s))) {
    const l = stars(m[3]!);
    return l ? `あなたの命宮は${m[1]}宮にあり、主星がないため、向かいの${m[2]}宮にある${l}を借りて読みます。` : null;
  }
  /* 命宮四方實際坐曜的本命四化有：遷移宮太陽化忌、財帛宮武曲化祿。 */
  if ((m = /^命宮四方實際坐曜的本命四化有：(.+)。$/.exec(s))) {
    const items = m[1]!.split('、').map((x) => {
      const r = new RegExp(`^(${P})宮?(${S})化([祿權科忌])$`).exec(x);
      const pal = r && palace(r[1]!), h = r && hua(r[2]!, r[3]!);
      return pal && h ? `${pal}の${h}` : null;
    });
    return items.every(Boolean) ? `命宮の三方四正に実際に入っている星のうち、生まれ年の四化がつくのは、${(items as string[]).join('、')}です。` : null;
  }
  /* 命宮同度的配曜另見右弼、天馬。 */
  if ((m = new RegExp(`^命宮同度的配曜另見((?:${S})(?:、(?:${S}))*)。$`).exec(s))) {
    const l = stars(m[1]!);
    return l ? `命宮には、ほかに${l}も入っています。` : null;
  }
  /* 本盤命宮有破軍化權。 */
  if ((m = new RegExp(`^本盤(${P})宮?有(${S})化([祿權科忌])。$`).exec(s))) {
    const pal = palace(m[1]!), h = hua(m[2]!, m[3]!);
    return pal && h ? `あなたの命盤では、${pal}に${h}があります。` : null;
  }
  /* 本宮見天機化忌。／本宮有天梁化祿。 */
  if ((m = new RegExp(`^本宮(?:見|有)(${S})化([祿權科忌])。$`).exec(s))) {
    const h = hua(m[1]!, m[2]!);
    return h ? `この宮には${h}があります。` : null;
  }
  /* 本宮有貪狼化祿、祿存。（化曜同配曜混合清單） */
  if ((m = new RegExp(`^本宮有((?:${S})(?:化[祿權科忌])?(?:、(?:${S})(?:化[祿權科忌])?)+)。$`).exec(s))) {
    const xs = m[1]!.split('、').map((x) => {
      const r = new RegExp(`^(${S})(?:化([祿權科忌]))?$`).exec(x);
      return r ? (r[2] ? hua(r[1]!, r[2]) : starJa(r[1]!)) : null;
    });
    return xs.every(Boolean) ? `この宮には${listJa(xs as string[])}があります。` : null;
  }
  /* 本宮有祿存。／本宮同度擎羊。 */
  if ((m = new RegExp(`^本宮(?:有|同度)((?:${S})(?:、(?:${S}))*)。$`).exec(s))) {
    const l = stars(m[1]!);
    return l ? `この宮には${l}も入っています。` : null;
  }
  return null;
}
