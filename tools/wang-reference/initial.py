#!/usr/bin/env python3
"""初階專用：下載轉錄、建立段落導航、查摘要及原段。唔改深造索引。"""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.request import Request, urlopen
from urllib.parse import urlsplit

import reference as core

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
CACHE = ROOT / "tmp/wang-reference/initial"
INDEX = HERE / "initial-index.json"
GUIDES = HERE / "initial-guides.json"
LEDGER = CACHE / "sources.json"
PALACES = {13:"命宮",14:"命宮",15:"兄弟",16:"夫妻",17:"子女",18:"財帛",19:"疾厄",20:"遷移",21:"僕役",22:"官祿",23:"田宅",24:"福德",25:"父母"}
STAR_NAMES = list(dict.fromkeys(core.STARS + "天傷 天使 天哭 天虛 天巫 天月 陰煞 天才 天壽 三台 八座 龍池 鳳閣 恩光 天貴 天官 天福 台輔 封誥 孤辰 寡宿 蜚廉 破碎 解神 截空 旬空 華蓋 天德 月德 長生 沐浴 冠帶 臨官 帝旺 衰 病 死 墓 絕 胎 養 博士 力士 青龍 小耗 將軍 奏書 飛廉 喜神 病符 大耗 伏兵 官府 將星 攀鞍 歲驛 息神 劫殺 劫煞 災煞 天煞 指背 月煞 亡神 歲建 晦氣 喪門 貫索 官符 龍德 白虎 吊客 流羊 流陀 流祿 流馬 流昌 流曲 流魁 流鉞".split()))


def mentions(text):
    tags=core.mentions(text)
    # Single-character names are only tags when named as a heading, not inside prose.
    tags["stars"] += [s for s in STAR_NAMES if len(s)>1 and s not in core.STARS and core.norm(s) in core.norm(text)]
    return tags


class ArticleParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.block = None
        self.strong = 0
        self.records = []
        self.images = []
        self.links = []
        self.tables = 0
        self.in_title = False
        self.title = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "h1":
            self.in_title = True
        if tag == "div":
            if self.depth:
                self.depth += 1
            elif "prose" in a.get("class", "").split():
                self.depth = 1
        if not self.depth:
            return
        if tag in ["p", "li", "h1", "h2", "h3", "h4", "tr"] and self.block is None:
            self.block = {"tag":tag, "text":[], "emphasis":[]}
        if tag in ["strong", "b"]:
            self.strong += 1
        if tag == "br" and self.block:
            self.block["text"].append(" ")
        if tag in ["td","th"] and self.block:
            self.block["text"].append(" | ")
        if tag == "img":
            self.images.append({k:a.get(k) for k in ["src","alt"]})
        if tag == "a":
            self.links.append(a.get("href"))
        if tag == "table":
            self.tables += 1

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if self.depth and self.block:
            self.block["text"].append(data)
            if self.strong:
                self.block["emphasis"].append(data)

    def handle_endtag(self, tag):
        if tag == "h1":
            self.in_title = False
        if tag in ["strong", "b"] and self.depth:
            self.strong = max(0, self.strong - 1)
        if self.block and tag == self.block["tag"]:
            text = re.sub(r"\s+", " ", "".join(self.block["text"])).strip()
            emph = re.sub(r"\s+", "", "".join(self.block["emphasis"]))
            if text:
                self.records.append({"text":text, "emphasised":len(emph) >= len(core.norm(text))*.7, "html_tag":tag})
            self.block = None
        if tag == "div" and self.depth:
            self.depth -= 1


def digest(path):
    return sha256(Path(path).read_bytes()).hexdigest()


def inputs():
    # This file contains navigation only; no dependency on the advanced fulltext cache.
    return core.load(HERE / "index.json")["initial_notes"]


