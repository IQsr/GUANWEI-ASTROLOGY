'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { MarkedSegment } from '@/lib/zhu';
import { sectionBreaks } from '@/lib/suidu';

/**
 * 命書正文 ＋ 註層（工單 F1 · 內容系統 §4 · 視覺系統 §6）
 *
 * ── 註層係展開，唔係浮窗 ──
 *
 * 內容 §4：「術語**墨點展開**註層，註層尾連去藏經閣。」
 *
 * 「展開」同「浮窗」差好遠：浮窗係蓋住正文，讀完要撳走；
 * 展開係**版面讓一讓位**，讀完照住讀落去。
 * 一本書冇彈出嘅嘢 —— 佢只有註，而註喺字下面。
 *
 * 亦都因為咁，呢度冇 `position: absolute`、冇 z-index、冇 portal：
 * 一段註就係一段字，插喺嗰一段之後。
 *
 * ⚠ 呢個 component 收嘅係**已經標好嘅**段落（`lib/zhu.ts` 標）。
 * 佢唔知邊個詞要標、亦都攞唔到成個詞條庫 —— 只有呢一章用到嗰幾條註。
 * 咁樣成本詞條庫（兩萬幾字）唔會跟住落 client bundle。
 */

export type Note = {
  id: string;
  term: string;
  /** 詞條摘要（C3 寫嗰陣就係為咗喺呢度用 —— 內容 §4「寫一次用兩次」）。 */
  summary: string;
  href: string;
};

/**
 * 出處（2026-10-12）：句尾「據」字號撳開。同術語註一樣係展開、唔係浮窗。
 * 書名、頁、節、原文照錄 —— 讀者質疑一句，撳開就見到嗰句由邊度嚟。
 */
export type CiteNote = { id: string; book: string; page: number; section: string; text: string };

export function Juan({
  segments,
  notes,
  cites = {},
}: {
  segments: MarkedSegment[];
  notes: Record<string, Note>;
  cites?: Record<string, CiteNote>;
}) {
  const t = useTranslations('chapter');
  const [open, setOpen] = useState<string | null>(null);
  /** 撳過就唔再係一個「新嘢」—— 個點退色，但唔會消失（消失會令字跳位）。 */
  const [seen, setSeen] = useState<Set<string>>(() => new Set());

  const breaks = sectionBreaks(segments.map((s) => s.slot));

  return (
    <div className="wen flex flex-col gap-6">
      {segments.map((seg, i) => {
        const shown = seg.runs.find((r) => r.term && open === r.term.id)?.term;
        const note = shown ? notes[shown.id] : undefined;
        /* 出處嘅 key 帶住段號同 run 號：同一個出處喺兩段都撳得開，唔會兩段一齊開 */
        const citeOpen = seg.runs.findIndex((r, j) => r.cite && open === `cite:${i}:${j}`);
        const citeList = citeOpen >= 0 ? seg.runs[citeOpen]!.cite!.map((id) => cites[id]).filter(Boolean) : [];

        return (
          /*
           * ⚠ `data-slot` 唔係一個樣式 hook，係 F2 嗰個觀察點：
           * 右邊個細盤靠佢知道你而家讀緊邊一格（見 lib/suidu.ts）。
           */
          <div key={`${seg.slot}-${i}`} data-slot={seg.slot}>
            {/* 分節記號：取代以前嘅過場句（lib/suidu.ts `sectionBreaks`）。純裝飾，讀屏唔讀。 */}
            {breaks[i] ? <div className="fen-jie" aria-hidden="true" /> : null}
            <p className="text-body leading-[1.95]">
              {seg.runs.map((run, j) =>
                run.cite ? (
                  <button
                    key={j}
                    type="button"
                    className="ju"
                    aria-expanded={open === `cite:${i}:${j}`}
                    aria-label={t('citeAria')}
                    onClick={() => setOpen((cur) => (cur === `cite:${i}:${j}` ? null : `cite:${i}:${j}`))}
                  >
                    {t('citeMark')}
                  </button>
                ) : run.term ? (
                  <button
                    key={j}
                    type="button"
                    className="zhu"
                    data-seen={seen.has(run.term.id) ? '1' : '0'}
                    aria-expanded={open === run.term!.id}
                    onClick={() => {
                      const id = run.term!.id;
                      setOpen((cur) => (cur === id ? null : id));
                      setSeen((cur) => new Set(cur).add(id));
                    }}
                  >
                    {run.text}
                  </button>
                ) : (
                  <span key={j}>{run.text}</span>
                ),
              )}
            </p>

            {citeList.length ? (
              <div className="zhu-ceng flex flex-col gap-5">
                {citeList.map((c) => (
                  <div key={c!.id} className="flex flex-col gap-2">
                    <p className="font-sans text-cap tracking-[0.08em] text-ink-3">
                      {t('citeWhere', { book: c!.book, page: c!.page, section: c!.section })}
                    </p>
                    <blockquote lang="zh-Hans" className="text-sm leading-[1.9] text-ink-2">
                      {t('citeQuote', { text: c!.text })}
                    </blockquote>
                  </div>
                ))}
              </div>
            ) : null}

            {note ? (
              <div className="zhu-ceng">
                <p className="text-sm leading-[1.9] text-ink-2">{note.summary}</p>
                {/*
                  * 註層尾連去藏經閣（內容 §4）。
                  *
                  * 呢條連結唔係「睇更多」—— 佢係話畀你聽呢句嘢邊度嚟。
                  * 藏經閣嗰版列住原文同出處，撳得入去自己核。
                  */}
                <p className="mt-3 font-sans text-cap tracking-[0.14em]">
                  <Link
                    href={note.href}
                    className="text-indigo transition-colors duration-[240ms] hover:text-ink"
                  >
                    {t('lexiconNote', { term: note.term })}
                  </Link>
                </p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
