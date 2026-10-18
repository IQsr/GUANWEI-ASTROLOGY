import json,re,collections
inv=json.load(open('tools/clash/inventory.json',encoding='utf8'))
FACT=re.compile(r'虛歲|[〇一二三四五六七八九]{4}年|宮干|大限落在|流年命宮|^這(十|一)年的\S+?宮(坐|沒有主星)|^你的\S+?宮坐|^這(十|一)年，\S+化\S落在|宮位的\S+、?\S*。$|^下一個大限|^寫這本書|按農曆逐月|^這(十|一)年最值得做的事|^這(十|一)年最順的是|^關於\S+，決定之前')
PRE=re.compile(r'^(這(十|一)年(對你來說)?，|工作上，|錢方面，|感情上，|心境上，)')
texts=collections.OrderedDict()
for r in inv:
    if FACT.search(r['text']): continue
    t=PRE.sub('',r['text'])
    e=texts.setdefault(t,{'ch':set(),'combo':False})
    e['ch'].add(r['chapter']); e['combo']|=r['combo']
items=[{'i':k,'t':t,'ch':sorted(v['ch'])} for k,(t,v) in enumerate(texts.items())]
json.dump({'texts':[{'i':x['i'],'t':x['t'],'ch':x['ch'],'combo':texts[x['t']]['combo']} for x in items]},open('tools/clash/texts.json','w',encoding='utf8'),ensure_ascii=False)
n=len(items); k=10; size=(n+k-1)//k
for b in range(k):
    part=items[b*size:(b+1)*size]
    json.dump(part,open(f'tools/clash/batch-{b+1:02d}.json','w',encoding='utf8'),ensure_ascii=False,indent=0)
print(n,size)
