'use client';

import { useState } from 'react';
import { Chart } from '@/components/Chart';
import { Zhanjuan } from '@/components/Zhanjuan';
import { ZHANJUAN_MS } from '@/lib/zhanjuan';
import type { Chart as ZChart } from '@guanwei/ziwei/contract';

/**
 * 展卷嘅活樣板（工單 E6）
 *
 * 呢一幕喺真流程入面要行完五步落款先見到，所以擺一版撳得到嘅 ——
 * 一段淨係播一次嘅動效，冇得重播就驗唔到。
 */
export function ZhanjuanDemo({ chart }: { chart: ZChart }) {
  const [run, setRun] = useState(0);
  const [lit, setLit] = useState<number | null>(null);

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-4">
        <button type="button" className="btn-jie" onClick={() => setRun((n) => n + 1)}>
          再　展　一　次
        </button>
        <p className="font-sans text-cap tracking-[0.12em] text-ink-3" data-nums>
          界欄十二條 · 每條 240ms · 相隔 90ms · 成幕 {ZHANJUAN_MS}ms
        </p>
      </div>

      <div className="mt-10 w-full" style={{ maxWidth: 760 }}>
        <Zhanjuan key={run}>
          <Chart
            chart={chart}
            selected={lit}
            onSelect={setLit}
            maxWidth={760}
            center={
              <p className="text-center font-sans text-cap tracking-[0.16em] text-ink-3">
                展卷
              </p>
            }
          />
        </Zhanjuan>
      </div>
    </div>
  );
}
