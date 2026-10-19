#!/usr/bin/env python3
"""253條舊引文：人工語意裁定、定位差異、實際消費句與原段反查。"""
from __future__ import annotations
import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import re
import sys

import reference as core
import deep

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DECISIONS = HERE / 'excerpt-decisions.json'
INDEX = HERE / 'excerpt-audit.json'
OUT = HERE / 'deep'
LABELS = {
    'metadata_only': '定位／摘錄格式為主，核心文意可留',
    'expand_evidence': '補引完整上下文／保留修飾',
    'revise_copy': '文案需刪改或收窄',
    'fix_conditions': '條件／範圍未足，需改觸發或條件句',
    'hold_source': '原檔／讀法有疑，保留待核',
    'unused': '未見直接使用，僅處理摘引記錄',
}
PHYSICAL = {
    'page_range': '頁碼／跨頁範圍',
    'non_contiguous_selection': '標題、正文各自找回，但非連續摘錄',
    'repeated_heading': '重複帶入標題／首行',
    'heading_changed': '標題／首行有異，正文可找回',
    'abridged_or_changed_text': '節略／拼接／文字改動，不能視為逐字連錄',
}
GROUPS = [(1, 61), (62, 106), (107, 151), (152, 201), (202, 253)]


def hash_text(text):
    return hashlib.sha256(text.encode('utf8')).hexdigest()


def resolve(obj, pointer):
    for part in pointer.strip('/').split('/'):
        key = part.replace('~1', '/').replace('~0', '~')
        obj = obj[int(key)] if isinstance(obj, list) else obj[key]
    return obj


def parent_record(data, pointer):
    parts = pointer.strip('/').split('/')
    for n in range(len(parts) - 1, -1, -1):
        candidate = resolve(data, '/' + '/'.join(parts[:n])) if n else data
        if isinstance(candidate, dict) and any(k in candidate for k in ['text', 'summary', 'poles', 'pivots', 'body']):
            return candidate, '/' + '/'.join(parts[:n])
    return data, ''


def projection(obj):
    if 'poles' in obj:
        # core/trine/lean are retained drafts, not the prose targeted by citation.ts.
        return {k: obj[k] for k in ['n', 'name', 'stars', 'branches', 'page', 'poles', 'plain']}
    keys = ['id', 'star', 'palace', 'hua', 'text', 'summary', 'body', 'when', 'role',
            'topic', 'scope', 'ming', 'branches', 'cond', 'pivots', 'decade', 'natal',
            'areas', 'edit', 'overrides', 'tail', 'also']
    return {k: obj[k] for k in keys if k in obj}


def source_check(quote, pages):
    hay = core.norm(''.join(p['text'] for p in pages))
    lines = [core.norm(s) for s in quote.splitlines() if core.norm(s)]
    full = core.norm(quote) in hay
    body = core.norm(''.join(quote.splitlines()[1:]))
    first = lines[0] if lines else ''
    if full:
        kind = 'page_range'
    elif first and body.startswith(first) and body in hay:
        kind = 'repeated_heading'
    elif len(lines) > 1 and all(s in hay for s in lines):
        kind = 'non_contiguous_selection'
    elif len(lines) > 1 and body and body in hay and first not in hay:
        kind = 'heading_changed'
    else:
        kind = 'abridged_or_changed_text'
    return {'kind': kind, 'label': PHYSICAL[kind], 'whole_quote_matches_after_normalisation': full,
            'first_line_found': bool(first and first in hay),
            'body_after_first_line_found': bool(body and body in hay),
            'note': '只比較字句位置；不裁語意、條件成立或原字校定。'}


