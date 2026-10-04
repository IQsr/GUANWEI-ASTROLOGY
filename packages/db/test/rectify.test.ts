import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from '../src/testing';

/**
 * 定時辰驗證紀錄（0003）：anon 寫得入（經 function），但讀唔到、直接寫唔到張表。
 */
let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
});
afterEach(() => db.close());

const record = (picked = 3, candidates = '{3,4,5}', answers = '[{"year":2014,"area":"工作","a":"yes","yes":[3]}]') =>
  db.sql(`select rectify_record(1::smallint, $1::smallint[], 3::smallint, $2::smallint, 0.9::real, $3::jsonb, '{"3":0.9,"4":0.05,"5":0.05}'::jsonb, '{}'::jsonb) as id`, [
    candidates,
    picked,
    answers,
  ]);

describe('rectify_record', () => {
  it('anon 經 function 寫得入', async () => {
    await db.asAnon();
    const [r] = await record();
    expect(r!.id).toBeTruthy();
    await db.asOwner();
    const rows = await db.sql('select band, picked, true_shichen from rectify_trials');
    expect(rows).toEqual([{ band: 1, picked: 3, true_shichen: 3 }]);
  });

  it('anon 讀唔到、直接寫唔到張表', async () => {
    await db.asAnon();
    await record();
    await expect(db.sql('select * from rectify_trials')).rejects.toThrow();
    await expect(
      db.sql(`insert into rectify_trials (candidates, picked, confidence, answers, posterior) values ('{1}', 1, 0.5, '[]', '{}')`),
    ).rejects.toThrow();
  });

  it('揀中嘅唔喺候選、太多題：拒絕', async () => {
    await db.asAnon();
    await expect(record(7)).rejects.toThrow();
    const many = JSON.stringify(Array.from({ length: 31 }, (_, i) => ({ year: 2000 + i, area: '錢', a: 'no', yes: [] })));
    await expect(record(3, '{3,4,5}', many)).rejects.toThrow();
  });
});
