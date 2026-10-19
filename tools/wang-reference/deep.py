#!/usr/bin/env python3
"""深造：精確章節邊界、詳細導讀、逐段檢索與待核清單。"""
from __future__ import annotations
import argparse
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path
import re
import sys

import reference as core

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
CACHE=ROOT/"tmp/wang-reference/deep"
STRUCTURE=HERE/"deep-structure.json"
GUIDES=HERE/"deep-guides.json"
INDEX=HERE/"deep-index.json"
MAJORS=core.STARS[:14]
EXTRA="天傷 天使 天哭 天虛 三台 八座 龍池 鳳閣 孤辰 寡宿 恩光 天貴 天才 天壽 台輔 封誥 天官 天福 蜚廉 破碎 解神 天巫 天月 陰煞 華蓋 大耗 天空 截空 旬空 天德 月德 龍德 天廚 長生 沐浴 博士 流羊 流陀 流祿 流馬 流昌 流曲 流魁 流鉞".split()
STARS=list(dict.fromkeys(core.STARS+EXTRA))


def digest(path):return sha256(Path(path).read_bytes()).hexdigest()
def text_hash(text):return sha256(text.encode("utf8")).hexdigest()
def pos(page,line):return page*10000+line


def original():
    lib=core.load(ROOT/"tmp/wang-reference/library.json")
    pdf=Path(lib["book"]["pdf_path"])
    if len(lib["pages"])!=595 or not pdf.exists() or digest(pdf)!=lib["book"]["sha256"]:
        raise ValueError("原書指紋／595頁快取未對齊，先執行reference.py build。")
    return lib


def source_tags(text):
    t=core.mentions(text)
    t["stars"] += [s for s in EXTRA if core.norm(s) in core.norm(text)]
    for key,names in core.PAIRS.items():
        if key not in t["pair_mentions"] and core.norm(''.join(reversed(names))) in core.norm(text):t["pair_mentions"].append(key)
    return t


def find_line(pages,page,needle,mode="exact"):
    for i,l in enumerate(pages[page-1]["text"].splitlines(),1):
        n=core.norm(l)
        if (mode=="exact" and n==core.norm(needle)) or (mode=="prefix" and n.startswith(core.norm(needle))):return i
    raise ValueError(f"p.{page}未找到章名：{needle}")


