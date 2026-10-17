import {createRequire} from 'node:module';import {writeFileSync} from 'node:fs';
const root='C:/Users/issac/OneDrive/Documents/guanwei/';
const require=createRequire(root+'packages/ziwei/package.json');const {build}=require('esbuild');
const b=await build({entryPoints:[root+'tools/leads-audit/entry.ts'],bundle:true,write:false,platform:'node',format:'esm',logLevel:'error',
 tsconfig:root+'apps/web/tsconfig.json',nodePaths:[root+'apps/web/node_modules'],alias:{'server-only':root+'tools/leads-audit/empty.js'},loader:{'.json':'json'},external:['next','react','react-dom']});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;const books=[];
for(let i=0;i<60;i++){const y=1945+Math.floor(rnd()*70),mo=1+Math.floor(rnd()*12),d=1+Math.floor(rnd()*28),h=Math.floor(rnd()*24),sex=rnd()<.5?'male':'female';
 const ch=m.book(y,mo,d,h,sex,'audit-'+i);if(ch)books.push({birth:`${y}-${mo}-${d} ${h}:15 ${sex}`,chapters:ch});}
writeFileSync(process.argv[2],JSON.stringify(books));console.log(books.length,'books',books[0].chapters.map(c=>c.slug+':'+c.tier).join(' '));