def fetch(args):
    CACHE.mkdir(parents=True, exist_ok=True)
    old = {r["note_section"]:r for r in core.load(LEDGER)} if LEDGER.exists() else {}
    def one(n):
        number = n["note_section"]
        url = n["transcription_url"]
        if urlsplit(url).hostname != "lesternkgmailcom.github.io":
            raise ValueError("下載只接受原筆記所列轉錄站。")
        path = CACHE / f"{number:02}.html"
        if path.exists() and number in old and not args.refresh and digest(path) == old[number]["html_sha256"]:
            return old[number]
        with urlopen(Request(url, headers={"User-Agent":"Guanwei-initial-reference/1.0"}), timeout=35) as response:
            data = response.read()
            status = response.status
            final_url = response.url
        path.write_bytes(data)
        return {"note_section":number, "url":url, "final_url":final_url, "http_status":status,
                "retrieved_at_utc":datetime.now(timezone.utc).isoformat(), "html_sha256":digest(path), "bytes":len(data)}
    with ThreadPoolExecutor(max_workers=5) as pool:
        rows = list(pool.map(one, inputs()))
    core.write(LEDGER, sorted(rows,key=lambda r:r["note_section"]))
    core.emit({"downloaded_or_reused":len(rows),"local_cache":str(CACHE),"bytes":sum(r["bytes"] for r in rows)})


def heading(text, emphasised):
    n = core.norm(text)
    stars = [s for s in STAR_NAMES if len(s)>1 and core.norm(s) in n]
    star_heading = bool(re.fullmatch(r"\d{0,2}[、.．\s]*(?:"+"|".join(STAR_NAMES)+r")",text))
    numbered = bool(re.match(r"^(?:\d{1,2}[、．.]|[（(][一二三四五六七八九十]{1,3}[）)]\s*(?:"+"|".join(core.STARS)+"))",text))
    label = re.match(r"^(\d+[、．.]\s*[^：:]{1,20})[：:]",text)
    if label:
        return label[1], stars
    if len(text)<=60 and (emphasised or star_heading or numbered):
        # A cross-reference sentence can be bold in the HTML; retain just its title.
        if re.search(r"[請清]參看",text):
            label = re.match(r"^([^\s]+)",text)
            return label[1],stars
        return text,stars
    branch = re.match(r"^[「『\[]([^」』\]]+)[」』\]]",text)
    if branch and (core.norm(branch[1]) in [core.norm(k) for k in core.PAIRS] or
                   any(core.norm(branch[1]) in [core.norm(''.join(v)),core.norm(''.join(reversed(v)))] for v in core.PAIRS.values())):
        return branch[1],mentions(branch[1])["stars"]
    return None,stars


def main_star(label):
    if label in STAR_NAMES:
        return label
    m=re.match(r"^(?:\d{1,2}[、.．\s]*|[（(][一二三四五六七八九十]{1,3}[）)]\s*)("+"|".join(core.STARS)+r")(?:\s|[（(]|$)",label)
    return m[1] if m else None


