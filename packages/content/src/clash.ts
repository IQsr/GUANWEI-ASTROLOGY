/*
 * 同一章入面講相反嘅嘢（2026-10-18 · 模擬讀者第 1 項）。
 *
 * 以前 axes.ts 用一張逐宮字表，只捉到七個宮幾組字。而家每句會出書嘅句都標咗「講緊乜方向」
 * （plain/clash.json，十批 sub-agent 標、tools/clash/merge.py 合併）：
 *   a：[軸, +/-, 對象]，例如 [關係, -, 父母]；s：g 一般 / c 帶條件 / p 時期；combo：係唔係組合講法
 *   （宮垣論嘅雙星條文、pairs.json 整合版、格局）。
 *
 * 同一章、同一條軸、同一個對象、方向相反，就係矛盾。點處理（同 Issac 傾好）：
 *   一、組合講法行先，單星講法讓位 —— 兩粒星同宮，原書係當一個組合讀，唔係各自讀完再加埋；
 *   二、帶條件嘅講法係一般講法嘅例外；
 *   三、以上分唔到，就按段嘅優先：細讀 > 結論、開場 > 生活 > 結構、擾動 > 牽動。
 * 輸咗嗰句喺可以剷嘅段（結構、細讀、擾動、牽動）、而下一句冇靠住佢，就剷；
 * 剷唔到（結論、開場、生活係讀者一定讀到、亦唔可以少嘅），就喺後面嗰句加「不過，」講明係另一面。
 * 對象唔同（父母對母親、長輩對上司）唔算矛盾。
 */
import raw from './plain/clash.json';

export type Claim = [axis: string, sign: '+' | '-', object: string];
export type Ann = { a: Claim[]; s: 'g' | 'c' | 'p'; combo: boolean };
const DATA = raw as unknown as Record<string, Ann>;

/* 組裝或者後生讀者處理加落去嘅前綴：查標註前拎走 */
const PREFIX = /^(不過，|但|說到將來的[^，]{1,6}，|如果你有伴侶，|將來，|這(?:十|一)年(?:對你來說)?，|工作上，|錢方面，|感情上，|心境上，)/;
export function annOf(sentence: string): Ann | undefined {
  let s = sentence.trim();
  for (let k = 0; k < 4; k++) {
    const t = s.replace(PREFIX, '');
    if (t === s) break;
    s = t;
  }
  return DATA[s];
}

const PRIORITY: Record<string, number> = { 細讀: 6, 結論: 5, 開場: 5, 生活: 4, 結構: 3, 擾動: 3, 牽動: 2 };
const DROPPABLE = new Set(['結構', '細讀', '擾動', '牽動']);
const SKIP = new Set(['過場', '留白']);
/* 同 test/anaphor.test.ts 嘅 ANAPHOR：下一句用呢啲開頭就係靠住上一句 */
const LEANS = /^(這|那|至於|它的課題|相對地|所以|於是|因此|而|但|也|同樣|卷二那句|不是)/;
const TURNED = /^(不過|但|只是|可是|然而)/;

type Seg = { slot: string; text: string };
type Item = { seg: number; k: number; slot: string; text: string; ann?: Ann; alive: boolean; bridge: boolean };
export type ClashLog = { kept: string; lost: string; how: 'drop' | 'bridge' | 'keep' };

const sentencesOf = (s: string): string[] => s.match(/[^。！？]*[。！？]|[^。！？]+$/g) ?? [];
const opposed = (x: Ann, y: Ann) => x.a.some(([ax, sg, ob]) => y.a.some(([ax2, sg2, ob2]) => ax === ax2 && ob === ob2 && sg !== sg2));

