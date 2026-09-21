import { setTimeout as sleep } from 'node:timers/promises';
import { launchBrowser } from './_server.mjs';
const b=await launchBrowser();
const p=await (await b.newContext({viewport:{width:1440,height:900},locale:'zh-TW',extraHTTPHeaders:{'Accept-Language':'zh-Hant,zh;q=0.9'}})).newPage();
p.on('console', m => { if (m.type()==='error') console.log('CONSOLE ERR:', m.text().slice(0,200)); });
await p.goto('http://localhost:3220/tokens/mingshu',{waitUntil:'networkidle'});
await p.locator('.suidu').scrollIntoViewIfNeeded();
await sleep(800);
console.log(JSON.stringify(await p.evaluate(() => ({
  panes: document.querySelectorAll('.suidu-pan').length,
  paneDisplay: getComputedStyle(document.querySelector('.suidu-pan')).display,
  gongInPane: document.querySelectorAll('.suidu-pan .gong').length,
  slots: [...document.querySelectorAll('.suidu [data-slot]')].map(e=>e.dataset.slot),
  litAttrs: [...document.querySelectorAll('.suidu-pan .gong')].map(e=>e.dataset.lit ?? '-'),
})), null, 1));
await b.close();