def compile_index():
    manual = core.load(DECISIONS)
    base = core.load(HERE / 'index.json')
    detailed = core.load(HERE / 'deep-index.json')
    source = deep.original()  # Includes PDF hash verification, not just a cache check.
    local = core.load(ROOT / 'tmp/wang-reference/deep/library.json')
    blocks = {b['id']: b for b in local['blocks']}
    corpus_path = ROOT / 'packages/content/src/sources/zhongzhou.json'
    corpus = core.load(corpus_path)['passages']
    if manual['reviewed_pdf_sha256'] != source['book']['sha256']:
        raise ValueError('PDF版本已變；須重新閱讀，不能只刷新指紋。')
    page_hash = hash_text(json.dumps([p['text'] for p in source['pages']], ensure_ascii=False))
    if manual['reviewed_source_page_text_sha256'] != page_hash:
        raise ValueError('頁文字快照已變，須覆核人工段號。')
    if manual['reviewed_corpus_sha256'] != core.sha(corpus_path):
        raise ValueError('摘引庫已變，須逐項重新確認裁定。')
    for file, expected in manual['reviewed_consumer_hashes'].items():
        if not (ROOT / file).exists() or core.sha(ROOT / file) != expected:
            raise ValueError(file + '已變，須覆核文案／觸發與裁定。')
    if len(manual['decisions']) != 253 or [r['ordinal'] for r in manual['decisions']] != list(range(1, 254)):
        raise ValueError('人工裁定必須完整覆蓋1–253且不重複。')
    review_ids = [r['passage_id'] for r in detailed['excerpt_review']]
    if [r['passage_id'] for r in manual['decisions']] != review_ids:
        raise ValueError('待核清單或排序已變，唔可以靠序號套舊裁定。')
    live_uses, _, _ = core.source_uses(corpus)
    base_passages = {p['id']: p for p in base['passages']}
    files = {}
    systems = core.load(ROOT / 'packages/content/src/xingxi/systems.json')
    result = []
    for decision, mechanical in zip(manual['decisions'], detailed['excerpt_review']):
        pid = decision['passage_id']
        if decision['verdict'] not in LABELS:
            raise ValueError(pid + '裁定碼無效')
        if live_uses[pid] != base_passages[pid]['uses']:
            raise ValueError(pid + '直接引用清單已變，先更新底層索引並覆核。')
        lo, hi = decision['proposed_quote_pages']
        if not 1 <= lo <= hi <= 595:
            raise ValueError(pid + '建議頁無效')
        evidence = []
        for bid in decision['evidence_blocks']:
            b = blocks[bid]
            raw = source['pages'][b['pdf_page']-1]['text'].splitlines()[b['source_lines'][0]-1:b['source_lines'][1]]
            if ''.join(s.strip() for s in raw) != b['text']:
                raise ValueError(bid + '與原頁行失配')
            evidence.append({k: b[k] for k in ['id', 'pdf_page', 'source_lines', 'section_id', 'section_title', 'text_sha256']})
        consumers = []
        for use in live_uses[pid]:
            file = use['file']
            if file not in files:
                files[file] = core.load(ROOT / file)
            data = files[file]
            record, pointer = parent_record(data, use['pointer'])
            source_obj = resolve(data, use['pointer'])
            if source_obj.get('passage_id', source_obj.get('passage')) != pid:
                raise ValueError(pid + '引用指標不符')
            topic = data.get('topic') if isinstance(data, dict) else None
            consumer = {**use, 'record_pointer': pointer, 'topic': topic,
                        'record_snapshot': projection(record)}
            if 'poles' in record:
                consumer['reviewed_fields'] = ['plain.basis', 'plain.lean', '逐項明指的其他中文欄']
                consumer['scope_note'] = '此source為星系來源記錄；runtime逐句掛源另由branch basis決定。未整套核舊稿及點票rules。'
            elif file.endswith('/plain/palace.json'):
                consumer['reviewed_fields'] = ['summary']
                consumer['scope_note'] = 'watch不在citation.ts的此source覆蓋範圍，未因此獲核。'
            else:
                consumer['reviewed_fields'] = [k for k in ['text', 'body', 'pivots', 'when'] if k in record]
            if use['pointer'] == '/basis' and topic and topic.get('xingxi'):
                n = topic['xingxi']
                s = next(s for s in systems if s['n'] == n)
                consumer['indirect_citation_targets'] = {
                    'file': 'packages/content/src/xingxi/systems.json', 'pointer': f'/{n-1}/plain',
                    'fields': ['basis', *['lean.' + p for p in s['poles']]],
                    'text_snapshot': {'basis': s['plain']['basis'],
                                      'lean': {p: s['plain']['lean'][p] for p in s['poles']}},
                    'related_audit': f'xingxi.{n}',
                    'reason': 'citation.ts將branch basis掛到星系plain.basis與兩端lean；平衡另由本輪星系條目檢查。',
                }
            consumers.append(consumer)
        row = {**decision, 'verdict_label': LABELS[decision['verdict']],
               'original_locator': {'chapter': corpus[pid].get('chapter'), 'section': corpus[pid].get('ref'),
                                    'pdf_pages': corpus[pid]['lines']},
               'original_quote_sha256': hash_text(corpus[pid]['text']),
               'previous_mechanical_category': mechanical['category'],
               'physical_check': source_check(corpus[pid]['text'], source['pages'][lo-1:hi]),
               'evidence': evidence, 'consumers': consumers,
               'review_status': 'individually_reviewed_recommendations_not_applied',
               'semantic_scope': manual['scope'],
               'read_command': f'python tools/wang-reference/excerpt_audit.py show --id {pid} --source'}
        result.append(row)
    return {'schema_version': 1, 'reviewed_on': manual['reviewed_on'],
            'book': {k: v for k, v in source['book'].items() if k != 'pdf_path'},
            'inputs': {'manual_sha256': core.sha(DECISIONS), 'script_sha256': core.sha(Path(__file__)),
                       'reference_script_sha256': core.sha(HERE / 'reference.py'),
                       'deep_script_sha256': core.sha(HERE / 'deep.py'),
                       'corpus_sha256': manual['reviewed_corpus_sha256'],
                       'page_text_sha256': page_hash, 'consumer_hashes': manual['reviewed_consumer_hashes']},
            'scope_notes': manual['scope_notes'],
            'counts': {'reviewed': len(result), 'verdicts': dict(Counter(r['verdict'] for r in result)),
                       'physical': dict(Counter(r['physical_check']['kind'] for r in result)),
                       'direct_source_uses': sum(len(r['consumers']) for r in result),
                       'indirect_basis_links': sum('indirect_citation_targets' in u for r in result for u in r['consumers']),
                       'production_changes_applied': 0},
            'items': result}