def scan(args):
    lib=original();pages=lib["pages"]
    parts=[]
    curated=core.load(HERE/"curated.json")
    for p in curated["sections"]:
        page=p["start"];line=1
        if p["id"]=="main-stars":page,line=4,1
        elif p["id"]=="auxiliary":page,line=220,find_line(pages,220,"輔佐煞曜總論")
        elif p["id"]=="transformations":page,line=234,find_line(pages,234,"化曜")
        elif p["id"]=="misc":page,line=314,find_line(pages,314,"雜曜總論")
        elif p["id"]=="brightness":page,line=325,find_line(pages,325,"星曜廟陷")
        elif p.get("palace"):
            forms=core.PALACES[p["palace"]]
            if p["id"]=="friends":needle="交友宫(奴仆宫)"
            elif p["id"]=="career":needle="事业宫(官禄宫)"
            else:needle=forms[0]
            line=find_line(pages,page,needle)
        title={"main-stars":"星曜論前言與十四正曜","misc":"雜曜、流曜與十二神","brightness":"廟陷說明、表格與宮次圖"}.get(p["id"],p["title"])
        parts.append({"id":p["id"],"title":title,"palace":p.get("palace"),"start":{"page":page,"line":line},"position":pos(page,line)})
    parts.sort(key=lambda x:x["position"])
    for i,p in enumerate(parts):p["end_position"]=parts[i+1]["position"] if i+1<len(parts) else pos(596,1)
    sections=[]
    def add(sid,title,page,line,kind,**extra):
        parent=next(p for p in reversed(parts) if p["position"]<=pos(page,line))
        sections.append({"id":sid,"title":title,"kind":kind,"part":parent["id"],"palace":parent["palace"],
                         "start":{"page":page,"line":line},"position":pos(page,line),
                         "source_heading":pages[page-1]["text"].splitlines()[line-1].strip(),**extra})
    for p in parts:add(f"deep.{p['id']}.intro",p["title"]+"・篇首",p["start"]["page"],p["start"]["line"],"part_intro")
    # Exact numbered star headings; matching by position prevents same-page palace bleed.
    star_counts=Counter()
    for p in pages:
        n=p["pdf_page"]
        parent=next(x for x in reversed(parts) if x["position"]<=pos(n,1))
        for i,l in enumerate(p["text"].splitlines(),1):
            position=pos(n,i)
            parent=next(x for x in reversed(parts) if x["position"]<=position)
            if parent["id"]!="main-stars" and not parent["palace"]:continue
            m=re.fullmatch(r"(\d{1,2})[、.．]?(\D{2,3})",core.norm(l))
            if m and 1<=int(m[1])<=14 and core.norm(MAJORS[int(m[1])-1])==m[2]:
                star=MAJORS[int(m[1])-1]
                add(f"deep.{parent['id']}.{star}",star,n,i,"star",subject_stars=[star])
                star_counts[parent["id"]]+=1
    # A few PDF headings contain stray punctuation/spacing in the text layer.
    expected_parts=[p for p in parts if p["palace"] or p["id"]=="main-stars"]
    for p in expected_parts:
        if star_counts[p["id"]]!=14:
            print(f"heading coverage: {p['id']} {star_counts[p['id']]}/14",file=sys.stderr)
    add("deep.wealth.紫微","紫微〔原提取序號為l，按正文核位〕",433,12,"star_editorial",subject_stars=["紫微"],title_status="damaged_number_preserved")
    add("deep.career.巨門","巨門〔原提取標題為臣門，待核字形〕",542,24,"star_editorial",subject_stars=["巨門"],title_status="damaged_heading_preserved")
    health_anchors=[("紫微",465,5),("天機",466,14),("太陽",467,17),("武曲",468,23),("天同",469,21),("廉貞",470,19),("天府",471,22),("太陰",472,13),("貪狼",473,5),("巨門",474,2),("天相",474,19),("天梁",475,14),("七殺",476,9),("破軍",477,1)]
    for star,page,line in health_anchors:
        add(f"deep.health.{star}",star+"〔編輯導航：正文起句，原書無獨立標題〕",page,line,"star_editorial",subject_stars=[star],title_status="editorial_body_anchor_not_printed_heading")
    for number,page,line,title in [(1,478,8,"神經系統"),(2,479,21,"消化系統"),(3,481,1,"循環系統"),(4,481,25,"呼吸系統"),(5,482,19,"泌尿生殖系統"),(6,483,20,"五官"),(7,484,18,"婦科")]:
        add(f"deep.health.system.{number}",title+"〔傳統疾病論述，僅作文本導航〕",page,line,"health_system")
    systems=core.load(ROOT/"packages/content/src/xingxi/systems.json")
    for s in systems:
        page=s["page"]
        if s["n"]==1:line=find_line(pages,42,"紫微独坐子午紫微独坐",mode="prefix")
        else:
            line=next((i for i,l in enumerate(pages[page-1]["text"].splitlines(),1) if re.match(r"^"+str(s["n"])+r"\D",core.norm(l))),None)
            if not line:raise ValueError(f"星系{s['n']}標題未定位。")
        add(f"deep.system.{s['n']:02}",s["name"],page,line,"system",subject_stars=s["stars"],branches=s["branches"],system_number=s["n"],title_status="navigation_name_check_source_heading")
    add("deep.systems.afterword","六十星系後記",219,find_line(pages,219,"六十星系后记"),"method")
    # Auxiliary, transformations and miscellany are actual source sections.
    aux=[(221,"1天魁天铖","天魁天鉞"),(223,"2左辅右弼","左輔右弼"),(225,"3文昌文曲","文昌文曲"),(227,"4禄存天马","祿存天馬"),(230,"1擎羊陀罗","擎羊陀羅"),(232,"2火星铃星","火星鈴星"),(233,"3地空地劫","地空地劫")]
    for j,(page,needle,title) in enumerate(aux,1):add(f"deep.aux.{j:02}",title,page,find_line(pages,page,needle),"auxiliary",subject_stars=source_tags(title)["stars"])
    hua_count=0
    for p in pages[237:314]:
        for i,l in enumerate(p["text"].splitlines(),1):
            m=re.fullmatch(r"(.{2})([甲乙丙丁戊己巳已庚辛壬癸])[干千]化([禄权科忌])",core.norm(l))
            if m and m[1] in [core.norm(s) for s in STARS]:
                star=next(s for s in STARS if core.norm(s)==m[1]);stem=m[2];raw_stem=stem
                if stem in ["巳","已"]:stem="己"
                hua={"禄":"祿","权":"權","科":"科","忌":"忌"}[m[3]]
                add(f"deep.hua.{stem}.{hua}",f"{star}（{stem}干化{hua}）",p["pdf_page"],i,"transformation",subject_stars=[star],stem=stem,raw_stem=raw_stem,hua=hua,title_status="stem_near_glyph_needs_review" if raw_stem!=stem else "source_heading_located")
                hua_count+=1
    if hua_count!=40:raise ValueError(f"只找到{hua_count}/40個四化標題，唔當完成。")
    misc=[(315,"天伤天使","天傷天使"),(315,"天刑天姚","天刑天姚"),(316,"天哭天虚","天哭天虛"),(316,"红鸾天喜","紅鸞天喜"),(317,"三台八座","三台八座"),(317,"龙池凤阁","龍池鳳閣"),(318,"孤辰寡宿","孤辰寡宿"),(318,"恩光天贵","恩光天貴"),(318,"天才","天才"),(319,"天寿","天壽"),(319,"台辅封诰","台輔封誥"),(319,"天宫天福","天官天福"),(319,"蜚廉","蜚廉"),(320,"破碎","破碎"),(320,"解神","解神"),(320,"天巫","天巫"),(320,"天月","天月"),(321,"阴煞","陰煞"),(321,"咸池","咸池"),(321,"大耗","大耗"),(322,"天空","天空"),(322,"截空旬空","截空旬空"),(322,"天德月德","天德月德"),(322,"龙德","龍德"),(322,"天厨","天廚"),(323,"长生十二神","長生十二神"),(323,"流曜总论","流曜總論"),(324,"博士十二神","博士十二神"),(324,"将前十二神","將前十二神"),(325,"岁前十二神","歲前十二神")]
    for j,(page,needle,title) in enumerate(misc,1):add(f"deep.misc.{j:02}",title,page,find_line(pages,page,needle),"miscellany",subject_stars=source_tags(title)["stars"])
    # 华盖 is mangled as two short lines in this PDF's extracted text.
    add("deep.misc.huagai","華蓋〔原檔提取標題疑字，按後文定位〕",321,10,"miscellany",subject_stars=["華蓋"],title_status="editorial_anchor_damaged_heading")
    for page in range(327,333):add(f"deep.figure.{page}",f"圖片頁{page}（廟陷表／宮次圖；看原圖）",page,1,"image",title_status="ocr_navigation_only")
    sections.sort(key=lambda s:s["position"])
    if len({s["id"] for s in sections})!=len(sections):raise ValueError("章節ID重複。")
    for i,s in enumerate(sections):s["end_position"]=sections[i+1]["position"] if i+1<len(sections) else pos(596,1)
    structure={"schema_version":1,"pdf_sha256":lib["book"]["sha256"],"parts":parts,"sections":sections,"star_heading_counts":dict(star_counts),"note":"導航名可作繁簡對照；原檔標題另存。end_position為下一節起點，唔包含下一節。"}
    core.write(STRUCTURE,structure)
    core.emit({"parts":len(parts),"sections":len(sections),"systems":60,"transformations":hua_count,"star_heading_counts":dict(star_counts)})


