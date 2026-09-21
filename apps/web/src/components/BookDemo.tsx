'use client';

import { useState } from 'react';
import type { Chart as ZChart } from '@guanwei/ziwei/contract';
import { Book } from '@/components/Book';
import { Chart } from '@/components/Chart';
import { Seal } from '@/components/Seal';
import { BOOK_STATES, SHAPE_OF, type BookState } from '@/lib/book';
import { MARK } from '@/lib/site';

/**
 * 「書」元件嘅活樣板（工單 E2）
 *
 * 呢一版唔係產品，係一張對照表 —— 同 `/tokens` 一樣。
 * 佢存在嘅理由係：**五個狀態要撳得到先睇得出佢係咪真係只用闊度。**
 *
 * 樣板本身就係第四條驗收標準嘅示範：同一個 `<Book>`，
 * 封面／落款／命盤全部係由呢度塞入去嘅 children。
 * 個書唔知入面係乜，佢淨係識由一個形變成另一個形。
 */

const LABEL: Record<BookState, string> = {
  spine: '架上書脊',
  cover: '封面',
  spread: '跨頁',
  titled: '合上題名',
  open: '展開',
};

const NAME = '李文卿';

/** 落款五步（E4）嘅樣，唔係真嘢 —— 真嘢要等 G1。 */
const TI = [
  ['姓　名', NAME],
  ['出生日期', '一九九八年三月十二日'],
  ['時　辰', '辰時'],
  ['出生地', '香港'],
] as const;

const MU = ['序 · 你的命盤', '一 · 命宮', '二 · 兄弟宮', '三 · 夫妻宮', '四 · 子女宮'];

function BlankCover() {
  return (
    <div className="flex h-full flex-col justify-between p-7">
      <span className="font-latin text-cap uppercase tracking-[0.42em] text-ink-3">GUAN WEI</span>
      <div>
        {/* 未題名：得一條虛線，唔係一個 placeholder 名 */}
        <div className="h-px w-28 border-b border-dashed border-rule" />
        <p className="mt-4 font-sans text-cap tracking-[0.16em] text-ink-3">尚未題名</p>
      </div>
    </div>
  );
}

function TitledCover() {
  return (
    <div className="flex h-full flex-col justify-between p-7">
      <span className="font-latin text-cap uppercase tracking-[0.42em] text-ink-3">GUAN WEI</span>
      <div>
        <p className="text-h2 font-semibold tracking-[0.18em]">{NAME}</p>
        <p className="mt-2 text-sm tracking-[0.1em] text-ink-2">命書</p>
        <Seal text={MARK} label="觀微印" className="mt-6" />
      </div>
    </div>
  );
}

function Contents() {
  return (
    <div className="h-full p-7">
      <p className="font-sans text-cap tracking-[0.2em] text-ink-3">目　次</p>
      <ul className="mt-5 flex flex-col gap-3">
        {MU.map((m) => (
          <li key={m} className="border-b jielan pb-2 text-sm tracking-[0.06em] text-ink-2">
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Luokuan() {
  return (
    <div className="h-full p-7">
      <p className="font-sans text-cap tracking-[0.2em] text-ink-3">落　款</p>
      <dl className="mt-5 flex flex-col gap-4">
        {TI.map(([k, v]) => (
          <div key={k} className="border-b jielan pb-2">
            <dt className="font-sans text-cap tracking-[0.16em] text-ink-3">{k}</dt>
            <dd className="mt-1 text-sm tracking-[0.06em]">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Zhengwen() {
  return (
    <div className="h-full p-7">
      <p className="font-sans text-cap tracking-[0.2em] text-ink-3">一 · 命宮</p>
      <p className="mt-5 text-sm leading-[1.95] tracking-[0.02em] text-ink-2">
        這一章讀命宮，也就是你出發時的位置。它描述的是傾向與起點，不是你這個人的全部。
      </p>
      <p className="mt-4 text-sm leading-[1.95] tracking-[0.02em] text-ink-2">
        命宮不是獨立看的。它與遷移宮正對，又與財帛宮、官祿宮連成一組。
      </p>
    </div>
  );
}

export function BookDemo({ chart }: { chart: ZChart }) {
  const [state, setState] = useState<BookState>('spine');
  const [lit, setLit] = useState<number | null>(null);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {BOOK_STATES.map((s) => (
          <button
            key={s}
            type="button"
            className="btn-jie"
            aria-pressed={state === s}
            style={state === s ? { borderColor: 'var(--cinnabar)', color: 'var(--cinnabar)' } : undefined}
            onClick={() => setState(s)}
          >
            {LABEL[s]}
          </button>
        ))}
      </div>

      <p className="mt-4 font-sans text-cap tracking-[0.12em] text-ink-3" data-nums>
        state <code>{state}</code> · shape <code>{SHAPE_OF[state]}</code>
      </p>

      {/* 個書擺喺一條界欄上面 —— 架上、枱面都係一條線（視覺系統 §8） */}
      <div className="mt-10 border-b jielan pb-0">
        <Book
          state={state}
          label={`${NAME}命書`}
          spine={`${NAME}命書`}
          cover={state === 'titled' ? <TitledCover /> : <BlankCover />}
          verso={state === 'open' ? <Zhengwen /> : <Contents />}
          recto={
            state === 'open' ? (
              <div className="flex h-full items-center p-4">
                <Chart
                  chart={chart}
                  selected={lit}
                  onSelect={setLit}
                  maxWidth={400}
                  center={
                    <p className="text-center font-sans text-cap tracking-[0.16em] text-ink-3">
                      {NAME}
                    </p>
                  }
                />
              </div>
            ) : (
              <Luokuan />
            )
          }
        />
      </div>
    </div>
  );
}
