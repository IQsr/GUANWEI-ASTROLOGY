// 將 tools/cards/ming/NN.json（一個星系一個檔）按星系編號合併成 packages/content/src/cards/ming.json。
// 用法（專案根目錄）：node tools/cards/merge.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, 'ming');
const out = join(here, '../../packages/content/src/cards/ming.json');
const files = readdirSync(dir).filter((f) => /^\d{2}\.json$/.test(f)).sort();
const cards = files.flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
writeFileSync(out, JSON.stringify(cards, null, 2) + '\n');
console.log(`${files.length} 個星系、${cards.length} 張卡 → ${out}`);
