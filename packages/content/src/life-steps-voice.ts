/** Reader-facing explanations and advice; these do not assert that a past event occurred. */
export const LIFE_STEPS_VOICE = {
  "initiative": {
    "zh": "這一年，機會較需要你主動發掘。把想法整理成可行的計劃、把細節安排好，是你較能使上力的地方。",
    "en": "Opportunities that year called for initiative. Turning ideas into workable plans and arranging the details was a useful way to apply your strengths.",
    "ja": "この年は、自分から機会を探すことが大切でした。考えを実行できる計画にまとめ、細部を整えることに力を使いやすい時期です。"
  },
  "team": {
    "zh": "與人一起做事時，把彼此的期望和分工說清楚，也讓後續的配合更有著落。",
    "en": "When working with others, clarifying expectations and responsibilities gave the collaboration a firmer basis.",
    "ja": "人と一緒に取り組むときは、期待と役割を言葉にしておくと、その後の協力につながります。"
  },
  "pace": {
    "zh": "安排新的投入時，也要留出能停下來整理的空間，讓事情有節奏地推進。",
    "en": "When taking on something new, leaving room to pause and regroup helped set a sustainable pace.",
    "ja": "新しいことに力を注ぐときも、立ち止まって整理する余地を残し、無理のないペースで進めることが大切です。"
  },
  "study": {
    "zh": "這一年，適合把想學、想試的事排出次序，一步一步做出來。跟家人或老師談清楚自己的想法，也有助把眼前的安排接起來。",
    "en": "For that year, it helped to put what you wanted to learn or try in order and work through it step by step. Talking your ideas through with family or teachers could help connect the arrangements around you.",
    "ja": "この年は、学びたいことや試したいことに順番をつけ、一歩ずつ取り組むとよい時期です。家族や先生に自分の考えを伝えることも、日々の段取りをつなぐ助けになります。"
  },
  "planning": {
    "zh": "這一年，較費心的是計劃能否照原來的步伐推進。事情容易有延誤，心思也容易停在反覆推敲上；把已能決定的部分先定下來，會較容易找回節奏。",
    "en": "That year, keeping plans moving at the intended pace could take more thought. Delays and repeated deliberation were possible; settling what could already be decided offered a practical way to regain a rhythm.",
    "ja": "この年は、計画を予定どおり進めることに気力を使いやすい時期でした。遅れや考え直しが生じやすいため、決められる部分を先に決めることが、ペースを取り戻す助けになります。"
  },
  "documents": {
    "zh": "這一年，說清楚與寫清楚要放在一起。與人談好的安排，宜把細節和責任一併確認；涉及文件、申請或承諾，尤其宜確認由你承擔的部分。",
    "en": "That year, clear conversations needed equally clear written arrangements. It helped to confirm details and responsibilities together, especially the obligations you would take on in documents, applications or commitments.",
    "ja": "この年は、口頭の話と書面の内容をそろえることが大切でした。取り決めの細部と責任を確認し、書類や申請、約束で自分が何を引き受けるかを明確にしておくとよい時期です。"
  },
  "resources": {
    "zh": "這一年的重點，是重新衡量原來帶來收入的做法。已有的財源也要看維持它需要多少投入，讓收入、支出和承擔能接得上。",
    "en": "The focus that year was to reassess established ways of earning. Existing income also needed to be weighed against the effort and resources required to sustain it, keeping receipts, spending and commitments aligned.",
    "ja": "この年の要点は、それまで収入につながっていた方法を見直すことでした。収入を保つための投入も含め、収支と負担がつり合うよう整えることが大切です。"
  },
  "opening": {
    "zh": "這一年，原來受阻的地方有了轉圜的可能。較值得把握的，是把重新出現的空間用在能繼續累積的事情上。",
    "en": "That year offered the possibility of an opening where things had been constrained. It was worth using that room for something you could continue to build on.",
    "ja": "この年は、それまで行き詰まっていたところに転じる余地がありました。開けた余地を、続けて積み重ねられることに使うのがよい時期です。"
  }
} as const;

/** Rendering translates sentence by sentence, including already saved paragraphs. */
export function lifeVoiceTranslation(text:string,locale:'en'|'ja'):string|undefined {
  for(const line of Object.values(LIFE_STEPS_VOICE)){
    if(text===line.zh)return line[locale];
    const zh:string[]=line.zh.match(/[^。]+。/g)??[];
    const translated=locale==='en'?line.en.split(/(?<=\.)\s+/):line.ja.match(/[^。]+。/g)??[];
    if(zh.length!==translated.length)throw new Error('Twelve-step voice translation boundary mismatch');
    const index=zh.indexOf(text);if(index>=0)return translated[index];
  }
}
