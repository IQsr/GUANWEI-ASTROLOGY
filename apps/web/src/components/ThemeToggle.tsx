'use client';

import { useEffect, useState } from 'react';
import { writeLocal } from '@/lib/local';

type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  const stamped = document.documentElement.dataset.theme;
  if (stamped === 'light' || stamped === 'dark') return stamped;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeToggle({ dayLabel, nightLabel }: { dayLabel: string; nightLabel: string }) {
  // SSR 唔知用戶揀咗乜，所以先出 null，掛載之後先填 —— 避免 hydration 唔一致。
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  function toggle() {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    // 私密視窗、封咗 site data 之下記唔到 —— writeLocal 自己食咗個錯。
    writeLocal('theme', next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="border border-rule px-3 py-1.5 font-sans text-cap tracking-[0.16em] text-ink-2 transition-colors duration-200 ease-ink hover:border-ink-2 hover:text-ink"
    >
      {theme === 'dark' ? dayLabel : nightLabel}
    </button>
  );
}