def blocks_from(pages,structure):
    anchors={s["position"] for s in structure["sections"]}
    all_blocks=[]
    for p in pages:
        page=p["pdf_page"];current=[];start=None;serial=0
        def flush(end):
            nonlocal serial,current,start
            if not current:return
            text="".join(x.strip() for x in current).strip()
            if text:
                serial+=1
                all_blocks.append({"id":f"wtz.deep.p{page:03}.b{serial:03}","pdf_page":page,"source_lines":[start,end],"position":pos(page,start),"text":text,"text_sha256":text_hash(text),"image_table":p["image_table"],"extraction":p["extraction"]})
            current=[];start=None
        lines=p["text"].splitlines()
        for i,l in enumerate(lines,1):
            if not l.strip():flush(i-1);continue
            begins=(pos(page,i) in anchors or bool(re.match(r"^\s*[·•●]",l)) or bool(re.match(r"^\s{2,}\S",l)))
            if current and begins:flush(i-1)
            if start is None:start=i
            current.append(l)
        flush(len(lines))
    sections=structure["sections"];si=0
    for b in all_blocks:
        while si+1<len(sections) and sections[si+1]["position"]<=b["position"]:si+=1
        s=sections[si]
        tags=source_tags(b["text"])
        b.update(section_id=s["id"],section_title=s["title"],part=s["part"],palace=s["palace"],subject_stars=s.get("subject_stars",[]),section_pair_mentions=source_tags(s["title"])["pair_mentions"],**tags)
        b["conditional_language"]=[label for label,pattern in [("前提／分支",r"若|倘|当|如.*则"),("排除／否定",r"不宜|不喜|不可|无|未|否则"),("限制／转化",r"但|唯|仅|必须|然后|始|反主|除非") ] if re.search(pattern,b["text"])]
        b["boundary_status"]="page_local_extraction_read_neighbours_and_full_section"
    for before,after in zip(all_blocks,all_blocks[1:]):
        if before["pdf_page"]+1==after["pdf_page"] and before["section_id"]==after["section_id"] and not before["image_table"] and not after["image_table"] and not re.search(r"[。；！？.!?]$",before["text"]):
            before["continues_to"]=after["id"]
            after["continues_from"]=before["id"]
    return all_blocks


