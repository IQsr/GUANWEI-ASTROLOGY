import { setTimeout as sleep } from 'node:timers/promises';
import { mkdirSync } from 'node:fs';
import { launchBrowser } from './_server.mjs';
const BASE='http://localhost:3221', OUT='/home/claude/demo4';
mkdirSync(OUT,{recursive:true});
const b=await launchBrowser();
const p=await (await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2,locale:'zh-TW',extraHTTPHeaders:{'Accept-Language':'zh-Hant,zh;q=0.9'}})).newPage();
await p.goto(`${BASE}/tokens/mingshu`,{waitUntil:'networkidle'});

async function atSlot(slot) {
  await p.evaluate((s) => {
    const el = [...document.querySelectorAll('.suidu [data-slot]')].find(e => e.dataset.slot === s);
    if (el) {
      const r = el.getBoundingClientRect();
      window.scrollBy(0, r.top - window.innerHeight / 3);
    }
  }, slot);
  await sleep(800);
  return p.evaluate(() => ({
    self: document.querySelectorAll('.suidu-pan .gong[data-lit="self"]').length,
    san: document.querySelectorAll('.suidu-pan .gong[data-lit="san"]').length,
  }));
}

for (const s of ['開場','結構','過場','牽動','擾動','留白']) {
  console.log(s, JSON.stringify(await atSlot(s)));
}
await atSlot('牽動');
await p.screenshot({path:`${OUT}/f2-牽動.png`});
await b.close();
