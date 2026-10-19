import type { Bilingual } from './ming-prose';

/** 逐段另核的條件分支。未列出不表示相反，只表示不在本次出文範圍。 */
export type ExtraProse = { lead?: Bilingual; explanation: Bilingual; standalone?: boolean };
export const EXTRA_PROSE: Record<string, ExtraProse> = {
  'card.ming.pojun-ziwu.newold': {
    lead: { zh: '你有兼行兼業、新舊交接的處事特點。', en: 'Your way of working can involve several roles and the transition between old and new.' },
    explanation: { zh: '已有的事情需要維持，新的方向又要展開，兩邊如何銜接，便成為實際的功課。你可以把開展與維持各需要的時間、責任列清楚，讓新的安排接得住原有的基礎。', en: 'Maintaining an existing task while developing another makes coordination important. Set out the time and responsibilities for both so that the new arrangement can use the existing foundation.' },
  },
  'card.ming.pojun-ziwu.selfmade': {
    explanation: { zh: '需要自己開創，仍可以使用長輩留下的條件。值得保留的是可以支持下一步的基礎，改革則用來處理已不合用的部分。', en: 'Creating something yourself can still use foundations left by elders. Preserve what supports the next step and reform what no longer works.' },
  },
  'card.ming.pojun-ziwu.yuqi': {
    explanation: { zh: '不肯將就可以帶來很大的改動，也可能連帶耗去時間、資源與已有安排。放棄一項東西前，可以先看它是否完全不能用，還是有一部分仍值得留下。', en: 'Refusing to settle can bring major changes and consume time, resources or existing arrangements. Before giving something up, consider whether any part remains useful.' },
  },
  'card.ming.pojun-ziwu.family': {
    lead: { zh: '你與家人的緣分較淡，不少事情需要親力親為。', en: 'Family ties are thinner in this branch, and many things call for your own effort.' },
    explanation: { zh: '可以把自己要承擔的部分提早安排，也把希望得到的配合說明白。親力親為不應被放大成每一段關係都不會支持你，實際相處仍值得逐件商量。', en: 'Prepare what you need to handle yourself and explain the support you would like. This should not be expanded into a claim that every relationship will fail to support you; discuss actual needs individually.' },
  },
  'card.ming.pojun-ziwu.pivot': {
    explanation: { zh: '這些時段與後續發展的關係較大，適合連同當時的具體選擇回看。樞紐只指出影響的重要程度，順逆仍要看所行星曜的完整配合。', en: 'These periods have a greater connection to later development and can be reviewed alongside actual choices. A pivot indicates significance; its direction still depends on the full combination.' },
  },
  'card.ming.jumen-sihai.si': {
    explanation: { zh: '這一面的重點，是讓持續努力與節制逐漸留下成果。可以把自己的生活需要與累積目標說具體，再定期檢查做法是否相符；這裡不推算資產數字或特定投資結果。', en: 'The emphasis is on allowing sustained effort and restraint to leave a result. Clarify living needs and goals, then review whether your methods fit them; this does not estimate assets or investment outcomes.' },
  },
  'card.ming.jumen-sihai.sun-dim': {
    standalone: true,
    explanation: { zh: '表達立場時，除了自己有沒有說清楚，也值得留意對方如何理解。把事實、推測與希望對方配合的部分分開，能讓分歧有較清楚的討論位置。', en: 'When stating a position, consider both what you mean and how it is understood. Separating facts, inferences and requests gives a disagreement a clearer basis for discussion.' },
  },
  'card.ming.jumen-sihai.pivot': {
    standalone: true,
    explanation: { zh: '關鍵在轉變的影響，而不是先替整段時間指定一件必然發生的事。可以留意哪些方向值得保留、哪些安排需要重整，再連同具體條件看進退。', en: 'The importance concerns the effect of change, not a predetermined event for the whole period. Identify directions to preserve and arrangements to reconsider, then assess the actual conditions.' },
  },
  'card.ming.tanlang-ziwu.duanzheng': {
    standalone: true,
    explanation: { zh: '自己想要的東西值得爭取，取得它的方法也值得重視。把原則放在決定之前，往後較容易知道自己願意走到哪裡，也讓實際行動與重視的界線相接。', en: 'What you want can be pursued with care for how it is obtained. Put principles before a decision so that action remains connected to the boundaries you value.' },
  },
  'card.ming.tanlang-ziwu.jiaoji': {
    explanation: { zh: '場面往來是可以運用的一面，值得想清楚每次交流希望了解甚麼、哪些關係值得繼續經營。這份性質本身不保證交往帶來財富，也不代表所有場合都需要投入同樣心力。', en: 'Social exchange is a capacity you can use. Clarify what you want to understand and which relationships deserve further attention. It guarantees neither wealth from socialising nor equal commitment to every occasion.' },
  },
  'card.ming.tanlang-ziwu.pivot': {
    explanation: { zh: '幾段時間各有不同的所行星曜，適合逐段對照，不能只用關鍵兩字把它們說成同一種遭遇。正在經過的部分可以留意選擇，已走過的部分則可以用實際經驗回看。', en: 'The periods involve different stars and should be considered individually, rather than treated as the same experience. Current periods invite attention to choices; past ones can be reviewed against actual experience.' },
  },
};
