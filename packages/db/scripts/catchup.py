"""由 migrations/0007–0011 生成 catchup/0007-0012.sql：可以重複跑嘅追趕檔。

點解要有：all.sql 太大（SQL Editor 報 Backend error），而且唔可以重跑。
呢個檔淨係 0007 之後，每一句改成重跑唔會撞錯（if not exists / DO 區塊）。
生成方法：python scripts/catchup.py（喺 packages/db 行）。test/catchup.test.ts 守住佢同 migration 一致。
"""
import pathlib, re

D = pathlib.Path('migrations')
FILES = ['0007_pay.sql', '0008_account.sql', '0009_refund.sql', '0010_no_service_key.sql', '0011_terms.sql', '0012_private_rls.sql']

def strip_comments(sql: str) -> str:
    out = []
    for line in sql.replace('\r\n', '\n').split('\n'):
        if line.strip().startswith('--'):
            continue
        out.append(line)
    s = '\n'.join(out)
    return re.sub(r'\n{3,}', '\n\n', s)

def idempotent(sql: str) -> str:
    sql = re.sub(r'^create table (?!if not exists)', 'create table if not exists ', sql, flags=re.M)
    sql = re.sub(r'add column (?!if not exists)', 'add column if not exists ', sql)
    # alter table … add constraint … ; → DO 區塊（重複就跳過）
    def con(m):
        stmt = m.group(0).rstrip(';')
        return "do $c$ begin\n  " + stmt.replace('\n', '\n  ') + ";\nexception when duplicate_object then null;\nend $c$;"
    sql = re.sub(r'^alter table \w+ add constraint [^;]+;', con, sql, flags=re.M)
    return sql

head = """-- 觀微 · 追趕 migration 0007–0012（生成檔，唔好手改：python scripts/catchup.py）
--
-- 用法：Supabase → SQL Editor → 貼晒落去 → Run。
-- 前提：0001–0006 已經跑過（成過書就一定跑過）。
-- 可以重複跑：已經有嘅嘢會跳過，唔會撞 already exists。
"""
parts = [head]
for f in FILES:
    parts.append(f'\n-- ── {f} ──\n' + idempotent(strip_comments((D / f).read_text(encoding='utf-8'))).strip() + '\n')
pathlib.Path('catchup').mkdir(exist_ok=True)
out = ''.join(parts)
pathlib.Path('catchup/0007-0012.sql').write_text(out, encoding='utf-8', newline='\n')
print(len(out.encode('utf-8')), 'bytes')
