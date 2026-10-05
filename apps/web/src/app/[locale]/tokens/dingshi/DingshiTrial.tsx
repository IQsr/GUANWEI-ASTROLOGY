'use client';

import { useState, useTransition } from 'react';
import type { Answer, Question } from '@guanwei/content';
import { PLACES } from '@/lib/luokuan';
import { finish, nextStep, type Birth } from './actions';
import type { Asked, Verdict } from '@/lib/dingshi-types';

/** 十二時辰（子時跨兩日，23–1 時） */
const SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const hours = (i: number) => {
  const from = (23 + i * 2) % 24;
  return `${from}–${(from + 2) % 24} 時`;
};
const BAND_LABEL = ['半夜到清晨（23–5 時）', '早上（5–11 時）', '中午到下午（11–17 時）', '傍晚到夜晚（17–23 時）'];

type Stage =
  | { kind: 'form' }
  | { kind: 'ask'; q: Question; text: string; n: number; total: number }
  | { kind: 'truth' }
  | { kind: 'result'; v: Verdict; truth: number | null };

export function DingshiTrial() {
  const [birth, setBirth] = useState<Birth>({ date: '', placeIndex: 0, sex: 'female', band: null });
  const [asked, setAsked] = useState<Asked[]>([]);
  const [stage, setStage] = useState<Stage>({ kind: 'form' });
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  const step = (b: Birth, list: Asked[]) =>
    start(async () => {
      const r = await nextStep(b, list);
      if (!r.ok) {
        setError('排不到盤，請檢查日期。');
        return;
      }
      setError('');
      setStage(r.done ? { kind: 'truth' } : { kind: 'ask', q: r.q, text: r.text, n: r.n, total: r.total });
    });

  const answer = (a: Answer) => {
    if (stage.kind !== 'ask') return;
    const list = [...asked, { q: stage.q, a }];
    setAsked(list);
    step(birth, list);
  };

  const submitTruth = (t: number | null) =>
    start(async () => {
      const v = await finish(birth, asked, t);
      if (!v) {
        setError('計算失敗，請再試。');
        return;
      }
      setStage({ kind: 'result', v, truth: t });
    });

  const restart = () => {
    setAsked([]);
    setBirth({ date: '', placeIndex: 0, sex: 'female', band: null });
    setStage({ kind: 'form' });
  };

  return (
    <div className="banxin mt-10 flex flex-col gap-6" aria-busy={pending}>
      {error ? <p className="text-sm text-[color:var(--zhu,#b0412e)]">{error}</p> : null}

      {stage.kind === 'form' ? (
        <form
          className="ka flex flex-col gap-5 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(birth.date)) {
              setError('請填出生日期。');
              return;
            }
            step(birth, []);
          }}
        >
          <label className="flex flex-col gap-2 text-sm">
            出生日期（西曆）
            <input type="date" required value={birth.date} onChange={(e) => setBirth({ ...birth, date: e.target.value })} className="border jielan bg-transparent px-3 py-2" />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            出生地
            <select value={birth.placeIndex} onChange={(e) => setBirth({ ...birth, placeIndex: Number(e.target.value) })} className="border jielan bg-transparent px-3 py-2">
              {PLACES.map((p, i) => (
                <option key={p.key} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-2">性別</legend>
            <div className="flex gap-6">
              {(['female', 'male'] as const).map((s) => (
                <label key={s} className="flex items-center gap-2">
                  <input type="radio" name="sex" checked={birth.sex === s} onChange={() => setBirth({ ...birth, sex: s })} />
                  {s === 'female' ? '女' : '男'}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-2">大概在甚麼時段出生？（先不要說準確時間）</legend>
            {BAND_LABEL.map((l, i) => (
              <label key={l} className="flex items-center gap-2">
                <input type="radio" name="band" checked={birth.band === i} onChange={() => setBirth({ ...birth, band: i })} />
                {l}
              </label>
            ))}
            <label className="flex items-center gap-2">
              <input type="radio" name="band" checked={birth.band === null} onChange={() => setBirth({ ...birth, band: null })} />
              完全不知道（系統會在十二個時辰裡猜，準確度低很多）
            </label>
          </fieldset>
          <button type="submit" className="btn-mo self-start" disabled={pending}>
            開始
          </button>
        </form>
      ) : null}

      {stage.kind === 'ask' ? (
        <div className="ka flex flex-col gap-5 p-6">
          <p className="text-cap tracking-[0.16em] text-ink-3" data-nums>
            第 {stage.n} / {stage.total} 題
          </p>
          <p className="font-serif text-lead leading-[1.9]">{stage.text}</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-mo" disabled={pending} onClick={() => answer('yes')}>
              有
            </button>
            <button type="button" className="btn-mo" disabled={pending} onClick={() => answer('no')}>
              沒有
            </button>
            <button type="button" className="lian text-sm" disabled={pending} onClick={() => answer('unsure')}>
              不記得
            </button>
          </div>
        </div>
      ) : null}

      {stage.kind === 'truth' ? (
        <div className="ka flex flex-col gap-5 p-6">
          <p className="font-serif text-lead">問完了。現在請告訴我們你真正的出生時辰：</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SHICHEN.map((s, i) => (
              <button key={s} type="button" className="border jielan px-3 py-2 text-sm hover:bg-[color:var(--ink-rule,transparent)]" disabled={pending} onClick={() => submitTruth(i)}>
                {s}時（{hours(i)}）
              </button>
            ))}
          </div>
          <button type="button" className="lian self-start text-sm" disabled={pending} onClick={() => submitTruth(null)}>
            其實我也不肯定
          </button>
        </div>
      ) : null}

      {stage.kind === 'result' ? (
        <div className="ka flex flex-col gap-4 p-6">
          <p className="font-serif text-lead">
            系統猜：{SHICHEN[stage.v.picked]}時（{hours(stage.v.picked)}），把握 {Math.round(stage.v.confidence * 100)}%
          </p>
          {stage.v.correct === null ? (
            <p className="text-sm text-ink-2">你不肯定自己的時辰，這次不計準確度。</p>
          ) : (
            <p className="text-sm">{stage.v.correct ? '✓ 猜對了。' : `✗ 猜錯了，你是${SHICHEN[stage.truth!]}時。`}</p>
          )}
          <ul className="text-sm text-ink-3" data-nums>
            {stage.v.ranking.map((r) => (
              <li key={r.shichen}>
                {SHICHEN[r.shichen]}時　{Math.round(r.p * 100)}%
              </li>
            ))}
          </ul>
          <p className="text-cap text-ink-3">{stage.v.saved ? '結果已記錄，謝謝幫忙。' : '⚠ 結果未能記錄（資料庫未設定？）。'}</p>
          <button type="button" className="btn-mo self-start" onClick={restart}>
            再試一個
          </button>
        </div>
      ) : null}
    </div>
  );
}
