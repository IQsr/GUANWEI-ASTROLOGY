'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Answer, Question } from '@guanwei/content';
import { Link } from '@/i18n/navigation';
import { dingshiFinish, dingshiStep } from '@/app/[locale]/book/[bookId]/dingshi/actions';
import type { Asked, Verdict } from '@/lib/dingshi-types';

/**
 * 推算時辰（2026-10-09 · 測試中，Issac 要求寫明）
 *
 * 唔知時辰嘅讀者：揀大概時段（可以「完全不知道」）→ 十二條「某年某方面有冇事」→ 最吻合嘅時辰。
 * 同「溯時」（ShiyanTrial）共用問題、答案、分數嘅字；分別係冇真時辰對答案、唔記錄，
 * 而且由頭到尾掛住「測試中」同免責：模擬得「知時段 85%／完全唔知 51%」，未有真人數據（docs、rectify-sim）。
 */
const fromHour = (i: number) => (23 + i * 2) % 24;
/** 最高分低過呢個就講明「唔可靠」 */
const SURE = 0.5;

type Stage =
  | { kind: 'start' }
  | { kind: 'ask'; q: Question; text: string; n: number; total: number }
  | { kind: 'result'; v: Verdict };

export function DingshiFind({ bookId }: { bookId: string }) {
  const t = useTranslations('dingshi');
  const ts = useTranslations('shiyan');
  const locale = useLocale();
  const bands = ts.raw('bands') as string[];
  const names = ts.raw('shichen') as string[];
  /* -1 = 完全不知道（送 null 去 server：十二個時辰都排） */
  const [band, setBand] = useState<number | null>(null);
  const [asked, setAsked] = useState<Asked[]>([]);
  const [stage, setStage] = useState<Stage>({ kind: 'start' });
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const sentBand = band === null || band < 0 ? null : band;

  const advance = (list: Asked[]) =>
    start(async () => {
      const r = await dingshiStep(bookId, sentBand, list, locale);
      if (!r.ok) {
        setError(true);
        return;
      }
      setError(false);
      if (!r.done) {
        setStage({ kind: 'ask', q: r.q, text: r.text, n: r.n, total: r.total });
        return;
      }
      const v = await dingshiFinish(bookId, sentBand, list);
      if (!v) {
        setError(true);
        return;
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
      {/* 測試中：每一步都見到，唔係淨係開頭講一次 */}
      <p className="ka flex items-start gap-3 p-4 text-sm leading-[1.8] text-ink-2">
        <span className="shrink-0 rounded-sm border border-cinnabar px-2 py-0.5 text-cap text-cinnabar">{t('badge')}</span>
        <span>{t('testing')}</span>
      </p>

      {error ? <p className="text-sm text-ink-2">{ts('error')}</p> : null}

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
            <label className="flex items-center gap-3">
              <input type="radio" name="band" checked={band === -1} onChange={() => setBand(-1)} />
              {t('bandUnknown')}
            </label>
            <p className="mt-1 text-cap text-ink-3">{t('bandHint')}</p>
          </fieldset>
          <button type="button" className="btn-mo self-start" disabled={pending || band === null} onClick={() => advance([])}>
            {t('start')}
            <span className="btn-jiantou" aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}

      {stage.kind === 'ask' ? (
        <div className="ka flex flex-col gap-5 p-6">
          <p className="text-cap tracking-[0.16em] text-ink-3" data-nums>
            {ts('progress', { n: stage.n, total: stage.total })}
          </p>
          <p className="font-serif text-lead leading-[1.9]">{stage.text}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-mo" disabled={pending} onClick={() => answer('yes')}>
              {ts('yes')}
            </button>
            <button type="button" className="btn-mo" disabled={pending} onClick={() => answer('no')}>
              {ts('no')}
            </button>
            <button type="button" className="lian text-sm" disabled={pending} onClick={() => answer('unsure')}>
              {ts('unsure')}
            </button>
          </div>
        </div>
      ) : null}

      {stage.kind === 'result' ? (
        <div className="ka flex flex-col gap-4 p-6">
          <p className="font-serif text-h3 leading-[1.6]">
            {t('guess', { name: names[stage.v.picked]!, from: fromHour(stage.v.picked), to: (fromHour(stage.v.picked) + 2) % 24 })}
          </p>
          <p className="text-cap text-ink-3">{ts('confidence', { p: Math.round(stage.v.confidence * 100) })}</p>
          {stage.v.confidence < SURE ? <p className="text-body text-cinnabar">{t('lowConfidence')}</p> : null}
          <div>
            <p className="text-cap tracking-[0.14em] text-ink-3">{ts('ranking')}</p>
            <ul className="mt-2 text-sm text-ink-2" data-nums>
              {stage.v.ranking.map((r) => (
                <li key={r.shichen}>{ts('rankRow', { name: names[r.shichen]!, p: Math.round(r.p * 100) })}</li>
              ))}
            </ul>
          </div>
          <p className="text-body leading-[1.9] text-ink-2">{t('use', { name: names[stage.v.picked]! })}</p>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/cast" className="btn-mo">
              {t('recast')}
              <span className="btn-jiantou" aria-hidden="true">→</span>
            </Link>
            <Link href={`/book/${bookId}`} className="lian text-sm">
              {t('back')}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
