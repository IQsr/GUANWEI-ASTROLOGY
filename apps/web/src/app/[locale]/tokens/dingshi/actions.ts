'use server';

import { ENGINE_VERSION, type ShichenIndex } from '@guanwei/ziwei';
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
  type Answer,
  type Question,
} from '@guanwei/content';
import { PLACES } from '@/lib/luokuan';
import { supabaseServer } from '@/lib/supabase.server';

/**
 * 定時辰驗證頁嘅 server action（2026-10-05）
 *
 * 引擎只喺 server 行（check-bundle）。瀏覽器淨係揸住生辰同答案，每一步交返嚟重新計 ——
 * 十二個盤、幾十年嘅預測，一次幾十毫秒，唔使存 session。
 */

export type Birth = { date: string; placeIndex: number; sex: 'male' | 'female'; band: number | null };
export type Asked = { q: Question; a: Answer };

/** 一次試答最多問幾多題（模擬：3 選 1 問 12 題，有把握嗰陣九成九啱） */
const MAX_QUESTIONS = 12;

function setup(b: Birth) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b.date);
  const place = PLACES[b.placeIndex];
  if (!m || !place) return null;
  const only = b.band !== null && b.band >= 0 && b.band <= 3 ? BANDS[b.band] : undefined;
  const cs = candidates(
    {
      solar: { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) },
      tz: place.tz,
      place: { lng: place.lng, lat: place.lat, label: place.label },
      sex: b.sex,
    },
    only,
  );
  if (cs.length === 0) return null;
  const born = cs[0]!.chart.lunar.y;
  /* 十八歲之後到上年（同回看過去一樣）：細個嘅事唔記得，今年未過完 */
  const preds = cs.map((c) => predictions(c.chart, born + 17, new Date().getFullYear() - 1));
  return { cs, born, preds };
}

export async function nextStep(
  b: Birth,
  asked: Asked[],
): Promise<{ ok: false } | { ok: true; done: true } | { ok: true; done: false; q: Question; text: string; n: number; total: number }> {
  const s = setup(b);
  if (!s) return { ok: false };
  if (asked.length >= MAX_QUESTIONS) return { ok: true, done: true };
  const post = posterior(s.preds, asked, RECTIFY_MODEL);
  const q = nextQuestion(s.preds, post, new Set(asked.map((x) => qid(x.q))), RECTIFY_MODEL, questionPool(s.preds));
  if (!q) return { ok: true, done: true };
  return { ok: true, done: false, q, text: questionText(q, s.born), n: asked.length + 1, total: MAX_QUESTIONS };
}

export type Verdict = {
  picked: ShichenIndex;
  confidence: number;
  ranking: { shichen: ShichenIndex; p: number }[];
  /** null = 試用者唔肯定自己時辰 */
  correct: boolean | null;
  saved: boolean;
};

export async function finish(b: Birth, asked: Asked[], trueShichen: number | null): Promise<Verdict | null> {
  const s = setup(b);
  if (!s) return null;
  const post = posterior(s.preds, asked, RECTIFY_MODEL);
  const ranking = s.cs.map((c, i) => ({ shichen: c.shichen, p: post[i]! })).sort((x, y) => y.p - x.p);
  const top = ranking[0]!;
  const truth = trueShichen !== null && trueShichen >= 0 && trueShichen <= 11 ? (trueShichen as ShichenIndex) : null;

  /* 只記得落重新計分要用嘅嘢：年份、方面、答案、邊幾個候選預測「有」。唔記生日、地點。 */
  const answers = asked.map(({ q, a }) => ({
    year: q.year,
    area: q.area,
    a,
    yes: s.cs.filter((_, i) => s.preds[i]!.has(qid(q))).map((c) => c.shichen),
  }));
  let saved = false;
  try {
    const { error } = await supabaseServer().rpc('rectify_record', {
      p_band: b.band,
      p_candidates: s.cs.map((c) => c.shichen),
      p_true: truth,
      p_picked: top.shichen,
      p_confidence: top.p,
      p_answers: answers,
      p_posterior: Object.fromEntries(ranking.map((r) => [String(r.shichen), Number(r.p.toFixed(4))])),
      p_meta: { model: RECTIFY_MODEL, engine: ENGINE_VERSION },
    });
    saved = !error;
    if (error) console.error('[dingshi] 記錄唔到', error.message);
  } catch (e) {
    console.error('[dingshi] 記錄唔到', e);
  }

  return { picked: top.shichen, confidence: top.p, ranking, correct: truth === null ? null : truth === top.shichen, saved };
}