def build(args):
    guides = {g["number"]:g for g in core.load(GUIDES)["chapters"]}
    ledger = {r["note_section"]:r for r in core.load(LEDGER)}
    chapters, blocks, lookup = [], [], []
    for note in inputs():
        n = note["note_section"]
        path = CACHE / f"{n:02}.html"
        if digest(path) != ledger[n]["html_sha256"]:
            raise ValueError(f"第{n}篇HTML指紋已變，重新fetch確認。")
        p = ArticleParser()
        p.feed(path.read_text(encoding="utf-8-sig"))
        if not p.records:
            raise ValueError(f"第{n}篇未抽到正文，唔當完成。")
        title = "".join(p.title).strip()
        if core.norm("初階講義") not in core.norm(title):
            raise ValueError(f"第{n}篇唔似所需講義頁：{title}")
        g = guides.get(n)
        if not g:
            raise ValueError(f"第{n}篇未有詳細導讀。")
        if g.get("reviewed_html_sha256")!=ledger[n]["html_sha256"]:
            raise ValueError(f"第{n}篇來源版本未同人工摘要對齊。重新核對摘要及段號後，再更新reviewed_html_sha256；唔沿用舊段號。")
        overrides = {s["paragraph"]:s for s in g.get("section_overrides",[])}
        section = "篇首"
        section_stars = []
        primary_star = None
        section_pairs = []
        section_path = []
        headings = []
        for number, r in enumerate(p.records,1):
            label, stars = heading(r["text"], r["emphasised"])
            is_heading = bool(label and label == r["text"])
            anchor_kind = "explicit_heading" if is_heading else "inline_branch_or_term"
            if number in overrides:
                label=overrides[number]["label"]
                stars=overrides[number]["stars"]
                primary_star=stars[0] if stars else None
                is_heading=False
                anchor_kind="editorial_navigation_anchor"
            if label:
                changed=core.norm(label)!=core.norm(section)
                section = label
                ms=main_star(label)
                if ms: primary_star=ms
                elif "附" in label or n not in [10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25]: primary_star=None
                section_stars = list(dict.fromkeys(([primary_star] if primary_star else [])+stars))
                section_pairs = mentions(label)["pair_mentions"]
                section_path = ([primary_star] if primary_star and primary_star not in label else [])+[label]
                if changed:
                    headings.append({"heading":section,"paragraph":number,"stars":stars,"kind":anchor_kind})
            tags = mentions(r["text"])
            block = {"id":f"wtz.initial.{n:02}.p{number:04}", "chapter":n,"title":title,
                     "section":section,"paragraph":number,"is_heading":is_heading,
                     "section_stars":section_stars,"section_path":section_path,"section_pair_mentions":section_pairs,"chapter_palace":PALACES.get(n),
                     "text":r["text"], **tags,
                     "context_dependency":"heading_and_adjacent_paragraphs_required",
                     "source_status":"third_party_transcription_not_original_book_verified"}
            blocks.append(block)
            # Tracked navigation contains no body/quote from the copyrighted text.
            lookup.append({k:v for k,v in block.items() if k!="text"})
        for i,h in enumerate(headings):
            h["end_paragraph"]=(headings[i+1]["paragraph"]-1) if i+1<len(headings) else len(p.records)
        if len(g.get("point_sources",[]))!=len(g["points"]):
            raise ValueError(f"第{n}篇細讀重點未有逐項段落依據。")
        for sources in g["point_sources"]:
            if not sources or any(not 1<=s<=len(p.records) for s in sources):
                raise ValueError(f"第{n}篇摘要來源段號無效。")
        chapters.append({"number":n,"title":title,"url":note["transcription_url"],
                         "source":ledger[n],"paragraphs":len(p.records),"headings":headings,
                         "image_elements":p.images,"html_table_count":p.tables,
                         "source_status":"third_party_transcription_not_original_book_verified", **g})
    book = {"title":"中洲派斗數：初階講義（網上轉錄）", "attributed_author":"王亭之",
            "chapter_count":len(chapters),"original_book_pages":None,
            "locator_convention":"chapter number from supplied 25-page navigation + nonempty HTML paragraph count; not book pages",
            "status":"transcription_parsed_and_summarised_original_edition_not_collated"}
    core.write(CACHE / "library.json", {"book":book,"chapters":chapters,"blocks":blocks})
    index = {"schema_version":1,"book":book,"chapters":chapters,"paragraph_index":lookup,
             "input_hashes":{str(p.relative_to(ROOT)).replace('\\','/'):digest(p) for p in [Path(__file__),GUIDES,HERE/"reference.py",ROOT/"packages/content/src/sources/t2s.json"]},
             "library_sha256":digest(CACHE/"library.json"),
             "limitations":core.load(GUIDES)["limitations"],"case_cards":core.load(GUIDES)["case_cards"]}
    core.write(INDEX,index)
    write_guide(index)
    core.emit({"chapters":len(chapters),"paragraphs":len(blocks),"sections":sum(len(c["headings"]) for c in chapters),
               "guide":str(HERE/"INITIAL.md"),"index":str(INDEX)})


