import 'server-only';
import {citeOf,citation} from '@guanwei/content';
import {sentences} from './zhu';
import {BookAnalysis,BOOK_ANALYSIS_VERSION,isChapterAnalysis,type ChapterAnalysis,type ChapterDecision,type ClaimLink} from '@guanwei/content/analysis-record';
import {P1_CROSS_RULES,type CrossRule} from '@guanwei/content/engine-p1-cross';
import {P1A_RULES} from '@guanwei/content/engine-p1a';
import {P1B_RULES} from '@guanwei/content/engine-p1b';
import type {Chart} from '@guanwei/ziwei';
import type {ChapterReading} from './chapter-reading';
import type {CrossAnalysis} from './cross-palace-chapters';
import crossCopy from './cross-palace-reading.json';

type Chapter={slug:string;title?:string;text:string;slots:string[];reading?:ChapterReading};
const unique=<T,>(a:readonly T[])=>[...new Set(a)];
const roles:Record<string,string>={'命宮':'本人','性格的骨架':'本人／命宮結構','兄弟':'平輩／知交','夫妻':'伴侶關係','子女':'子女／親近後輩','財帛':'求財／經手／積聚','疾厄':'傳統疾厄材料的適用範圍','遷移':'出外／環境','僕役':'一般下屬／助力','官祿':'工作／責權','田宅':'住居／產業／服務機構','福德':'內在投入／享用','父母':'父母／照顧者／上司','給你的話':'全書已選重點','一生十二步':'過去階段','這十年':'大限','這一年':'流年','序':'出生與排盤背景','身宮與五行局':'後天著力範圍'};
export const chapterFocusId=(slug:string)=>`focus:${slug}:selected`;

/** One trace per new book. The pilot and production overlays consume the same result object. */
export function collectCrossDecisions(ledger:BookAnalysis,cross:CrossAnalysis){
  const prior=[...P1A_RULES,...P1B_RULES];
  for(const result of cross.priorAnalysis.results){
    const rule=prior.find(r=>r.id===result.id)!;
    ledger.pilot(result,[],{when:rule.when,gates:rule.gates??[]});
  }
  for(const result of cross.results){
    const rule=P1_CROSS_RULES.find(r=>r.id===result.id) as CrossRule;
    ledger.pilot(result,[...rule.palaces],{when:rule.when,gates:rule.gates??[],borrow:rule.borrow??null},{borrow:result.borrow,integrity:result.integrity});
  }
}

/** Final paragraph identities are resolved after the existing alignment/ending pass.
 * No text is selected by a score, string prefix such as 本盤, or a test-case identity.
 */
