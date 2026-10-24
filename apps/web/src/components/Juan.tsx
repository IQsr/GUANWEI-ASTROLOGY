'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { MarkedSegment } from '@/lib/zhu';
import { sectionBreaks } from '@/lib/suidu';
import { keywordMarks, type MarkKind } from '@/lib/guanjian';
import type { Run } from '@/lib/zhu';
import { paragraphCitations, uniqueReferences } from '@/lib/paragraph-citations';
import { referencePresentation, type ReferenceQuotePart } from '@/lib/reference-presentation';

type MarkedRun = Run & { mark?: MarkKind };

/**
 * 將一段嘅 runs 按關鍵字記號切開（`lib/guanjian.ts`）：普通字喺記號邊界切開；
 * 術語、出處唔切 —— 術語成個落喺記號入面先跟記號色，出處永遠唔標。
 */
function withMarks(runs: Run[]): MarkedRun[] {
  const marks = keywordMarks(runs.map((r) => r.text).join(''));
  if (marks.length === 0) return runs;
  const out: MarkedRun[] = [];
  let at = 0;
  for (const r of runs) {
    const from = at;
    const to = at + r.text.length;
    at = to;
    if (r.cite) {
      out.push(r);
      continue;
    }
    if (r.term) {
      const m = marks.find((k) => k.start <= from && k.end >= to);
      out.push(m ? { ...r, mark: m.kind } : r);
      continue;
    }
    /* 普通字：按記號邊界切 */
    let pos = from;
    for (const m of marks) {
      if (m.end <= pos || m.start >= to) continue;
      const a = Math.max(m.start, from);
      const b = Math.min(m.end, to);
      if (a > pos) out.push({ text: r.text.slice(pos - from, a - from) });
      out.push({ text: r.text.slice(a - from, b - from), mark: m.kind });
      pos = b;
    }
    if (pos < to) out.push({ text: r.text.slice(pos - from) });
  }
  return out;
}

/**
 * 命書正文 ＋ 註層（工單 F1 · 內容系統 §4 · 視覺系統 §6）
 *
 * ── 註層係展開，唔係浮窗 ──
 *
 * 內容 §4：「術語**墨點展開**註層，註層尾連去藏經閣。」
 *
 * 「展開」同「浮窗」差好遠：浮窗係蓋住正文，讀完要撳走；
 * 展開係**版面讓一讓位**，讀完照住讀落去。
 * 一本書冇彈出嘅嘢 —— 佢只有註，而註喺字下面。
 *
 * 亦都因為咁，呢度冇 `position: absolute`、冇 z-index、冇 portal：
 * 一段註就係一段字，插喺嗰一段之後。
 *
 * ⚠ 呢個 component 收嘅係**已經標好嘅**段落（`lib/zhu.ts` 標）。
 * 佢唔知邊個詞要標、亦都攞唔到成個詞條庫 —— 只有呢一章用到嗰幾條註。
 * 咁樣成本詞條庫（兩萬幾字）唔會跟住落 client bundle。
 */

export type Note = {
  id: string;
  term: string;
  /** 詞條摘要（C3 寫嗰陣就係為咗喺呢度用 —— 內容 §4「寫一次用兩次」）。 */
  summary: string;
  href: string;
};

/**
 * 每段一個「據」：展開段內去重後的出處、原文及已保存的適用條件。
 * 逐句來源對應仍留在 runs；只合併顯示，不改寫舊書或猜補缺少的條件。
 */
export type CiteNote = { quoteParts?: ReferenceQuotePart[]; id: string; book: string; page: number; pageEnd?: number; section: string; text: string; pageConvention?: 'pdf'; excerpt?: boolean; sourceNote?: string };