def review_rows(index,pages):
    corpus=core.load(ROOT/"packages/content/src/sources/zhongzhou.json")["passages"]
    rows=[]
    for p in index["passages"]:
        if p["text_match"]!="needs_page_review":continue
        quote=corpus[p["id"]]["text"];lo,hi=p["pdf_pages"]
        hay=core.norm(''.join(x["text"] for x in pages[lo-1:hi]));lines=[core.norm(x) for x in quote.splitlines() if core.norm(x)]
        located=None
        first_line=quote.splitlines()[0] if quote.splitlines() else ''
        heading_like=bool(lines and (lines[0] in core.norm(p["section"]) or core.norm(p["section"]) in lines[0]))
        if len(lines)>1 and core.norm(''.join(quote.splitlines()[1:])) in hay:
            category="正文吻合，摘引文標題不同" if heading_like else "除首行外可找回，首行內容待核"
            located=[lo,hi]
        elif len(lines)>1 and all(l in hay for l in lines):category="各段可找回，但非連續摘錄"
        else:
            window=pages[max(0,lo-3):min(595,hi+2)]
            lengths=[len(core.norm(x["text"])) for x in window]
            joined=''.join(core.norm(x["text"]) for x in window)
            offset=joined.find(core.norm(quote))
            if offset>=0:
                end=offset+len(core.norm(quote))-1;cursor=0;found=[]
                for page,length in zip(window,lengths):
                    if cursor<=end and cursor+length>offset:found.append(page["pdf_page"])
                    cursor+=length
                located=[min(found),max(found)]
                category="相鄰頁全文吻合，原頁範圍待核"
            else:category="字句／OCR／節選或頁碼差異待核"
        rows.append({"passage_id":p["id"],"pdf_pages":p["pdf_pages"],"located_candidate_pages":located,"section":p["section"],"category":category,"status":"mechanical_comparison_not_semantic_verdict"})
    return rows


