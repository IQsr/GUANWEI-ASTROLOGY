/**
 * 簡體版驗收（2026-10-08）
 *
 * 一、每一版公開頁（首頁、落款、示範書全部章、藏經閣全部詞條、條款、私隱）喺 /zh-Hans 開，
 *     讀者見到嘅字入面冇繁體字（品牌標誌「星敘」除外，見 hans-scan.mjs）。
 *     ⚠ 登入先見到嘅書（真書）掃唔到 —— 但佢哋同示範書行同一條路（displayTitle、localizeMarked）。
 * 二、<html lang="zh-Hans">（簡體字型靠佢揀 SC）。
 * 三、大陸、新加坡瀏覽器（zh-CN、zh-SG）去簡體；台灣、香港（zh-TW、zh-HK）照舊繁體。
 */
import { startServer, stopServer } from './_server.mjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { leftovers } from './hans-scan.mjs';

const PORT = Number(process.env.CHECK_HANS_PORT ?? 3990);
const BASE = `http://localhost:${PORT}`;
const fail = [];
const check = (name, ok, why) => {
  if (!ok) fail.push(`${name}：${why}`);
};

const server = await startServer(PORT);
try {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(`${BASE}/zh-Hans`)).status === 200) break;
    } catch {
      /* 未起身 */
    }
    await sleep(500);
  }

  const get = (p) => fetch(BASE + encodeURI(p)).then(async (r) => ({ status: r.status, html: await r.text() }));
  const links = (html, prefix) =>
    [...new Set([...html.matchAll(new RegExp(`href="(${prefix}[^"#?]+)"`, 'g'))].map((m) => decodeURIComponent(m[1])))];

  const sample = await get('/zh-Hans/sample');
  const lexicon = await get('/zh-Hans/lexicon');
  const routes = [
    '/zh-Hans', '/zh-Hans/cast', '/zh-Hans/sample', '/zh-Hans/lexicon', '/zh-Hans/terms', '/zh-Hans/privacy',
    '/zh-Hans/shelf', '/zh-Hans/claim',
    ...links(sample.html, '/zh-Hans/sample/'),
    ...links(lexicon.html, '/zh-Hans/lexicon/'),
  ];
  check('掃到嘢', routes.length > 50, `只得 ${routes.length} 版`);

  for (const r of routes) {
    const { status, html } = await get(r);
    check(r, status === 200, `HTTP ${status}`);
    const left = leftovers(html);
    check(r, left.length === 0, `仲有繁體字：${left.slice(0, 3).join(' ／ ')}`);
    check(`${r} lang`, /<html[^>]*lang="zh-Hans"/.test(html), '冇 lang="zh-Hans"');
  }

  for (const [al, want] of [['zh-CN,zh;q=0.9', '/zh-Hans'], ['zh-SG', '/zh-Hans'], ['zh-TW', null], ['zh-HK', null]]) {
    const r = await fetch(`${BASE}/`, { headers: { 'accept-language': al }, redirect: 'manual' });
    const loc = r.headers.get('location');
    const to = loc ? new URL(loc, BASE).pathname : null;
    check(`語言偵測 ${al}`, want ? to === want : to === null || to === '/', `去咗 ${to}`);
  }
  console.log(`  掃咗 ${routes.length} 版`);
} finally {
  stopServer(server);
}

if (fail.length) {
  console.error('✗ 簡體版驗收唔過：');
  for (const f of fail.slice(0, 40)) console.error('  ' + f);
  process.exit(1);
}
console.log('✓ 簡體：公開頁冇漏繁體字、lang="zh-Hans"、大陸星馬瀏覽器去簡體、港台照舊繁體');