/** 邊句贏：回傳輸嗰個（`a` 喺前、`b` 喺後） */
function loser(a: Item, b: Item): Item {
  if (a.ann!.combo !== b.ann!.combo) return a.ann!.combo ? b : a;
  const ca = a.ann!.s === 'c', cb = b.ann!.s === 'c';
  if (ca !== cb) return ca ? b : a;
  const pa = PRIORITY[a.slot] ?? 1, pb = PRIORITY[b.slot] ?? 1;
  if (pa !== pb) return pa > pb ? b : a;
  return b;
}

/**
 * 處理一章入面相反嘅句，回傳新嘅段同一份紀錄（量度、測試用）。
 * `drop: false`（運限章）：唔剷，只加「不過，」。
 */
export function resolveClashes<T extends Seg>(segments: T[], opts: { drop?: boolean } = {}): { segments: T[]; log: ClashLog[] } {
  const canDrop = opts.drop !== false;
  const items: Item[] = [];
  segments.forEach((seg, i) => {
    if (SKIP.has(seg.slot)) return;
    sentencesOf(seg.text).forEach((t, k) => items.push({ seg: i, k, slot: seg.slot, text: t, ann: annOf(t), alive: true, bridge: false }));
  });
  const log: ClashLog[] = [];
  for (let j = 0; j < items.length; j++) {
    const b = items[j]!;
    if (!b.ann) continue;
    for (let i = 0; i < j && b.alive; i++) {
      const a = items[i]!;
      if (!a.alive || !a.ann || !opposed(a.ann, b.ann)) continue;
      /* 後面嗰句本身已經講明係另一面（「不過同宮還有陀羅，拉向另一邊：⋯」「⋯，只是⋯」）：當處理咗 */
      /* 「再加上X，⋯」係同宮第二粒煞疊加上去（assemble.ts 擾動格；方向真係相反嘅宮已經寫成「拉向另一邊」） */
      if (TURNED.test(b.text) || /但|只是|卻|拉向另一邊/.test(b.text) || (b.slot === '擾動' && a.slot === '擾動')) {
        log.push({ kept: a.text, lost: b.text, how: 'keep' });
        continue;
      }
      const lose = loser(a, b);
      const win = lose === a ? b : a;
      /* 下一句（跨段都算：基塊可以一半喺開場、一半喺結構）靠住佢，就唔剷 */
      const next = items.slice(items.indexOf(lose) + 1).find((x) => x.alive);
      const leanedOn = Boolean(next && LEANS.test(next.text));
      if (canDrop && DROPPABLE.has(lose.slot) && !leanedOn) {
        lose.alive = false;
        log.push({ kept: win.text, lost: lose.text, how: 'drop' });
        continue;
      }
      /* 剷唔到：照留，下面按最終次序睇貼唔貼住 */
      log.push({ kept: win.text, lost: lose.text, how: 'keep' });
    }
  }
  /*
   * 剷完之後按最終次序，兩句貼住而方向相反先加「不過，」講明係另一面（2026-10-18 晚 · 模擬讀者覆檢：
   * 唔貼住加「不過」，前面往往係一句無關嘅事實句，六成讀落突兀）。唔貼住就照留。
   */
  const alive = items.filter((x) => x.alive);
  for (let j = 1; j < alive.length; j++) {
    const a = alive[j - 1]!, b = alive[j]!;
    if (!a.ann || !b.ann || !opposed(a.ann, b.ann)) continue;
    if (TURNED.test(b.text) || /但|只是|卻|拉向另一邊/.test(b.text) || (b.slot === '擾動' && a.slot === '擾動')) continue;
    b.bridge = true;
    log.push({ kept: a.text, lost: b.text, how: 'bridge' });
  }
  const out = segments.map((seg, i) => {
    if (SKIP.has(seg.slot)) return seg;
    let turned = 0;
    const text = items
      .filter((x) => x.seg === i && x.alive)
      .map((x) => (x.bridge ? `${turned++ ? '但' : '不過，'}${x.text}` : x.text))
      .join('');
    return text === seg.text ? seg : { ...seg, text };
  });
  return { segments: out.filter((s) => s.text.trim() !== ''), log };
}