def write_guide(index):
    lines = ["# 初階講義：詳細摘要與查閱索引", "", "今次先整理初階；深造索引獨立保留，唔作初階缺文嘅補寫來源。", "",
             "## 怎樣用", "", "1. 先按下面25篇導讀揀範圍；每篇有實際抽出嘅細節標題／星曜入口。",
             "2. 用 `initial.py search` 查字詞／星曜／宮位／組合，再 `show --id` 連前後段讀。",
             "3. 引用寫『初階轉錄・第N篇・小節・本次抽取段號』及原網址，唔把篇號／段號冒作原書頁碼。", "",
             "```powershell", "python tools/wang-reference/initial.py search --pair 紫破 --palace 交友",
             "python tools/wang-reference/initial.py search --chapter 4 子時",
             "python tools/wang-reference/initial.py show --chapter 21 --section 紫微",
             "python tools/wang-reference/initial.py check", "```", "",
             "`--stars`包括明示小節星曜；`--pair`查段落或所屬分支明寫嘅組合名稱／簡稱，唔將兩星各自出現當同宮。",
             "段落標籤只供查閱，唔係判斷層嘅已核條件；『若、但、唯、不』要連完整小節理解。", "",
             "## 已知缺口與版本界線", ""]
    lines += [f"- {s}" for s in index["limitations"]]
    lines += ["", "## 先處理嘅閱讀問題", ""]
    for card in index["case_cards"]:
        refs="、".join(f"第{c}篇第{p}段" for c,p in card["sources"])
        lines += [f"### {card['id']}　{card['title']}","",card["finding"],"",f"**定位**：{refs}。", "",f"**處理**：{card['action']} 狀態：`{card['status']}`。",""]
    lines += ["## 25篇導讀", "", "以下係自寫摘要與查閱建議；段號定位轉錄依據，『引用時保留』及操作建議屬編輯界線，唔冒作作者原話。", ""]
    for c in index["chapters"]:
        lines += [f"### {c['number']:02}　{c['short_title']}", "", f"[轉錄頁]({c['url']})｜本次抽取 {c['paragraphs']} 段｜{c['category']}", "", "**本篇處理甚麼**", "", c["overview"], "", "**細讀重點**", ""]
        for point,sources in zip(c["points"],c["point_sources"]):
            lines += [f"- {point}〔本篇第{'、'.join(map(str,sources))}段〕"]
        lines += ["", "**引用時保留**："+c["boundaries"], "", "**連讀**："+c["read_with"], ""]
        if c["headings"]:
            lines += ["**小節／段內分支入口**（括號為本次抽取段號，唔係原書頁碼；編輯補嘅導航已標明）", "", "；".join(f"{h['heading']}（{h['paragraph']}）" for h in c["headings"]), ""]
        for note in c.get("review_notes",[]):
            lines += [f"**待核／缺漏**：{note}", ""]
    lines += ["## 引用紀錄最少記甚麼", "", "來源網址＋HTML指紋、篇名／小節／段號、原文重點（自寫摘要）、明示條件及排除條件、所論宮位與時間層、須連讀嘅修飾段、轉錄疑字、使用狀態。", "",
              "原書未到手，狀態保持『轉錄可定位，未對原書』。書中基本說法、具體組合、運限交涉、編輯建議分開保存，唔補寫成作者已講過嘅結論。", ""]
    (HERE/"INITIAL.md").write_text("\n".join(lines),encoding="utf8")


def read_library():
    if not INDEX.exists() or not (CACHE/"library.json").exists():
        raise ValueError("先執行 initial.py fetch 同 initial.py build。")
    return core.load(INDEX),core.load(CACHE/"library.json")


def warnings(index):
    changed = [p for p,h in index["input_hashes"].items() if not (ROOT/p).exists() or digest(ROOT/p)!=h]
    out = ["導讀／程式已變，先build："+", ".join(changed)] if changed else []
    if digest(CACHE/"library.json")!=index["library_sha256"]:
        out.append("原段快取指紋已變，先build。")
    return out


def search(args):
    index,lib=read_library()
    stars=[]
    for s in args.stars:
        canonical=next((x for x in STAR_NAMES if core.norm(x)==core.norm(s)),None)
        if not canonical:raise ValueError(f"未知星曜：{s}")
        stars.append(canonical)
    palace=core.palace_name(args.palace)
    pair=next((p for p in core.PAIRS if core.norm(p)==core.norm(args.pair or "")),None)
    if args.pair and not pair:raise ValueError("組合請用紫破、同梁、機巨等簡稱。")
    results=[]
    for b in lib["blocks"]:
        if args.chapter and b["chapter"]!=args.chapter:continue
        if stars and not all(s in b["stars"]+b["section_stars"] for s in stars):continue
        if palace and palace!=b["chapter_palace"] and palace not in b["palace_mentions"]:continue
        if pair and pair not in b["pair_mentions"]+b["section_pair_mentions"]:continue
        if args.layer and args.layer not in b["layer_mentions"]:continue
        text=core.norm(b["text"])
        if args.query+args.condition and not all(any(f in text for f in core.query_forms(q)) for q in args.query+args.condition):continue
        score=(10 if palace and palace==b["chapter_palace"] else 0)+(5 if not b["is_heading"] else 0)
        score+=sum(2 for s in stars if s in b["section_stars"])
        if pair and pair in b["section_pair_mentions"]:score+=30
        out={k:v for k,v in b.items() if k!="text"}
        source=index["chapters"][b["chapter"]-1]
        out["url"]=source["url"]
        out["html_sha256"]=source["source"]["html_sha256"]
        out.update(score=score,excerpt=b["text"][:args.excerpt])
        results.append(out)
    results.sort(key=lambda b:(-b["score"],b["chapter"],b["paragraph"]))
    hit_ids={r["id"] for r in results[:args.limit]}
    related=[c for c in index["case_cards"] if any(f"wtz.initial.{n:02}.p{p:04}" in hit_ids for n,p in c["sources"])]
    core.emit({"warnings":warnings(index),"total":len(results),"results":results[:args.limit],"related_reading_notes":related,
               "next":"show --id ID；前後文及本節全文要連讀，段號唔係原書頁碼"})


