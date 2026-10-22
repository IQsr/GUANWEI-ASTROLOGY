import { sanFangPalaces, type Chart, type Palace } from '@guanwei/ziwei';
import { isYouthReader } from './youth';
import type { FreeReadingSegment } from './free-ming-reader';
import type { MingStatement } from './ming-writer';
import data from './cards/palace-readings.json';

type Profile = { star: string; heading: string; text: string; detail: string; sources: string[]; conditions: string[] };
type Entry = { palace: string; title: string; boundary: string; boundarySources: string[]; advice: string; profiles: Profile[] };
const entries = new Map((data.palaces as Entry[]).map((p) => [p.palace, p]));
const majors = new Set(data.palaces[0]!.profiles.map((p) => p.star));
const ownMajors = (p: Palace) => p.stars.filter((s) => majors.has(s.name));
const nameOf = (name: string) => name.endsWith('宮') ? name : `${name}宮`;
const line = (text: string, kind: MingStatement['kind'], id: string, sources: string[] = []): MingStatement => ({
  text, en: '', kind, source_ids: [id], citations: sources.map(palaceReadingCiteId),
});

/** 新引用命名空間不覆寫舊書所用摘引。 */
export const palaceReadingCiteId = (id: string) => `palace.reading.v1:${id}`;
const sources = new Map(Object.entries(data.sources).map(([id, source]) => [palaceReadingCiteId(id), source]));
export const palaceReadingSource = (id: string) => sources.get(id) ?? null;
export const PALACE_READER_PALACES = data.palaces.map((p) => p.palace);