export function attachBookAnalysis(chart:Chart,book:Chapter[],ledger:BookAnalysis):Chapter[]{
  const byChapter=new Map<string,ChapterAnalysis>();
  const output=book.filter(ch=>ch.slug!=='給你的話').map(ch=>attach(ch));
  const ending=book.find(ch=>ch.slug==='給你的話');if(ending)output.push(attach(ending));
  return book.map(ch=>output.find(c=>c.slug===ch.slug)!);

  function attach(ch:Chapter):Chapter{
    const palace=ch.slug==='性格的骨架'?'命宮':ch.slug;
    const layer=ch.slug==='這一年'?'annual':ch.slug==='這十年'?'decade':'natal';
    const legacy=!ch.reading;
    // Retain the old implicit citation lookup for chapters without a rich reading.
    const reading:ChapterReading=ch.reading??{format:'ming-expanded-v1',legacyPresentation:true,
      segments:ch.text.split('\n\n').map((text,i)=>({text,slot:ch.slots[i]??'正文',statements:sentences(text).map((text,j)=>({text,en:'',kind:'interpretation' as const,source_ids:[`legacy.implicit.${ch.slug}.${i}.${j}`],citations:citeOf(text)??[]}))})),international:{text:ch.text,slots:[...ch.slots]}};
    const selectedIds=new Set(reading.segments.flatMap(s=>s.statements?.flatMap(l=>l.source_ids)??[]));
    const decisions=structuredClone(ledger.decisions.filter(d=>d.chapters.includes(palace)));
    const linked=new Map<string,string[]>();
    for(const id of selectedIds){
      const direct=decisions.filter(d=>d.ruleId===id||`${d.ruleId}-base`===id||`${d.ruleId}-follow`===id||`${d.ruleId}-base-fact`===id);
      if(direct.length)linked.set(id,direct.map(d=>d.id));
      const entry=crossCopy.entries.find(e=>e.parts.some((_,i)=>`cross.reading.${e.id}.${i}`===id));
      if(entry){
        const i=entry.parts.findIndex((_,i)=>`cross.reading.${entry.id}.${i}`===id),part=entry.parts[i]!;
        linked.set(id,unique([...entry.requires,...entry.requiredPrior,...part.ruleIds,...part.priorRequired]));
      }
    }
    const used=unique([...linked.values()].flat().concat(reading.segments.flatMap(s=>s.analysisLinks?.decisionIds??[])));
    for(const id of used)if(!decisions.some(d=>d.id===id)){
      const d=ledger.decisions.find(d=>d.id===id);if(!d)throw Error(`Unresolved selected decision ${id}`);decisions.push(structuredClone(d));
    }
    for(const d of decisions)if(used.includes(d.id)){d.presentation='selected';d.presentationReason='referenced by the selected chapter paragraph';}
    const upstreamFocusIds=ch.slug==='性格的骨架'?[chapterFocusId('命宮')]:[];
    if(ch.slug==='給你的話'){
      upstreamFocusIds.push(...reading.segments.flatMap(s=>s.analysisLinks?.upstreamFocusIds??[]));
      // Keep unconsumed pilot traces in the paid closing snapshot, not in the free chapter metadata.
      for(const d of ledger.decisions.filter(d=>!d.chapters.length))if(!decisions.some(v=>v.id===d.id))decisions.push(structuredClone(d));
      const selected=reading.segments.flatMap(s=>s.statements?.flatMap(l=>l.source_ids)??[]).filter(id=>id.startsWith('epilogue.selected.'));
      const names=unique(selected.flatMap(id=>id.slice('epilogue.selected.'.length).split('.'))).filter(name=>byChapter.has(name));
      for(const name of names){
        const upstream=byChapter.get(name)!;upstreamFocusIds.push(chapterFocusId(name));
        for(const d of upstream.decisions)if(!decisions.some(v=>v.id===d.id))decisions.push(structuredClone(d));
      }
    }
    const factIds=unique([...ledger.factsFor(palace),...decisions.flatMap(d=>d.factIds)]);
    const relationIds=unique([...ledger.relations.filter(r=>r.target.palace===palace).map(r=>r.id),...decisions.flatMap(d=>d.relationIds)]);
    const claims:ClaimLink[]=[];
    for(const [segment,s] of reading.segments.entries()){
      const lines=s.statements?.length?s.statements:[null];
      for(const [statement,line] of lines.entries()){
        const role=line?.kind==='evidence'?'fact':line?.kind==='interpretation'?'book-interpretation':'editorial';
        const sourceIds=line?.source_ids??[],citationIds=line?.citations??[];
        let decisionIds=unique(sourceIds.flatMap(id=>linked.get(id)??[]));
        const isAdvice=line?.kind==='editorial-advice'||line?.kind==='editorial-example';
        const isClosing=ch.slug==='給你的話';
        const closingNames=isClosing?(s.analysisLinks?.upstreamFocusIds?.map(id=>id.slice('focus:'.length,-':selected'.length))??unique(sourceIds.filter(id=>id.startsWith('epilogue.selected.')).flatMap(id=>id.slice('epilogue.selected.'.length).split('.')))):[];
        if(isClosing)decisionIds=unique(closingNames.flatMap(name=>byChapter.get(name)?.chapter.focus[0]?.decisionIds??[]));
        if(!decisionIds.length&&(legacy||!line||citationIds.length)&&!isAdvice){
          const ruleId=sourceIds.join('+')||`paragraph-${segment}`;
          const id=`legacy:${ch.slug}:${ruleId}`;
          if(!decisions.some(d=>d.id===id))decisions.push({id,ruleId,adapter:'selected-snapshot',chapters:[ch.slug],layer,timeLayers:ch.slug==='一生十二步'?['natal','decade','annual']:[layer],queryCatalogue:'legacy',kind:'legacy-selection',
            status:'source_pending',presentation:'selected',presentationReason:'existing selected prose retained; executable claim prerequisites not mapped in P0',
            factIds:ledger.factsFor(palace),relationIds:ledger.relations.filter(r=>r.target.palace===palace).map(r=>r.id),sourceIds:citationIds,
            conditions:[...(s.referenceConditions??[]),...(s.referenceApplicability??[])],exceptions:[],requirements:null,
            checks:{selectedSourceIds:sourceIds,legacyPresentation:legacy,timeLayers:ch.slug==='一生十二步'?['natal','decade','annual']:[layer]},qualifiers:['Selection and attached citations are recorded; semantic completeness is not certified.'],coverage:'unmapped'});
          decisionIds=[id];
        }
        if(isAdvice)decisionIds=unique(decisions.filter(d=>d.presentation==='selected').map(d=>d.id));
        if(s.analysisLinks)decisionIds=[...s.analysisLinks.decisionIds];
        claims.push({id:`claim:${ch.slug}:${segment}:${statement}`,segment,statement:line?statement:null,role,
          sourceIds:[...sourceIds],citationIds:[...citationIds],references:[...(s.analysisLinks?.references??[]),...citationIds.filter(id=>!s.analysisLinks?.references?.some(r=>r.citationId===id)).map(citationId=>{
            const blocks=citation(citationId)?.quoteParts?.flatMap(p=>p.blockIds??[p.id])??[];
            const direct=(s.referenceFocus??[]).filter(id=>blocks.includes(id));
            const background=s.referenceBackground?.some(g=>g.citationIds.includes(citationId));
            return {citationId,role:background?'comparison' as const:direct.length?'direct' as const:'legacy-unclassified' as const,blockIds:background?blocks:direct};
          })],focusIds:[chapterFocusId(ch.slug),...closingNames.map(chapterFocusId)],decisionIds,
          review:isAdvice?'editorial':decisionIds.some(id=>decisions.find(d=>d.id===id)?.coverage==='unmapped')?'legacy-unmapped':decisionIds.length?'decision-linked':'editorial'});
      }
    }
    const bodyFocus=reading.segments.flatMap((s,i)=>{
      const rows=claims.filter(c=>c.segment===i);
      if(s.statements?.some(l=>l.kind==='editorial-advice'||l.kind==='editorial-example')||!rows.some(c=>c.citationIds.length||c.role==='book-interpretation'))return [];
      const decisionIds=unique(rows.flatMap(c=>c.decisionIds));
      return [{id:`focus:${ch.slug}:segment-${i}`,question:s.heading??roles[ch.slug]??ch.slug,decisionIds,
        factIds:unique(decisionIds.flatMap(id=>decisions.find(d=>d.id===id)?.factIds??[])),
        qualifiers:unique(decisionIds.flatMap(id=>decisions.find(d=>d.id===id)?.qualifiers??[])),
        relationIds:unique(decisionIds.flatMap(id=>decisions.find(d=>d.id===id)?.relationIds??[]))}];
    });
    for(const c of claims){
      const row=reading.segments[c.segment]!,advice=row.statements?.some(l=>l.kind==='editorial-advice'||l.kind==='editorial-example');
      const own=bodyFocus.filter(f=>f.id===`focus:${ch.slug}:segment-${c.segment}`);
      // A generic advice link is explicitly chapter-scoped; it is not a new sourced astrological claim.
      c.focusIds=unique([...c.focusIds,...(advice?bodyFocus.filter(f=>!row.analysisLinks||f.decisionIds.some(id=>row.analysisLinks!.decisionIds.includes(id))):own).map(f=>f.id)]);
    }
    const chapter:ChapterDecision={chapter:ch.slug,subjectRole:roles[ch.slug]??ch.slug,layer,timeLayers:ch.slug==='一生十二步'?['natal','decade','annual']:[layer],
      focus:[{id:chapterFocusId(ch.slug),question:unique(bodyFocus.map(f=>f.question)).join('；')||roles[ch.slug]||ch.slug,factIds:unique([...factIds,...decisions.flatMap(d=>d.factIds)]),
        decisionIds:decisions.filter(d=>d.presentation==='selected').map(d=>d.id),qualifiers:unique(decisions.flatMap(d=>d.qualifiers)),relationIds},...bodyFocus],
      unresolvedDecisionIds:decisions.filter(d=>d.status==='source_pending'||d.status==='unknown_input').map(d=>d.id),
      validButUnwrittenDecisionIds:decisions.filter(d=>d.presentation==='valid_not_written').map(d=>d.id)};
    const needed=new Set([...chapter.focus.flatMap(f=>f.factIds),...relationIds.flatMap(id=>ledger.relations.find(r=>r.id===id)?.majorFactIds??[])]);
    const snapshot:ChapterAnalysis={version:BOOK_ANALYSIS_VERSION,context:structuredClone(ledger.context),facts:structuredClone(ledger.facts.filter(f=>needed.has(f.id)||f.position.status==='unknown')),
      relations:structuredClone(ledger.relations.filter(r=>relationIds.includes(r.id))),decisions,chapter,claims,upstreamFocusIds:unique(upstreamFocusIds)};
    if(!isChapterAnalysis(snapshot))throw Error(`Invalid new-book analysis: ${ch.slug}`);
    byChapter.set(ch.slug,snapshot);
    return {...ch,reading:{...reading,analysis:snapshot}};
  }
}
