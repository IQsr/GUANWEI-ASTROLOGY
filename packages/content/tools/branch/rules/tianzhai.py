# 田宅宮規則（2026-10-12）。題目次序 = 合併輸出次序：組合／地支題目行先，單星通則其次。
FIRE = {'star': ['火星', '鈴星'], 'at': 'same'}
KONG = {'star': ['地空', '地劫'], 'at': 'same'}
SHA = {'star': ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'], 'at': 'same'}
FUZUO = {'star': ['左輔', '右弼'], 'at': 'sifang'}
KUIYUE = {'star': ['天魁', '天鉞'], 'at': 'sifang'}
CHANGQU = {'star': ['文昌', '文曲'], 'at': 'same'}
GOODHUA = {'hua': ['祿', '權', '科'], 'at': 'same'}
GOOD = {'any': [GOODHUA, FUZUO, KUIYUE]}
LU = {'any': [{'hua': '祿', 'at': 'sifang'}, {'star': '祿存', 'at': 'sifang'}]}
LUSAME = {'any': [{'hua': '祿', 'at': ['same', 'opp']}, {'star': '祿存', 'at': ['same', 'opp']}]}
def H(hua, star, at='same'): return {'hua': hua, 'star': star, 'at': at}
def R(id, when, text, en, src, quote, role='refine'):
    return {'id': id, 'when': when, 'text': text, 'en': en, 'src': src, 'quote': quote, 'role': role}

# ── 紫微 ──
T.append({'id': '紫微破軍.田宅', 'stars': ['紫微', '破軍'], 'rules': [
 R('田宅.紫破.意外', {'all': [LUSAME, {'not': SHA}]},
   '紫微破軍見祿而無煞，你會有意外得來的資產。',
   'Zi Wei with Po Jun meeting Lu and no harsh stars: property or assets come to you unexpectedly.',
   '[紫微破军]同度，见禄存或化禄，而无煞忌刑耗诸曜，则主有意外资产可得，', '则主有意外资产可得'),
 R('田宅.紫破.新', GOOD,
   '紫微破軍見〔吉〕，你任職的多是新興機構。',
   'Zi Wei with Po Jun and good signs: you tend to work for young, growing organisations.',
   '若为[紫破]见吉，则为新兴机构，', '若为[紫破]见吉，则为新兴机构'),
]})
T.append({'id': '紫微天相.田宅', 'stars': ['紫微', '天相'], 'rules': [
 R('田宅.紫相.煞', SHA,
   '紫微天相見〔煞〕，任職的多是老舊機構，根基不穩；要留意轉職或改革的機會。',
   'Zi Wei with Tian Xiang and harsh stars: you tend to work for older organisations on shaky ground; watch for chances to move on or to reform.',
   '若[紫相]见煞，则为老旧机构，而基础动摇，宜注意转职或改革之机会。', '宜注意转职或改革之机会', 'limit'),
]})
T.append({'id': '紫微貪狼.田宅', 'stars': ['紫微', '貪狼'], 'rules': [
 R('田宅.紫貪.祿', LU,
   '紫微貪狼見祿，你有機會搬進更好的住所。',
   'Zi Wei–Tan Lang meets Lu: you have the chance to move into a finer home.',
   '[紫贪]见禄主动建，或迁华宅。', '或迁华宅'),
]})
T.append({'id': '紫微.田宅', 'stars': ['紫微'], 'rules': [
 R('田宅.紫微.文書', {'hua': '忌', 'star': ['文昌', '文曲'], 'at': 'sifang'},
   '文昌或文曲化忌，買賣物業容易因文書契約受損失。',
   'With Wen Chang or Wen Qu in Hindrance, property deals can go wrong over contracts and paperwork.',
   '紫微守田宅宫虽见辅佐吉曜，亦不宜昌曲化忌，主买卖物业因文书契约而受损失。', '主买卖物业因文书契约而受损失', 'limit'),
 R('田宅.紫微.輔佐', {'any': [FUZUO, KUIYUE]},
   '見〔輔佐吉星〕，你的家族聚居；你任職的機構也人多。',
   'With helper stars, your family lives close together, and the organisation you work for is large.',
   '紫微星系在田宅宫，若辅佐吉曜同会者，主聚族而居，又主所服务机构员工众多。', '主聚族而居'),
 R('田宅.紫微.置業', GOOD,
   '紫微見〔吉〕，你有能力置業，擁有自己的物業。',
   'Zi Wei meets good signs: you are able to buy property of your own.',
   '凡紫微星系守田宅宫而见吉，均主置业，', '均主置业'),
]})

# ── 天機 ──
T.append({'id': '天機巨門.田宅', 'stars': ['天機', '巨門'], 'rules': [
 R('田宅.機巨.煞', SHA,
   '天機巨門有煞同宮，即使見吉化，產業也難守；坐卯較好。',
   'Tian Ji with Ju Men and harsh stars in the palace: even with good transformations property is hard to keep; Mao is the better seat.',
   '天机巨门有煞同度，纵见吉化亦不吉，仍主产业难守。在卯宫者较为吉利。', '仍主产业难守', 'limit'),
]})
T.append({'id': '天機太陰.田宅', 'stars': ['天機', '太陰'], 'rules': [
 R('田宅.機陰.陰祿', H('祿', '太陰'),
   '太陰化祿，你容易自置產業，居住環境也較安靜。',
   'Tai Yin in Abundance: buying your own property comes easily, and your home is quieter.',
   '若太阴化禄，然后主易自置产业，居住环境亦较安静。', '然后主易自置产业，居住环境亦较安静'),
 R('田宅.機陰.吉', {'all': [{'hua': ['祿', '權', '科'], 'star': ['天機', '太陰'], 'at': 'same'}, {'any': [FUZUO, KUIYUE]}]},
   '天機太陰見〔吉化〕又見〔吉星〕，你買賣田宅可以獲利。',
   'Tian Ji with Tai Yin well transformed and with helper stars: buying and selling property can turn a profit.',
   '天机太阴见吉化(最喜天机化禄)，又见吉曜，则买卖田宅可以获利。', '则买卖田宅可以获利'),
 R('田宅.機陰.遷', None,
   '天機太陰在田宅宮，主時時遷動，也常轉換工作環境。',
   'Tian Ji with Tai Yin in your Property Palace: you move often, and change workplaces often too.',
   '天机太阴的星曜组合，主时时迁动，尤以寅申二宫为然，见煞则不守祖业，亦不享现成的事业，亦主时时变换工作环境。', '天机太阴的星曜组合，主时时迁动', 'base'),
]})
T.append({'id': '天機天梁.田宅', 'stars': ['天機', '天梁'], 'rules': [
 R('田宅.機梁.梁祿', H('祿', '天梁'),
   '天梁化祿，多住舊宅華廈，或在有年資的機構服務。',
   'Tian Liang in Abundance: you often live in a grand old house, or work for a long-established organisation.',
   '天机天梁而天梁化禄，多住旧宅华夏。或在有年资之机构服务。', '或在有年资之机构服务'),
 R('田宅.機梁.遲', None,
   '天機天梁在田宅宮，較難自置產業，多要四十歲以後才置業。',
   'Tian Ji with Tian Liang in your Property Palace: buying your own place is hard, and usually comes after forty.',
   '天机天梁的组合，基本性质主难自置产业，必四十岁以后始能置业。', '必四十岁以后始能置业', 'base'),
]})
T.append({'id': '天機.田宅', 'stars': ['天機'], 'rules': [
 R('田宅.天機.本', None,
   '天機在田宅宮，產業多變動：時時搬遷、時買時賣，或者常換工作環境。',
   'With Tian Ji in your Property Palace, property is always on the move: frequent moves, buying and selling, or changing workplaces.',
   '在现代，亦主时时迁动，或时买时卖，甚或主时时变换工作环境，不一定主退祖自兴。', '或时买时卖', 'base'),
]})

# ── 太陽 ──
T.append({'id': '太陽太陰.田宅', 'stars': ['太陽', '太陰'], 'rules': [
 R('田宅.陰陽.合璧', None,
   '太陽太陰同在田宅宮，古人說「日月合璧」，家道興隆；用在任職的機構也一樣。',
   'Tai Yang with Tai Yin in your Property Palace is what the old texts call sun and moon joined: the household prospers, and so does your workplace.',
   '太阴亦喜与太阳同度或拱照，古人说：[日月合壁]田宅，家道与兴隆。]此意亦可用于服务机构。', '此意亦可用于服务机构', 'base'),
]})
T.append({'id': '太陽天梁.田宅', 'stars': ['太陽', '天梁'], 'rules': [
 R('田宅.陽梁.吉', GOOD,
   '太陽天梁見〔吉〕，你可以置業，而且以舊宅為宜。',
   'Tai Yang with Tian Liang and good signs: you can buy property, and older houses suit you best.',
   '太阳天梁有吉星始可置业，且以旧宅为宜。', '且以旧宅为宜'),
]})
T.append({'id': '太陽巨門.田宅', 'stars': ['太陽', '巨門'], 'rules': [
 R('田宅.陽巨.吉', {'all': [GOOD, {'not': SHA}]},
   '太陽巨門見〔吉〕而無煞，產業增置，宜在外地或外國置業；只是仍免不了明爭暗鬥，不宜做地產投資。',
   'Tai Yang with Ju Men, good signs and no harsh stars: property grows, best bought away from home or abroad; but rivalry remains, so avoid property speculation.',
   '[太阳巨门]见吉化，吉曜，不见煞忌刑曜，主产业增置，且宜外国或外地置业，但仍不免有明争暗斗，故不宜从事地产投资。', '且宜外国或外地置业'),
]})
T.append({'id': '太陽.田宅', 'stars': ['太陽'], 'rules': [
 R('田宅.太陽.巨對', {'all': [{'star': '巨門', 'at': 'opp'}, {'not': {'star': '巨門', 'at': 'same'}}]},
   '太陽與巨門相對，即使見吉，你在產業上也多爭奪。',
   'With Tai Yang facing Ju Men, property brings contention even with good signs.',
   '太阳与巨门相对，即使见吉曜，亦主争夺。', '亦主争夺', 'limit'),
 R('田宅.太陽.忌', H('忌', '太陽'),
   '太陽化忌，你的祖業難守，事業根基也較難建立。',
   'Tai Yang in Hindrance: inherited property is hard to keep, and a solid base for your career is hard to build.',
   '太阳化忌在田宅，不主不利父亲，主祖业倾败，或平生事业难有根基。', '或平生事业难有根基', 'limit'),
]})

# ── 武曲 ──
T.append({'id': '武曲天府.田宅', 'stars': ['武曲', '天府'], 'rules': [
 R('田宅.武府.祿', LU,
   '武曲天府見祿，你能守住祖業、父業，還能發揚光大。',
   'Wu Qu with Tian Fu meeting Lu: you hold on to the family property and make more of it.',
   '若得禄者，能守祖、父之业，且能将之发扬光大。', '且能将之发扬光大'),
]})
T.append({'id': '武曲貪狼.田宅', 'stars': ['武曲', '貪狼'], 'rules': [
 R('田宅.武貪.火鈴', FIRE,
   '同宮有火星或鈴星，你家的祖業父業會突然增值。',
   'With Huo Xing or Ling Xing in the palace, family property suddenly rises in value.',
   '[武曲贪狼]同度，为[火贪]、[铃贪]格者，祖、父遗业突然增值。', '祖、父遗业突然增值'),
 R('田宅.武貪.忌', {'all': [H('忌', '武曲'), SHA]},
   '武曲化忌又見〔煞〕，你容易因產業引起糾紛。',
   'Wu Qu in Hindrance with harsh stars: property tends to lead to disputes.',
   '武曲贪狼星系，若武曲化为忌星，|_又见煞，主因产业引致纠纷。', '主因产业引致纠纷', 'limit'),
]})
T.append({'id': '武曲破軍.田宅', 'stars': ['武曲', '破軍'], 'rules': [
 R('田宅.武破.自創', {'any': [H('祿', '破軍'), {'all': [{'star': '天相', 'at': 'opp'}, {'any': [FUZUO, KUIYUE]}]}]},
   '祖業不主豐厚，會漸漸消磨，然後靠自己興創；也宜買舊宅。',
   'Family property is not large and wears away, after which you build your own; older houses suit you.',
   '武曲破军的星系，若天相会吉曜，或破军化禄，则不主祖业丰厚，却主祖业消磨而自身兴创，亦主宜买旧宅。', '却主祖业消磨而自身兴创'),
]})
T.append({'id': '武曲七殺.田宅', 'stars': ['武曲', '七殺'], 'rules': [
 R('田宅.武殺.祿', H('祿', '武曲'),
   '武曲化祿，你靠自己置下的產業豐盈。',
   'Wu Qu in Abundance: the property you acquire by your own efforts is plentiful.',
   '必须武曲化禄，然后始主自置产业丰盈。', '然后始主自置产业丰盈'),
 R('田宅.武殺.本', {'not': H('祿', '武曲')},
   '武曲七殺在田宅宮，一般對你的田宅不利。',
   'Wu Qu with Qi Sha in your Property Palace generally does not favour property.',
   '[武曲七杀]的宫度，因七杀落陷，一般不利田宅，稍见煞，或对宫天府不吉。即易产业破败。', '一般不利田宅', 'limit'),
]})
T.append({'id': '武曲.田宅', 'stars': ['武曲'], 'rules': [
 R('田宅.武曲.祿', {'all': [{'all': [LU, {'not': SHA}, {'not': {'star': ['破軍', '七殺'], 'at': 'same'}}]}, {'not': {'star': '天府', 'at': 'same'}}]},
   '武曲見祿而無煞，你家祖業豐厚，容易守成。',
   'Wu Qu meeting Lu with no harsh stars: the family property is ample and easy to keep.',
   '武曲化禄或与禄存同拱，不见煞曜，祖业丰厚易守成，见辅佐吉曜更主陆续添置。', '祖业丰厚易守成'),
 R('田宅.武曲.財經', None,
   '武曲在田宅宮，你宜在財經機構服務。',
   'With Wu Qu in your Property Palace, financial institutions are good places to work.',
   '凡武曲守田宅宫，吉者，常主能在业务兴旺的机构服务。凶者，则主时生变动。', '常主能在业务兴旺的机构服务', 'base'),
]})

# ── 天同 ──
T.append({'id': '天同太陰.田宅', 'stars': ['天同', '太陰'], 'rules': [
 R('田宅.同陰.吉', GOOD,
   '天同太陰見〔吉〕，你宜購入農場或寧靜的地段。',
   'Tian Tong with Tai Yin and good signs: farmland or a quiet neighbourhood suits you.',
   '[天同太阴]同度见吉化吉曜，古人认为可藉鱼桑花果而成巨富，在现代，亦宜购入农场，或宁静之地段。', '亦宜购入农场，或宁静之地段'),
]})
T.append({'id': '天同巨門.田宅', 'stars': ['天同', '巨門'], 'rules': [
 R('田宅.同巨.本', None,
   '天同巨門不利田宅：除非見吉而不見煞，否則置產終要吃虧。',
   'Tian Tong with Ju Men does not favour property: unless the signs are good and harsh stars absent, buying ends in loss.',
   '天同与巨门的星系结构，不利田宅，除非见吉化吉曜而不见煞，否则置产终招损失。', '否则置产终招损失', 'limit'),
]})
T.append({'id': '天同天梁.田宅', 'stars': ['天同', '天梁'], 'rules': [
 R('田宅.同梁.買賣', None,
   '天同天梁在田宅宮，流動性大，最宜從事物業買賣。',
   'Tian Tong with Tian Liang in your Property Palace brings movement, which suits property trading.',
   '天同天梁的星系组合，流动性增加，故田宅宫见此星系，最宜从事物业买卖。', '最宜从事物业买卖', 'base'),
]})
T.append({'id': '天同.田宅', 'stars': ['天同'], 'rules': [
 R('田宅.天同.祿', LU,
   '天同見祿，你白手起家，置下的產業豐厚。',
   'Tian Tong meets Lu: starting from nothing, you acquire plenty of property.',
   '天同守田宅宫，一般主白手兴家，可以嚣为业。若见禄者，置业丰厚。', '若见禄者，置业丰厚'),
 R('田宅.天同.忌', H('忌', '天同'),
   '天同化忌，雖能自置產業，卻要為產業花不少精神。',
   'Tian Tong in Hindrance: you can buy your own property, but it takes a lot of your energy.',
   '唯若天同化忌，则虽能自置产业，却为鼍业招致烦恼，或一生为产业而花费精神。', '或一生为产业而花费精神', 'limit'),
 R('田宅.天同.梁對', {'all': [{'star': '天梁', 'at': 'opp'}, {'not': {'star': '天梁', 'at': 'same'}}]},
   '天同與天梁相對，你置業的過程比較順利，少有波折。',
   'Tian Tong faces Tian Liang: buying property goes fairly smoothly for you, with few setbacks.',
   '天同守田宅宫与天梁对拱，其性质较[天同天梁]同度为佳，主置业较为顺利。', '主置业较为顺利'),
 R('田宅.天同.本', None,
   '天同在田宅宮，一般主白手興家；重的是居住環境的享受，不主物業豐厚。',
   'With Tian Tong in your Property Palace, you generally build from nothing; you value a comfortable home more than a large portfolio.',
   '天同守田宅宫，由于天同的精神受比物质享受为重，所以一般情况下，仅主居住环境的享受，故不主牧业丰厚。', '仅主居住环境的享受', 'base'),
]})

# ── 廉貞 ──
T.append({'id': '廉貞天相.田宅', 'stars': ['廉貞', '天相'], 'rules': [
 R('田宅.廉相.煞', SHA,
   '廉貞天相見〔煞〕，你家裡傳下來的產業容易流失。',
   'Lian Zhen–Tian Xiang meets harsh stars: property handed down in your family easily slips away.',
   '[廉贞天相]与破对拱，稍见煞即主祖业调零。', '稍见煞即主祖业调零', 'limit'),
]})
T.append({'id': '廉貞破軍.田宅', 'stars': ['廉貞', '破軍'], 'rules': [
 R('田宅.廉破.本', None,
   '廉貞破軍在田宅宮，你家祖業的根基容易動搖。',
   'Lian Zhen with Po Jun in your Property Palace shakes the family foundations.',
   '[廉贞破军]对天相，则天相之性质固须注意，但祖基动摇之性质则更甚。若见火铃、空劫、刑耗等曜，则破后亦能自置。', '但祖基动摇之性质则更甚', 'base'),
 R('田宅.廉破.自置', {'any': [FIRE, KONG]},
   '同宮有火鈴或空劫，祖業破了之後，也能自己再置。',
   'With Huo Xing, Ling Xing, Di Kong or Di Jie in the palace, you can rebuild your own property after the family estate is lost.',
   '[廉贞破军]对天相，则天相之性质固须注意，但祖基动摇之性质则更甚。若见火铃、空劫、刑耗等曜，则破后亦能自置。', '则破后亦能自置'),
]})
T.append({'id': '廉貞貪狼.田宅', 'stars': ['廉貞', '貪狼'], 'rules': [
 R('田宅.廉貪.本', GOOD,
   '廉貞貪狼見〔吉〕，你有祖業，只是不易守。',
   'Lian Zhen with Tan Lang and good signs brings family property, though it is hard to keep.',
   '廉贞贪狼的星曜组合，见吉亦有祖业，唯不易守。', '见吉亦有祖业，唯不易守', 'base'),
]})
T.append({'id': '廉貞.田宅', 'stars': ['廉貞'], 'rules': [
 R('田宅.廉貞.本', {'not': {'star': ['天府', '天相', '破軍', '貪狼'], 'at': 'same'}},
   '廉貞在田宅宮，帶破祖的性質，自己創業時也容易有困擾糾紛。',
   'Lian Zhen in your Property Palace tends to break with the family inheritance, and starting your own venture brings its share of trouble.',
   '由于廉贞守田宅宫，有破组的性质，故前人认为不宜，其实除破祖外，还有自己创业时必带困扰，纠纷以致破败的性质。', '还有自己创业时必带困扰', 'base'),
]})

# ── 天府 ──
T.append({'id': '天府.田宅', 'stars': ['天府'], 'rules': [
 R('田宅.天府.紫', {'all': [{'star': '紫微', 'at': 'same'}, FUZUO, KUIYUE]},
   '天府與紫微同宮，又得眾星拱照，你的田園豐茂。',
   'Tian Fu with Zi Wei and surrounded by helpers: your property flourishes.',
   '天府最喜紫微同度，百官朝拱，则田园丰茂，', '则田园丰茂'),
 R('田宅.天府.文', {'all': [CHANGQU, LU]},
   '同宮有文昌文曲，又見祿，你置產得利。',
   'With Wen Chang or Wen Qu in the palace and Lu present, buying property pays off.',
   '天府最喜与科文诸曜同度，即昌曲、龙凤、天才、化科诸曜同度或会合，是为文星入宅，前人以为主发科名，家有读书之子，若更遇禄，则主置产得利。', '若更遇禄，则主置产得利'),
 R('田宅.天府.增益', {'all': [{'any': [FUZUO, KUIYUE]}, LU]},
   '見〔輔佐吉星〕又見祿，能在現成基礎上發展，物業增加。',
   'With helper stars and Lu, you build on what is already there, and your property grows.',
   '天府主守成，但当与辅佐吉曜会合，又与化禄或禄存相会之时，则能在现成基础下发展，物业增益。', '物业增益'),
 R('田宅.天府.本', None,
   '天府在田宅宮，主有祖業父業，或能在有基礎聲譽的機構服務。',
   'With Tian Fu in your Property Palace, there is family property, or you work for an established, reputable organisation.',
   '田宅宫喜天府坐守，主有祖、父物业，或能在有基础声誉之机构服务。', '或能在有基础声誉之机构服务', 'base'),
]})

# ── 太陰 ──
T.append({'id': '太陰.田宅', 'stars': ['太陰'], 'rules': [
 R('田宅.太陰.輔佐', {'all': [{'any': [{'star': ['左輔', '右弼'], 'at': 'same'}, {'star': '祿存', 'at': 'same'}]}, {'not': {'hua': '忌', 'star': '太陽', 'at': 'same'}}]},
   '太陰與左輔右弼或祿存同宮，你承接祖業而興盛。',
   'Tai Yin with Zuo Fu, You Bi or Lu Cun in the palace: you inherit family property and it prospers.',
   '又日：[与左右禄主阴福同居，则承祖业而盛。故知太阴遇吉，有祖业且可自置。', '则承祖业而盛'),
 R('田宅.太陰.忌', {'all': [H('忌', '太陰'), {'not': SHA}]},
   '太陰化忌而無煞，你家中或任職的機構多是非。',
   'Tai Yin in Hindrance without harsh stars: there is friction at home or at work.',
   '太阴化忌见煞防有孝服。无煞则主家宅或服务机构有是非。', '无煞则主家宅或服务机构有是非', 'limit'),
]})

# ── 貪狼 ──
T.append({'id': '貪狼.田宅', 'stars': ['貪狼'], 'rules': [
 R('田宅.貪狼.火鈴', {'all': [FIRE, {'not': {'star': '武曲', 'at': 'same'}}]},
   '同宮有火星或鈴星，自置豐厚，只是房子總有破損，古人說「火貪宜住舊宅華廈」。',
   'With Huo Xing or Ling Xing in the palace, you acquire plenty, though the house always has some wear; the old saying is that this suits a grand old home.',
   '若入庙与火铃同度，则自置丰厚，但所住之房宅必有破损。即所谓[火贪宜住旧宅华厦]。', '则自置丰厚'),
 R('田宅.貪狼.吉', {'all': [{'any': [GOODHUA, {'star': '祿存', 'at': 'same'}, CHANGQU]}, {'not': FIRE}]},
   '見〔吉化〕、祿存或文昌文曲，你的產業耐久而豐盛。',
   'With good transformations, Lu Cun, Wen Chang or Wen Qu, your property lasts and grows.',
   '贪狼入庙，无火铃，但有吉星同度会照，如吉化、禄存、昌曲、则产业耐久且丰盛。', '则产业耐久且丰盛'),
 R('田宅.貪狼.本', None,
   '貪狼主散不主聚，稍見刑忌，你的產業就容易生事端。',
   'Tan Lang scatters rather than gathers: the slightest harsh influence stirs up trouble over property.',
   '贪狼主散不主聚，故稍见刑忌即生事端。', '贪狼主散不主聚', 'base'),
]})

# ── 巨門 ──
T.append({'id': '巨門辰戌.田宅', 'stars': ['巨門'], 'branch': ['辰', '戌'], 'rules': [
 R('田宅.巨門辰戌.艱', None,
   '巨門坐辰戌，你置業要經歷一番艱苦。',
   'With Ju Men in Chen or Xu, buying property takes you real hardship.',
   '巨门在辰戌两宫者，主艰苦置业。', '主艰苦置业', 'base'),
]})
T.append({'id': '巨門.田宅', 'stars': ['巨門'], 'rules': [
 R('田宅.巨門.忌', H('忌', '巨門'),
   '巨門化忌，你的家宅不安，或自己要遠離家室。',
   'Ju Men in Hindrance: home is unsettled, or you live far from your family.',
   '巨门化忌于田宅，主家宅不安，或主自身远离家室。', '主家宅不安，或主自身远离家室', 'limit'),
 R('田宅.巨門.本', {'not': {'star': '太陽', 'at': 'same'}},
   '巨門不利田宅：即使見吉，也不主有祖業可守，多要中年以後才自置。',
   'Ju Men does not favour property: even with good signs there is no family estate to keep, and you usually buy your own only in midlife.',
   '巨门不利田宅，故纵遇吉星祥曜，亦不主有祖。父遗业可守，仅能于中年后自置。', '仅能于中年后自置', 'base'),
]})

# ── 天相 ──
T.append({'id': '天相.田宅', 'stars': ['天相'], 'rules': [
 R('田宅.天相.祿', LU,
   '天相見祿，你有能力靠自己置下產業。',
   'Tian Xiang meets Lu: you are able to buy property by your own means.',
   '天相与须见禄，然后始主可以自置。更见辅佐诸曜者，则产业丰盈。', '然后始主可以自置'),
 R('田宅.天相.豐盈', {'all': [LU, {'any': [FUZUO, KUIYUE]}]},
   '天相見祿又見〔左輔右弼等吉星〕，你的產業豐盈。',
   'Tian Xiang meets Lu and helper stars: your property is ample.',
   '天相与须见禄，然后始主可以自置。更见辅佐诸曜者，则产业丰盈。', '则产业丰盈'),
 R('田宅.天相.火鈴夾', {'jia': ['火星', '鈴星']},
   '火星鈴星相夾，你的家宅不安，住處喧鬧。',
   'Flanked by Huo Xing and Ling Xing, home is unsettled and noisy.',
   '天相为火铃夹者，主家宅不安，住宅喧闹，或有缺陷。', '主家宅不安，住宅喧闹', 'limit'),
 R('田宅.天相.吉夾', {'any': [{'jia': ['文昌', '文曲']}, {'jia': ['左輔', '右弼']}]},
   '文昌文曲或左輔右弼相夾，你的住宅華麗。',
   'Flanked by Wen Chang and Wen Qu, or Zuo Fu and You Bi, your home is handsome.',
   '天相喜昌曲夹，龙凤夹，辅弼夹，则住宅华丽。', '则住宅华丽'),
]})

# ── 天梁 ──
T.append({'id': '天梁.田宅', 'stars': ['天梁'], 'rules': [
 R('田宅.天梁.祿', H('祿', '天梁'),
   '天梁化祿，你在機構內人緣容易不佳。',
   'Tian Liang in Abundance: you can find yourself less popular at work.',
   '天梁在田宅宫化禄，易致人缘不佳。', '易致人缘不佳', 'limit'),
 R('田宅.天梁.機', {'star': '天機', 'at': ['same', 'opp']},
   '天梁與天機同宮或相對，你多搬遷，住處常變動。',
   'Tian Liang is beside or facing Tian Ji: you move house often.',
   '天梁天机，主多迂动，', '天梁天机，主多迂动'),
 R('田宅.天梁.馬', {'any': [{'star': '天馬', 'at': 'same'}, FIRE]},
   '同宮有天馬或火鈴，你容易漂盪；就算有祖業也難享。',
   'With Tian Ma, Huo Xing or Ling Xing in the palace, you drift, and even family property is hard to enjoy.',
   '天梁与天马同躔，或火铃同度，则主飘荡，纵有祖、父遗业亦不能享。', '则主飘荡', 'limit'),
 R('田宅.天梁.本', {'all': [{'all': [{'not': {'star': ['天機', '天同'], 'at': ['same', 'opp']}}, {'not': {'hua': '忌', 'star': '太陽', 'at': ['same', 'opp']}}]}, {'not': {'any': [{'star': '天馬', 'at': 'same'}, FIRE]}}]},
   '天梁是蔭星，在田宅宮，你有祖業父業。',
   'Tian Liang is the sheltering star: in your Property Palace it points to family property.',
   '天梁为阴星，故居田宅宫，主必有祖业父业，', '主必有祖业父业', 'base'),
]})

# ── 七殺 ──
T.append({'id': '七殺.田宅', 'stars': ['七殺'], 'rules': [
 R('田宅.七殺.祿', LU,
   '七殺得祿，你雖無祖產父業，卻能自置。',
   'Qi Sha meeting Lu: no family property, but you buy your own.',
   '七杀最喜得禄，虽无祖产父业，却能自置。', '虽无祖产父业，却能自置'),
 R('田宅.七殺.獨', {'all': [{'alone': True}, {'not': {'branch': ['寅', '申']}}, {'not': LU}]},
   '七殺獨坐田宅宮，你不利置業，更不宜做物業買賣。',
   'Qi Sha alone in your Property Palace does not favour buying, and property trading even less.',
   '七杀入田宅宫，若为独坐者，除寅申两宫外，均不利于置业，更不利从事物业买卖。', '更不利从事物业买卖', 'limit'),
]})

# ── 破軍 ──
T.append({'id': '破軍.田宅', 'stars': ['破軍'], 'rules': [
 R('田宅.破軍.祿權', {'all': [{'hua': ['祿', '權'], 'star': '破軍', 'at': 'same'}, {'any': [FUZUO, KUIYUE]}]},
   '破軍化祿化權又見〔吉星〕，舊宅拆建翻新，也會轉到更好的工作環境。',
   'Po Jun in Abundance or Authority with helper stars: an old house is rebuilt, and you move to a better workplace.',
   '破军化禄权者，更见吉曜，主旧宅拆建翻新。亦主转换良好之工作环境。', '主旧宅拆建翻新'),
 R('田宅.破軍.火鈴', {'any': [FIRE, KONG]},
   '同宮有火鈴或空劫，你在產業上會有損失。',
   'With Huo Xing, Ling Xing, Di Kong or Di Jie in the palace, property brings losses.',
   '破军与火铃，空劫同度会照，主产、也损失。', '破军与火铃，空劫同度会照', 'limit'),
]})