def build(args):
    lib=original();structure=core.load(STRUCTURE);guides=core.load(GUIDES)
    if structure["pdf_sha256"]!=lib["book"]["sha256"] or guides["reviewed_pdf_sha256"]!=lib["book"]["sha256"]:raise ValueError("原PDF同人工摘要版本未對齊。")
    source_text_hash=text_hash(json.dumps([p["text"] for p in lib["pages"]],ensure_ascii=False))
    if guides["reviewed_text_sha256"]!=source_text_hash:raise ValueError("頁文字／OCR快照已變，先重新核對人工段號與摘要。")
    blocks=blocks_from(lib["pages"],structure)
    ids={s["id"] for s in structure["sections"]}
    for s in structure["sections"]:
        bs=[b for b in blocks if b["section_id"]==s["id"]]
        s["block_count"]=len(bs)
        s["pdf_pages"]=[s["start"]["page"],max((b["pdf_page"] for b in bs),default=s["start"]["page"])]
        s["condition_mentions"]=sorted({m for b in bs for m in b["condition_mentions"]})
        s["layer_mentions"]=sorted({m for b in bs for m in b["layer_mentions"]})
    for g in guides["parts"]:
        if g["id"] not in {p["id"] for p in structure["parts"]}:raise ValueError("未知導讀章節"+g["id"])
        for point in g["points"]:
            if not point["pages"] or any(not 1<=p<=595 for p in point["pages"]):raise ValueError("摘要頁碼無效")
    if {g["id"] for g in guides["parts"]}!={p["id"] for p in structure["parts"]}:raise ValueError("大章導讀未齊。")
    if {s["n"] for s in guides["systems"]}!=set(range(1,61)):raise ValueError("60星系摘要未齊。")
    block_ids={b["id"] for b in blocks}
    for c in guides["condition_cards"]:
        if any(b not in block_ids for b in c["sources"]):raise ValueError("條件卡段落失效："+c["id"])
        if any(s not in ids for s in c.get("sections",[])):raise ValueError("條件卡小節失效："+c["id"])
    for r in guides["review_cards"]:
        if any(not 1<=p<=595 for p in r["pages"]):raise ValueError("待核卡頁碼無效")
    legacy=core.load(HERE/"index.json")
    reviews=review_rows(legacy,lib["pages"])
    local={"book":lib["book"],"parts":structure["parts"],"sections":structure["sections"],"blocks":blocks}
    core.write(CACHE/"library.json",local)
    index={"schema_version":1,"book":{k:v for k,v in lib["book"].items() if k!="pdf_path"},"parts":structure["parts"],"sections":structure["sections"],"guides":guides,
           "blocks":[{k:v for k,v in b.items() if k!="text"} for b in blocks],"excerpt_review":reviews,
           "input_hashes":{str(p.relative_to(ROOT)).replace('\\','/'):digest(p) for p in [Path(__file__),GUIDES,STRUCTURE,HERE/"reference.py",HERE/"index.json",ROOT/"packages/content/src/sources/zhongzhou.json"]},
           "local_library_sha256":digest(CACHE/"library.json"),"source_page_text_sha256":source_text_hash,
           "audit":{"pages":595,"parts":len(structure["parts"]),"sections":len(structure["sections"]),"blocks":len(blocks),"systems":60,"transformations":sum(s["kind"]=="transformation" for s in structure["sections"]),"summary_points":sum(len(p["points"]) for p in guides["parts"]),"condition_cards":len(guides["condition_cards"]),"text_review_queue":len(reviews),"review_categories":dict(Counter(r["category"] for r in reviews))}}
    core.write(INDEX,index);write_docs(index)
    core.emit(index["audit"])


def locator(pages):return '、'.join(f"p.{p}" for p in pages)


