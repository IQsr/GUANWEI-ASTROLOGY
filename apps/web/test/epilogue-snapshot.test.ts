import {vi,it,expect} from 'vitest';
import {readingContentVersion} from '@/lib/chengshu';
const db=vi.hoisted(()=>({body:'摘要。' as string|null,version:'',signedIn:true,calls:[] as string[],reading:{saved:'epilogue'}}));
vi.mock('@/lib/supabase.server',()=>({supabaseServer:()=>({
 auth:{getUser:async()=>({data:{user:db.signedIn?{id:'reader'}:null}})},
 from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{id:'chapter',slots:['撮要'],content_version:db.version},error:null})};return q;},
 rpc:async(name:string)=>{db.calls.push(name);return {data:name==='chapter_body'?db.body:db.reading,error:null};}
})}));
it('reads the saved closing references only after the body entitlement gate, without recomputing old books',async()=>{
 const {serverJuan}=await import('@/lib/juan.server');
 db.version=readingContentVersion('rules@test');db.body='摘要。';db.calls=[];
 expect((await serverJuan().body('book','給你的話'))?.reading).toEqual(db.reading);expect(db.calls).toEqual(['chapter_body','chapter_reading']);
 db.body=null;db.calls=[];expect((await serverJuan().body('book','給你的話'))?.reading).toBeUndefined();expect(db.calls).toEqual(['chapter_body']);
 db.body='舊書原稿。';db.version='rules+ming-expanded-v1';db.calls=[];expect((await serverJuan().body('book','給你的話'))?.reading).toBeUndefined();expect(db.calls).toEqual(['chapter_body']);
 // P0 metadata uses the same protected saved JSON for all nineteen chapters.
 db.version=readingContentVersion('rules@test');
 for(const slug of ['序','身宮與五行局','一生十二步','這十年','這一年']){
  db.calls=[];expect((await serverJuan().body('book',slug))?.reading).toEqual(db.reading);expect(db.calls).toEqual(['chapter_body','chapter_reading']);
  db.body=null;db.calls=[];expect((await serverJuan().body('book',slug))?.reading).toBeUndefined();expect(db.calls).toEqual(['chapter_body']);db.body='舊書原稿。';
 }
 db.version=readingContentVersion('rules@test');db.signedIn=false;db.calls=[];expect(await serverJuan().body('book','給你的話')).toBeNull();expect(db.calls).toEqual([]);
});
