'use client';

import { useState } from 'react';
import { Book } from '@/components/Book';
import { Shelf } from '@/components/Shelf';
import { shelf, type ShelfBook } from '@/lib/shelf';
import { Seal } from '@/components/Seal';
import { MARK } from '@/lib/site';

/**
 * 書架嘅活樣板（工單 E3）
 *
 * 同 `/tokens/shu` 一樣係內部參考。佢存在嘅理由：
 * **空狀態同取書狀態都要撳得到先睇得出佢係咪企得住。**
 */

const BOOKS: Record<string, ShelfBook[]> = {
  空: [],
  一本: [
    { id: 'b1', state: 'titled', name: '李文卿', lastReadAt: null, createdAt: '2026-09-01T00:00:00Z' },
  ],
  四本: [
    { id: 'b1', state: 'titled', name: '李文卿', lastReadAt: '2026-09-14T00:00:00Z', createdAt: '2025-09-01T00:00:00Z' },
    { id: 'b2', state: 'titled', name: '陳映真', lastReadAt: '2026-08-02T00:00:00Z', createdAt: '2026-02-01T00:00:00Z' },
    { id: 'b3', state: 'awaiting', name: '王樹人', lastReadAt: null, createdAt: '2026-07-01T00:00:00Z' },
    { id: 'b4', state: 'blank', name: null, lastReadAt: null, createdAt: '2026-09-10T00:00:00Z' },
  ],
};

const SCENES = Object.keys(BOOKS);

export function ShelfDemo() {
  const [scene, setScene] = useState('四本');
  const [taken, setTaken] = useState<string | null>(null);

  const spines = shelf(BOOKS[scene]!);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {SCENES.map((s) => (
          <button
            key={s}
            type="button"
            className="btn-jie"
            aria-pressed={scene === s}
            style={scene === s ? { borderColor: 'var(--cinnabar)', color: 'var(--cinnabar)' } : undefined}
            onClick={() => {
              setScene(s);
              setTaken(null);
            }}
          >
            {s}
          </button>
        ))}
        {taken ? (
          <button type="button" className="btn-jie" onClick={() => setTaken(null)}>
            放　返
          </button>
        ) : null}
      </div>

      <p className="mt-4 font-sans text-cap tracking-[0.12em] text-ink-3">
        {taken ? '取書：書櫃淡到 16%，但冇消失' : '撳一條書脊試下取書'}
      </p>

      <div className="mt-10">
        <Shelf spines={spines} taken={taken} onTake={setTaken}>
          <Book
            state={taken ? 'cover' : 'spine'}
            label="李文卿命書"
            spine="李文卿命書"
            cover={
              <div className="flex h-full flex-col justify-between p-5">
                <span className="font-latin text-[10px] uppercase tracking-[0.4em] text-ink-3">
                  GUAN WEI
                </span>
                <div>
                  <p className="text-h3 font-semibold tracking-[0.18em]">李文卿</p>
                  <Seal text={MARK} label="觀微印" className="mt-4" />
                </div>
              </div>
            }
          />
        </Shelf>
      </div>
    </div>
  );
}
