import { sanFangPalaces, type Chart, type Palace } from '@guanwei/ziwei';

export type ResidualContext = 'borrowed-wutan-wealth' | 'zisha-parents' | 'wutan-wellbeing' | 'tongyin-health' | 'tongyin-parents' | 'tongyin-wealth' | 'borrowed-yangju-career';
type Context = { prose: string; fact?: string; heading?: string; citations?: string[]; conditions?: string[] };

/** Only these reviewed paragraphs vary; native positions never come from a borrowed opposite palace. */
export function palaceResidualContext(chart: Chart, p: Palace, variant: ResidualContext | undefined): Context | null {
  const own = p.stars.filter((s) => s.kind === 'major');
  if (variant === 'borrowed-yangju-career' && p.name === '官祿' && !own.length && p.borrowsFrom) {
    const opposite = chart.palaces.find((q) => q.branch === p.borrowsFrom);
    const borrowed = opposite?.stars.filter((s) => s.kind === 'major') ?? [];
    if (opposite && ['寅','申'].includes(opposite.branch)
      && borrowed.some((s) => s.name === '太陽') && borrowed.some((s) => s.name === '巨門')) return {
      heading: '借陽巨，看怎樣把事情講清、推進',
      fact: `本盤官祿宮在${p.branch}，本宮沒有主星，借對宮${opposite.branch}的太陽、巨門作參照。`,
      prose: '陽巨在原書的基本主題，是口舌、不同背景與對外事務；借到官祿宮，較值得看的不是你說話多不多，而是能否把不同立場、要求和資料連起來，讓事情有下一步。報告有人聽懂、小組知道怎樣分工，或有分歧時找得到可討論的焦點，都是理解這個主題的日常角度。將來看工作方向，也可先看它是否需要說明、交涉和對外接觸，再考慮職業名稱。',
      conditions: ['此段只按本命官祿宮空宮，對宮寅申實坐太陽、巨門的組合主題來讀；不把對宮的四化、輔煞、廟陷或宮支搬成本宮實坐條件。原書巨門化忌、太陽化忌兩支，各須其指定化星及完整配合，不能因借陽巨便套用；吉化成名、異族提拔、太陽落陷及落陷化忌而有吉無四煞刑耗的反向例外，也各按原文條件另讀。說明、協調與日常表現的連繫屬編輯解說，不判定你已具備某種能力，不指定職業或預告成就。'],
    };
  }
  if (variant === 'tongyin-wealth' && p.name === '財帛' && ['子','午'].includes(p.branch)
    && own.some((s) => s.name === '天同') && own.some((s) => s.name === '太陰')
    && own.every((s) => !s.sihua)) return {
    heading: '財源與留下的錢，分開看',
    fact: `本盤財帛宮在${p.branch}，天同、太陰實坐，兩星本身都沒有本命四化。`,
    prose: '原書把子午同陰列為天同守財帛時較利財源的一組；本盤先讀這個求財主題，另列的化祿、化權、化忌結果並非兩星本身已有的配合。放回日常，收到的錢、已經有用途的錢，以及最後能留下的餘額，是三件不同的事。即使一時多了一筆可用的錢，若之後的需要也增加，手上餘額仍未必同步增加；這正是本章把財源與積聚分開看的意思。',
    conditions: ['本段按子午財帛宮實坐天同、太陰，且兩星均無本命四化來讀；三方其他星曜的祿、權、科、忌，不改寫成這兩星本身化祿、化權或化忌。原書天同化祿的破祖後興起、太陰化祿的意外財源、太陰化權的異域發展，以及同陰化忌的難聚，各保留其指定化星與完整配合。無這兩星本命四化，不代表財源固定、必有積蓄或不會損失。收支與餘額的區分屬生活解說，不預告實際收入；不據此採用原書日夜、廟陷或運限的其他分支。'],
  };
  if (variant === 'borrowed-wutan-wealth' && !own.length) return {
    heading: '借武貪，先看所得與投入',
    prose: '這一宮借武貪，先看開拓所得與維持財源的投入。社交或工作帶來機會之後，時間、應酬與後續責任也要接住；所得增加與能否留住成果，因此要分開衡量。',
  };
  if (variant === 'zisha-parents' && own.some((s) => s.name === '紫微') && own.some((s) => s.name === '七殺')) {
    const four = sanFangPalaces(chart.palaces, p.branch);
    const required = [['廉貞','祿'],['破軍','權'],['武曲','科']];
    const together = required.every(([name,hua]) => four.some((q) => q.stars.some((s) => s.name === name && s.sihua === hua)));
    const ke = p.stars.some((s) => s.name === '紫微' && s.sihua === '科');
    return {
      heading: together ? '三項四化同會，照顧多了提攜的支持' : '先看照顧，融洽另有配合',
      fact: together ? '本盤父母宮三方四正見廉貞化祿、破軍化權、武曲化科同會。' : '本盤父母宮三方四正，未見齊廉貞化祿、破軍化權、武曲化科這組配合。',
      prose: together
        ? '原書在紫殺這一支，將三項四化同會列為兩代感情融洽與提攜的支持。這一宮因此不只看責任是否有人承擔，也看照顧怎樣幫你逐步建立能力；得到扶助，仍需要讓自己的想法有表達的位置。'
        : `原書談兩代融洽與提攜時，另有上述三項四化同會的前提。${ke ? '本宮紫微化科，原書又提醒主觀的一面；' : ''}這一宮先按紫殺的責任與照顧主題來讀：實際得到甚麼支持、對方怎樣作安排，以及你的需要有沒有被聽見，須各自觀察。有人照顧，與雙方意見相同，並不是同一件事。`,
      conditions: ['這段只查本命父母宮的實坐紫微、七殺，及三方四正實際所在的廉貞化祿、破軍化權、武曲化科；三項須同時具備。借星參照不視為符合這組實坐條件。紫微化科另按本宮實際有無來讀。'],
    };
  }
  if (variant === 'wutan-wellbeing' && own.some((s) => s.name === '貪狼') && own.some((s) => s.name === '武曲' && s.sihua === '忌')) return {
    heading: '武曲化忌，所得與滿足要分開',
    fact: `本盤武曲在福德宮${p.branch}化忌，與貪狼同宮。`,
    prose: '原書在武曲化忌的一支，把追求財富與精神享受連在一起，也談到物質條件與內心滿足可以不同步。這一宮較值得留意的，是已有成果能否真正帶來滿足，而不只是繼續增加下一個目標。喜歡甚麼是一層，投入之後是否仍有樂趣，又是另一層。',
    citations: ['palace.remaining.v1:wellbeing-武曲'],
    conditions: ['此段採本命武曲、貪狼實坐福德宮，且武曲在本宮化忌；不把對宮化忌借入。原書見煞、天月、天刑、天虛、陰煞、大耗等加重描述，各有其他前提，不能只由武曲化忌推定疾病、癖好或人格。'],
  };
  if (variant === 'tongyin-health') {
    const conditions = ['本段只分本命疾厄宮的實坐與借入：火鈴同度須與本宮實坐同陰同宮，太陰化忌亦須是本宮實坐太陰的本命四化。對宮配曜及四化不因借星搬入；未採某一支，不等於已知身體健康或沒有病患。原書病名與調治語句仍屬傳統術數材料，不作個人診斷或治療建議。'];
    if (!own.length) return {
      heading: '本盤借同陰，先讀基本取象',
      prose: '這張盤的疾厄宮是空宮借同陰，這裡先讀水濕的基本取象。原書另談的濕火與陰虛虧損，分別需要火鈴同度、太陰化忌；本盤沒有因為借入同陰就同時具備這兩種配合。',
      conditions,
    };
    if (own.some((s) => s.name === '天同') && own.some((s) => s.name === '太陰')) {
      const fire = p.stars.filter((s) => s.name === '火星' || s.name === '鈴星').map((s) => s.name);
      const ji = own.some((s) => s.name === '太陰' && s.sihua === '忌');
      const placement = `本盤同陰實坐疾厄宮，${fire.length ? `${fire.join('、')}亦在本宮` : '沒有火星、鈴星同宮'}，太陰${ji ? '在本宮化忌' : '未在本宮化忌'}。`;
      const branches = [
        ...(fire.length ? ['按原書的傳統取象，火鈴同度這一支由水濕轉談濕火與四肢痛楚。'] : []),
        ...(ji ? ['太陰化忌這一支，則另談陰虛虧損。'] : []),
      ];
      return {
        heading: fire.length || ji ? '本宮配合，分清同陰的兩支' : '本盤同陰，先讀水濕的基本取象',
        prose: placement + (branches.join('') || '這裡沿同陰的水濕基本取象來讀；原書另談的濕火、陰虛虧損，各有額外配合，這張盤未採用這兩支。'),
        conditions,
      };
    }
  }
  if (variant === 'tongyin-parents' && p.name === '父母'
    && own.some((s) => s.name === '天同') && own.some((s) => s.name === '太陰')
    && own.every((s) => !s.sihua)
    && ['擎羊','火星'].every((name) => p.stars.some((s) => s.name === name))) return {
    heading: '有感情，仍要談清彼此的要求',
    fact: `本盤父母宮在${p.branch}，天同、太陰與擎羊、火星同宮；天同、太陰本身都沒有本命四化。`,
    prose: '同陰在這裡有感情豐富的一面，羊火同宮亦提醒你留意相處中的分歧。這一宮的重點，是對方的關心、願意幫忙，與是否認同你的決定，未必總是一起出現。談到責任、生活安排或重要選擇時，要留意彼此想要的是支援、陪伴，還是對事情有不同安排；先把要求說清楚，才較容易分辨分歧出在哪裡。',
    conditions: ['此段按父母宮本命實坐天同、太陰，擎羊、火星同宮，且天同、太陰均無本命四化來讀。文昌亦實坐本宮，僅記實際配置，不以一顆文昌抵銷羊火。三方天梁化祿不改寫成天同、太陰本身吉化；原書「吉化而煞重仍主不和」的完整前提另論，不把見兩煞直接等同煞重。借星、只在對宮或三方見羊火、或兩主星帶四化者，不套用此段的本盤說明。關心、要求與決定的區分是編輯解說，並非已知父母的實際態度；原書太陰化忌、刑克分離等句及其條件照存於原引，不由此預告父母存亡。'],
  };
  return null;
}