def write_docs(index):
    out=HERE/"deep";out.mkdir(exist_ok=True)
    g=index["guides"];a=index["audit"]
    lines=["# 深造講義：詳細摘要與逐節索引","",f"本機595頁PDF；{a['parts']}個大章、{a['sections']}個章節／圖片入口、{a['blocks']}個頁內抽取段。","",
           "- [六十星系逐節摘要](deep/SYSTEMS.md)","- [已拆清前提、例外與層次嘅條件卡](deep/CONDITIONS.md)","- [完整小節索引：十四正曜、四化、雜曜、十二宮逐星](deep/SECTIONS.md)","- [條件、版本及待核清單](deep/REVIEW.md)","",
           "## 查閱方式","","```powershell","python tools/wang-reference/deep.py search --part friends --pair 紫破","python tools/wang-reference/deep.py search --part career --stars 天機 --condition 化科","python tools/wang-reference/deep.py show --section deep.system.17","python tools/wang-reference/deep.py show --page 504","python tools/wang-reference/deep.py check","```","",
           "頁碼係本PDF一基頁序；b段號係本次文字提取，唔係印刷段號。PDF指紋：`"+index["book"]["sha256"]+"`。","",
           "原文全文同條件片段只存本機忽略嘅tmp目錄；可追蹤檔只收摘要、定位與標籤。篇章摘要、章節定位、文字吻合、盤上條件成立及文案語意受支持係不同檢查。","",
           "下列摘要依列明原頁重寫。『條件／界線』係人工查閱註；自動字詞標籤只供檢索，唔係可執行判斷。各章所有分支未逐條完成語意校勘。","",
           "## 全書導讀",""]
    for p in g["parts"]:
        part=next(x for x in index["parts"] if x["id"]==p["id"])
        lines += [f"### {part['title']}","",f"入口：`{p['id']}`｜起頁 p.{part['start']['page']}","",p["overview"],"", "**細讀重點**",""]
        lines += [f"- {v['summary']}〔{locator(v['pages'])}〕" for v in p["points"]]
        lines += ["", "**條件／界線**："+p["conditions"],"", "**待核／連讀**："+p["review"],""]
    (HERE/"DEEP.md").write_text('\n'.join(lines),encoding="utf8")
    lines=["# 六十星系逐節摘要","","每條摘要定位星系開頭嘅比較軸；唔係對所有人嘅人格結論。兩端係該星系內相對比較，唔跨星系排名。配曜及經行宮垣分支仍要讀完整原節。","","| 編號 | 小節 | 原書入口 | 摘要／查閱條件 |","|---|---|---|---|"]
    for card in g["systems"]:
        s=next(s for s in index["sections"] if s.get("system_number")==card["n"])
        lines.append(f"| {card['n']} | {s['title']} | {locator(card['source_pages'])} · `{s['id']}` | {card['summary']} **核對**：{card['conditions']} |")
    lines += ["","標題保留導航名及PDF原標題兩欄；第11、22等節有標題簡寫或疑字，見待核清單。","","完整小節：`python tools/wang-reference/deep.py show --section deep.system.17`。"]
    (out/"SYSTEMS.md").write_text('\n'.join(lines)+'\n',encoding="utf8")
    lines=["# 深造逐節索引","","章節邊界以PDF提取行定位，同一頁可屬兩章；唔再將整頁所有星名視為新章內容。導航名有繁簡／近形字對照時，原標題仍喺JSON保留，未視為校勘更正。","","條件欄只列全文提及字詞；否定、必要、或且、例外及時間層要讀原段。","", "| 小節ID | 導航名 | PDF頁 | 層次字詞 | 條件字詞 |","|---|---|---|---|---|"]
    for s in index["sections"]:
        lines.append(f"| `{s['id']}` | {s['title']} | {s['pdf_pages'][0]}–{s['pdf_pages'][1]} | {'、'.join(s['layer_mentions'])} | {'、'.join(s['condition_mentions'])} |")
    (out/"SECTIONS.md").write_text('\n'.join(lines)+'\n',encoding="utf8")
    lines=["# 人工條件卡：前提、修飾與範圍","","呢五組係針對已讀段落拆條件嘅示範，唔係全書所有規則已拆完；亦唔執行命盤比對。其他小節嘅自動字詞標籤仍保持『只供檢索』。",""]
    for c in g["condition_cards"]:
        lines += [f"## {c['id']}　{c['title']}","",f"**範圍**：{c['scope']}〔{locator(c['pages'])}〕","","| 原文明示前提 | 摘要及修飾 |","|---|---|"]
        lines += [f"| {b['when']} | {b['summary']} |" for b in c["branches"]]
        lines += ["","**排除／界線**："+c["exclusions"],"","**定位**："+'、'.join(f"`{s}`" for s in c["sources"]+c.get("sections",[])),"",f"狀態：`{c['status']}`。",""]
    (out/"CONDITIONS.md").write_text('\n'.join(lines),encoding="utf8")
    lines=["# 深造：條件、版本與待核","","253條舊引文已有[逐項人工核對與修改建議](EXCERPT-AUDIT.md)。下方舊表保留最初機械比對紀錄；尤其『標題不同』唔一定真係標題錯，可能係非連續摘錄或重複首行。語意、條件與建議以新表逐項裁定為準，原檔疑點仍保留待核。","","## 人工閱讀問題",""]
    for c in g["review_cards"]:
        lines += [f"### {c['id']}　{c['title']}","",f"**定位**：{locator(c['pages'])}。狀態：`{c['status']}`。","",c["finding"],"","**處理**："+c["action"],""]
    lines += ["## 既有摘引文文字差異","",f"先前253條嚴格比對未吻合，今次按可重現嘅機械條件分組，唔直接判作253個內容錯誤。分組：{json.dumps(a['review_categories'],ensure_ascii=False)}。","","正文吻合但標題串接不同，仍要分開核對文案意思；非連續摘錄唔可以冒作原書連續句。候選頁只證明可找到字句，唔裁定其語意或自動改既有出處。未改既有corpus或產品內容。","","| passage id | 既有PDF頁 | 機械找回候選頁 | 原節 | 比對分類 |","|---|---|---|---|---|"]
    for r in index["excerpt_review"]:
        found=r["located_candidate_pages"];candidate=f"{found[0]}–{found[1]}" if found else "未定位"
        lines.append(f"| `{r['passage_id']}` | {r['pdf_pages'][0]}–{r['pdf_pages'][1]} | {candidate} | {r['section']} | {r['category']} |")
    (out/"REVIEW.md").write_text('\n'.join(lines)+'\n',encoding="utf8")


