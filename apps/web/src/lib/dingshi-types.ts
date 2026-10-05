import type { ShichenIndex } from '@guanwei/ziwei';
import type { Answer, Question } from '@guanwei/content';

/**
 * 定時辰嘅型別（2026-10-05）。獨立一個檔：client 元件同 'use server' 檔都要用，
 * 而 'use server' 檔唔可以 re-export 型別（Turbopack 嘅 server action loader 會當佢係值）。
 */
export type Asked = { q: Question; a: Answer };

export type Step = { done: true } | { done: false; q: Question; text: string; n: number; total: number };

export type Verdict = {
  picked: ShichenIndex;
  confidence: number;
  ranking: { shichen: ShichenIndex; p: number }[];
  /** null = 唔知真時辰 */
  truth: ShichenIndex | null;
  correct: boolean | null;
  saved: boolean;
};
