'use client';

import { useState, type ReactNode } from 'react';
import { Book } from '@/components/Book';
import { BookFlip } from '@/components/BookFlip';
import { Seal } from '@/components/Seal';
import { MARK } from '@/lib/site';

/**
 * 樣板：而家（`Book`，只准 width）對新版（`BookFlip`，封面繞書脊轉）
 *
 * 兩本書用同一份內容，擺喺同一張夜景桌面上，一上一下比較。
 * 「慢鏡」將新版拉慢三倍，睇清楚起 · 行 · 落同光影。
 */

const NAME = '陳觀微';

function Cover() {
  return (
    <div className="flex h-full flex-col justify-between p-7 ps-10">
      <p className="font-latin text-cap tracking-[0.4em] text-ink-3">GUAN WEI</p>
      <div>
        <p className="font-serif text-h2 font-semibold tracking-[0.18em]">{NAME}</p>
        <p className="mt-2 text-sm tracking-[0.3em] text-ink-2">命書</p>
        <Seal text={MARK} label="觀微印" className="mt-6" />
      </div>
    </div>
  );
}

function Verso() {
  return (
    <div className="font-serif">
      <p className="text-cap tracking-[0.2em] text-ink-3">序 · 你的命盤</p>
      <p className="mt-5 text-sm leading-[2] text-ink-2">
        這一章不講吉凶。它把你出生那一刻換算成一張盤，並且寫明這本書用的是哪一套算法。往後每一章，都從這裡長出來。
      </p>
    </div>
  );
}

function Recto() {
  return (
    <div className="font-serif">
      <p className="text-cap tracking-[0.2em] text-ink-3">一 · 命宮</p>
      <p className="mt-5 text-sm leading-[2] text-ink-2">
        這一章讀命宮，也就是你出發時的位置。它描述的是傾向與起點，不是你這個人的全部。
      </p>
    </div>
  );
}

function Stage({
  title,
  note,
  open,
  setOpen,
  children,
}: {
  title: string;
  note: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="text-h3 font-medium tracking-[0.14em]">{title}</h2>
          <p className="mt-1 text-sm text-ink-3">{note}</p>
        </div>
        <button type="button" className="btn-jie" onClick={() => setOpen(!open)}>
          {open ? '合上' : '揭開'}
        </button>
      </div>
      <div className="py-6">{children}</div>
    </section>
  );
}

export function FanshuDemo() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [slow, setSlow] = useState(false);

  return (
    <div className="flex flex-col gap-16" style={{ ['--fan-slow' as string]: slow ? 3 : 1 }}>
      <label className="flex items-center gap-3 self-end text-sm text-ink-2">
        <input type="checkbox" className="gou" checked={slow} onChange={(e) => setSlow(e.target.checked)} />
        新版慢鏡（×3）
      </label>

      <Stage title="而家" note="兩格闊度一齊變（E2：只准 width、零 3D）" open={a} setOpen={setA}>
        <div className="mu-wei" style={{ minHeight: 0, paddingBottom: 0 }}>
          <Book
            state={a ? 'open' : 'titled'}
            label={`${NAME}命書`}
            cover={<Cover />}
            verso={<div className="p-7"><Verso /></div>}
            recto={<div className="p-7"><Recto /></div>}
          />
        </div>
      </Stage>

      <Stage
        title="新版"
        note="封面繞書脊轉開 · 書脊企定 · 起行落 · 光影同厚度。撳封面或者右邊粒掣都得"
        open={b}
        setOpen={setB}
      >
        <BookFlip
          open={b}
          onToggle={() => setB(true)}
          label={`${NAME}命書`}
          cover={<Cover />}
          verso={<Verso />}
          recto={<Recto />}
        />
      </Stage>
    </div>
  );
}
