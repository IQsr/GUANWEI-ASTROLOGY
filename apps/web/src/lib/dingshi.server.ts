import 'server-only';
import { ENGINE_VERSION, type BirthInput, type ShichenIndex } from '@guanwei/ziwei';
import {
  BANDS,
  RECTIFY_MODEL,
  candidates,
  nextQuestion,
  posterior,
  predictions,
  qid,
  questionPool,
  questionText,
} from '@guanwei/content';
import { supabaseServer } from '@/lib/supabase.server';
import type { Asked, Step, Verdict } from '@/lib/dingshi-types';

export type { Asked, Step, Verdict };

/**
 * 定時辰（2026-10-05）：驗證頁（`/tokens/dingshi`）同書入面嘅小實驗（`/book/[id]/shiyan`）共用。
 *
 * 引擎只喺 server 行。瀏覽器淨係揸住答案，每一步交返嚟重新計 —— 十二個盤、幾十年嘅預測，
 * 一次大約一百毫秒，唔使存 session。
 */

/** 一次最多問幾多題（模擬：知時段 3 選 1 問 12 題，有把握嗰陣九成九啱） */
export const MAX_QUESTIONS = 12;

export type Prepared = ReturnType<typeof prepare>;

const AREAS = new Set(['工作', '錢', '感情', '遷移', '家', '身體', 'turn']);
const ANSWERS = new Set(['yes', 'no', 'unsure']);

/**
 * 瀏覽器交返嚟嘅答案（server action 係公開 endpoint，收到乜都得）：
 * 形狀唔啱嘅剷走、重複嘅題剷走、最多 MAX_QUESTIONS 題 —— 唔畀人塞一大堆嘢入嚟拖慢計分或者寫入。
 */
export function cleanAsked(raw: unknown): Asked[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Asked[] = [];
  for (const x of raw.slice(0, MAX_QUESTIONS * 2)) {
    const q = (x as { q?: { year?: unknown; area?: unknown } })?.q;
    const a = (x as { a?: unknown })?.a;
    if (!q || !Number.isInteger(q.year) || (q.year as number) < 1900 || (q.year as number) > 2100) continue;
    if (typeof q.area !== 'string' || !AREAS.has(q.area) || typeof a !== 'string' || !ANSWERS.has(a)) continue;
    const item = { q: { year: q.year as number, area: q.area }, a } as Asked;
    if (seen.has(qid(item.q))) continue;
    seen.add(qid(item.q));
    out.push(item);
    if (out.length >= MAX_QUESTIONS) break;
  }
  return out;
}

/** 排候選盤、計每個盤由十八歲到上年嘅預測。`band` = 0–3 大概時段，null = 唔知。 */
export function prepare(input: Omit<BirthInput, 'time'>, band: number | null) {
  const only = band !== null && band >= 0 && band <= 3 ? BANDS[band] : undefined;
  const cs = candidates(input, only);
  if (cs.length === 0) return null;
  const born = cs[0]!.chart.lunar.y;
  /* 十八歲之後到上年（同回看過去一樣）：細個嘅事唔記得，今年未過完 */
  const preds = cs.map((c) => predictions(c.chart, born + 17, new Date().getFullYear() - 1));
  return { band: only ? band : null, cs, born, preds };
}

export function step(p: NonNullable<Prepared>, asked: Asked[], lang: 'zh' | 'en' = 'zh'): Step {
  if (asked.length >= MAX_QUESTIONS) return { done: true };
  const post = posterior(p.preds, asked, RECTIFY_MODEL);
  const q = nextQuestion(p.preds, post, new Set(asked.map((x) => qid(x.q))), RECTIFY_MODEL, questionPool(p.preds));
  if (!q) return { done: true };
  return { done: false, q, text: questionText(q, p.born, lang), n: asked.length + 1, total: MAX_QUESTIONS };
}

/**
 * 計結果；`record` 先寫入 `rectify_trials`（0003）。
 * 只記重新計分要用嘅嘢：年份、方面、答案、邊幾個候選預測「有」。唔記生日、地點、名、書。
 */
export async function verdict(
  p: NonNullable<Prepared>,
  asked: Asked[],
  truth: ShichenIndex | null,
  /* 0005：要有一本自己嘅書先記得（真時辰由 DB 讀盤，每本書只記第一次）；冇書（/tokens）唔記 */
  opts: { record: boolean; source: 'tokens' | 'book'; bookId?: string },
): Promise<Verdict> {
  const post = posterior(p.preds, asked, RECTIFY_MODEL);
  const ranking = p.cs.map((c, i) => ({ shichen: c.shichen, p: post[i]! })).sort((x, y) => y.p - x.p);
  const top = ranking[0]!;
  let saved = false;
  if (opts.record && opts.bookId) {
    const answers = asked.map(({ q, a }) => ({
      year: q.year,
      area: q.area,
      a,
      yes: p.cs.filter((_, i) => p.preds[i]!.has(qid(q))).map((c) => c.shichen),
    }));
    try {
      const { data, error } = await supabaseServer().rpc('rectify_record', {
        p_book: opts.bookId,
        p_band: p.band,
        p_candidates: p.cs.map((c) => c.shichen),
        p_picked: top.shichen,
        p_confidence: top.p,
        p_answers: answers,
        p_posterior: Object.fromEntries(ranking.map((r) => [String(r.shichen), Number(r.p.toFixed(4))])),
        p_meta: { model: RECTIFY_MODEL, engine: ENGINE_VERSION, source: opts.source },
      });
      /* null = 呢本書記過喇（或者唔係你本書）：唔當失敗，只係冇新紀錄 */
      saved = !error && data !== null;
      if (error) console.error('[dingshi] 記錄唔到', error.message);
    } catch (e) {
      console.error('[dingshi] 記錄唔到', e);
    }
  }
  return {
    picked: top.shichen,
    confidence: top.p,
    ranking,
    truth,
    correct: truth === null ? null : truth === top.shichen,
    saved,
  };
}

/**
 * 書入面嘅小實驗：由本書攞生辰同真時辰（RLS：淨係本書主人讀得到）。
 * 冇盤（待時辰）、冇時間 → null：唔知真時辰就冇得對答案，唔做。
 */
export async function bookBirth(bookId: string): Promise<{ input: Omit<BirthInput, 'time'>; truth: ShichenIndex } | null> {
  const sb = supabaseServer();
  /* 未登入：0004 起讀表係 permission denied，唔係空 —— 先問 */
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await sb
    .from('books')
    .select('subjects(birth_date, birth_time, birth_tz, birth_place, lng, lat, sex), charts(payload)')
    .eq('id', bookId)
    .maybeSingle();
  if (error) throw error;
  const one = <T,>(x: T | T[] | null | undefined) => (Array.isArray(x) ? x[0] : x) ?? null;
  const s = one(data?.subjects as Record<string, unknown> | Record<string, unknown>[] | null);
  const c = one(data?.charts as { payload: unknown } | { payload: unknown }[] | null);
  const shichen = (c?.payload as { lunar?: { shichen?: number } } | null)?.lunar?.shichen;
  if (!s || !s.birth_time || typeof shichen !== 'number') return null;
  const [y, m, d] = String(s.birth_date).split('-').map(Number);
  return {
    input: {
      solar: { y: y!, m: m!, d: d! },
      tz: String(s.birth_tz),
      place: { lng: Number(s.lng), lat: Number(s.lat), label: String(s.birth_place) },
      sex: s.sex === 'male' ? 'male' : 'female',
    },
    truth: shichen as ShichenIndex,
  };
}
