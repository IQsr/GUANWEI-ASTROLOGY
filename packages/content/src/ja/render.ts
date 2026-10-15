import tmRaw from './tm.json';
import { PALACE_JA, listJa, starJa } from './terms';

/* ───────────────────────────────────────────────────────────
 * 日文版：由砌好嘅中文章逐句譯（2026-10-15 · 試做命宮）
 *
 * 同英文（en/render.ts）一樣嘅分工：中文決定講乜，日文只管點講。
 *   一、資料句 → 翻譯表（`tm.json` 嘅 sentences）
 *   二、程式砌出嚟嘅句（「你的命宮坐天同、天梁。」）→ 下面嘅模板
 *
 * 譯唔到嘅句唔會靜靜雞出中文：回 `missing`，測試列晒出嚟。
 * 試做階段模板只得命宮用到嗰幾條；全書要照英文嗰套補（約四五十條）。
 * ─────────────────────────────────────────────────────────── */

const TM = tmRaw as { sentences: Record<string, string> };

export type Rendered = { text: string; missing: string[] };

const sentencesOf = (t: string) => (t.match(/[^。！？]*[。！？]|[^。！？]+/g) ?? []).map((s) => s.trim()).filter(Boolean);

/** 「天同、天梁」→「天同・天梁」；有一粒唔係星就當譯唔到 */
function starsJa(list: string): string | null {
  const xs = list.split('、').map(starJa);
  return xs.every(Boolean) ? listJa(xs as string[]) : null;
}

type Template = { re: RegExp; ja: (m: RegExpExecArray) => string | null };
const TEMPLATES: Template[] = [
  /* 「你的命宮坐天同、天梁。」／「你的夫妻宮坐太陰。」 */
  {
    re: /^你的(\S+?)宮?坐(\S+)。$/,
    ja: (m) => {
      const p = PALACE_JA[m[1]!] ?? PALACE_JA[`${m[1]}宮`];
      const s = starsJa(m[2]!);
      return p && s ? `あなたの${p}には${s}が入っています。` : null;
    },
  },
];

function template(zh: string): string | null {
  for (const t of TEMPLATES) {
    const m = t.re.exec(zh);
    if (m) return t.ja(m);
  }
  return null;
}

const PARA = String.fromCharCode(10, 10);

function paragraphJa(zh: string, missing: string[]): string {
  return sentencesOf(zh)
    .map((s) => TM.sentences[s] ?? template(s) ?? (missing.push(s), `〔${s}〕`))
    .join('');
}

export function renderChapter(zh: string): Rendered {
  const missing: string[] = [];
  const text = zh.split(PARA).map((p) => paragraphJa(p, missing)).join(PARA);
  return { text, missing };
}

/** 翻譯表入面所有日文（畀日文 lint 掃） */
export const allJapanese = (): string[] => Object.entries(TM.sentences).filter(([k]) => !k.startsWith('$')).map(([, v]) => v);
