'use client';

import { useState } from 'react';
import { Book } from '@/components/Book';
import { Juan, type Note } from '@/components/Juan';
import type { MarkedChapter } from '@/lib/zhu';

/**
 * 命書嘅活樣板（工單 F1）
 *
 * 同 `/tokens/shu`、`/tokens/shelf` 一樣係內部參考。
 * 佢存在嘅理由：**註層要撳得到先睇得出佢係咪一段字，唔係一個浮窗。**
 *
 * 十二章喺一版度可以撳來撳去 —— 而術語「全書只標一次」呢條規矩
 * 就係要噉樣先睇得出：喺命宮撳過「紫微」，去到財帛章佢就唔再標點。
 */
export function JuanDemo({
  marked,
  notes,
}: {
  marked: MarkedChapter[];
  notes: Record<string, Note>;
}) {
  const [at, setAt] = useState(0);
  const chapter = marked[at]!;

  const marks = marked.map((c) =>
    c.segments.reduce((n, s) => n + s.runs.filter((r) => r.term).length, 0),
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {marked.map((c, i) => (
          <button
            key={c.palace}
            type="button"
            className="btn-jie"
            aria-pressed={i === at}
            style={i === at ? { borderColor: 'var(--cinnabar)', color: 'var(--cinnabar)' } : undefined}
            onClick={() => setAt(i)}
          >
            {c.palace}
          </button>
        ))}
      </div>

      <p className="mt-4 font-sans text-cap tracking-[0.12em] text-ink-3" data-nums>
        這一章標了 {marks[at]} 個術語 · 全書共 {marks.reduce((a, b) => a + b, 0)} 個
      </p>

      <div className="mt-10">
        <Book
          state="open"
          label={`命書 · ${chapter.palace}`}
          verso={
            <div className="h-full overflow-hidden p-7">
              <p className="font-sans text-cap tracking-[0.2em] text-ink-3">目　次</p>
              <ul className="mt-5 flex flex-col gap-2">
                {marked.map((c, i) => (
                  <li key={c.palace}>
                    <button
                      type="button"
                      className="w-full border-b jielan pb-1.5 text-start text-sm tracking-[0.06em] transition-colors duration-200 ease-ink hover:text-ink"
                      style={i === at ? { color: 'var(--cinnabar)' } : { color: 'var(--ink-2)' }}
                      onClick={() => setAt(i)}
                    >
                      {c.palace}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          }
          recto={
            <div className="h-full overflow-y-auto p-7">
              <p className="font-sans text-cap tracking-[0.2em] text-ink-3">{chapter.palace}</p>
              <div className="mt-5">
                <Juan segments={chapter.segments} notes={notes} />
              </div>
            </div>
          }
        />
      </div>

    </div>
  );
}