def read():
    if not INDEX.exists():raise ValueError("先deep.py scan，再deep.py build。")
    return core.load(INDEX),core.load(CACHE/"library.json")


def warnings(index):
    changed=[p for p,h in index["input_hashes"].items() if not (ROOT/p).exists() or digest(ROOT/p)!=h]
    out=["索引已過期，先重建："+', '.join(changed)] if changed else []
    if digest(CACHE/"library.json")!=index["local_library_sha256"]:out.append("頁內段落快取指紋已變。")
    return out


def search(args):
    index,lib=read();palace=core.palace_name(args.palace)
    stars=[]
    for name in args.stars:
        s=next((s for s in STARS if core.norm(s)==core.norm(name)),None)
        if not s:raise ValueError(f"未知星曜：{name}")
        stars.append(s)
    pair=next((p for p in core.PAIRS if core.norm(p)==core.norm(args.pair or '')),None)
    if args.pair and not pair:raise ValueError("組合請用紫破、同梁等簡稱。")
    hits=[]
    for b in lib["blocks"]:
        if args.part and b["part"]!=args.part:continue
        if palace and palace!=b["palace"] and palace not in b["palace_mentions"]:continue
        if stars and not all(s in b["stars"]+b["subject_stars"] for s in stars):continue
        if pair and pair not in b["pair_mentions"]+b["section_pair_mentions"]:continue
        if args.layer and args.layer not in b["layer_mentions"]:continue
        if not all(any(f in core.norm(b["text"]) for f in core.query_forms(q)) for q in args.query+args.condition):continue
        score=(20 if pair and pair in b["section_pair_mentions"] else 0)+(10 if palace and palace==b["palace"] else 0)+sum(s in b["subject_stars"] for s in stars)*3
        out={k:v for k,v in b.items() if k!='text'};out.update(score=score,excerpt=b["text"][:args.excerpt]);hits.append(out)
    hits.sort(key=lambda b:(-b["score"],b["position"]))
    review=[r for r in index["guides"]["review_cards"] if any(b["pdf_page"] in r["pages"] for b in hits[:args.limit])]
    selected=hits[:args.limit]
    cards=[c for c in index["guides"]["condition_cards"] if any(b["id"] in c["sources"] or b["section_id"] in c.get("sections",[]) for b in selected)]
    core.emit({"warnings":warnings(index),"total":len(hits),"results":selected,"related_review":review,"related_condition_cards":cards,"note":"段落或所屬小節提及，只供定位；唔等於本命同宮或盤上條件成立。"})


