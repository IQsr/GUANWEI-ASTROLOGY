# 父母宮規則（2026-10-12）。原書父母宮兼論上司、主管（「尚可推断自己跟上司、主管及主管机构的关系」）。
# 題目次序 = 合併輸出次序：組合／地支題目行先，單星通則其次，唔限主星嘅通則最後。
FIRE = {'star': ['火星', '鈴星'], 'at': 'same'}
KONG = {'star': ['地空', '地劫'], 'at': 'same'}
SHA4 = {'star': ['擎羊', '陀羅', '火星', '鈴星'], 'at': 'same'}
SHA = {'star': ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'], 'at': 'same'}
FUZUO = {'star': ['左輔', '右弼'], 'at': 'sifang'}
KUIYUE = {'star': ['天魁', '天鉞'], 'at': 'sifang'}
GOODHUA = {'hua': ['祿', '權', '科'], 'at': 'same'}
GOOD = {'any': [GOODHUA, FUZUO, KUIYUE]}
LU = {'any': [{'hua': '祿', 'at': 'sifang'}, {'star': '祿存', 'at': 'sifang'}]}
PAIR = {'any': [{'all': [{'star': '左輔', 'at': 'sifang'}, {'star': '右弼', 'at': 'sifang'}]},
                {'all': [{'star': '天魁', 'at': 'sifang'}, {'star': '天鉞', 'at': 'sifang'}]}]}
def H(hua, star, at='same'): return {'hua': hua, 'star': star, 'at': at}
def R(id, when, text, en, src, quote, role='refine'):
    return {'id': id, 'when': when, 'text': text, 'en': en, 'src': src, 'quote': quote, 'role': role}

# ── 紫微 ──
T.append({'id': '紫微七殺.父母', 'stars': ['紫微', '七殺'], 'rules': [
 R('父母.紫殺.本', None,
   '紫微七殺在父母宮，父母有責任心，無論甚麼情形都會呵護你。',
   'With Zi Wei and Qi Sha in your Parents Palace, your parents are responsible and protect you whatever happens.',
   '巳亥宫[紫微七杀]，对四化影响极为敏感。基本性质则为父母有责任心，无论任何种情形下，对自己均能呵护。', '对自己均能呵护', 'base'),
 R('父母.紫殺.三吉', {'all': [H('祿', '廉貞', 'sifang'), H('權', '破軍', 'sifang')]},
   '會廉貞化祿、破軍化權，兩代感情融洽，也得父母提攜。',
   'Meeting Lian Zhen in Abundance and Po Jun in Authority: warm ties between the generations, and your parents help you along.',
   '故最喜见廉贞化禄、破军化权、武曲化科同时相会则两代感情融洽，且主受父母提携。', '且主受父母提携'),
]})
T.append({'id': '紫微天府.父母', 'stars': ['紫微', '天府'], 'rules': [
 R('父母.紫府.科', {'any': [H('科', '紫微'), H('科', '天府')]},
   '紫微化科，父母有權威；天府化科，父母呵護你。',
   'Zi Wei in Merit: your parents carry authority; Tian Fu in Merit: they look after you.',
   '紫微化科，父母权威；天府化科，父母呵护。', '天府化科，父母呵护'),
]})
T.append({'id': '紫微.父母', 'stars': ['紫微'], 'rules': [
 R('父母.紫微.主觀', {'not': {'all': [FUZUO, KUIYUE]}},
   '紫微不得眾星拱照，父母較主觀，習慣下命令；同樣可以看你和上司的關係：上司慣於發號施令，要懂得調和。',
   'Without helpers around Zi Wei, your parents are opinionated and used to giving orders; the same applies to your bosses, who like to command, so learn to work with that.',
   '然如无百官朝拱，则仅主父母主观，在家庭有暴君倾向，其权威性质在此。故若见煞忌刑曜，则主自己童年不为父母爱护，或父母常主观命令，左右自己的意志。这点性质，亦可以用来推断跟上司的关系。上司习惯命令，须注意如何调和。', '上司习惯命令，须注意如何调和'),
 R('父母.紫微.本', {'not': {'hua': '科', 'star': ['紫微', '天府'], 'at': 'same'}},
   '紫微在父母宮，你的父母有權威，在家說了算。',
   'With Zi Wei in your Parents Palace, your parents carry authority and have the final say at home.',
   '紫微守父母宫，主父母有权威。', '紫微守父母宫，主父母有权威', 'base'),
]})

# ── 天機 ──
T.append({'id': '天機太陰.父母', 'stars': ['天機', '太陰'], 'rules': [
 R('父母.機陰.本', {'not': SHA},
   '天機太陰是較好的組合：沒有煞星，你與父母關係穩定，不會分隔兩地。',
   'Tian Ji with Tai Yin is a good pairing: with no harsh stars, your bond with your parents is steady and does not point to separation.',
   '[天机太阴]为较佳组合，无煞，不主刑克分离。', '[天机太阴]为较佳组合', 'base'),
]})
T.append({'id': '天機巨門.父母', 'stars': ['天機', '巨門'], 'rules': [
 R('父母.機巨.本', None,
   '天機巨門在父母宮，即使不見煞，你也容易與父母遠離，或兩代關係欠佳；坐酉比坐卯好。用來看上司，你的上司工作上境況也不太順。',
   'With Tian Ji and Ju Men in your Parents Palace, you live apart from your parents even without harsh stars, or the generations do not get on; You is better than Mao. Applied to your bosses, it means they have a hard time at work.',
   '卯酉宫[天机巨门]，不见煞亦主远离，或两代人际关系不佳，或不利父母。见煞者主刑克，或父业破败。然酉宫者优于卯宫。所谓[不利父母]，乃指出生后父母境遇欠佳。持此以验上司，亦主上司在工作上境况不利。', '不见煞亦主远离，或两代人际关系不佳', 'base'),
]})
T.append({'id': '天機.父母', 'stars': ['天機'], 'rules': [
 R('父母.天機.吉', {'all': [{'hua': ['祿', '權', '科'], 'at': 'sifang'}, {'not': {'star': ['太陰', '巨門'], 'at': 'same'}}, {'not': H('忌', '天機')}]},
   '天機見〔吉化〕，你與父母的關係穩定。',
   'Tian Ji meets 〔good transformations〕: your bond with your parents is steady.',
   '天机守父母富，基本性质不利父子间的人际关系。见禄权科会，然后始主稳定，否则主两代远离。', '见禄权科会，然后始主稳定'),
 R('父母.天機.忌', H('忌', '天機'),
   '天機化忌，你和父母之間的關係較差，容易隔膜。',
   'Tian Ji in Hindrance: relations between you and your parents are strained, and distance creeps in easily.',
   '天机化忌，基本性质为两代人际关系不佳。', '基本性质为两代人际关系不佳', 'limit'),
 R('父母.天機.本', {'all': [{'not': {'hua': ['祿', '權', '科'], 'at': 'sifang'}}, {'not': {'star': '太陰', 'at': 'same'}}]},
   '天機在父母宮，你和父母容易分隔兩地，聚少離多。',
   'With Tian Ji in your Parents Palace, you and your parents tend to live apart and see each other little.',
   '天机守父母富，基本性质不利父子间的人际关系。见禄权科会，然后始主稳定，否则主两代远离。', '否则主两代远离', 'base'),
]})

# ── 太陽 ──
T.append({'id': '太陽太陰.父母', 'stars': ['太陽', '太陰'], 'rules': [
 R('父母.陰陽.本', None,
   '太陽太陰同在父母宮，一般父母和美，與你的關係也好。',
   'With Tai Yang and Tai Yin together in your Parents Palace, your parents usually get on well, and so do you with them.',
   '[太阳太阴]同度者，一般情形下主父母和美，与自身关系亦良好。', '一般情形下主父母和美，与自身关系亦良好', 'base'),
 R('父母.陰陽.陰祿', H('祿', '太陰'),
   '太陰化祿，你小時候很得父母寵愛，被照顧得周到。',
   'Tai Yin in Abundance: your parents doted on you as a child, and you were well looked after.',
   '若太阴化禄，则主幼年受父母溺爱；', '则主幼年受父母溺爱'),
 R('父母.陰陽.陽祿', H('祿', '太陽'),
   '太陽化祿，你得父母助力，或得父母的親友提攜。',
   'Tai Yang in Abundance: your parents help you, or their friends and relatives give you a leg up.',
   '太阳化禄，则受父母助力，或得父母之戚友提携；', '则受父母助力，或得父母之戚友提携'),
]})
T.append({'id': '太陽巨門.父母', 'stars': ['太陽', '巨門'], 'rules': [
 R('父母.陽巨.吉', {'hua': ['祿', '權', '科'], 'star': ['太陽', '巨門'], 'at': 'same'},
   '太陽巨門見〔吉化〕，宜在外資機構服務，容易得外國上司提拔。',
   'Tai Yang with Ju Men, with 〔good transformations〕: working for a foreign organisation suits you, and foreign bosses tend to promote you.',
   '[太阳巨门]见吉化者，、以服务异族为佳，主得异族上司提拔。', '主得异族上司提拔'),
 R('父母.陽巨.忌', {'hua': '忌', 'star': ['太陽', '巨門'], 'at': 'same'},
   '太陽巨門化忌，容易與上司不和，所以以自由職業為佳。',
   'Tai Yang with Ju Men in Hindrance: you clash with bosses easily, so freelance work suits you better.',
   '[太阳巨门]化忌，则主与上司不和，因此以自由职业为佳。', '因此以自由职业为佳', 'limit'),
 R('父母.陽巨.離鄉', None,
   '太陽巨門在父母宮，你的父親曾經離鄉安家。',
   'With Tai Yang and Ju Men in your Parents Palace, your father once left home to settle elsewhere.',
   '太阳巨门在父母宫，主父亲曾离乡安家。', '主父亲曾离乡安家', 'base'),
]})
T.append({'id': '太陽天梁.父母', 'stars': ['太陽', '天梁'], 'rules': [
 R('父母.陽梁.權', H('權', '太陽'),
   '太陽化權最吉：你受父母蔭庇，也多助力。',
   'Tai Yang in Authority is best: your parents shelter you and help you a great deal.',
   '[太阳天梁]以太阳化权为最吉，不但可受父母荫庇，且多助力：', '[太阳天梁]以太阳化权为最吉'),
 R('父母.陽梁.吉', {'hua': ['祿', '科'], 'star': '太陽', 'at': 'same'},
   '太陽吉化，你得到父母的庇蔭很大，受益良多。',
   'Tai Yang has a favourable transformation: your parents’ protection does a great deal for you.',
   '太阳天梁守父母宫，若太阳吉化，则得父母荫庇之力甚大。', '则得父母荫庇之力甚大'),
 R('父母.陽梁.主觀', {'not': GOOD},
   '太陽天梁不見吉星，父母較主觀；與上司也容易有成見。',
   'Tai Yang with Tian Liang and no helpful stars: your parents are opinionated, and bosses easily form fixed views of you.',
   '[太阳天梁]在父母宫，如无吉曜，则虽不见煞忌，亦主父母主观。同时亦主与上司易有成见。', '同时亦主与上司易有成见', 'limit'),
]})

# ── 天同 ──
T.append({'id': '天同天梁.父母', 'stars': ['天同', '天梁'], 'rules': [
 R('父母.同梁.馬', {'star': '天馬', 'at': 'same'},
   '同宮有天馬，父母要離鄉別井；有時也表示你父親的工作帶流動性質。',
   'With Tian Ma in the palace, your parents leave their home town; sometimes it means your father’s work involves travel.',
   '[天同天梁]与天马同度，主父母须离乡背井。更见火铃，则主飘流。此种星曜性质，有时又主父亲所业者带流动色彩。', '有时又主父亲所业者带流动色彩'),
]})
T.append({'id': '天同辰戌.父母', 'stars': ['天同'], 'branch': ['辰', '戌'], 'rules': [
 R('父母.天同辰戌.巨忌', H('忌', '巨門', 'opp'),
   '對宮巨門化忌，兩代意見不合，與上司也容易不和。',
   'With Ju Men in Hindrance opposite, the generations disagree, and you clash with bosses too.',
   '天同在辰戌二宫，最嫌对宫巨门化忌，主父子参商。亦主与上司不和。', '亦主与上司不和', 'limit'),
]})
T.append({'id': '天同.父母', 'stars': ['天同'], 'rules': [
 R('父母.天同.羊', {'star': '擎羊', 'at': 'same'},
   '同宮有擎羊，你容易受上司壓力，以致不和。',
   'With Qing Yang in the palace, bosses put pressure on you and friction follows.',
   '天同与擎羊同度，则主受上司压力，以致不和。', '则主受上司压力，以致不和', 'limit'),
 R('父母.天同.火鈴', FIRE,
   '天同與火星或鈴星同宮，你工作上常常換上司。',
   'Tian Tong shares the palace with Huo Xing or Ling Xing: your bosses change often.',
   '火铃同度，时时变换上司。', '火铃同度，时时变换上司', 'limit'),
 R('父母.天同.祿梁', {'all': [H('祿', '天同'), {'star': '天梁', 'at': ['same', 'opp']}]},
   '天同化祿，又與天梁同宮或相對，你受父母蔭庇。',
   'Tian Tong in Abundance, beside or facing Tian Liang: your parents shelter you.',
   '天同化禄，唯与天梁同度或对拱者，始主受父母荫庇，', '始主受父母荫庇'),
 R('父母.天同.對星', PAIR,
   '見齊〔成對的輔佐星〕，你和父母兩代關係吉利。',
   'With 〔helper stars in matched pairs〕, relations between the generations go well.',
   '天同与左辅右弼，或天魁天钺同会，以见齐对星始吉，', '以见齐对星始吉'),
]})

# ── 廉貞 ──
T.append({'id': '廉貞天府.父母', 'stars': ['廉貞', '天府'], 'rules': [
 R('父母.廉府.本', {'all': [{'any': [FUZUO, KUIYUE]}, {'not': SHA}]},
   '廉貞天府是父母宮最穩定的結構；見〔吉星〕，你和父母兩代感情和美。',
   'Lian Zhen with Tian Fu is the steadiest structure in the Parents Palace; with helpful stars, the generations are close.',
   '[廉贞天府]为最稳定结构，不主刑克，见吉曜且主感情和美。', '[廉贞天府]为最稳定结构', 'base'),
]})
T.append({'id': '廉貞.父母', 'stars': ['廉貞'], 'rules': [
 R('父母.廉貞.祿', H('祿', '廉貞'),
   '廉貞化祿，你和父母一般感情融洽，相處和睦。',
   'Lian Zhen in Abundance: you generally get on warmly with your parents.',
   '廉贞化禄，一般主不刑克，或感情融洽。', '或感情融洽'),
 R('父母.廉貞.忌', H('忌', '廉貞'),
   '廉貞化忌，你與父母的感情較難融洽。',
   'Lian Zhen in Hindrance: warmth with your parents does not come easily.',
   '廉贞化忌，一般主不利父母，或刑克、或生离、或感情不融洽。', '或感情不融洽', 'limit'),
]})

# ── 天府 ──
T.append({'id': '天府.父母', 'stars': ['天府'], 'rules': [
 R('父母.天府.火鈴', {'star': ['火星', '鈴星'], 'at': 'same'},
   '天府與火星或鈴星同宮，你和父母容易分隔兩地。',
   'Tian Fu with Huo Xing or Ling Xing: you and your parents tend to live apart.',
   '天府与火、铃同度，主生离。', '天府与火、铃同度，主生离'),
 R('父母.天府.祿存煞', {'all': [{'star': '祿存', 'at': 'same'}, {'star': ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'], 'at': 'same'}]},
   '天府與祿存同宮又見〔煞〕，你和父母意見不合，各持己見。',
   'Tian Fu with Lu Cun meets 〔harsh stars〕: you and your parents disagree, each holding to their own view.',
   '天府禄存同度，见煞，主父子参商。', '见煞，主父子参商'),
 R('父母.天府.祿', {'all': [{'hua': '祿', 'at': ['same', 'opp']}, {'not': H('祿', '武曲', ['same', 'opp'])}]},
   '天府見化祿，你父母的財力對你有幫助。',
   'Tian Fu with Abundance: your parents’ means are a help to you.',
   '天府与化禄同度或对拱，以武曲化禄最宜，则父母财荫颇厚。', '天府与化禄同度或对拱'),
 R('父母.天府.武祿', H('祿', '武曲', ['same', 'opp']),
   '天府會武曲化祿，你從父母那裡得到的財力支持頗厚。',
   'Tian Fu meets Wu Qu in Abundance: the financial support you get from your parents is generous.',
   '天府与化禄同度或对拱，以武曲化禄最宜，则父母财荫颇厚。', '则父母财荫颇厚'),
 R('父母.天府.羊', {'star': '擎羊', 'at': 'same'},
   '天府與擎羊同宮，你和父母兩代不和，常有摩擦。',
   'Tian Fu shares the palace with Qing Yang: you and your parents do not get on, and friction is common.',
   '天府与擎羊同度，主两代不和。', '主两代不和', 'limit'),
 R('父母.天府.祿存', {'star': '祿存', 'at': 'same'},
   '天府與祿存同宮，你的父母喜歡獨自掌管家中財權。',
   'Tian Fu shares the palace with Lu Cun: your parents like to keep control of the household money to themselves.',
   '天府禄存同度，见煞，主父子参商。又主父母喜独掌财权。', '又主父母喜独掌财权'),
]})

# ── 太陰 ──
T.append({'id': '太陰.父母', 'stars': ['太陰'], 'rules': [
 R('父母.太陰.火鈴', {'star': ['火星', '鈴星'], 'at': 'same'},
   '太陰與火星或鈴星同宮，你和父母容易分隔兩地。',
   'Tai Yin with Huo Xing or Ling Xing: you and your parents tend to live apart.',
   '倘仅躔火、铃，则只主分离。', '倘仅躔火、铃，则只主分离'),
 R('父母.太陰.馬', {'star': '天馬', 'at': 'same'},
   '太陰與天馬同宮，你和父母住得遠，見面少。',
   'Tai Yin with Tian Ma: you live far from your parents and see them little.',
   '太阴与天马、天虚同度，不见火铃亦主远离父母。', '不见火铃亦主远离父母'),
 R('父母.太陰.讒', {'all': [{'hua': '忌', 'star': '太陰', 'at': 'same'}, {'star': ['擎羊', '陀羅'], 'at': 'sifang'}, {'star': '文曲', 'at': 'sifang'}, {'not': {'star': '陀羅', 'at': 'same'}}]},
   '太陰化忌又見羊陀和文曲，容易有人從中挑撥，令你和父母或上司不和。',
   'Tai Yin in Hindrance with Qing Yang or Tuo Luo and Wen Qu: someone may stir things up between you and your parents or boss.',
   '太阴化忌见羊陀，更见文曲，主有人进谗，以致与父母或上司不和。', '主有人进谗'),
 R('父母.太陰.羊', {'star': '擎羊', 'at': 'same'},
   '太陰與擎羊同宮，你和母親的緣份較淺。',
   'Tai Yin with Qing Yang: your bond with your mother is thinner.',
   '太阴擎羊同度，主与母亲缘份浅，', '主与母亲缘份浅', 'limit'),
 R('父母.太陰.陀', {'star': '陀羅', 'at': 'same'},
   '太陰與陀羅同宮，你與母親各有成見，不易融洽。',
   'Tai Yin with Tuo Luo: you and your mother each hold your own views, and harmony is hard.',
   '太阴陀罗同度，主与母亲不和，各怀成见，', '各怀成见', 'limit'),
]})

# ── 貪狼 ──
T.append({'id': '貪狼.父母', 'stars': ['貪狼'], 'rules': [
 R('父母.貪狼.子午火', {'all': [{'branch': ['子', '午']}, {'star': ['火星', '鈴星'], 'at': 'same'}]},
   '貪狼在子午，又與火星或鈴星同宮，你年紀小就離開父母。',
   'Tan Lang in Zi or Wu with Huo Xing or Ling Xing: you leave your parents young.',
   '贪狼在子午，火铃同度则主幼少离开父母。', '火铃同度则主幼少离开父母'),
 R('父母.貪狼.武祿', H('祿', '武曲', ['same', 'opp']),
   '貪狼會武曲化祿，你父親的事業出色。',
   'Tan Lang meets Wu Qu in Abundance: your father does well in his work.',
   '贪狼若与武曲化禄相拱，则父业峥嵘，见辅佐诸曜尤吉。', '则父业峥嵘'),
 R('父母.貪狼.忌', H('忌', '貪狼'),
   '貪狼化忌，你早年就離開父母，自己生活。',
   'Tan Lang in Hindrance: you leave your parents early and live on your own.',
   '贪狼化忌，主早年离开父母，', '主早年离开父母', 'limit'),
]})

# ── 巨門 ──
T.append({'id': '巨門.父母', 'stars': ['巨門'], 'rules': [
 R('父母.巨門.同火', {'all': [{'star': '天同', 'at': ['same', 'opp']}, {'star': ['火星', '鈴星'], 'at': 'same'}]},
   '巨門遇天同，又與火星或鈴星同宮，你和父母意見不合。',
   'Ju Men meeting Tian Tong, with Huo Xing or Ling Xing: you and your parents disagree.',
   '巨门与天同同度或相对，火铃同躔，则主父母子女参商。', '则主父母子女参商'),
 R('父母.巨門.煞忌', {'any': [{'star': ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'], 'at': 'same'}, {'hua': '忌', 'at': 'same'}]},
   '巨門在父母宮又見〔煞忌〕，你和父母之間難免不和。',
   'Ju Men in your Parents Palace meets 〔harsh stars or Hindrance〕: some friction with your parents is hard to avoid.',
   '否则纵使化禄，亦仅主父业丰厚，刑克或不和仍难避免。', '或不和仍难避免'),
 R('父母.巨門.陽', {'all': [{'star': '太陽', 'at': ['same', 'opp']}, {'not': {'hua': ['祿', '權', '科'], 'star': ['太陽', '巨門'], 'at': ['same', 'opp']}}]},
   '巨門與太陽同宮或相對，你和父母一般兩代不和。',
   'With Ju Men beside or facing Tai Yang, the generations generally do not get on.',
   '巨门太阳的结构，一般情形下主父子不和。若见吉化，则主父母离乡别井。', '一般情形下主父子不和', 'limit'),
 R('父母.巨門.機', {'all': [{'star': '天機', 'at': ['same', 'opp']}, {'not': SHA}]},
   '巨門與天機同宮或相對而無煞，你小時候多會寄住或寄養在別處，離開父母一段時間。',
   'With Ju Men beside or facing Tian Ji and no harsh stars, you stay with others for a time as a child, away from your parents.',
   '巨门与天机同度或相对，古人认为乃重拜父母，二姓延生之兆。其实若不见煞，仅主寄宿或寄养，不主二姓。', '仅主寄宿或寄养'),
]})

# ── 天相 ──
T.append({'id': '天相.父母', 'stars': ['天相'], 'rules': [
 R('父母.天相.吉', {'any': [FUZUO, KUIYUE]},
   '天相見〔輔佐吉星〕，你和父母和美，也容易受上司提拔。',
   'Tian Xiang meets 〔helper stars〕: you get on well with your parents, and bosses tend to promote you.',
   '天相最喜见魁钺、左右，亦喜见天官、天福、天贵、解神、天德、龙德、天巫、长生诸曜，则与父母和美。亦主易受主管提拔。', '亦主易受主管提拔'),
 R('父母.天相.火鈴夾', {'jia': ['火星', '鈴星']},
   '天相被火星鈴星相夾，你和父母住得遠，見面少。',
   'Tian Xiang is flanked by Huo Xing and Ling Xing: you live far from your parents and see them little.',
   '天相为火铃夹，主远离父母，见天马尤确。', '主远离父母'),
]})

# ── 天梁 ──
T.append({'id': '天梁.父母', 'stars': ['天梁'], 'rules': [
 R('父母.天梁.吉', {'all': [GOOD, {'not': SHA}]},
   '天梁見〔吉〕而無煞，你必定得到父母的福蔭。',
   'Tian Liang meets 〔good signs〕 and no harsh stars: your parents’ blessings are sure to reach you.',
   '倘入庙无煞，而有吉曜吉化会合，则主必得父母福荫。', '则主必得父母福荫'),
 R('父母.天梁.同', {'all': [{'star': '天同', 'at': ['same', 'opp']}, {'not': H('忌', '天同', ['same', 'opp'])}]},
   '天梁與天同同宮或相對，是天梁喜歡的配搭，對你和父母的關係有利。',
   'Tian Liang beside or facing Tian Tong is a pairing it welcomes, and it favours your bond with your parents.',
   '天梁喜见天同同度或对拱，唯天同化忌或与四煞空劫刑伤同会者，则主两代意见参商。', '天梁喜见天同同度或对拱'),
 R('父母.天梁.同忌', H('忌', '天同', ['same', 'opp']),
   '天同化忌，你和父母兩代之間意見不合，各有堅持。',
   'Tian Tong in Hindrance: you and your parents disagree, each holding to their own view.',
   '天梁喜见天同同度或对拱，唯天同化忌或与四煞空劫刑伤同会者，则主两代意见参商。', '则主两代意见参商', 'limit'),
 R('父母.天梁.馬羊', {'all': [{'star': '天馬', 'at': 'same'}, {'star': '擎羊', 'at': 'same'}]},
   '天梁與天馬、擎羊同宮，你會離家生活。',
   'Tian Liang shares the palace with Tian Ma and Qing Yang: you leave home to live elsewhere.',
   '天梁与天马、擎羊同度，主离家。', '天梁与天马、擎羊同度，主离家', 'limit'),
]})

# ── 七殺 ──
T.append({'id': '七殺.父母', 'stars': ['七殺'], 'rules': [
 R('父母.七殺.代溝', {'all': [{'star': ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'], 'at': 'same'}, {'not': {'star': ['火星', '鈴星'], 'at': 'same'}}, {'not': {'hua': '祿', 'star': '廉貞', 'at': 'same'}}]},
   '七殺見〔煞〕，你和父母有代溝，和上司也容易不和。',
   'Qi Sha meets 〔harsh stars〕: there is a generation gap with your parents, and friction with bosses.',
   '七杀守父母宫，煞轻者，主有代沟。', '七杀守父母宫，煞轻者，主有代沟'),
 R('父母.七殺.紫權', H('權', '紫微', ['same', 'opp']),
   '七殺會紫微化權，你的父母成見很深，不易被說服。',
   'Qi Sha meets Zi Wei in Authority: your parents hold very fixed views and are hard to persuade.',
   '七杀会紫微化权，父母成见极深。', '七杀会紫微化权，父母成见极深', 'limit'),
 R('父母.七殺.紫科', {'all': [H('科', '紫微', ['same', 'opp']), GOOD]},
   '會紫微化科又見〔吉〕，父母有聲譽，只是兩代關係未必相諧。',
   'Meeting Zi Wei in Merit with 〔helpful stars〕, your parents are well regarded, though the generations do not always see eye to eye.',
   '七杀会紫微化科，又见吉曜，父母有声誉。但两代关系未必相谐。', '父母有声誉'),
 R('父母.七殺.吉', {'hua': ['祿', '權', '科'], 'at': 'sifang'},
   '七殺會到祿權科，你得到父母蔭庇之力。',
   'Qi Sha meeting Abundance, Authority or Merit: you benefit from your parents’ shelter.',
   '七杀得禄、权、科会，主得父母荫庇之力。', '主得父母荫庇之力'),
 R('父母.七殺.遠', {'any': [FIRE, {'star': '天馬', 'at': ['same', 'opp']}]},
   '同宮有火鈴，或會天馬，你與父母遠離。',
   'With Huo Xing or Ling Xing in the palace, or meeting Tian Ma, you live far from your parents.',
   '七杀与火铃同度，或会天马，主远离父母，且远离之性质不良。', '主远离父母', 'limit'),
 R('父母.七殺.本', None,
   '七殺在父母宮，你與父母的關係較疏遠。',
   'With Qi Sha in your Parents Palace, your relationship with your parents is more distant.',
   '七杀于父母宫并非善曜，’即使入庙，亦与父母关系疏远。', '亦与父母关系疏远', 'base'),
]})

# ── 破軍 ──
T.append({'id': '破軍.父母', 'stars': ['破軍'], 'rules': [
 R('父母.破軍.煞', {'all': [{'star': ['擎羊', '陀羅', '地空', '地劫'], 'at': 'same'}, {'not': {'star': ['火星', '鈴星'], 'at': 'same'}}]},
   '破軍見〔煞〕，你和父母容易分隔兩地。',
   'Po Jun meets 〔harsh stars〕: you and your parents tend to live apart.',
   '14破军破军守父母宫，基本性质不忍受，稍见煞即主远离，煞重则主刑克。', '稍见煞即主远离'),
 R('父母.破軍.權羊陀', {'all': [{'hua': '權', 'star': '破軍', 'at': 'same'}, {'star': ['擎羊', '陀羅'], 'at': 'same'}]},
   '破軍化權又與擎羊或陀羅同宮，你和父母或上司關係不和。',
   'Po Jun in Authority with Qing Yang or Tuo Luo: relations with your parents or boss are strained.',
   '破军化权，绝不宜羊陀同度，否则主父子关系不和，或与上司不和。', '否则主父子关系不和'),
 R('父母.破軍.祿', H('祿', '破軍'),
   '破軍化祿，你的父母之間感情和美，家裡氣氛好。',
   'Po Jun in Abundance: your parents get on well together, and home feels good.',
   '破军化禄，则父母和美，更见辅佐吉曜者尤佳。', '破军化禄，则父母和美'),
 R('父母.破軍.火鈴', FIRE,
   '破軍與火星或鈴星同宮，你和父母分隔兩地。',
   'Po Jun shares the palace with Huo Xing or Ling Xing: you and your parents live far apart.',
   '破军与火星、铃星同度，决主远离。', '破军与火星、铃星同度，决主远离', 'limit'),
 R('父母.破軍.獨', {'alone': True},
   '破軍獨坐父母宮，本質孤獨，跟上司關係也疏遠，所以有時會常換工作。',
   'With Po Jun alone in your Parents Palace, things are solitary by nature: you are distant from bosses too, so you may change jobs often.',
   '破军独坐于父母宫，基本性质孤独。亦主跟上司关系疏远，故有时亦主时时变换工作。唯见辅佐对星者，则可以调和关系。', '亦主跟上司关系疏远'),
]})

# ── 唔限主星（通則，排最後） ──
T.append({'id': '太陽.父母', 'stars': ['太陽'], 'rules': [
 R('父母.太陽.陷煞', {'all': [{'bright': 'low', 'star': '太陽'}, {'any': [{'star': ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'], 'at': 'same'}, {'hua': '忌', 'at': 'same'}]}]},
   '太陽光熱不足又見〔煞忌〕，你小時候不太得父母歡心。',
   'Tai Yang shines weakly and meets 〔harsh stars or Hindrance〕: as a child you were not your parents’ favourite.',
   '若太阳落陷，视煞忌会合程度，而定是否刑克，或不为父母所喜。', '或不为父母所喜'),
 R('父母.太陽.廟吉', {'all': [{'bright': 'high', 'star': '太陽'}, {'any': [GOODHUA, FUZUO, KUIYUE]}]},
   '太陽光熱充足又見〔吉〕，你童年很受父母愛護。',
   'Tai Yang shines strongly and meets 〔good signs〕: your parents cherished you as a child.',
   '太阳在父母宫，入庙者，无克；更见吉，童年受父母爱护。', '童年受父母爱护'),
]})
T.append({'id': '武曲天府.父母', 'stars': ['武曲', '天府'], 'rules': [
 R('父母.武府.廉忌', {'hua': '忌', 'star': '廉貞', 'at': 'sifang'},
   '武曲天府會廉貞化忌，你和父母之間意見不合。',
   'Wu Qu–Tian Fu meets Lian Zhen in Hindrance: you and your parents disagree.',
   '[武曲天府]会廉贞化忌，则主父子参商。', '会廉贞化忌，则主父子参商'),
]})
T.append({'id': '父母通則', 'stars': [], 'rules': [
 R('父母.通則.吉化', {'hua': ['祿', '權', '科'], 'at': 'same'},
   '父母宮見祿權科，很多時候講的是上司的特質：一般宜在大機構服務，或者上司身居要職。',
   'Abundance, Authority or Merit in the Parents Palace often describes your bosses: you generally do well in a large organisation, or your boss holds an important post.',
   '父母宫见禄、权、科，许多时候仅主上司的特质。一般情形下，可视为宜在大机构企业服务。或主上司任要职，有权势名誉。', '可视为宜在大机构企业服务'),
 R('父母.通則.煞', SHA4,
   '父母宮見〔煞〕，有時只主人際關係欠佳，包括與父母、與上司。',
   '〔Harsh stars〕 in the Parents Palace can simply mean strained relationships, with your parents and with your bosses.',
   '父母宫见四煞，亦不一定主刑克，有时仅主人际关系不佳(包括与本身父母宫及上司主管的关系)。', '有时仅主人际关系不佳'),
 R('父母.通則.祿馬', {'any': [{'star': '祿存', 'at': 'same'}, {'star': '天馬', 'at': 'same'}]},
   '父母宮見祿存或天馬，父母多遷動；有時也表示你常換上司。',
   'Lu Cun or Tian Ma in the Parents Palace often means your parents move around; sometimes it means your bosses keep changing.',
   '父母宫见禄存、天马，往往主父母迁动。但有时亦主自己时时更换上司。', '但有时亦主自己时时更换上司'),
]})
