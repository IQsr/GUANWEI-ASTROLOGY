/**
 * 兩人對照連接句試跑（2026-10-15）
 *
 *   cd packages/content/tools/pairing
 *   npm install
 *   （自己喺呢度開 .env，寫 ANTHROPIC_API_KEY=…；.env 已經 gitignore）
 *   node --env-file=.env run.mjs                  # 全部事實包 × 兩個模型
 *   node --env-file=.env run.mjs 01 claude-sonnet-5-5
 *
 * 每個結果寫去 out/<模型>/<NN>.json，跟住過 validate.py，最後印一張表：通過未、句數、token、成本。
 */
import Anthropic from '@anthropic-ai/sdk';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const PRICE = {
  /* 美元／百萬 token（輸入、輸出），2026-10 價 */
  'claude-sonnet-5-5': [2, 10],
  'claude-opus-5-5': [4, 20],
};
const [onlyPack, onlyModel] = process.argv.slice(2);
const models = onlyModel ? [onlyModel] : Object.keys(PRICE);
const packs = readdirSync('packs').filter((f) => f.endsWith('.json') && (!onlyPack || f.startsWith(onlyPack)));

const system = readFileSync('prompt.md', 'utf8').split(/\r?\n---\r?\n/)[1].trim();
/* structured outputs：將 $defs 攤開，唔靠 $ref */
const raw = JSON.parse(readFileSync('schema.json', 'utf8'));
const sentence = raw.$defs.sentence;
const schema = {
  ...raw,
  $defs: undefined,
  properties: {
    headline: sentence,
    sections: { ...raw.properties.sections, items: { ...raw.properties.sections.items, properties: { ...raw.properties.sections.items.properties, sentences: { type: 'array', items: sentence } } } },
  },
};
delete schema.$defs;

/* .env 寫 ANTHROPIC_API_KEY 或者 API_KEY 都得 */
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.API_KEY });
const rows = [];
for (const model of models) {
  mkdirSync(`out/${model}`, { recursive: true });
  for (const f of packs) {
    const pack = readFileSync(`packs/${f}`, 'utf8');
    const t0 = Date.now();
    let response;
    try {
      response = await client.beta.messages.create({
        model,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
        system,
        messages: [{ role: 'user', content: pack }],
      });
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) throw new Error('API key 唔啱或者冇讀到 .env');
      if (e instanceof Anthropic.APIError) {
        rows.push({ model, pack: f, ok: false, note: `API ${e.status}: ${e.message}` });
        continue;
      }
      throw e;
    }
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') {
      rows.push({ model, pack: f, ok: false, note: `stop_reason ${response.stop_reason}` });
      continue;
    }
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const out = `out/${model}/${f}`;
    writeFileSync(out, JSON.stringify(JSON.parse(text), null, 1) + '\n');
    let check;
    let ok = true;
    try {
      check = execFileSync('python', ['-I', 'validate.py', `packs/${f}`, out], { encoding: 'utf8' });
    } catch (e) {
      check = e.stdout;
      ok = false;
    }
    const { input_tokens: i, output_tokens: o } = response.usage;
    const [pi, po] = PRICE[model] ?? [0, 0];
    rows.push({
      model,
      served: response.model,
      pack: f,
      ok,
      secs,
      in: i,
      out: o,
      usd: ((i * pi + o * po) / 1e6).toFixed(4),
      note: check.trim().split('\n').slice(0, 4).join(' / '),
    });
    console.log(`${model} ${f} ${ok ? '✓' : '✗'} ${secs}s`);
  }
}
writeFileSync('out/summary.json', JSON.stringify(rows, null, 1) + '\n');
console.table(rows.map(({ note, ...r }) => r));
for (const r of rows.filter((x) => !x.ok)) console.log(`✗ ${r.model} ${r.pack}: ${r.note}`);