def show(args):
    index,lib=read_library()
    if args.id:
        hit=next((b for b in lib["blocks"] if b["id"]==args.id),None)
        if not hit:raise ValueError("搵唔到段落ID。")
        number=hit["chapter"]
        blocks=[b for b in lib["blocks"] if b["chapter"]==number and abs(b["paragraph"]-hit["paragraph"])<=args.context]
    else:
        number=args.chapter
        blocks=[b for b in lib["blocks"] if b["chapter"]==number]
        if args.section:
            blocks=[b for b in blocks if core.norm(args.section) in core.norm(' '.join(b["section_path"]))]
    chapter=next((c for c in index["chapters"] if c["number"]==number),None)
    if not chapter or not blocks:raise ValueError("搵唔到篇／小節。")
    core.emit({"warnings":warnings(index),"chapter":chapter,"blocks":blocks,
               "note":"第三方轉錄；疑字未擅改；原書頁碼未知。條件跨段延續時要讀整節。"})


def check(args):
    index,lib=read_library()
    errors=warnings(index)
    if [c["number"] for c in index["chapters"]]!=list(range(1,26)):errors.append("25篇未齊或次序錯誤")
    if len({b["id"] for b in lib["blocks"]})!=len(lib["blocks"]):errors.append("段ID重複")
    for c in index["chapters"]:
        p=CACHE/f"{c['number']:02}.html"
        if not p.exists() or digest(p)!=c["source"]["html_sha256"]:errors.append(f"第{c['number']}篇原HTML指紋失配")
        bs=[b for b in lib["blocks"] if b["chapter"]==c["number"]]
        if [b["paragraph"] for b in bs]!=list(range(1,c["paragraphs"]+1)):errors.append(f"第{c['number']}篇段序失配")
        if len(c["points"])<3 or not c["boundaries"]:errors.append(f"第{c['number']}篇導讀未齊")
        if len(c["points"])!=len(c["point_sources"]):errors.append(f"第{c['number']}篇摘要依據未齊")
    ids={b["id"] for b in lib["blocks"]}
    for card in index["case_cards"]:
        if any(f"wtz.initial.{c:02}.p{p:04}" not in ids for c,p in card["sources"]):errors.append(card["id"]+"定位失效")
    core.emit({"ok":not errors,"errors":errors,"chapters":len(index["chapters"]),"paragraphs":len(lib["blocks"]),
               "status":"25篇轉錄已解析；摘要有可定位來源；唔等於逐條對過原書"})
    if errors:raise SystemExit(1)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(required=True)
    p=sub.add_parser("fetch");p.add_argument("--refresh",action="store_true");p.set_defaults(func=fetch)
    p=sub.add_parser("build");p.set_defaults(func=build)
    p=sub.add_parser("search");p.add_argument("query",nargs="*");p.add_argument("--chapter",type=int,choices=range(1,26));p.add_argument("--stars",nargs="+",default=[]);p.add_argument("--palace");p.add_argument("--pair");p.add_argument("--condition",action="append",default=[]);p.add_argument("--layer",choices=["本命","大限","流年"]);p.add_argument("--limit",type=int,default=8);p.add_argument("--excerpt",type=int,default=90);p.set_defaults(func=search)
    p=sub.add_parser("show");g=p.add_mutually_exclusive_group(required=True);g.add_argument("--id");g.add_argument("--chapter",type=int,choices=range(1,26));p.add_argument("--section");p.add_argument("--context",type=int,choices=range(0,11),default=2);p.set_defaults(func=show)
    p=sub.add_parser("check");p.set_defaults(func=check)
    args=parser.parse_args()
    if getattr(args,"limit",1)<1 or getattr(args,"excerpt",0)<0:parser.error("limit要大於0，excerpt不能為負。")
    try:args.func(args)
    except (ValueError,FileNotFoundError) as e:parser.exit(2,f"{e}\n")


if __name__=="__main__":main()
