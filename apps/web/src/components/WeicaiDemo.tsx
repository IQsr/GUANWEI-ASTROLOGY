'use client';

import { useState } from 'react';
import { Caikai } from '@/components/Caikai';
import { Weicai } from '@/components/Weicai';

const SLOTS = ['開場', '結構', '牽動', '擾動', '留白'];

const BODY = [
  '這一章讀兄弟宮。它看的是你與平輩之間的相處結構，不評斷誰對誰錯，也不代手足本人發言。',
  '太陰在兄弟宮，照顧的方向多半是往內的：你傾向先把事情理順，再讓別人知道。',
  '兄弟宮與交友、田宅同屬一組。你怎樣與平輩相處、跟誰來往、住在哪裡，是同一件事的三面。',
  '值得你自己看的是：上一次跟平輩開口求助，是什麼時候。',
];

/**
 * 未裁之頁嘅活樣板（工單 F4）
 *
 * ⚠ 呢度粒掣係**樣板專用**。真嗰條路冇呢粒掣 ——
 * 一章裁得開未係 `cut_page()` 答嘅（0006），唔係撳出嚟嘅。
 */
export function WeicaiDemo() {
  const [cut, setCut] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" className="btn-jie" onClick={() => setCut(false)} data-demo="uncut">
          未裁
        </button>
        <button type="button" className="btn-jie" onClick={() => setCut(true)} data-demo="cut">
          裁開（播一次）
        </button>
      </div>

      <div className="mt-10">
        {cut ? (
          <Caikai key="cut" play>
            <div className="max-w-banxin">
              <p className="font-sans text-cap tracking-[0.2em] text-ink-3">二 · 兄弟</p>
              <div className="mt-5 flex flex-col gap-6">
                {BODY.map((t, i) => (
                  <p key={i} className="text-body leading-[1.95]">
                    {t}
                  </p>
                ))}
              </div>
            </div>
          </Caikai>
        ) : (
          <Weicai title="二 · 兄弟" slots={SLOTS} bookId="demo" isAnonymous={false} />
        )}
      </div>
    </div>
  );
}
