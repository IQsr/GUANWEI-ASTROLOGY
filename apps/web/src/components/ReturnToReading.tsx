'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { parseReading, type Reading } from '@/lib/journey';
import { readSession } from '@/lib/local';

/**
 * 藏經閣：「← 回到《章名》」（重新設計第二期）
 *
 * 由正文個註撳入藏經閣，之前係返唔到正文嘅 —— 藏經閣冇返回，
 * 而瀏覽器嘅上一頁唔一定係正文（你可能已經喺藏經閣入面撳咗幾條）。
 *
 * 讀嗰版（`MarkRead`）喺 sessionStorage（`gw-reading`）記低「讀緊邊一章」，呢度讀返。
 * ⚠ 藏經閣係公開、可索引、靜態嘅頁，所以唔可以喺 server 度知你讀緊乜 ——
 * 呢條返回只喺 client 出，冇記錄就乜都唔出，唔會留一個空位。
 */
export function ReturnToReading({ fallback }: { fallback?: { href: string; label: string } }) {
  const [reading, setReading] = useState<Reading | null>(null);

  useEffect(() => {
    setReading(parseReading(readSession('reading')));
  }, []);

  const to = reading ? { href: reading.href, label: `回到《${reading.title}》` } : fallback;
  if (!to) return <span />;

  return (
    <Link
      href={to.href}
      className="font-sans text-cap tracking-[0.2em] text-ink-3 transition-colors duration-200 ease-ink hover:text-ink-2"
    >
      ← {to.label}
    </Link>
  );
}
