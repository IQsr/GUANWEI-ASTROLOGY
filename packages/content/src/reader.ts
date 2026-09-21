/**
 * 讀者版 ＋ 讀感測試材料（工單 C10 嘅真人嗰半）
 *
 * 出處：內容系統 §8
 *
 * 機器嗰半（`barnum.ts`）答得到「兩本書有幾似」，答唔到
 * 「呢句似唔似你」。後者只有真人答得到，而且係唯一測到
 * **啲字有冇料**嘅方法。
 *
 * 呢個檔案唔做測試，佢**印材料** —— 令嗰八至十個人嘅時間唔好浪費喺
 * 排版同對答案上面。
 */
import type { Chapter } from './assemble';
import { sentencesOf } from './barnum';

const ORDER = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];

function ordered(chapters: Chapter[]): Chapter[] {
  return [...chapters].sort((a, b) => ORDER.indexOf(a.palace) - ORDER.indexOf(b.palace));
}

/**
 * 讀者版：淨係文，冇出處、冇插槽名、冇評級。
 *
 * ⚠ 測試用嘅版本**一定唔可以有出處標註**。
 * 見到「base.貪狼.命宮」就知道呢章講貪狼，
 * 而個測試問嘅係「你分唔分得出邊本係你」—— 唔係「你認唔認得出標籤」。
 */
export function readerEdition(chapters: Chapter[], title = '命書'): string {
  const out = [`# ${title}`, ''];
  for (const c of ordered(chapters)) {
    out.push(`## ${c.palace === '僕役' ? '交友' : c.palace}`, '', c.text, '');
  }
  return out.join('\n');
}

/**
 * 逐句標記表。
 *
 * §8：「8–10 人讀自己本書，逐句標『似我／唔似我／唔明』。」
 *
 * 逐句係關鍵 —— 逐章標只會標到「幾似」，而「幾似」正正就係
 * 巴納姆式文案最容易攞到嘅分數。一句一句標，空泛嗰啲就藏唔到。
 */
/**
 * ⚠ 只有**講緊讀者**嗰啲句先標得。
 *
 * 第一次印出嚟嘅標記表，第一句係「這一章讀命宮，也就是你出發時的位置」——
 * 叫人標佢「似我／唔似我」係冇意思嘅：佢唔係一句關於你嘅說話，
 * 佢係一句話你知呢章讀乜嘅說話。
 *
 * 章框（章首、過場）同留白句都係咁。佢哋照樣印喺讀者版度，
 * 但唔入標記表 —— 否則個表會收到一堆冇意義嘅格，
 * 而嗰啲格會溝淡真正有用嗰批（實質判斷嗰幾格）嘅比例。
 */
const CLAIM_SLOTS = new Set(['開場', '結構', '牽動', '擾動']);

export function markingSheet(chapters: Chapter[], label: string): string {
  const out = [
    `# 讀感標記表　${label}`,
    '',
    '逐句標一個：**似我** / **唔似我** / **唔明**。',
    '',
    '- 「似我」＝ 你認得出呢句講緊你，而且你唔覺得佢對邊個都啱',
    '- 「唔似我」＝ 你覺得唔啱，或者你覺得佢對邊個都啱',
    '- 「唔明」＝ 讀唔明，或者要諗一陣先明',
    '',
    '⚠ 唔使勉強揀「似我」。**標「唔似我」對我哋最有用** —— 佢指得出邊句係廢話。',
    '',
    '（書入面嘅導語同結尾問題唔喺呢張表，佢哋唔係講緊你，所以冇得標。）',
    '',
    '---',
    '',
  ];
  let n = 0;
  const closing: string[] = [];
  for (const c of ordered(chapters)) {
    const name = c.palace === '僕役' ? '交友' : c.palace;
    out.push(`## ${name}`, '');
    for (const seg of c.segments) {
      if (!CLAIM_SLOTS.has(seg.slot)) {
        if (seg.slot === '留白') closing.push(`${name}：${seg.text}`);
        continue;
      }
      for (const s of sentencesOf(seg.text)) {
        n++;
        out.push(`${String(n).padStart(3)}. ${s}`, '');
        out.push('　　似我 ☐　唔似我 ☐　唔明 ☐', '');
      }
    }
  }
  /*
   * 留白句唔標「似我」，佢標「想唔想答」——
   * 因為佢係一條問題。一條冇人想答嘅問題，同一句冇人覺得似自己嘅斷語，
   * 係兩種唔同嘅失敗，要分開量。
   */
  out.push('---', '', '## 每章結尾嗰條問題', '',
    '呢啲唔係講你嘅說話，係留返畀你嘅問題。逐條標：**想答** / **冇感覺**。', '');
  for (const t of closing) out.push(`- ${t}`, '', '　　想答 ☐　冇感覺 ☐', '');
  out.push('---', '', `講你嘅句子共 ${n} 句，結尾問題 ${closing.length} 條。`);
  return out.join('\n');
}

/**
 * 巴納姆測試嘅兩本書。
 *
 * §8：「畀每人睇兩本 —— 自己嗰本同一本隨機抽嘅。分唔到＝文案太空泛。
 * 目標：八成人一睇就分到。」
 *
 * ⚠ 兩本要**打亂次序**，而且兩本都要用同一個標題 ——
 * 否則佢係喺分辨排版，唔係喺分辨內容。
 *
 * `swap` 決定咗邊本排前。由呼叫者傳，令答案表同題目表對得返，
 * 亦都令成件事可重現。
 */
export function barnumPair(
  mine: Chapter[],
  theirs: Chapter[],
  swap: boolean,
): { sheet: string; answer: '甲' | '乙' } {
  const [first, second] = swap ? [theirs, mine] : [mine, theirs];
  const sheet = [
    '# 兩本書',
    '',
    '下面兩本書，一本係你嘅，一本係隨機抽嘅另一個人嘅。',
    '兩本都冇標題、冇名、冇出生資料。',
    '',
    '**讀完之後答一條問題：邊本係你？** 同埋寫一句你點解咁揀。',
    '',
    '唔肯定就寫「分唔到」。**分唔到係一個有用嘅答案** —— 佢話我哋知啲字太空泛。',
    '',
    '---',
    '',
    readerEdition(first, '甲'),
    '',
    '---',
    '',
    readerEdition(second, '乙'),
    '',
    '---',
    '',
    '## 你嘅答案',
    '',
    '　揀邊本：甲 ☐　乙 ☐　分唔到 ☐',
    '',
    '　點解：____________________________________________',
    '',
  ].join('\n');
  return { sheet, answer: swap ? '乙' : '甲' };
}

/** 一個參加者嘅全套材料。 */
export function participantPack(
  id: string,
  mine: Chapter[],
  theirs: Chapter[],
  swap: boolean,
): { marking: string; pair: string; answer: '甲' | '乙' } {
  const { sheet, answer } = barnumPair(mine, theirs, swap);
  return { marking: markingSheet(mine, id), pair: sheet, answer };
}
