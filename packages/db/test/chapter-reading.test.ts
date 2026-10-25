import { beforeAll, afterAll, expect, it } from 'vitest';
import { createTestDb, seedReader, type TestDb } from '../src/testing';

let db: TestDb;
let me: string;
let other: string;
let book: string;
let free: string;
let deep: string;
let ending: string;
const epilogueSnapshot={format:'ming-expanded-v1',writer:'epilogue-reader-v1',segments:[{slot:'撮要',text:'同一本正文的收結。',referenceConditions:['本命主星及四化條件保留。'],referenceApplicability:['本段連讀命宮、官祿。'],statements:[{text:'同一本正文的收結。',source_ids:['epilogue.selected.命宮.官祿'],citations:['saved.original.source']}]}],international:{text:'舊版收結。',slots:['結論']},internationalSnapshot:{text:'舊版收結。',slots:['結論']}};
const snapshot = { analysis:{version:'book-analysis-v1',privateMarker:'P0-INTERNAL-CHAPTER-TRACE',chapter:{chapter:'命宮',focus:[{id:'focus:命宮:selected'}]},conditions:['required-before-result'],exceptions:['retained-exception']}, format: 'ming-expanded-v1', segments: [{ slot: '結論', text: '展開正文。', statements: [{ citations: ['source.test'] }] }], international: { text: '舊版首段。\n\n舊版後文不可預覽。', slots: ['開場', '結構'] } };
const token = '33333333-3333-4333-8333-333333333333';
const subject = { name: '測試', birth_date: '1990-03-21', birth_time: '14:20', birth_tz: 'Asia/Hong_Kong', birth_place: '香港', lng: 114.17, lat: 22.32, sex: 'female' };
const chart = { engine_version: 'test', school_profile_id: 'test', payload: {} };
const chapters = [
  { slug: '命宮', ord: 1, tier: 'free', title: '命宮', body: '展開正文。', content_version: 'rules+ming-expanded-v1', slots: ['結論'], reading: snapshot },
  { slug: '兄弟', ord: 2, tier: 'deep', title: '兄弟', body: '展開正文。', content_version: 'rules+ming-expanded-v1', slots: ['結論'], reading: snapshot },
  {slug:'給你的話',ord:4,tier:'deep',title:'給你的話',body:'同一本正文的收結。',content_version:'rules+ming-expanded-v1+cross-palace-production-v1+epilogue-reader-v1',slots:['撮要'],reading:epilogueSnapshot},
  { slug: '舊章', ord: 3, tier: 'free', title: '舊章', body: '原文。', content_version: 'old', slots: ['正文'] },
];
const create = (chs = chapters) => db.sql('select create_book($1,$2,$3,$4,$5,$6,$7) as id', [token, JSON.stringify(subject), JSON.stringify(chart), '測試命書', '觀微', JSON.stringify(chs), '2026-09-29']);

beforeAll(async () => {
  db = await createTestDb();
  me = await seedReader(db, { anonymous: false, email: 'reading@example.test' });
  other = await seedReader(db);
  await db.asReader(me);
  book = String((await create())[0]!.id);
  const rows = await db.sql('select id, slug from chapters where book_id = $1', [book]);
  free = String(rows.find((r) => r.slug === '命宮')!.id);
  deep = String(rows.find((r) => r.slug === '兄弟')!.id);
  ending = String(rows.find((r) => r.slug === '給你的話')!.id);
});
afterAll(async () => { await db?.close(); });

it('新正文與閱讀快照一同保存，舊章沒有快照；重送不重寫', async () => {
  await db.asReader(me);
  expect((await db.sql('select chapter_reading($1) as data', [free]))[0]!.data).toEqual(snapshot);
  await create(chapters.map((c) => ({ ...c, body: '重送改文。' })));
  expect((await db.sql('select chapter_body($1) as body', [free]))[0]!.body).toBe('展開正文。');
  const old = await db.sql('select id from chapters where book_id=$1 and slug=$2', [book, '舊章']);
  expect((await db.sql('select chapter_reading($1) as data', [old[0]!.id]))[0]!.data).toBeNull();
});

it('快照不能直接 select，未購深度章、其他讀者、匿名均不能讀完整資料', async () => {
  await db.asReader(me);
  await expect(db.sql('select reading from chapters where id=$1', [free])).rejects.toThrow(/permission denied/);
  expect((await db.sql('select chapter_reading($1) as data', [deep]))[0]!.data).toBeNull();
  expect((await db.sql('select chapter_reading($1) as data', [ending]))[0]!.data).toBeNull();
  await db.asReader(other);
  expect((await db.sql('select chapter_reading($1) as data', [free]))[0]!.data).toBeNull();
  expect(await db.sql('select * from chapter_leads_v2($1)', [book])).toEqual([]);
  await db.asAnon();
  await expect(db.sql('select chapter_reading($1)', [free])).rejects.toThrow(/permission denied/);
});

it('目次只開每版首段及首段來源，不洩漏英日快照後文', async () => {
  await db.asReader(me);
  const rows = await db.sql('select * from chapter_leads_v2($1)', [book]);
  const m = rows.find((r) => r.slug === '命宮')!;
  expect(m.lead).toBe('展開正文。');
  expect(m.international_lead).toBe('舊版首段。');
  expect(m.citations).toEqual(['source.test']);
  expect(JSON.stringify(rows)).not.toContain('舊版後文');
  expect(JSON.stringify(rows)).not.toContain('P0-INTERNAL-CHAPTER-TRACE');
  expect(JSON.stringify(rows)).not.toContain('required-before-result');
});

it('有購買權限後才可經同一 RPC 讀深度章快照', async () => {
  await db.asOwner();
  await db.sql("insert into entitlements(reader_id,book_id,product,stripe_payment_id) values($1,$2,'deep','reading-test')", [me, book]);
  await db.asReader(me);
  expect((await db.sql('select chapter_reading($1) as data', [deep]))[0]!.data).toEqual(snapshot);
});

it('收結正文、出處、條件及英日原版經實際儲存與讀取完整保留，其他讀者仍不可讀',async()=>{
 await db.asReader(me);
 expect((await db.sql('select chapter_body($1) as body',[ending]))[0]!.body).toBe('同一本正文的收結。');
 expect((await db.sql('select chapter_reading($1) as data',[ending]))[0]!.data).toEqual(epilogueSnapshot);
 await db.asReader(other);
 expect((await db.sql('select chapter_reading($1) as data',[ending]))[0]!.data).toBeNull();
});
