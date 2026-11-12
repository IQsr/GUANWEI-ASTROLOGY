import {it,expect} from 'vitest';
import {cast} from '@guanwei/ziwei';
import {isLookbackZhOnly,lifeStepsChapter} from '../src/daxian';
import samples from '../../../apps/web/test/fixtures/sample-charts.json';
import {renderChapter as en} from '../src/en/render';
import {renderChapter as ja} from '../src/ja/render';
import {citation} from '../src/citation';

it.each(samples)('$id：直讀年份重點，保留盤面、內部條件與翻譯',(sample)=>{
 const c=cast(sample.input as Parameters<typeof cast>[0]);if(!c.ok)throw new Error(c.message);
 const chapter=lifeStepsChapter({chart:c.value,year:2026,solar:sample.input.solar})!;
 const text=chapter.segments.map(s=>s.text).join('');
 expect(text).not.toMatch(/原書列出|原書為你|回看提示|正是開頭說/);
 const backs=chapter.segments.filter(s=>s.slot==='回看');
 // 2026-11-10：成年年份都可入選（樞紐年先），每年用王亭之今年卡講那一年大概點
 expect(backs.length).toBeGreaterThan(0);expect(backs.length).toBeLessThanOrEqual(3);
 if(sample.id!=='C')expect(backs.some((s)=>s.statements!.some((l)=>l.source_ids.some((id)=>id.startsWith('syn.'))))).toBe(true);
 for(const segment of backs){
  expect(segment.text).toContain('當年的');
  expect(segment.referenceConditions?.join('')).toContain('不表示曾發生某件往事');
  for(const l of segment.statements??[])for(const id of l.citations){const r=citation(id);expect(r?.quoteParts?.length??(r?.text?1:0)).toBeGreaterThan(0);}
 }
 // 回看新句只有中文，英日版略過（apps/web life-steps-reading.ts）
 const intl=chapter.segments.map(s=>(s.statements??[{text:s.text,source_ids:[] as string[]}]).filter(l=>!isLookbackZhOnly(l.source_ids)).map(l=>l.text).join('')).join('');
 expect(en(intl).missing).toEqual([]);expect(ja(intl).missing).toEqual([]);
 if(sample.id==='C'){expect(text).toContain('跟家人或老師');expect(text).not.toMatch(/收入的做法|借貸|合約|上司/);}
});
