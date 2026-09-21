'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { MarkedSegment } from '@/lib/zhu';

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

export function Juan({
  segments,
  notes,
}: {
  segments: MarkedSegment[];
  notes: Record<string, Note>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  /** 撳過就唔再係一個「新嘢」—— 個點退色，但唔會消失（消失會令字跳位）。 */
  const [seen, setSeen] = useState<Set<string>>(() => new Set());

  return (
    <div className="flex flex-col gap-6">
      {segments.map((seg, i) => {
        const shown = seg.runs.find((r) => r.term && open === r.term.id)?.term;
        const note = shown ? notes[shown.id] : undefined;

        return (
          /*
           * ⚠ `data-slot` 唔係一個樣式 hook，係 F2 嗰個觀察點：
           * 右邊個細盤靠佢知道你而家讀緊邊一格（見 lib/suidu.ts）。
           */
          <div key={`${seg.slot}-${i}`} data-slot={seg.slot}>
            <p className="text-body leading-[1.95]">
              {seg.runs.map((run, j) =>
                run.term ? (
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
                    藏經閣 · {note.term}
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