export function Juan({
  segments,
  notes,
  cites = {},
}: {
  segments: MarkedSegment[];
  notes: Record<string, Note>;
  cites?: Record<string, CiteNote>;
}) {
  const t = useTranslations('chapter');
  const [open, setOpen] = useState<string | null>(null);
  /** 撳過就唔再係一個「新嘢」—— 個點退色，但唔會消失（消失會令字跳位）。 */
  const [seen, setSeen] = useState<Set<string>>(() => new Set());

  const breaks = sectionBreaks(segments.map((s) => s.slot));

  const quoteText=(c:CiteNote)=>c.quoteParts ? c.quoteParts.map((part)=>part.text).join('\n……\n') : c.text;
  const renderReference=(c:CiteNote & {sharedQuoteCount?:number})=>{
    const text=quoteText(c);
    if(!text && !c.sourceNote)return null;
    const pages=c.quoteParts?.length ? c.quoteParts.flatMap((part)=>[part.page,part.pageEnd??part.page]) : [c.page,c.pageEnd??c.page];
    const first=Math.min(...pages), last=Math.max(...pages);
    return <div key={c.id} className="flex flex-col gap-2">
      {text ? <p className="font-sans text-cap tracking-[0.08em] text-ink-3">
        {t(c.pageConvention==='pdf'?'citePdfWhere':'citeWhere',{book:c.book,page:last>first?`${first}–${last}`:first,section:c.section})}
      </p> : null}
      {text ? <blockquote lang="zh-Hans" className="text-sm leading-[1.9] text-ink-2">{t(c.excerpt?'citeExcerpt':'citeQuote',{text})}</blockquote> : null}
      {c.quoteParts?.filter((part)=>part.note).map((part)=><p key={part.id} className="text-sm leading-[1.9] text-ink-2">{part.note}</p>)}
      {c.sourceNote ? <p className="text-sm leading-[1.9] text-ink-2">{c.sourceNote}</p> : null}
    </div>;
  };


  return (
    <div className="wen flex flex-col gap-6">
      {segments.map((seg, i) => {
        const shown = seg.runs.find((r) => r.term && open === r.term.id)?.term;
        const note = shown ? notes[shown.id] : undefined;
        const paragraph = paragraphCitations(seg.runs);
        const runs = withMarks(paragraph.runs);
        const citeKey = `cite:${i}`;
        const references = uniqueReferences(paragraph.citations.map((id) => cites[id]).filter((c): c is CiteNote => Boolean(c)));
        const panel = referencePresentation(seg.referenceConditions ?? [], references, seg.referenceFocus ?? [], seg.referenceApplicability ?? []);
        const citeList = open === citeKey ? panel.references : [];

        return (
          /*
           * ⚠ `data-slot` 唔係一個樣式 hook，係 F2 嗰個觀察點：
           * 右邊個細盤靠佢知道你而家讀緊邊一格（見 lib/suidu.ts）。
           */
          <div key={`${seg.slot}-${i}`} data-slot={seg.slot}>
            {/* 分節記號：取代以前嘅過場句（lib/suidu.ts `sectionBreaks`）。純裝飾，讀屏唔讀。 */}
            {breaks[i] ? <div className="fen-jie" aria-hidden="true" /> : null}
            {seg.heading ? <h2 className="mb-4 font-serif text-lead tracking-[0.12em] text-ink-2">{seg.heading}</h2> : null}
            <p className="text-body leading-[1.95]">
              {runs.map((run, j) =>
                run.term ? (
                  <Guan key={j} kind={run.mark}>
                  <button
                    key={j}
                    type="button"
                    className="zhu"
                    data-seen={seen.has(run.term.id) ? '1' : '0'}
                    aria-expanded={open === run.term!.id}
                    onClick={() => {
                      const id = run.term!.id;
                      setOpen((cur) => (cur === id ? null : id));
                      setSeen((cur) => new Set(cur).add(id));
                    }}
                  >
                    {run.text}
                  </button>
                  </Guan>
                ) : run.mark ? (
                  <em key={j} className={`guan guan-${run.mark}`}>
                    {run.text}
                  </em>
                ) : (
                  <span key={j}>{run.text}</span>
                ),
              )}
              {references.length ? <button
                type="button"
                className="ju"
                aria-expanded={open === citeKey}
                aria-label={t('citeParagraphAria')}
                onClick={() => setOpen((cur) => (cur === citeKey ? null : citeKey))}
              >{t('citeMark')}</button> : null}
            </p>

            {citeList.length ? (
              <div className="zhu-ceng flex flex-col gap-5">
                {panel.applicability.length ? <section className="flex flex-col gap-2" aria-label={t('citeApplicability')}>
                  <p className="font-sans text-cap tracking-[0.08em] text-ink-3">{t('citeApplicability')}</p>
                  {panel.applicability.map((condition,k) => <p key={k} className="text-sm leading-[1.9] text-ink-2">{condition}</p>)}
                </section> : null}
                {panel.directReferences.length ? <section className="flex flex-col gap-4" aria-label={t('citeDirect')}>
                  <p className="font-sans text-cap tracking-[0.08em] text-ink-3">{t('citeDirect')}</p>
                  {panel.directReferences.map(renderReference)}
                </section> : null}
                {panel.conditions.length ? <div className="flex flex-col gap-2">
                  <p className="font-sans text-cap tracking-[0.08em] text-ink-3">{t('citeConditions')}</p>
                  {panel.conditions.map((condition, k) => <p key={k} className="text-sm leading-[1.9] text-ink-2">{condition}</p>)}
                </div> : null}
                {panel.directReferences.length && citeList.some((c)=>Boolean(quoteText(c))) ? <p className="font-sans text-cap tracking-[0.08em] text-ink-3">{t('citeContext')}</p> : null}
                {citeList.map(renderReference)}
              </div>
            ) : null}

            {note ? (
              <div className="zhu-ceng">
                <p className="text-sm leading-[1.9] text-ink-2">{note.summary}</p>
                {/*
                  * 註層尾連去藏經閣（內容 §4）。
                  *
                  * 呢條連結唔係「睇更多」—— 佢係話畀你聽呢句嘢邊度嚟。
                  * 藏經閣嗰版列住原文同出處，撳得入去自己核。
                  */}
                <p className="mt-3 font-sans text-cap tracking-[0.14em]">
                  <Link
                    href={note.href}
                    className="text-indigo transition-colors duration-[240ms] hover:text-ink"
                  >
                    {t('lexiconNote', { term: note.term })}
                  </Link>
                </p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** 術語成個落喺關鍵字入面：個掣跟記號色 */
function Guan({ kind, children }: { kind?: MarkKind; children: React.ReactNode }) {
  return kind ? <em className={`guan guan-${kind}`}>{children}</em> : <>{children}</>;
}
