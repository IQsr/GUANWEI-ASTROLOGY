import json,re,sys,collections
S=sys.argv[1];R='C:/Users/issac/OneDrive/Documents/guanwei/packages/content/src/sources/'
books=json.load(open(S+'/books.json',encoding='utf-8'))
t2s=json.load(open(R+'t2s.json',encoding='utf-8'))
tmap=t2s if isinstance(t2s,dict) and len(t2s)>100 else t2s.get('map',t2s)
def norm(s):
    s=''.join(tmap.get(ch,ch) if isinstance(tmap,dict) else ch for ch in s)
    return re.sub(r'[\s，。、；：！？「」『』（）·,.;:!?()]','',s)
corp={}
for f in ['quanshu.json','zhongzhou.json']:
    d=json.load(open(R+f,encoding='utf-8'));corp[f]=norm(' '.join(p.get('text','') if isinstance(p,dict) else str(p) for p in d['passages'].values()))
STARS='紫微 天機 太陽 武曲 天同 廉貞 天府 太陰 貪狼 巨門 天相 天梁 七殺 破軍 文昌 文曲 左輔 右弼 天魁 天鉞 祿存 擎羊 陀羅 火星 鈴星 地空 地劫 化祿 化權 化科 化忌 天馬'.split()
Q=re.compile(r'《([^》]+)》寫「([^」]+)」')
rows=[];per=collections.defaultdict(list)
for bi,b in enumerate(books):
    for c in b['chapters']:
        if c['tier']!='deep':continue
        paras=c['text'].split('\n\n');lead=paras[0];first=re.split(r'(?<=[。！？])',lead)[0]
        m=Q.search(c['text']);qp=None;qok=None
        if m:
            qp=next(i for i,p in enumerate(paras) if m.group(0) in p)
            qn=norm(m.group(2));qok=any(qn in v for v in corp.values())
        r=dict(book=bi,birth=b['birth'],slug=c['slug'],slot=c['slots'][0] if c['slots'] else '',lead=lead,first=first,llen=len(lead),
               starFirst=any(s in first for s in STARS),structFirst=bool(re.match(r'^(你的)?\S{1,4}宮(坐|有|在|裡|沒有|無)',first)),
               quote=m.group(0) if m else None,quoteBook=m.group(1) if m else None,quotePara=qp,quoteFound=qok)
        rows.append(r);per[c['slug']].append(r)
json.dump(rows,open(S+'/rows.json','w',encoding='utf-8'),ensure_ascii=False)
print('deep chapters',len(rows))
print('slug | n | leadLen med | firstSentence has star% | struct-first% | distinct first sentences | no quote% | quote not in para1% | quote NOT found in corpus% | lead slot')
for slug,rs in per.items():
    n=len(rs);ll=sorted(r['llen'] for r in rs)
    nq=sum(1 for r in rs if not r['quote']);qp=sum(1 for r in rs if r['quote'] and r['quotePara']!=0);qf=sum(1 for r in rs if r['quote'] and not r['quoteFound'])
    slots=collections.Counter(r['slot'] for r in rs).most_common(2)
    print(slug,n,ll[n//2],f"{100*sum(r['starFirst'] for r in rs)/n:.0f}%",f"{100*sum(r['structFirst'] for r in rs)/n:.0f}%",len(set(r['first'] for r in rs)),f"{100*nq/n:.0f}%",f"{100*qp/max(1,n-nq):.0f}%",f"{100*qf/max(1,n-nq):.0f}%",slots)
