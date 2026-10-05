'use client';

import { useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import type { Answer, Question } from '@guanwei/content';
import { Link } from '@/i18n/navigation';
import { readLocal, writeLocal } from '@/lib/local';
import { shiyanFinish, shiyanStep } from '@/app/[locale]/book/[bookId]/shiyan/actions';
import type { Asked, Verdict } from '@/lib/dingshi-types';

/**
 * 時辰小實驗（2026-10-05 · 書入面）
 *
 * 揀大概時段 → 十二條「某年某方面有冇事」→ 猜時辰，同本書落款嘅真時間對。
 * 生辰同真時辰由 server 喺本書讀，呢度唔經手。讀者剔咗同意先記錄；同一本書只記一次（`gw-shiyan`）。
 */
const fromHour = (i: number) => (23 + i * 2) % 24;
const near = (a: number, b: number) => Math.abs(a - b) === 1 || Math.abs(a - b) === 11;

type Stage =
  | { kind: 'start' }
  | { kind: 'ask'; q: Question; text: string; n: number; total: number }
  | { kind: 'result'; v: Verdict };

export function ShiyanTrial({ bookId }: { bookId: string }) {
  const t = useTranslations('shiyan');
  const bands = t.raw('bands') as string[];
  const names = t.raw('shichen') as string[];
  const [band, setBand] = useState<number | null>(null);
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [asked, setAsked] = useState<Asked[]>([]);
  const [stage, setStage] = useState<Stage>({ kind: 'start' });
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  /* 呢本書做過就唔再記錄（掛載之後先讀 —— server 唔知讀者部機記咗乜） */
  useEffect(() => {
    setDone((readLocal('shiyan') ?? '').split(',').includes(bookId));
  }, [bookId]);

  const advance = (list: Asked[]) =>
    start(async () => {
      const r = await shiyanStep(bookId, band, list);
      if (!r.ok) {
        setError(true);
        return;
      }
      setError(false);
      if (!r.done) {
        setStage({ kind: 'ask', q: r.q, text: r.text, n: r.n, total: r.total });
        return;
      }
      const record = consent && !done;
      const v = await shiyanFinish(bookId, band, list, record);
      if (!v) {
        setError(true);
        return;
      }
      if (v.saved) {
        const seen = (readLocal('shiyan') ?? '').split(',').filter(Boolean);
        writeLocal('shiyan', [...new Set([...seen, bookId])].slice(-50).join(','));
        setDone(true);
      }
      setStage({ kind: 'result', v });
    });

  const answer = (a: Answer) => {
    if (stage.kind !== 'ask') return;
    const list = [...asked, { q: stage.q, a }];
    setAsked(list);
    advance(list);
  };

  return (
    <div className="banxin flex flex-col gap-6" aria-busy={pending}>
      {error ? <p className="text-sm text-ink-2">{t('error')}</p> : null}

      {stage.kind === 'start' ? (
        <div className="ka flex flex-col gap-5 p-6">
          <p className="text-body leading-[1.95] text-ink-2">{t('intro')}</p>
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-2 font-serif text-lead">{t('bandQ')}</legend>
            {bands.map((l, i) => (
              <label key={l} className="flex items-center gap-3">
                <input type="radio" name="band" checked={band === i} onChange={() => setBand(i)} />
                {l}
              </label>
            ))}
          </fieldset>
          {done ? (
            <p className="text-sm text-ink-3">{t('already')}</p>
          ) : (
            <label className="flex items-start gap-3 text-sm leading-[1.8]">
              <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                {t('consent')}
                <span className="block text-ink-3">{t('consentNote')}</span>
              </span>
            </label>
          )}
          {t('zhNote') ? <p className="text-cap text-ink-3">{t('zhNote')}</p> : null}
          <button type="button" className="btn-mo self-start" disabled={pending || band === null} onClick={() => advance([])}>
            {t('start')}
            <span className="btn-jiantou" aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}

      {stage.kind === 'ask' ? (
        <div className="ka flex flex-col gap-5 p-6">
          <p className="text-cap tracking-[0.16em] text-ink-3" data-nums>
            {t('progress', { n: stage.n, total: stage.total })}
          </p>
          <p className="font-serif text-lead leading-[1.9]">{stage.text}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-mo" disabled={pending} onClick={() => answer('yes')}>
              {t('yes')}
            </button>
            <button type="button" className="btn-mo" disabled={pending} onClick={() => answer('no')}>
              {t('no')}
            </button>
            <button type="button" className="lian text-sm" disabled={pending} onClick={() => answer('unsure')}>
              {t('unsure')}
            </button>
          </div>
        </div>
      ) : null}

      {stage.kind === 'result' ? (
        <div className="ka flex flex-col gap-4 p-6">
          <p className="font-serif text-h3 leading-[1.6]">
            {t('guess', { name: names[stage.v.picked]!, from: fromHour(stage.v.picked), to: (fromHour(stage.v.picked) + 2) % 24 })}
          </p>
          <p className="text-cap text-ink-3">{t('confidence', { p: Math.round(stage.v.confidence * 100) })}</p>
          {stage.v.truth === null ? null : stage.v.correct ? (
            <p className="text-body text-gold-ink">{t('hit', { name: names[stage.v.truth]! })}</p>
          ) : near(stage.v.truth, stage.v.picked) ? (
            <p className="text-body">{t('near', { truth: names[stage.v.truth]!, guess: names[stage.v.picked]! })}</p>
          ) : (
            <p className="text-body">{t('miss', { truth: names[stage.v.truth]! })}</p>
          )}
          {stage.v.truth !== null && !stage.v.ranking.some((r) => r.shichen === stage.v.truth) ? (
            <p className="text-sm text-ink-3">{t('outside')}</p>
          ) : null}
          <div>
            <p className="text-cap tracking-[0.14em] text-ink-3">{t('ranking')}</p>
            <ul className="mt-2 text-sm text-ink-2" data-nums>
              {stage.v.ranking.map((r) => (
                <li key={r.shichen}>{t('rankRow', { name: names[r.shichen]!, p: Math.round(r.p * 100) })}</li>
              ))}
            </ul>
          </div>
          <p className="text-cap text-ink-3">{stage.v.saved ? t('recorded') : t('notRecorded')}</p>
          <Link href={`/book/${bookId}`} className="btn-mo self-start">
            {t('back')}
            <span className="btn-jiantou" aria-hidden="true">→</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