def page_label(pages):
    return f'p.{pages[0]}' if pages[0] == pages[1] else f'pp.{pages[0]}–{pages[1]}'


def file_link(file, from_dir):
    return Path(os.path.relpath(ROOT / file, from_dir)).as_posix()


def render(index):
    outputs = {}
    detail_dir = OUT / 'excerpt-audit'
    lines = ['# 253條舊引文逐項核對', '', f"核對日期：{index['reviewed_on']}。原書：王亭之《中州派紫微斗數深造講義》本機595頁PDF。",
             '', '**定位差異與語意支持分開判斷。下列係修改建議清單，未改corpus、產品文案或引擎。**', '',
             f"PDF SHA256：`{index['book']['sha256']}`。頁碼均為1起算PDF頁。", '', '## 核對結果', '',
             '| 裁定 | 條數 |', '|---|---|']
    for key, label in LABELS.items():
        lines.append(f"| {label} (`{key}`) | {index['counts']['verdicts'].get(key,0)} |")
    lines += ['', '補引類別唔等於只改頁就算：須按每項保留條件、修飾或將編輯建議獨立。文案／條件問題不代表已證全書別處絕無相似說法。', '',
              '### 字句定位係另一個維度', '',
              '| 定位差異（不代表語意已支持） | 條數 |', '|---|---|']
    for key, label in PHYSICAL.items():
        lines.append(f"| {label} | {index['counts']['physical'].get(key, 0)} |")
    lines += ['', '例如完整字句換頁後找回，仍可能漏咗原文前提，所以146項頁碼／跨頁定位不等於146項只修頁即可。原來機械標成標題不同的項目，亦已重分非連續節錄、重複首行及真正首行差異。', '',
              '## 範圍與使用方式', '']
    lines += ['- ' + s for s in index['scope_notes']]
    lines += ['', '```powershell', 'python tools/wang-reference/excerpt_audit.py show --id deep.星系06.8 --source',
              'python tools/wang-reference/excerpt_audit.py search --verdict fix_conditions',
              'python tools/wang-reference/excerpt_audit.py check', '```', '',
              '原頁正文仍只在本機忽略快取。`--source`會連人工核讀段及其跨頁續段；索引保存段號、原行及文字指紋，唔複製原書全文。', '',
              '## 需要先處理的明確缺口', '',
              '- `deep.星系06.8`／`.9`：擎羊後面複合條件被省去，唔可以「容易」補代。',
              '- `deep.星系21.5`：比較武曲化科，被改成比一般大。',
              '- `deep.星系36.5`：缺雜曜仍稱融和最強；`deep.星系53.3`：缺無刑煞仍稱成權威。',
              '- `deep.遷移.貪狼.5`：原文獨坐，現topic未限獨坐。',
              '- `deep.兄弟.太陰.1`：日夜及廟陷分支被合併成無條件和美。',
              '- `deep.星系58.4`：p.210原PDF四化內部疑點，先保留待核，唔自動校改。', '',
              '## 原始253項完整對照', '',
              '| # | passage id／詳情 | 舊頁 → 建議摘引頁 | 定位差異 | 語意裁定 |', '|---|---|---|---|---|']
    for lo, hi in GROUPS:
        name = f'{lo:03}-{hi:03}.md'
        detail = [f'# 舊引文核對 {lo}–{hi}', '', '[返回253項總表](../EXCERPT-AUDIT.md)', '',
                  '以下分開列來源定位、已讀段落、現有中文消費句及建議。原文只在本機快取；命理點票與實際命盤未驗。', '']
        for r in [r for r in index['items'] if lo <= r['ordinal'] <= hi]:
            n = r['ordinal']
            lines.append(f"| {n} | [`{r['passage_id']}`](excerpt-audit/{name}#audit-{n:03}) | {page_label(r['original_locator']['pdf_pages'])} → {page_label(r['proposed_quote_pages'])} | {r['physical_check']['label']} | {r['verdict_label']} |")
            detail += [f'<a id="audit-{n:03}"></a>', '', f"## {n}　{r['passage_id']}", '',
                       f"**裁定**：{r['verdict_label']}（`{r['verdict']}`）。", '',
                       f"**原記錄**：{r['original_locator']['chapter']} · {r['original_locator']['section']} · {page_label(r['original_locator']['pdf_pages'])}。", '',
                       f"**建議定位**：{page_label(r['proposed_quote_pages'])}；{r['physical_check']['label']}。標題／正文非連續時須分段保存，呢個範圍唔聲稱整條連錄。", '',
                       '**核讀段落**：' + '；'.join(f"`{b['id']}`（{b['section_title']}，PDF {b['pdf_page']}頁提取行{b['source_lines'][0]}–{b['source_lines'][1]}）" for b in r['evidence']), '',
                       '**發現**：' + r['finding'], '', '**建議點改**：' + r['recommendation'], '', '**現有使用記錄**', '']
            if not r['consumers']:
                detail += ['未掃到直接引用；不據此聲稱整個產品或其他儲存位置完全冇用過。', '']
            for u in r['consumers']:
                link = file_link(u['file'], detail_dir)
                detail += [f"- [{u['file']}]({link}) `{u['pointer']}` · record `{u['record_id']}`。",
                           '  適用topic：`' + json.dumps(u['topic'], ensure_ascii=False, separators=(',', ':')) + '`。',
                           '  已存條件：`' + json.dumps(u['encoded_conditions'], ensure_ascii=False, separators=(',', ':')) + '`。', '']
                obj = u['record_snapshot']
                if 'plain' in obj:
                    detail += ['  本輪星系重點（basis及lean；其餘欄位未整套核）：', '', '```json',
                               json.dumps({'basis': obj['plain']['basis'], 'lean': obj['plain']['lean']}, ensure_ascii=False, indent=2), '```', '']
                else:
                    texts = {k: obj[k] for k in ['text', 'summary', 'body', 'pivots', 'scope', 'ming', 'branches', 'cond', 'decade', 'edit'] if k in obj}
                    if texts:
                        detail += ['```json', json.dumps(texts, ensure_ascii=False, indent=2), '```', '']
                if u.get('scope_note'):
                    detail += [u['scope_note'], '']
                if 'indirect_citation_targets' in u:
                    target = u['indirect_citation_targets']
                    detail += [f"**間接掛源**：`{target['file']}{target['pointer']}` 的basis及兩端lean。連讀 `{target['related_audit']}`，唔將basis只當來源元資料。", '',
                               '```json', json.dumps(target['text_snapshot'], ensure_ascii=False, indent=2), '```', '']
            detail += ['原段反查：`' + r['read_command'] + '`。', '']
        outputs[detail_dir / name] = '\n'.join(detail) + '\n'
    lines += ['', '機讀完整結果：[excerpt-audit.json](../excerpt-audit.json)。人工修改入口：[excerpt-decisions.json](../excerpt-decisions.json)。', '',
              '修改人工裁定後重建：`python tools/wang-reference/excerpt_audit.py build`。產品或來源變更會使核對失效，必須重新閱讀對應項，不能只刷新指紋。', '']
    outputs[OUT / 'EXCERPT-AUDIT.md'] = '\n'.join(lines)
    return outputs


