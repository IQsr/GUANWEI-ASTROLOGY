'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { resumeAction } from '@/app/[locale]/resume';

/**
 * 首頁「續讀《名》」（重新設計第二期）
 *
 * 首頁係靜態、可索引嘅頁，所以唔可以喺 server 度知你有冇書 ——
 * 一烘就變咗所有人共用一份 HTML。掛載之後先問，有先出一行；
 * 冇就乜都唔出，唔留空位。
 */
export function ResumeLink({ template }: { template: string }) {
  const [to, setTo] = useState<{ href: string; label: string } | null>(null);

  useEffect(() => {
    let live = true;
    resumeAction().then(
      (r) => live && setTo(r),
      () => {},
    );
    return () => {
      live = false;
    };
  }, []);

  if (!to) return null;
  return (
    <p className="mt-6">
      <Link href={to.href} className="lian border-night-ink-3 text-night-ink hover:text-night-ink-2">
        {template.replace('{name}', to.label)}
        <span className="btn-jiantou" aria-hidden="true">→</span>
      </Link>
    </p>
  );
}