/** 成書時寫入；主題段不冒充整組個人分支，明確細分只用已核條件。 */
export function palaceReading(chart: Chart, palace: string, year: number): FreeReadingSegment[] | null {
  const entry = entries.get(palace);
  const p = chart.palaces.find((q) => q.name === palace);
  if (!entry || !p) return null;
  const own = ownMajors(p);
  const opposite = !own.length && p.borrowsFrom ? chart.palaces.find((q) => q.branch === p.borrowsFrom) : undefined;
  const borrowed = own.length === 0;
  const chosen = own.length ? own : opposite ? ownMajors(opposite) : [];
  if (!chosen.length) throw Error(`No primary stars for palace reading: ${palace}`);
  const label = nameOf(palace);
  const names = chosen.map((s) => s.name);
  const fact = borrowed
    ? `你的${label}在${p.branch}，本宮沒有主星，借對宮${p.borrowsFrom}的${names.join('、')}作參照。`
    : `你的${label}在${p.branch}，${names.join('、')}${names.length === 2 ? '同宮' : '坐守'}。`;
  const conditions = [
    fact,
    borrowed ? '以下只參照原書實坐篇的主題，未把對宮的四化、配曜、夾宮及三方條件搬成本宮已成立。'
      : names.length === 2 ? '兩星在本宮同坐；以下分開交代原書兩節的主題與限制，不把兩條單星說法相加為整組的個人結論。'
        : '以下是本宮主星的原書主題及條件比較；除另列可確認分支外，沒有把各種條件都當成本盤成立。',
    '本段只談本命。引文若兼述大限、流年、日夜、廟陷或特定組合，須各按所列前提，未推某年事件。',
  ];
  const segment = (id: string, heading: string, text: string, refs: string[], extra: string[] = [], prefix = '', kind: MingStatement['kind'] = 'editorial-explanation'): FreeReadingSegment => ({
    slot: prefix ? '結論' : kind === 'editorial-advice' ? '做法' : '細讀', heading, text: prefix + text,
    ...(refs.length ? { referenceConditions: [...conditions, ...extra] } : {}),
    statements: [...(prefix ? [line(prefix, 'evidence', `${id}-fact`)] : []), line(text, kind, id, refs)],
  });
  const profiles = names.map((star) => {
    const profile = entry.profiles.find((r) => r.star === star);
    if (!profile) throw Error(`Missing palace profile: ${palace}/${star}`);
    return profile;
  });
  let out: FreeReadingSegment[];
  if (profiles.length === 1) {
    const r = profiles[0]!;
    out = [segment(`${palace}-${r.star}-theme`, r.heading, r.text, r.sources, r.conditions, fact),
      segment(`${palace}-${r.star}-limits`, '要連哪些條件一起讀', r.detail, r.sources, r.conditions)];
  } else {
    out = profiles.map((r, i) => segment(`${palace}-${r.star}-theme`, r.heading, r.text + r.detail, r.sources, r.conditions, i ? '' : fact));
  }

  // 兩組已核示範：實際條件逐項選段；借入不觸發、沒有條件不猜相反結果。
  if (!borrowed && names.length === 1 && palace === '財帛' && names[0] === '太陰' && ['辰', '戌'].includes(p.branch)) {
    const four = sanFangPalaces(chart.palaces, p.branch);
    const actual = four.filter((q) => !q.borrowsFrom);
    const sun = four.find((q) => q.branch !== p.branch && q.stars.some((s) => s.name === '太陽'));
    // 辰戌結構要求太陽實坐對宮，不能僅憑四方搜尋到太陽。
    const oppSun = sun?.name === '福德' && !sun.borrowsFrom && sun.stars.some((s) => s.name === '太陽' && s.sihua === '祿');
    const tongJi = actual.find((q) => q.stars.some((s) => s.name === '天同' && s.sihua === '忌'));
    out = [segment('wealth-taiyin-base', '先分清規劃與累積',
      '太陰在財帛章，原書重點是計劃、運用與累積，並用投資計劃者和執行者作區分。這是在說求財性質，未能直接證明你平日喜歡儲錢。',
      [data.special['wealth-taiyin-base']], ['廟陷與日夜會改變求財負荷；經手的錢不等於全部屬於自己。'], fact)];
    if (oppSun || tongJi) {
      const parts = [
        ...(oppSun ? ['本盤對宮太陽化祿。原書在辰戌太陰的這一分支，談先建立地位而後得財，並以先任職、後自創作一般例子。'] : []),
        ...(tongJi ? [`${oppSun ? '但你的' : '你的'}${nameOf(tongJi.name)}天同化忌在財帛宮三方四正，原書同時保留勞心勞力求財的修飾。`] : []),
        '這裡將機會與負荷一起讀，未把它改成你必須創業，亦未認定這就是你的工作經歷。',
      ];
      out.push(segment('wealth-taiyin-chenxu', '機會與所花心力一起看', parts.join(''), [data.special['wealth-taiyin-chenxu']], [
        ...(oppSun ? [`太陽本命化祿實坐對宮${sun!.branch}。`] : []),
        ...(tongJi ? [`天同本命化忌實坐${nameOf(tongJi.name)}${tongJi.branch}，不是借入四化。`] : []),
        '辰宮反背成富格仍須祿權科會且見吉曜；沒有用單一太陽祿代替整組條件。太陰祿、天機祿與天同祿各屬其他分支。',
      ], '', 'interpretation'));
    }
    const kongjie = p.stars.filter((s) => ['地空', '地劫'].includes(s.name)).map((s) => s.name);
    if (kongjie.length) out.push(segment('wealth-kongjie', '變化的提醒，不是損失預告',
      `本宮另有${kongjie.join('、')}同坐。原書將空劫在財帛的基本作用，寫作突然出現挫折性的變化；這裡保留這一項修飾，沒有把它推成你害怕花錢，也沒有指定損失金額、原因或發生年份。`,
      [data.special['wealth-kongjie']], [`${kongjie.join('、')}實坐財帛宮，未把會照當同宮。`, '引文後半有原PDF疑字，未採其不明四化條件，亦不從首句推定破產或嚴重損失。'], '', 'interpretation'));
    if (out.length === 1) out.push(segment('wealth-taiyin-general-limits', '要連哪些條件一起讀', profiles[0]!.detail,
      profiles[0]!.sources, profiles[0]!.conditions));
  }
  if (!borrowed && names.length === 1 && palace === '官祿' && names[0] === '天機' && ['子', '午'].includes(p.branch)) {
    const four = sanFangPalaces(chart.palaces, p.branch);
    const oppositeGiant = chart.palaces.find((q) => q.name === '夫妻');
    if (oppositeGiant && !oppositeGiant.borrowsFrom && ownMajors(oppositeGiant).some((s) => s.name === '巨門')) {
      const observed = four.filter((q) => !q.borrowsFrom).flatMap((q) => q.stars.flatMap((s) =>
        (s.sihua === '忌' || ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'].includes(s.name))
          ? [{ label: s.sihua === '忌' ? `${s.name}化忌` : s.name, where: `${nameOf(q.name)}${q.branch}${q === p ? '同宮' : '會照'}` }] : []));
      out = [segment('career-tianji-base', '先看工作的日常，再看職稱',
        '你的官祿宮坐天機，工作的變動性是這章的主要線索。原書用客戶不固定的零售業，以及交通、旅遊、傳播等行業作例子。這裡所看的，是工作如何回應不同客戶、需求與情況；一份工作的日常內容，會比職稱本身更能幫你對照這項性質。',
        [data.special['career-tianji-base']], ['本段沒有從四方見火鈴採用「火鈴同度」分支；天機化權須先經改變的例外亦保留。']),
      segment('career-tianji-ziwu-load', '轉變以後，仍要持續經營',
        `你這張盤，還有一層需要保留：工作即使出現好的條件，也仍要花心思經營。天機獨坐${p.branch}、對宮巨門，原書本來就有這項提醒。${observed.length ? `本盤三方四正另見${observed.map((s) => s.label).join('、')}，因此工作受環境牽動、需要奔波處理的修飾，也要一起看。` : ''}這章所談的負荷，包括轉變之後如何把事情維持下去，不能只用「適應力強」概括。`,
        [data.special['career-tianji-ziwu-load']], ['天機實坐子午，巨門實坐對宮；即使見吉仍費心。',
          ...(observed.length ? [`本盤實際坐曜位置：${observed.map((s) => `${s.label}在${s.where}`).join('；')}。`,
            '以上只按本條「見煞忌」採修飾；會照的火鈴或空劫，沒有當成與天機同度。'] : [])], '', 'interpretation'),
      segment('career-tianji-ziwu-limit', '應對變動，與從零開創要分開看',
        '這組子午天機形成的機月同梁結構，原書另有「創業之力薄弱」的提醒。這項限制要與前面的變動性一起讀：工作可以需要調整，卻不代表每次調整都適合從零另起爐灶。它提醒的是開創新事業這一面的限制，不能直接當成你整體工作能力的評分，亦不足以替你決定必須受僱或必須創業。',
        [data.special['career-tianji-ziwu-limit']], ['僅採天機獨坐子午的結構限制；不是一切天機組合的通則。', '午宮承繼父業、入大機構屬午宮分支；子宮沒有直接採用。原PDF性格疑字不建立個人規則。'])];
    }
  }
  // 每章邊界一段；只作原書方法說明，與個人已成立條件分開。
  out.push(segment(`${palace}-scope`, '這章要一起考慮的地方', entry.boundary, entry.boundarySources, ['本段是原書的判讀範圍，不是另一條個人結果。']));
  const youth = isYouthReader(chart, year);
  const advice = youth
    ? '你仍在成長，工作、伴侶、子女與資產可以先當作日後才會接觸的主題，毋須用現在的生活硬套。可以記下哪段有共鳴、哪段不像你，並保留不適用的情況。這是編輯提供的閱讀方法。'
    : entry.advice;
  out.push(segment(`${palace}-advice`, '可以怎樣對照生活', advice, [], [], '', 'editorial-advice'));
  out[0]!.slot = '結論';
  return out;
}