def show(args):
    index,lib=read();allblocks=lib["blocks"]
    if args.id:
        found=next((i for i,b in enumerate(allblocks) if b["id"]==args.id),None)
        if found is None:raise ValueError("未知段落ID")
        blocks=allblocks[max(0,found-args.context):found+args.context+1]
    elif args.section:
        blocks=[b for b in allblocks if b["section_id"]==args.section]
    else:blocks=[b for b in allblocks if b["pdf_page"]==args.page]
    if not blocks:raise ValueError("未命中指定段落、小節或頁碼。")
    by_id={b["id"]:b for b in allblocks}
    included={b["id"] for b in blocks}
    pending=list(blocks)
    while pending:
        b=pending.pop()
        for key in ["continues_from","continues_to"]:
            linked=b.get(key)
            if linked and linked not in included:
                included.add(linked);pending.append(by_id[linked])
    blocks=sorted((by_id[i] for i in included),key=lambda b:b["position"])
    for b in blocks:
        b["condition_clauses"]=[s for s in re.split(r"(?<=[。；])",b["text"]) if re.search(r"若|倘|但|唯|不宜|无|未|必须|除非|然后|始",s)]
    core.emit({"warnings":warnings(index),"book":lib["book"],"blocks":blocks,"condition_cards":[c for c in index["guides"]["condition_cards"] if any(b["id"] in c["sources"] or b["section_id"] in c.get("sections",[]) for b in blocks)],"review_notes":[c for c in index["guides"]["review_cards"] if any(b["pdf_page"] in c["pages"] for b in blocks)],"note":"condition_clauses保留否定與轉折，只係原文字句定位，未轉成可執行條件；偵測到嘅跨頁續段會一併顯示，必要時仍讀完整小節。"})


def check(args):
    index,lib=read();errors=warnings(index);source=original()
    if index["book"]["sha256"]!=source["book"]["sha256"]:errors.append("PDF版本已變")
    if text_hash(json.dumps([p["text"] for p in source["pages"]],ensure_ascii=False))!=index["source_page_text_sha256"]:errors.append("頁文字快照已變")
    if len({b["id"] for b in lib["blocks"]})!=len(lib["blocks"]):errors.append("段ID重複")
    if {b["pdf_page"] for b in lib["blocks"]}!=set(range(1,596)):errors.append("595頁覆蓋未齊")
    ids={s["id"] for s in index["sections"]}
    for b in lib["blocks"]:
        if b["section_id"] not in ids:errors.append("段落小節引用失效")
        raw=source["pages"][b["pdf_page"]-1]["text"].splitlines()[b["source_lines"][0]-1:b["source_lines"][1]]
        if ''.join(l.strip() for l in raw)!=b["text"]:errors.append(b["id"]+"與原頁提取行不符")
    for page in source["pages"]:
        covered=''.join(b["text"] for b in lib["blocks"] if b["pdf_page"]==page["pdf_page"])
        if covered!=''.join(l.strip() for l in page["text"].splitlines()):errors.append(f"p.{page['pdf_page']}有漏段或重複")
    for s in index["sections"]:
        heading=source["pages"][s["start"]["page"]-1]["text"].splitlines()[s["start"]["line"]-1].strip()
        if heading!=s["source_heading"]:errors.append(s["id"]+"標題原位失配")
        if not s["block_count"]:errors.append(s["id"]+"冇原段")
    for p in index["parts"]:
        if p["palace"]:
            count=sum(s["kind"] in ['star','star_editorial'] and s["part"]==p["id"] for s in index["sections"])
            if count!=14:errors.append(p["id"]+f"只有{count}/14逐星入口")
    core.emit({"ok":not errors,"errors":errors,**index["audit"],"note":"驗證定位、指紋與結構完整性，唔替所有分支語意或表格數值背書。"})
    if errors:raise SystemExit(1)


def main():
    p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(required=True)
    for name,func in [("scan",scan),("build",build),("check",check)]:q=sub.add_parser(name);q.set_defaults(func=func)
    q=sub.add_parser("search");q.add_argument("query",nargs="*");q.add_argument("--part");q.add_argument("--palace");q.add_argument("--stars",nargs="+",default=[]);q.add_argument("--pair");q.add_argument("--condition",action="append",default=[]);q.add_argument("--layer",choices=["本命","大限","流年"]);q.add_argument("--limit",type=int,default=8);q.add_argument("--excerpt",type=int,default=100);q.set_defaults(func=search)
    q=sub.add_parser("show");group=q.add_mutually_exclusive_group(required=True);group.add_argument("--id");group.add_argument("--section");group.add_argument("--page",type=int,choices=range(1,596));q.add_argument("--context",type=int,choices=range(0,11),default=2);q.set_defaults(func=show)
    args=p.parse_args()
    if getattr(args,'limit',1)<1 or getattr(args,'excerpt',0)<0:p.error("limit需大於0，excerpt不能為負")
    try:args.func(args)
    except (ValueError,FileNotFoundError) as e:p.exit(2,str(e)+'\n')


if __name__=='__main__':main()
