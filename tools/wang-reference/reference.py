#!/usr/bin/env python3
"""Local, provenance-first retrieval. No network, embeddings or model needed.

python tools/wang-reference/reference.py build
python tools/wang-reference/reference.py search --stars 紫微 破軍 --palace 交友
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import unicodedata

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
CACHE = ROOT / "tmp/wang-reference"
INDEX = HERE / "index.json"
SRC = ROOT / "packages/content/src"
PDF_NAME = "《中州派紫微斗数深造讲义》—王亭之.pdf"
NOTE_NAME = "初階講義-25頁重點筆記.md"
T2S = json.loads((SRC / "sources/t2s.json").read_text(encoding="utf-8-sig"))["map"]
STARS = "紫微 天機 太陽 武曲 天同 廉貞 天府 太陰 貪狼 巨門 天相 天梁 七殺 破軍 左輔 右弼 文昌 文曲 天魁 天鉞 祿存 天馬 擎羊 陀羅 火星 鈴星 地空 地劫 天刑 紅鸞 天喜 天姚 咸池".split()
PALACES = {
    "命宮": ["命宫", "命身宫"], "兄弟": ["兄弟宫"], "夫妻": ["夫妻宫"],
    "子女": ["子女宫"], "財帛": ["财帛宫"], "疾厄": ["疾厄宫"],
    "遷移": ["迁移宫"], "僕役": ["交友宫", "奴仆宫", "仆役宫"],
    "官祿": ["事业宫", "官禄宫"], "田宅": ["田宅宫"], "福德": ["福德宫"],
    "父母": ["父母宫"],
}
PAIRS = {
    "紫破": ["紫微", "破軍"], "紫府": ["紫微", "天府"], "紫貪": ["紫微", "貪狼"],
    "紫相": ["紫微", "天相"], "紫殺": ["紫微", "七殺"], "機巨": ["天機", "巨門"],
    "機梁": ["天機", "天梁"], "機陰": ["天機", "太陰"], "同梁": ["天同", "天梁"],
    "同巨": ["天同", "巨門"], "同陰": ["天同", "太陰"], "陽梁": ["太陽", "天梁"],
    "巨陽": ["巨門", "太陽"], "陽巨": ["巨門", "太陽"], "日月": ["太陽", "太陰"],
    "武相": ["武曲", "天相"], "武府": ["武曲", "天府"], "武貪": ["武曲", "貪狼"],
    "武殺": ["武曲", "七殺"], "武破": ["武曲", "破軍"], "廉府": ["廉貞", "天府"],
    "廉貪": ["廉貞", "貪狼"], "廉殺": ["廉貞", "七殺"], "廉破": ["廉貞", "破軍"],
    "廉相": ["廉貞", "天相"],
}
ALIASES = {
    "合作": ["合作", "合伙", "合夥", "合股"],
    "錢": ["财", "钱", "禄", "经商"], "工作": ["事业", "官禄", "职业", "工作"],
    "關係": ["关系", "感情", "相处"], "大限": ["大限", "大运"],
    "流年": ["流年", "年限"], "本命": ["本命", "原局", "生年", "天盘"],
    "見煞": ["见煞", "煞曜", "煞星", "煞忌"],
}
MARKERS = "入廟 落陷 見煞 無煞 化祿 化權 化科 化忌 祿存 羊陀 火鈴 空劫 同度 同宮 會照 對拱 相夾 三方四正 借星 吉化 生年 大限 流年".split()


def norm(text):
    text = unicodedata.normalize("NFKC", str(text))
    return re.sub(r"[\W_]+", "", "".join(T2S.get(c, c) for c in text)).lower()


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def write(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def palace_name(value):
    if not value:
        return None
    n = norm(value)
    for k, forms in PALACES.items():
        if n in [norm(k), *map(norm, forms), *[norm(f.removesuffix("宫")) for f in forms]]:
            return k
    raise ValueError(f"未知宮位：{value}")


def star_name(value):
    for s in STARS:
        if norm(s) == norm(value):
            return s
    raise ValueError(f"未知星曜：{value}；組合請分開寫，例如 --stars 紫微 破軍")


def mentions(text):
    n = norm(text)
    # A pair nickname is a retrieval cue, never proof of 同宮 or any chart condition.
    stars = {s for s in STARS if norm(s) in n}
    pairs = [k for k in PAIRS if norm(k) in n or norm("".join(PAIRS[k])) in n]
    for k in pairs:
        stars.update(PAIRS[k])
    return {
        "stars": sorted(stars, key=STARS.index),
        "pair_mentions": pairs,
        "palace_mentions": [k for k, forms in PALACES.items() if any(norm(f) in n for f in forms)],
        "condition_mentions": [m for m in MARKERS if norm(m) in n],
        "layer_mentions": [k for k in ("本命", "大限", "流年") if any(norm(f) in n for f in ALIASES[k])],
    }


def clean_page(text, page):
    lines = text.splitlines()
    # Remove repeating running header and page number only, retaining content order.
    while lines and (not lines[0].strip() or norm(lines[0]) in [norm("中州派紫微斗数深造讲义"), str(page)]):
        lines.pop(0)
    return "\n".join(lines).strip()


def source_uses(passages):
    uses = defaultdict(list)
    dangling = []
    files = sorted(p for p in SRC.rglob("*.json") if "sources" not in p.relative_to(SRC).parts)
    def walk(obj, file, pointer="", record=None, conditions=None):
        if isinstance(obj, dict):
            if "id" in obj or "n" in obj:
                record = obj.get("id", f"xingxi.{obj.get('n')}")
            if "when" in obj:
                conditions = {"when": obj["when"]}
            elif "cond" in obj:
                conditions = {k: obj[k] for k in ("scope", "ming", "branches", "cond", "pivots") if k in obj}
            pid = obj.get("passage_id", obj.get("passage"))
            corpus = obj.get("corpus")
            if isinstance(pid, str) and (corpus == "zhongzhou" or (corpus is None and pid in passages)):
                item = {"file": file, "pointer": pointer, "record_id": record, "encoded_conditions": conditions}
                if pid in passages:
                    uses[pid].append(item)
                else:
                    dangling.append({"passage_id": pid, **item})
            for key, value in obj.items():
                escaped = key.replace("~", "~0").replace("/", "~1")
                walk(value, file, f"{pointer}/{escaped}", record, conditions)
        elif isinstance(obj, list):
            for i, value in enumerate(obj):
                walk(value, file, f"{pointer}/{i}", record, conditions)
    for p in files:
        walk(load(p), p.relative_to(ROOT).as_posix())
    return uses, dangling, files


def build(args):
    curated = load(HERE / "curated.json")
    pdf = Path(args.pdf) if args.pdf else Path(args.downloads) / PDF_NAME
    if not pdf.exists():
        raise ValueError(f"搵唔到原書：{pdf}；用 --pdf 指定。")
    if args.pages_cache:
        raw = load(args.pages_cache)
        extraction = "existing_text_cache_unverified_against_pdf"
    else:
        try:
            from pypdf import PdfReader
        except ImportError:
            raise ValueError("build 需要 pypdf；search/show/check 只需Python標準庫。")
        reader = PdfReader(str(pdf))
        raw = [{"pdf_page": i + 1, "text": p.extract_text() or ""} for i, p in enumerate(reader.pages)]
        extraction = "pypdf_extract_text_from_fingerprinted_pdf"
    if len(raw) != 595 or [p["pdf_page"] for p in raw] != list(range(1, 596)):
        raise ValueError("呢份目錄只適用595頁版本，頁序亦必須完整連續；其他版本要另建目錄。")
    short_pages = [p["pdf_page"] for p in raw if len(clean_page(p["text"], p["pdf_page"])) < 80]
    ocr = {}
    ocr_error = None
    pdf_hash = sha(pdf)
    ocr_path = CACHE / "ocr-pages.json"
    if ocr_path.exists() and not args.skip_ocr:
        saved_ocr = load(ocr_path)
        if {p["pdf_page"] for p in saved_ocr} == set(short_pages) and all(p.get("pdf_sha256") == pdf_hash for p in saved_ocr):
            ocr = {p["pdf_page"]: p for p in saved_ocr}
    if short_pages and not args.skip_ocr and not ocr:
        renderer = shutil.which("pdftoppm")
        shell = shutil.which("powershell.exe")
        if renderer and shell:
            CACHE.mkdir(parents=True, exist_ok=True)
            request = []
            for n in short_pages:
                prefix = CACHE / f"page-{n}"
                subprocess.run([renderer, "-f", str(n), "-l", str(n), "-scale-to", "2400", "-png", "-singlefile", str(pdf), str(prefix)], check=True, capture_output=True)
                request.append({"pdf_page": n, "image": str(prefix.with_suffix(".png").resolve()), "pdf_sha256": pdf_hash})
            write(CACHE / "ocr-request.json", request)
            try:
                subprocess.run([shell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(HERE / "ocr-pages.ps1"),
                                "-RequestPath", str(CACHE / "ocr-request.json"), "-OutputPath", str(ocr_path)], check=True, capture_output=True)
                ocr = {p["pdf_page"]: p for p in load(ocr_path)}
            except subprocess.CalledProcessError:
                ocr_error = "Windows OCR未能執行；圖片頁只可按頁查原圖，未納入文字搜尋。可獨立執行ocr-pages.ps1後重建。"
        else:
            ocr_error = "未找到pdftoppm或Windows PowerShell；圖片頁尚未OCR。"
    systems = load(SRC / "xingxi/systems.json")
    corpus = load(SRC / "sources/zhongzhou.json")
    uses, dangling, usage_files = source_uses(corpus["passages"])
    pages = []
    for raw_page in raw:
        n = raw_page["pdf_page"]
        text = clean_page(raw_page["text"], n)
        page_extraction = extraction
        if n in ocr:
            text = ocr[n]["text"]
            page_extraction = "windows_ocr_image_table_requires_visual_review"
        sections = [s for s in curated["sections"] if s["start"] <= n <= s["end"]]
        system_context = []
        for i, system in enumerate(systems):
            end = systems[i+1]["page"] if i+1 < len(systems) else 219
            if system["page"] <= n <= end:
                system_context.append({k: system[k] for k in ("n", "name", "stars", "branches", "page")})
        pages.append({"id": f"wtz.deep.p{n:03}", "book_id": "wtz.deep", "pdf_page": n,
                      "sections": [s["title"] for s in sections],
                      "system_context": system_context,
                      "section_palaces": [s["palace"] for s in sections if s.get("palace")],
                      "text": text, **mentions(text), "extraction": page_extraction,
                      "image_table": n in short_pages,
                      "text_status": ("ocr_navigation_only" if n in ocr else "available") if len(norm(text)) >= 15 else "image_only_not_text_searchable"})
    lookup = []
    for pid, p in corpus["passages"].items():
        lo, hi = p["lines"]
        if not 1 <= lo <= hi <= 595:
            raise ValueError(f"頁碼無效：{pid} {p['lines']}")
        quote_norm = norm(p["text"])
        raw_norm = norm("".join(x["text"] for x in pages[lo-1:hi]))
        # Strict substring check. Differences are reported, never silently corrected.
        match = quote_norm in raw_norm
        lookup.append({"id": pid, "book_id": "wtz.deep", "chapter": p.get("chapter"),
                       "section": p.get("ref"), "pdf_pages": [lo, hi], **mentions(p.get("ref", "") + " " + p["text"]),
                       "usage_status": "referenced_in_data" if uses[pid] else "not_referenced_in_scanned_data",
                       "uses": uses[pid], "text_match": "exact_after_normalisation" if match else "needs_page_review",
                       "review_status": "inherited_corpus_not_new_semantic_verification"})
    note = Path(args.notes) if args.notes else Path(args.downloads) / NOTE_NAME
    notes = []
    if note.exists():
        text = note.read_text(encoding="utf-8-sig")
        for m in re.finditer(r"^### (\d+)\. ([^\n]+)\n(.*?)(?=^### |\Z)", text, re.M | re.S):
            number, heading, body = int(m[1]), m[2].strip(), m[3].strip()
            urls = re.findall(r"\[查看原頁\]\((https?://[^)]+)\)", body)
            notes.append({"id": f"wtz.initial.note{number:02}", "book_id": "wtz.initial.notes",
                          "note_section": number, "heading": heading,
                          "summary": re.sub(r"\[查看原頁\]\(.+?\)", "", body).strip(),
                          "transcription_url": urls[0] if urls else None,
                          "source_status": "user_supplied_summary_only_original_not_available",
                          "original_page": None, **mentions(heading + body)})
    book = {"id": "wtz.deep", "author": "王亭之", "title": corpus["book"],
            "pdf_path": str(pdf.resolve()), "sha256": pdf_hash, "pdf_pages": 595,
            "edition_status": "local_pdf_publication_details_not_verified",
            "extraction": extraction, "page_convention": "1-based PDF page, not corpus line number"}
    # Full text is kept in ignored tmp/, never copied into tracked output.
    write(CACHE / "library.json", {"schema_version": 1, "book": book, "pages": pages, "notes": notes,
                                  "notes_source": {"path": str(note.resolve()), "sha256": sha(note)} if note.exists() else None})
    plain = load(SRC / "plain/palace.json")
    a2 = [x for x in plain if x["palace"] not in ["命宮", "疾厄"]]
    missing_a2 = [{"id": x["id"], "star": x["star"], "palace": x["palace"]} for x in a2 if not x.get("source")]
    all_inputs = [HERE / "reference.py", HERE / "curated.json", HERE / "ocr-pages.ps1", ROOT / "docs/rules.md", ROOT / "docs/b5-zhongzhou.md",
                  ROOT / "packages/ziwei/src/rules/brightness.json", SRC / "sources/zhongzhou.json", SRC / "sources/t2s.json", *usage_files]
    index = {"schema_version": 1, "book": {k: v for k, v in book.items() if k != "pdf_path"},
             "input_hashes": {p.relative_to(ROOT).as_posix(): sha(p) for p in sorted(set(all_inputs))},
             "notes_input_sha256": sha(note) if note.exists() else None,
             "local_library_sha256": sha(CACHE / "library.json"),
             "scope": "595 PDF pages + inherited excerpt corpus + 25 summary navigation entries; not all Wang books",
             "sections": curated["sections"],
             "pages": [{k: v for k, v in p.items() if k != "text"} for p in pages],
             "passages": lookup,
             "initial_notes": [{k: v for k, v in p.items() if k != "summary"} for p in notes],
             "conflicts": curated["conflicts"], "reading_routes": curated["reading_routes"],
             "audit": {"corpus_passages": len(lookup), "referenced_passages": sum(bool(p["uses"]) for p in lookup),
                       "unreferenced_passages": sum(not p["uses"] for p in lookup),
                       "needs_page_review": sum(p["text_match"] == "needs_page_review" for p in lookup),
                       "image_table_pages": short_pages,
                       "native_text_pages": sum(not p["image_table"] for p in pages),
                       "ocr_navigation_pages": sum(p["text_status"] == "ocr_navigation_only" for p in pages),
                       "ocr_warning": ocr_error,
                       "not_text_searchable_pages": [p["pdf_page"] for p in pages if p["text_status"] == "image_only_not_text_searchable"],
                       "dangling_references": dangling,
                       "a2": {"scope": "plain/palace.json excludes 命宮 and 疾厄: 10 palaces x 14 stars",
                              "total": len(a2), "with_source": len(a2)-len(missing_a2),
                              "without_source": missing_a2},
                       "usage_definition": "JSON data reference only; not proof of runtime selection, publication or semantic support"}}
    write(INDEX, index)
    write_catalogue(index)
    emit({"index": str(INDEX), "local_fulltext": str(CACHE / "library.json"), "audit": index["audit"]})


def write_catalogue(index):
    a = index["audit"]
    lines = ["# 王亭之資料查閱總索引", "", "由 `reference.py build` 生成。檢索方法見 [README](README.md)。", "",
             "## 收錄範圍", "", f"《中州派紫微斗數深造講義》本機595頁PDF，{a['native_text_pages']}頁文字可搜、{a['ocr_navigation_pages']}頁圖片OCR輔助定位；出版年／版次未核。",
             "頁碼係PDF一基頁序。原有 corpus 嘅 `lines` 實際係頁碼，唔係文字行號。",
             "327–332頁係圖片表格；OCR只供搜尋字詞，表格行列與數值必須看原頁核對。",
             "《初階講義》只得25篇使用者提供摘要及轉錄網址，未取得原書；篇號唔係原書頁碼。",
             "《紫微斗數全書》係比較來源，唔歸入王亭之著作。其他王亭之著作尚未收錄。", "",
             f"已摘引文 {a['corpus_passages']} 條；資料引用 {a['referenced_passages']} 條；未見資料引用 {a['unreferenced_passages']} 條。",
             f"摘引文同原頁正規化逐字比對，{a['needs_page_review']} 條需覆核；其餘吻合亦唔等於語意推導已核。",
             f"A2：{a['a2']['total']} 個結論，{a['a2']['with_source']} 個有 source、{len(a['a2']['without_source'])} 個未有。", "",
             "## 原書章節", "", "章節可能喺同一頁交接，所以範圍有重疊；查閱要連前後頁。", "",
             "舊 `docs/b5-zhongzhou.md` 第一張表係粗略抽樣目錄；本表依全文章名重新定位，尤其子女、交友、事業章請用本表。", "",
             "| PDF頁 | 章節 |", "|---|---|"]
    for s in index["sections"]:
        lines.append(f"| {s['start']}–{s['end']} | {s['title']} |")
    lines += ["", "## 六十星系入口", "", "下表名稱及起頁沿用現有 systems.json；只係導航，唔係新增判斷。", "", "| 編號 | 星系 | PDF起頁 |", "|---|---|---|"]
    for s in load(SRC / "xingxi/systems.json"):
        lines.append(f"| {s['n']} | {s['name']} | {s['page']} |")
    lines += ["", "## 初階摘要入口", "", "連結指向筆記所列第三方轉錄，本次未重新核對網頁與原書。", "", "| 篇號 | 篇名 | 轉錄線索 |", "|---|---|---|"]
    for n in index["initial_notes"]:
        link = f"[轉錄]({n['transcription_url']})" if n["transcription_url"] else "未列網址"
        lines.append(f"| {n['note_section']} | {n['heading']} | {link} |")
    lines += ["", "## 已知版本／專案選擇", ""]
    for c in index["conflicts"]:
        lines += [f"- **{c['id']} {c['subject']}**：{c['adopted']} 依據：{c['decision']}。{c['caution']}"]
    lines += ["", "## A2 尚未有出處的結論", "", "以下係現有資料狀態，唔代表全書冇材料，亦唔代表可以自動補引文。", ""]
    for x in a["a2"]["without_source"]:
        lines.append(f"- `{x['id']}`")
    lines += ["", "## 核對要求", "", "條件標籤只係字詞出現。無煞同見煞、同度同會照、原局同流年不可互換。",
              "每次引用先 `show --page N --context 1` 讀完整相關頁；摘引文比對標記只查文字，唔裁定文案受支持。",
              "原書全文只喺忽略嘅 `tmp/wang-reference/`；追蹤索引只存定位、標籤及資料引用位置。", ""]
    (HERE / "CATALOGUE.md").write_text("\n".join(lines), encoding="utf-8")


def emit(value):
    print(json.dumps(value, ensure_ascii=False, indent=2))


def read_index():
    if not INDEX.exists():
        raise ValueError("先執行 reference.py build。")
    return load(INDEX)


def library():
    p = CACHE / "library.json"
    if not p.exists():
        raise ValueError("本機全文未建立；先 build。已追蹤嘅 index.json 仍可查摘引文定位。")
    return load(p)


def query_forms(q):
    for k, forms in ALIASES.items():
        if norm(q) == norm(k):
            return list(map(norm, forms))
    if norm(q) in [norm(k) for k in PAIRS]:
        key = next(k for k in PAIRS if norm(k) == norm(q))
        return [norm(key), norm("".join(PAIRS[key])), norm("".join(reversed(PAIRS[key])))]
    return [norm(q)]


def fresh_warnings(index):
    changed = [p for p, h in index["input_hashes"].items() if not (ROOT / p).exists() or sha(ROOT / p) != h]
    current = {p.relative_to(ROOT).as_posix() for p in SRC.rglob("*.json") if "sources" not in p.relative_to(SRC).parts}
    changed += sorted(current - set(index["input_hashes"]))
    warnings = ["索引輸入已變，先重新build：" + ", ".join(changed)] if changed else []
    cache = CACHE / "library.json"
    if cache.exists():
        if sha(cache) != index.get("local_library_sha256"):
            warnings.append("本機全文快取已變，先重新build。")
        ns = load(cache).get("notes_source")
        if ns and (not Path(ns["path"]).exists() or sha(ns["path"]) != ns["sha256"]):
            warnings.append("初階筆記已變或缺失，先重新build。")
    return warnings


def search(args):
    index = read_index()
    warnings = fresh_warnings(index)
    palace = palace_name(args.palace)
    stars = [star_name(s) for s in args.stars]
    pair = next((k for k in PAIRS if norm(k) == norm(args.pair or "")), None)
    if args.pair and not pair:
        raise ValueError("未知組合簡稱；例如 --pair 紫破／同梁／機巨。")
    if args.kind == "pages":
        lib = library()
        records = lib["pages"]
    elif args.kind == "notes":
        records = library()["notes"]
    else:
        corpus = load(SRC / "sources/zhongzhou.json")["passages"]
        records = [{**p, "text": corpus[p["id"]]["text"]} for p in index["passages"]]
    queries = args.query + args.condition
    results = []
    for r in records:
        text = r.get("text", r.get("summary", ""))
        heading = " ".join([r.get("section") or "", r.get("chapter") or "", r.get("heading") or ""])
        body = norm(text + heading)
        if stars and not all(s in r["stars"] for s in stars):
            continue
        if pair and pair not in r["pair_mentions"]:
            continue
        if palace:
            # For pages, palace filter means containing chapter OR explicit mention.
            # Prefer the containing chapter, but label both in the result.
            if palace not in [*r.get("section_palaces", []), *r["palace_mentions"]] and norm(palace) not in norm(heading):
                continue
        if args.layer and args.layer not in r["layer_mentions"]:
            continue
        if args.usage and r.get("usage_status") != args.usage:
            continue
        if queries and not all(any(form in body for form in query_forms(q)) for q in queries):
            continue
        score = sum(3 if any(f in norm(heading) for f in query_forms(q)) else 1 for q in queries)
        score += 12 if palace and palace in r.get("section_palaces", []) else 0
        score += 5 if stars and len(stars) > 1 and any(set(PAIRS[k]) == set(stars) for k in r["pair_mentions"]) else 0
        if pair:
            score += min(6, sum(body.count(f) for f in query_forms(pair)))
            score += 20 if any(set(s["stars"]) == set(PAIRS[pair]) for s in r.get("system_context", [])) else 0
        if args.kind == "passages":
            score += 10 if palace and norm(palace) in norm(heading) else 0
        out = {k: v for k, v in r.items() if k not in ["text", "summary", "uses"]}
        out["score"] = score
        if args.kind == "passages":
            out["use_count"] = len(r["uses"])
        # Return just a short locator. show retrieves full pages with neighbours.
        compact = re.sub(r"\s+", "", text)
        excerpt_query = queries or ([pair] if pair else stars)
        text_norm = norm(text)
        pos = next((text_norm.find(f) for q in excerpt_query for f in query_forms(q) if f in text_norm), 0)
        # Offsets from normalisation aren't character-identical; excerpt is only a hint.
        out["excerpt"] = compact[max(0, pos-40):max(0, pos-40)+args.excerpt]
        results.append(out)
    results.sort(key=lambda x: (-x["score"], x.get("pdf_page", x.get("pdf_pages", [0])[0]), x["id"]))
    emit({"warnings": warnings,
          "semantics": "AND across query terms and stars; palace/layer/condition are retrieval cues, not verified rule applicability; star co-occurrence is not 同宮",
          "total": len(results), "results": results[:args.limit],
          "next": "show --page N --context 1 / show --id PASSAGE_ID；查原頁前後文及對照條件後先寫"})


def show(args):
    index = read_index()
    lib = library()
    if args.id:
        page_id = re.fullmatch(r"wtz\.deep\.p(\d{3})", args.id)
        if page_id:
            args.page, args.id = int(page_id[1]), None
    if args.id:
        p = next((p for p in index["passages"] if p["id"] == args.id), None)
        if p is None:
            note = next((p for p in lib["notes"] if p["id"] == args.id), None)
            if note:
                emit(note)
                return
            raise ValueError(f"未知 passage id：{args.id}")
        lo, hi = p["pdf_pages"]
        info = {**p, "inherited_excerpt": load(SRC / "sources/zhongzhou.json")["passages"][args.id]["text"]}
    else:
        lo = hi = args.page
        info = None
    if not 1 <= lo <= hi <= 595:
        raise ValueError("頁碼必須介乎1–595。")
    pages = lib["pages"][max(1, lo-args.context)-1:min(595, hi+args.context)]
    related = [c for c in index["conflicts"] if any(p["pdf_page"] in c["deep_pages"] for p in pages)]
    emit({"warnings": fresh_warnings(index), "book": lib["book"], "passage": info, "related_conflicts": related,
          "pages": pages, "review": "文字提取可能有OCR／編碼錯字；有歧義要開原PDF逐頁看。條件及否定詞要連上下文核對。"})


def audit(args):
    index = read_index()
    result = {"warnings": fresh_warnings(index), **index["audit"]}
    if args.review:
        result["review_queue"] = [{k: p[k] for k in ("id", "pdf_pages", "section", "text_match")} for p in index["passages"] if p["text_match"] == "needs_page_review"]
    emit(result)


def check(args):
    index = read_index()
    lib = library()
    errors = fresh_warnings(index)
    if len(lib["pages"]) != 595 or len({p["id"] for p in lib["pages"]}) != 595:
        errors.append("全文頁數／id異常")
    if len({p["id"] for p in index["passages"]}) != len(index["passages"]):
        errors.append("passage id重複")
    if lib["book"]["sha256"] != index["book"]["sha256"]:
        errors.append("本機全文同索引PDF指紋唔同")
    pdf = Path(lib["book"]["pdf_path"])
    if not pdf.exists() or sha(pdf) != index["book"]["sha256"]:
        errors.append("原PDF缺失或指紋已變")
    if index["audit"]["dangling_references"]:
        errors.append("有失效passage引用")
    if index["audit"]["not_text_searchable_pages"]:
        errors.append("圖片頁尚未有可搜尋文字：" + str(index["audit"]["not_text_searchable_pages"]))
    for p in index["passages"]:
        for u in p["uses"]:
            obj = load(ROOT / u["file"])
            for part in u["pointer"].split("/")[1:]:
                key = part.replace("~1", "/").replace("~0", "~")
                obj = obj[int(key)] if isinstance(obj, list) else obj[key]
            if obj.get("passage_id", obj.get("passage")) != p["id"]:
                errors.append(f"反查引用失配：{p['id']}")
    emit({"ok": not errors, "errors": errors, "pages": len(lib["pages"]),
          "passages": len(index["passages"]),
          "text_review_queue": index["audit"]["needs_page_review"],
          "note": "check驗證索引完整性、指紋及引用指標，唔代替原文語意／條件覆核。"})
    if errors:
        raise SystemExit(1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("build", help="原PDF重新提取全文，更新可追蹤索引及本機快取")
    p.add_argument("--downloads", default=str(Path.home()/"Downloads"))
    p.add_argument("--pdf")
    p.add_argument("--notes")
    p.add_argument("--pages-cache", help="只供排錯：使用現有頁文字，會標未核原PDF")
    p.add_argument("--skip-ocr", action="store_true", help="跳過圖片頁OCR，會標明缺少文字")
    p.set_defaults(func=build)
    p = sub.add_parser("search", help="繁簡通搜；各詞AND；預設查原書全頁")
    p.add_argument("query", nargs="*")
    p.add_argument("--stars", nargs="+", default=[])
    p.add_argument("--pair", help="要求原文出現組合名稱／簡稱，例如紫破；仍需核對關係")
    p.add_argument("--palace")
    p.add_argument("--condition", action="append", default=[])
    p.add_argument("--layer", choices=["本命", "大限", "流年"])
    p.add_argument("--kind", choices=["pages", "passages", "notes"], default="pages")
    p.add_argument("--usage", choices=["referenced_in_data", "not_referenced_in_scanned_data"])
    p.add_argument("--limit", type=int, default=8)
    p.add_argument("--excerpt", type=int, default=100)
    p.set_defaults(func=search)
    p = sub.add_parser("show", help="原頁、前後文、摘引文、版本差異、產品反查")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--page", type=int)
    g.add_argument("--id")
    p.add_argument("--context", type=int, choices=range(0,6), default=1)
    p.set_defaults(func=show)
    p = sub.add_parser("audit", help="現有引文使用情況、A2缺口")
    p.add_argument("--review", action="store_true", help="列出摘引文逐字比對未吻合嘅待核清單")
    p.set_defaults(func=audit)
    p = sub.add_parser("check", help="核對指紋、頁數、失效引用及反查指標")
    p.set_defaults(func=check)
    args = parser.parse_args()
    if getattr(args, "usage", None) and args.kind != "passages":
        parser.error("--usage 只適用 --kind passages；全文頁唔等於已摘引文。")
    if getattr(args, "limit", 1) < 1 or getattr(args, "excerpt", 1) < 0:
        parser.error("limit要大於0，excerpt不能為負。")
    try:
        args.func(args)
    except (ValueError, FileNotFoundError) as exc:
        parser.exit(2, f"{exc}\n")


if __name__ == "__main__":
    main()
