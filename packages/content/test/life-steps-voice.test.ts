import {it,expect} from 'vitest';
import {cast} from '@guanwei/ziwei';
import {lifeStepsChapter} from '../src/daxian';
import samples from '../../../apps/web/test/fixtures/palace-before.json';
import {renderChapter as en} from '../src/en/render';
import {renderChapter as ja} from '../src/ja/render';
import {citation} from '../src/citation';

it.each(samples)('$id：直讀年份重點，保留盤面、內部條件與翻譯',(sample)=>{
 const c=cast(sample.input as Parameters<typeof cast>[0]);if(!c.ok)throw new Error(c.message);
 const chapter=lifeStepsChapter({chart:c.value,year:2026,solar:sample.input.solar})!;
 const text=chapter.segments.map(s=>s.text).join('');
 expect(text).not.toMatch(/原書列出|原書為你|回看提示|正是開頭說/);
 const backs=chapter.segments.filter(s=>s.slot==='回看');
 expect(backs.map(s=>s.heading)).toEqual(sample.id==='TL'?['二〇一八年','二〇二一年','二〇二四年']:sample.id==='A'?['二〇一五年','二〇二一年','二〇二五年']:['二〇二五年']);
 for(const segment of backs){
  expect(segment.text).toContain('當年的');
  expect(segment.referenceConditions?.join('')).toContain('不表示曾發生某件往事');
  for(const l of segment.statements??[])for(const id of l.citations)expect(citation(id)?.quoteParts?.length).toBeGreaterThan(0);
 }
 expect(en(text).missing).toEqual([]);expect(ja(text).missing).toEqual([]);
 if(sample.id==='TL')expect(text).toContain('重新衡量原來帶來收入的做法');
 if(sample.id==='A')expect(text).toContain('與人一起做事');
 if(sample.id==='C'){expect(text).toContain('跟家人或老師');expect(text).not.toMatch(/收入的做法|借貸|合約|上司/);}
});