def build(_):
    index = compile_index()
    core.write(INDEX, index)
    for path, text in render(index).items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf8')
    core.emit({'ok': True, **index['counts']})


def check(_):
    fresh = compile_index()
    if core.load(INDEX) != fresh:
        raise ValueError('生成JSON已過期，請build。')
    for path, expected in render(fresh).items():
        if not path.exists() or path.read_text(encoding='utf8') != expected:
            raise ValueError(str(path.relative_to(ROOT)) + '已過期，請build。')
    core.emit({'ok': True, **fresh['counts'], 'note': '檢查253項覆蓋、指紋、引用指標、原頁段位及生成一致性；不代替語意重讀或命盤驗證。'})


def show(args):
    index = compile_index()
    selected = [r for r in index['items'] if r['passage_id'] == args.id or r['ordinal'] == args.ordinal]
    if not selected:
        raise ValueError('查無本批審核項。')
    result = dict(selected[0])
    if args.source:
        local = core.load(ROOT / 'tmp/wang-reference/deep/library.json')
        blocks = {b['id']: b for b in local['blocks']}
        ids = set(result['evidence_blocks'])
        todo = list(ids)
        while todo:
            b = blocks[todo.pop()]
            for key in ['continues_from', 'continues_to']:
                if b.get(key) and b[key] not in ids:
                    ids.add(b[key]); todo.append(b[key])
        result['local_source_blocks'] = [b for b in local['blocks'] if b['id'] in ids]
    core.emit(result)


def search(args):
    index = compile_index()
    rows = [r for r in index['items'] if (not args.verdict or r['verdict'] == args.verdict)
            and all(core.norm(q) in core.norm(r['passage_id'] + r['finding'] + r['recommendation']) for q in args.query)]
    core.emit({'total': len(rows), 'items': [{k: r[k] for k in ['ordinal', 'passage_id', 'verdict_label', 'proposed_quote_pages', 'finding', 'recommendation']} for r in rows]})


def main():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(required=True)
    for name, fn in [('build', build), ('check', check)]:
        sub.add_parser(name).set_defaults(func=fn)
    q = sub.add_parser('show')
    g = q.add_mutually_exclusive_group(required=True)
    g.add_argument('--id'); g.add_argument('--ordinal', type=int)
    q.add_argument('--source', action='store_true'); q.set_defaults(func=show)
    q = sub.add_parser('search'); q.add_argument('query', nargs='*')
    q.add_argument('--verdict', choices=list(LABELS)); q.set_defaults(func=search)
    args = p.parse_args()
    try:
        args.func(args)
    except (ValueError, FileNotFoundError, KeyError) as e:
        p.exit(2, str(e) + '\n')


if __name__ == '__main__':
    main()
