# 僕役宮（程式內叫「僕役」）規則（2026-10-12）。原書：僕役宮主下屬、晚輩，兼論朋友；平輩知交歸兄弟宮。
# 題目次序 = 合併輸出次序：組合／地支題目行先，單星通則其次，唔限主星嘅通則最後。
FIRE = {'star': ['火星', '鈴星'], 'at': 'same'}
KONG = {'star': ['地空', '地劫'], 'at': 'same'}
YANGTUO = {'star': ['擎羊', '陀羅'], 'at': 'same'}
SHA = {'star': ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'], 'at': 'same'}
FUZUO = {'star': ['左輔', '右弼'], 'at': 'sifang'}
KUIYUE = {'star': ['天魁', '天鉞'], 'at': 'sifang'}
CHANGQU = {'star': ['文昌', '文曲'], 'at': 'same'}
GOODHUA = {'hua': ['祿', '權', '科'], 'at': 'same'}
GOOD = {'any': [GOODHUA, FUZUO, KUIYUE]}
LU = {'any': [{'hua': '祿', 'at': 'sifang'}, {'star': '祿存', 'at': 'sifang'}]}
def H(hua, star, at='same'): return {'hua': hua, 'star': star, 'at': at}
def R(id, when, text, en, src, quote, role='refine'):
    return {'id': id, 'when': when, 'text': text, 'en': en, 'src': src, 'quote': quote, 'role': role}

# ── 宮位連動（2026-10-12）：排最前，見 branch.ts palaceState() ──
def PS(name, st): return {'palace': name, 'is': st}
T.append({'id': '僕役連動', 'stars': [], 'link': True, 'rules': [
 R('僕役.連動.僕強命弱', {'all': [PS('僕役', 'good'), PS('命宮', 'bad')]},
   '你的僕役宮星曜強，命宮卻弱：容易反被下屬或晚輩壓過。',
   'Your Friends Palace is strong while your Life Palace is weak: staff or juniors can end up getting the better of you.',
   '交友宫星曜性质，固可显示相交关系，但星曜组合太强，而命宫星曜则弱，却又主受卑辈欺负。', '而命宫星曜则弱，却又主受卑辈欺负', 'limit'),
 R('僕役.連動.命強僕弱', {'all': [PS('命宮', 'good'), PS('僕役', 'bad')]},
   '你的命宮星曜強，僕役宮卻弱：下屬晚輩幫不上忙，凡事仍要親力親為。',
   'Your Life Palace is strong while your Friends Palace is weak: staff and juniors are little help, so you still have to do things yourself.',
   '若命宫星曜太强，交友宫星曜过弱，却主卑辈无助力，凡事仍需亲力亲为。', '凡事仍需亲力亲为', 'limit'),
]})

# ── 紫微 ──
T.append({'id': '紫微破軍.僕役', 'stars': ['紫微', '破軍'], 'rules': [
 R('僕役.紫破.輔佐', {'any': [FUZUO, KUIYUE]},
   '紫微破軍見〔輔佐吉星〕，得力的下屬容易另謀發展，所以你常覺得助力不足。',
   'Zi Wei with Po Jun and 〔helper stars〕: capable staff tend to move on, so you often feel short of help.',
   '『紫微破军』见辅佐诸吉，主得力下属易另谋发展，故自己反而时时感到助力不足。', '主得力下属易另谋发展'),
 R('僕役.紫破.煞', SHA,
   '紫微破軍見〔煞〕，你容易受朋友或下屬拖累。',
   'Zi Wei with Po Jun and 〔harsh stars〕: friends or staff can drag you down.',
   '『紫微破军』有煞，主受友人或下属拖累。', '主受友人或下属拖累', 'limit'),
]})
T.append({'id': '紫微天府.僕役', 'stars': ['紫微', '天府'], 'rules': [
 R('僕役.紫府.本', None,
   '紫微天府在僕役宮，你的朋友誠樸，也肯直言規勸。',
   'With Zi Wei and Tian Fu in your Friends Palace, your friends are honest and plain-spoken, and will tell you hard truths.',
   '『紫微天府』在交友宫，得友诚朴，亦能直谏。', '得友诚朴，亦能直谏', 'base'),
]})
T.append({'id': '紫微貪狼.僕役', 'stars': ['紫微', '貪狼'], 'rules': [
 R('僕役.紫貪.火鈴', FIRE,
   '同宮有火星或鈴星，你的僱傭或合作關係不能持久。',
   'With Huo Xing or Ling Xing in the palace, working or partnership arrangements do not last.',
   '[紫微贪狼]躔火、铃，雇佣关系或合作关系不能持久。', '雇佣关系或合作关系不能持久', 'limit'),
]})
T.append({'id': '紫微天相.僕役', 'stars': ['紫微', '天相'], 'rules': [
 R('僕役.紫相.本', None,
   '紫微天相在僕役宮不算吉：除非夫妻一起發展事業，否則下屬終難依靠。',
   'Zi Wei with Tian Xiang in your Friends Palace is not a happy structure: unless you build the business together with your spouse, staff are hard to rely on.',
   '『紫相』在交友宫为不吉结构，除非夫妻合作发展共同事业，否则下属终难依靠。', '否则下属终难依靠', 'base'),
]})
T.append({'id': '紫微七殺.僕役', 'stars': ['紫微', '七殺'], 'rules': [
 R('僕役.紫殺.吉', GOOD,
   '紫微七殺見〔吉〕，可以結交令你敬畏、肯直言的朋友。',
   'Zi Wei with Qi Sha and 〔good signs〕: you make friends you respect and who speak frankly.',
   '[紫杀]在交友宫，权力太重。见吉，主可结交畏友、诤友。', '主可结交畏友、诤友'),
]})
T.append({'id': '紫微子午.僕役', 'stars': ['紫微'], 'branch': ['子', '午'], 'rules': [
 R('僕役.紫微子午.輔佐', {'any': [FUZUO, KUIYUE]},
   '紫微見〔輔佐吉星〕，下屬忠誠可靠，但要防權力轉移。',
   'Zi Wei with 〔helper stars〕: your staff are loyal and reliable, but watch that power does not slip to them.',
   '紫微独坐子午，有辅佐吉曜同会，下属虽忠诚可靠，唯亦防权力转移。', '下属虽忠诚可靠，唯亦防权力转移'),
]})
T.append({'id': '紫微.僕役', 'stars': ['紫微'], 'rules': [
 R('僕役.紫微.煞', {'any': [SHA, {'hua': '忌', 'at': 'same'}]},
   '紫微見〔煞忌〕，你的下屬強硬而不得力，不服指揮。',
   'Zi Wei meets 〔harsh stars or Hindrance〕: the people under you are stubborn and unhelpful, and resist direction.',
   '紫微守交友宫，不喜见煞忌刑耗，主下属强顽而且不得力，甚至以怨报德；', '主下属强顽而且不得力', 'limit'),
 R('僕役.紫微.朝拱', {'all': [{'all': [FUZUO, KUIYUE]}, {'not': {'star': '破軍', 'at': 'same'}}]},
   '紫微得眾星拱照，下屬權威太大，容易把你架空。',
   'Zi Wei surrounded by helpers: your staff gain too much authority and can sideline you.',
   '但若见[百官朝拱]过分完美者，则又主下属权威太甚，容易将自己架空。', '容易将自己架空', 'limit'),
]})

# ── 天機 ──
T.append({'id': '天機巨門.僕役', 'stars': ['天機', '巨門'], 'rules': [
 R('僕役.機巨.本', None,
   '天機巨門在僕役宮，即使不見煞，也容易與朋友下屬發生誤會；宜保持君子之交，也不宜太親近下屬。',
   'With Tian Ji and Ju Men in your Friends Palace, misunderstandings with friends and staff come easily even without harsh stars; keep things gentlemanly, and do not get too close to staff.',
   '天机与巨门的组合，即使不见煞忌，亦主易跟下属或友人发生误会。所谓[天机巨门]交人，始善终恶。若更化忌，则纠纷更大。事端须视煞忌刑耗会合程度而定。故凡天机同拱巨门，须保持『君子之交淡如水』。亦不宜亲下属，以免反目。', '亦主易跟下属或友人发生误会', 'base'),
]})
T.append({'id': '天機天梁.僕役', 'stars': ['天機', '天梁'], 'rules': [
 R('僕役.機梁.吉', GOOD,
   '天機天梁見〔吉〕，可得年長可靠的朋友，或年長得力的親信。',
   'Tian Ji with Tian Liang and 〔good signs〕: you gain older, dependable friends, or a capable senior right hand.',
   '天机天梁见吉曜，亦主得年长可靠之友，或年长得力的亲信。', '亦主得年长可靠之友'),
]})
T.append({'id': '天機太陰.僕役', 'stars': ['天機', '太陰'], 'rules': [
 R('僕役.機陰.本', None,
   '天機太陰在僕役宮，你和朋友、下屬的關係不穩定。',
   'With Tian Ji and Tai Yin in your Friends Palace, relations with friends and staff are unsettled.',
   '寅申[天机太阴]及巳亥天机为太阴对拱，均主关系不稳定。', '均主关系不稳定', 'base'),
 R('僕役.機陰.陰祿', {'all': [H('祿', '太陰'), GOOD]},
   '太陰化祿又見〔吉〕，你會因朋友或下屬得財。',
   'Tai Yin in Abundance with 〔good signs〕: friends or staff bring you money.',
   '天机太阴而太阴入庙，化禄者，更见吉曜，主因友或下属得财。', '主因友或下属得财'),
]})
T.append({'id': '天機.僕役', 'stars': ['天機'], 'rules': [
 R('僕役.天機.忌', H('忌', '天機'),
   '天機化忌，你和身邊的朋友、下屬各懷機心，不易交心。',
   'Tian Ji in Hindrance: you and your friends or staff each keep your own agenda, and trust is hard to build.',
   '天机化忌，主彼此各怀机一己。更见煞，则更主受友人或下属造谣诽谤、背面是非。', '主彼此各怀机一己', 'limit'),
 R('僕役.天機.祿', {'all': [H('祿', '天機'), {'not': {'hua': '忌', 'at': 'sifang'}}]},
   '天機化祿，你交友雖不固定，卻時時得到助力。',
   'Tian Ji in Abundance: friends come and go, but there is always help.',
   '天机化禄，不逢化忌，虽主交友不常但却时时能得助力。', '但却时时能得助力'),
 R('僕役.天機.權', H('權', '天機'),
   '天機化權，你與朋友、下屬的關係較穩定。',
   'Tian Ji in Authority: relations with friends and staff are steadier.',
   '天机化权者，关系较稳定。与下属关系亦如是。', '天机化权者，关系较稳定'),
 R('僕役.天機.本', None,
   '天機在僕役宮，結識各方面的朋友，但也時時更換。',
   'With Tian Ji in your Friends Palace, you meet people from every walk of life, but they keep changing.',
   '一机在交友宫，主结识各方面的朋友，但亦时时更换。', '主结识各方面的朋友，但亦时时更换', 'base'),
]})

# ── 太陽 ──
T.append({'id': '太陽天梁.僕役', 'stars': ['太陽', '天梁'], 'rules': [
 R('僕役.陽梁.吉', {'all': [{'any': [H('權', '天梁'), H('科', '天梁')]}, {'not': SHA}]},
   '天梁化權化科而無煞，可以結交令你敬畏的諍友，或有正直敢言的下屬。',
   'Tian Liang in Authority or Merit with no harsh stars: you make friends who keep you honest, or have upright, outspoken staff.',
   '太阳天梁的组合，若太阳入庙，或天梁化权，化科，不见煞，则主得交畏友，或诤谏之友，或正直敢言下属。', '或正直敢言下属'),
 R('僕役.陽梁.孤', None,
   '太陽天梁較孤立，你要多花心思經營人際關係。',
   'Tai Yang with Tian Liang tends to stand alone, so put real effort into your relationships.',
   '唯太阳天梁较孤立，故宜注意及人际关系，务求藉人事补救。', '唯太阳天梁较孤立', 'base'),
]})
T.append({'id': '太陽巨門.僕役', 'stars': ['太陽', '巨門'], 'rules': [
 R('僕役.陽巨.吉', {'hua': ['祿', '權'], 'star': ['太陽', '巨門'], 'at': 'same'},
   '太陽巨門化權化祿，可以結交外國朋友，並從中得益。',
   'Tai Yang with Ju Men in Authority or Abundance: you make friends from abroad and benefit from them.',
   '太阳巨门化权禄，则主得交异族友人，且可受益。', '则主得交异族友人，且可受益'),
 R('僕役.陽巨.本', None,
   '太陽巨門在僕役宮，你的人際即使不見煞忌，也多口舌。',
   'With Tai Yang and Ju Men in your Friends Palace, there is a lot of talk and dispute even without harsh stars.',
   '太阳巨门的组合，即不见煞忌，已主口舌。', '太阳巨门的组合，即不见煞忌，已主口舌', 'base'),
]})
T.append({'id': '太陽太陰.僕役', 'stars': ['太陽', '太陰'], 'rules': [
 R('僕役.陰陽.輔佐', {'all': [{'any': [{'star': ['左輔', '右弼', '文昌', '文曲'], 'at': 'same'}, {'jia': ['左輔', '右弼']}, {'jia': ['文昌', '文曲']}]}, {'not': SHA}]},
   '太陽太陰見〔輔佐吉星〕，你不但交遊廣闊，下屬也眾多。',
   'Tai Yang–Tai Yin meets 〔helper stars〕: a wide circle, and plenty of staff.',
   '太阴太阳居交友宫、，见左辅右弼、文昌文曲同度，或相夹，不特交游广阔，且主下属众多。', '不特交游广阔，且主下属众多'),
 R('僕役.陰陽.本', {'not': {'any': [{'star': ['左輔', '右弼', '文昌', '文曲'], 'at': 'same'}, {'jia': ['左輔', '右弼']}, {'jia': ['文昌', '文曲']}]}},
   '太陽太陰同在僕役宮，你交遊廣闊，認識的人多。',
   'With Tai Yang and Tai Yin together in your Friends Palace, your circle is wide and you know many people.',
   '(唯在丑宫，[太阴太阳]同度，仍主交游广阔。这是由于太阴的缘故。)', '仍主交游广阔', 'base'),
]})
T.append({'id': '太陽.僕役', 'stars': ['太陽'], 'rules': [
 R('僕役.太陽.廟', {'all': [{'bright': 'high', 'star': '太陽'}, {'not': {'star': '太陰', 'at': 'same'}}]},
   '太陽光熱充足，你交遊廣闊，認識的人多。',
   'Tai Yang shines strongly: your circle is wide and you know many people.',
   '太阳虽主动，但唯入庙然后始主交游广阔；', '但唯入庙然后始主交游广阔'),
 R('僕役.太陽.陷', {'all': [{'bright': 'low', 'star': '太陽'}, {'not': {'star': '太陰', 'at': 'same'}}, {'not': {'hua': '祿', 'star': '太陽', 'at': 'same'}}]},
   '太陽光熱不足，你相識的人不多，也談不上深交；對朋友、下屬施恩，往往得不到回報。',
   'Tai Yang shines weakly: you know few people well, and kindness to friends or staff often goes unrewarded.',
   '若落陷地，则相识者固不多，亦谈不上交情(唯在丑宫，[太阴太阳]同度，仍主交游广阔。这是由于太阴的缘故。)太阳居交友宫，落陷，即使不见煞忌，亦主施恩无功，', '亦主施恩无功'),
 R('僕役.太陽.火鈴', FIRE,
   '太陽與火星或鈴星同宮，你和朋友之間多爭執。',
   'Tai Yang with Huo Xing or Ling Xing: there is a good deal of arguing among your friends.',
   '与火铃同度，主多争。', '与火铃同度，主多争'),
 R('僕役.太陽.朝拱', {'all': [FUZUO, KUIYUE]},
   '太陽得眾星拱照，你可以結交有地位的朋友。',
   'Tai Yang is surrounded by helper stars: you can make friends with people of standing.',
   '太阳守交友宫，见辅佐诸曜，及百官朝拱，命宫星曜有力者，主得交贵友。', '主得交贵友'),
 R('僕役.太陽.祿', H('祿', '太陽'),
   '太陽化祿，你的朋友圈廣，來往的人來自各方。',
   'Tai Yang in Abundance: your circle is wide, with people from all directions.',
   '化禄，主交游广；化权，主关系易稳定；化科，主多泛泛之交。', '化禄，主交游广'),
 R('僕役.太陽.權', H('權', '太陽'),
   '太陽化權，你和朋友、下屬的關係容易穩定下來。',
   'Tai Yang in Authority: your ties with friends and staff settle easily.',
   '化禄，主交游广；化权，主关系易稳定；化科，主多泛泛之交。', '化权，主关系易稳定'),
 R('僕役.太陽.羊陀', YANGTUO,
   '同宮有擎羊或陀羅，你和朋友之間多是非，或受牽累。',
   'With Qing Yang or Tuo Luo in the palace, friends bring talk or trouble.',
   '太阳与擎羊同度，增加是非；与陀罗同度，主受累；', '太阳与擎羊同度，增加是非', 'limit'),
]})

# ── 武曲 ──
T.append({'id': '武曲天府.僕役', 'stars': ['武曲', '天府'], 'rules': [
 R('僕役.武府.本', {'all': [{'hua': '祿', 'at': 'sifang'}, {'not': {'star': '祿存', 'at': 'same'}}, GOOD]},
   '武曲天府見祿又見〔吉星〕，交遊廣闊，朋友多有助力。',
   'Wu Qu with Tian Fu, Lu and 〔helpful stars〕: a wide circle, with friends who really help.',
   '仅于[武曲天府]同度，见禄(亦不宜禄存同度)，又见吉曜的情形下，始主交游广阔，且多助力。', '始主交游广阔，且多助力'),
]})
T.append({'id': '武曲貪狼.僕役', 'stars': ['武曲', '貪狼'], 'rules': [
 R('僕役.武貪.火鈴', FIRE,
   '同宮有火星或鈴星，你的交遊先熱後冷。',
   'With Huo Xing or Ling Xing in the palace, friendships start hot and cool off.',
   '[武曲贪狼]与火铃同度，主交游始热终冷，甚且凶终隙末。', '主交游始热终冷', 'limit'),
 R('僕役.武貪.本', None,
   '武曲貪狼在僕役宮，你多是飲食應酬的朋友。',
   'With Wu Qu and Tan Lang in your Friends Palace, many of your friends are dining-and-socialising companions.',
   '[武曲贪狼]，多饮食征逐之友。', '[武曲贪狼]，多饮食征逐之友', 'base'),
]})
T.append({'id': '武曲七殺.僕役', 'stars': ['武曲', '七殺'], 'rules': [
 R('僕役.武殺.廉祿', H('祿', '廉貞', 'sifang'),
   '會廉貞化祿，你得到助力，只是不持久。',
   'Meeting Lian Zhen in Abundance: you get help, though it does not last.',
   '[武曲七杀]见廉贞化禄，主得助力，唯不持久。', '主得助力，唯不持久'),
]})
T.append({'id': '武曲.僕役', 'stars': ['武曲'], 'rules': [
 R('僕役.武曲.祿輔', {'all': [H('祿', '武曲'), FUZUO]},
   '武曲化祿又見左輔右弼，你的下屬得力。',
   'Wu Qu in Abundance with Zuo Fu or You Bi: your staff are capable.',
   '武曲化禄于交友宫，须见左辅、右弼，然后始主下属得力，若无辅弼，则主为友人或下属奔波伤神。', '然后始主下属得力'),
 R('僕役.武曲.祿無輔', {'all': [H('祿', '武曲'), {'not': FUZUO}]},
   '武曲化祿而不見左輔右弼，要為朋友或下屬奔波傷神。',
   'Wu Qu in Abundance without Zuo Fu or You Bi: you wear yourself out running around for friends and staff.',
   '武曲化禄于交友宫，须见左辅、右弼，然后始主下属得力，若无辅弼，则主为友人或下属奔波伤神。', '则主为友人或下属奔波伤神', 'limit'),
 R('僕役.武曲.忌', H('忌', '武曲'),
   '武曲化忌，你容易受下屬或朋友拖累而有損失。',
   'Wu Qu in Hindrance: staff or friends can cost you.',
   '若武曲化忌，则主受下属侵吞，友人剥削，或因友人下属拖累而招致损失。', '或因友人下属拖累而招致损失', 'limit'),
 R('僕役.武曲.本', {'not': {'star': '天府', 'at': ['same', 'opp']}},
   '武曲在僕役宮，你基本上交遊不廣，下屬也無力。',
   'With Wu Qu in your Friends Palace, your circle is small and staff are not much help.',
   '凡武曲坐交友宫，基本性质不利。主交游不广，下属无力。', '主交游不广，下属无力', 'base'),
]})

# ── 天同 ──
T.append({'id': '天同巨門.僕役', 'stars': ['天同', '巨門'], 'rules': [
 R('僕役.同巨.本', None,
   '天同巨門在僕役宮，你和人即使不見煞，也容易生誤會。',
   'With Tian Tong and Ju Men in your Friends Palace, misunderstandings arise even without harsh stars.',
   '天同巨门的组合，即不见煞，亦主易生误会；', '即不见煞，亦主易生误会', 'base'),
]})
T.append({'id': '天同天梁.僕役', 'stars': ['天同', '天梁'], 'rules': [
 R('僕役.同梁.本', None,
   '天同天梁在僕役宮，可得肯直言的朋友，多是年長的；也有可靠的下屬。',
   'With Tian Tong and Tian Liang in your Friends Palace, you have friends who speak frankly, often older ones, and reliable staff.',
   '天同与天梁的组合，主得诤友。天梁化科者尤佳。唯一般情况下，主其人年长。亦主得可靠之下属，或主年长。', '亦主得可靠之下属', 'base'),
]})
T.append({'id': '天同.僕役', 'stars': ['天同'], 'rules': [
 R('僕役.天同.祿', H('祿', '天同'),
   '天同化祿，你交到的多是益友，對你有幫助。',
   'Tian Tong in Abundance: the friends you make are mostly good for you and a real help.',
   '天同化禄，交游得益友', '天同化禄，交游得益友'),
 R('僕役.天同.羊陀', YANGTUO,
   '同宮有擎羊或陀羅，你中年以後得益友，助力不少。',
   'With Qing Yang or Tuo Luo in the palace, good friends come after midlife, and help a lot.',
   '天同与羊陀同度，中年以后得益友，助力不少。', '中年以后得益友，助力不少'),
 R('僕役.天同.本', {'not': {'star': '巨門', 'at': 'same'}},
   '天同在僕役宮，隨和重情，容易結交朋友，與下屬的關係也好。',
   'With Tian Tong in your Friends Palace, you are easy-going and warm, make friends readily, and get on well with staff.',
   '天同在交友宫，主交游广阔，盖天同带感情而且随和，故易结交朋友，与下属关系亦佳。', '故易结交朋友，与下属关系亦佳', 'base'),
]})

# ── 廉貞 ──
T.append({'id': '廉貞破軍.僕役', 'stars': ['廉貞', '破軍'], 'rules': [
 R('僕役.廉破.破祿', H('祿', '破軍'),
   '破軍化祿，透過朋友結識有助力的人；下屬也能替你解決重大困難。',
   'Po Jun in Abundance: friends introduce you to useful people, and staff can solve big problems for you.',
   '若[廉贞破军]而破军化禄，则主因友人而得结识有助力人士，亦主下属能为自己解决重大困难。', '亦主下属能为自己解决重大困难'),
]})
T.append({'id': '廉貞.僕役', 'stars': ['廉貞'], 'rules': [
 R('僕役.廉貞.吉', GOOD,
   '廉貞見〔吉〕，你交遊廣闊，下屬眾多而且有助力。',
   'Lian Zhen with 〔good signs〕: a wide circle, and plenty of capable staff.',
   '廉贞与吉曜同会，则交游广阔，下属众多，且有助力。若廉贞化禄，更主得益。', '则交游广阔，下属众多，且有助力'),
 R('僕役.廉貞.空劫', KONG,
   '同宮有地空地劫，你的友情容易決裂，下屬也會背離。',
   'With Di Kong or Di Jie in the palace, friendships can break suddenly, and staff may walk away.',
   '廉贞与空劫同度，主感情易决裂。亦主下属背弃叛离。', '主感情易决裂', 'limit'),
 R('僕役.廉貞.本', None,
   '廉貞在僕役宮，交遊廣闊；只是帶的感情較表面，深交不多。',
   'With Lian Zhen in your Friends Palace, your circle is wide, though the feeling is often surface-deep and close bonds are few.',
   '尤须注意者，为廉贞所带的感情，往往较表面，故不多深交。', '故不多深交', 'base'),
]})

# ── 天府 ──
T.append({'id': '天府.僕役', 'stars': ['天府'], 'rules': [
 R('僕役.天府.本', {'not': {'any': [SHA, {'hua': '忌', 'at': 'same'}]}},
   '天府在僕役宮，你擇友謹慎，所以多交益友。',
   'With Tian Fu in your Friends Palace, you choose friends carefully, so most of them are good for you.',
   '天府守交友宫，主择交谨慎，。故多交益友。', '主择交谨慎', 'base'),
 R('僕役.天府.輔佐', {'any': [FUZUO, KUIYUE]},
   '天府見〔輔佐吉星〕，你可以得到知交，下屬也得力。',
   'Tian Fu meets 〔helper stars〕: you find true friends, and your staff are capable.',
   '辅弼，然后邕主可得知交，且主下属得力。', '且主下属得力'),
 R('僕役.天府.空劫', KONG,
   '天府與地空地劫同宮，你容易交上損友而破耗。',
   'Tian Fu with Di Kong or Di Jie: you can fall in with friends who cost you.',
   '天府与空劫刑耗同会，则主交损友以致破耗，及主手下人偷盗侵吞。', '则主交损友以致破耗'),
 R('僕役.天府.科', H('科', '天府'),
   '天府化科，你的朋友和下屬都忠厚誠信。',
   'Tian Fu in Merit: friends and staff alike are honest and trustworthy.',
   '天府化科，则友人及下属皆忠厚诚信。', '则友人及下属皆忠厚诚信'),
]})

# ── 貪狼 ──
T.append({'id': '貪狼.僕役', 'stars': ['貪狼'], 'rules': [
 R('僕役.貪狼.對星', {'any': [{'all': [{'star': '左輔', 'at': 'sifang'}, {'star': '右弼', 'at': 'sifang'}]}, {'all': [{'star': '天魁', 'at': 'sifang'}, {'star': '天鉞', 'at': 'sifang'}]}]},
   '貪狼見〔成對的輔佐星〕，你的朋友和下屬眾多。',
   'Tan Lang with 〔helper stars in matched pairs〕: many friends and staff.',
   '见辅佐诸曜皆为对星者，主友人及下属众多。', '主友人及下属众多'),
 R('僕役.貪狼.本', None,
   '貪狼主應酬，在僕役宮，你多場面上的朋友。',
   'Tan Lang is about socialising: in your Friends Palace it brings many acquaintances for show.',
   '贪狼主应酬，居交友宫，基本性质已多场面上的朋友，必须见吉化吉曜，然后始主有益，及主得下属众多。否则仅为泛泛之交。', '基本性质已多场面上的朋友', 'base'),
]})

# ── 巨門 ──
T.append({'id': '巨門.僕役', 'stars': ['巨門'], 'rules': [
 R('僕役.巨門.吉', {'all': [{'hua': ['祿', '權'], 'star': '巨門', 'at': 'same'}, {'any': [FUZUO, KUIYUE]}]},
   '巨門〔吉化〕，又見〔輔佐吉星〕，你可得能言善辯的朋友或下屬助你創業；彼此多討論辯論，事業由此而興。',
   'Ju Men with 〔good transformations〕 and 〔helper stars〕: articulate friends or staff help you build a business, and your discussions together drive it forward.',
   '故巨门化禄，或禄存同度，或化权星，又会辅佐吉曜，则主得能言善辩之友，可助自己创业；或得下属亦如是。又或与友人下属多辩论、讨论，由是创兴事业。', '可助自己创业'),
 R('僕役.巨門.吉口', {'all': [GOOD, {'not': {'any': [SHA, {'hua': '忌', 'at': 'same'}]}}]},
   '巨門見〔吉〕，你身邊的朋友、下屬口才好、能言善辯。',
   'Ju Men meets 〔good signs〕: the friends and staff around you are articulate and good at argument.',
   '凡巨门坐交友宫，吉则主舌辩、口才；凶则主口舌、争吵。', '吉则主舌辩、口才'),
 R('僕役.巨門.凶口', {'any': [SHA, {'hua': '忌', 'at': 'same'}]},
   '巨門見〔煞忌〕，你和朋友、下屬之間多口舌爭吵。',
   'Ju Men meets 〔harsh stars or Hindrance〕: there is much arguing between you and your friends or staff.',
   '凡巨门坐交友宫，吉则主舌辩、口才；凶则主口舌、争吵。', '凶则主口舌、争吵'),
]})

# ── 天相 ──
T.append({'id': '天相.僕役', 'stars': ['天相'], 'rules': [
 R('僕役.天相.調和', {'any': [FUZUO, LU]},
   '天相見左輔右弼或見祿，你和朋友、下屬的關係得以調和。',
   'Tian Xiang with Zuo Fu, You Bi or Lu: these relationships find their balance.',
   '凡天相坐交友宫，必与破军相对，故本质上已有反复的性质，必须见左辅、右弼，或见禄，然辱始可调和。', '必须见左辅、右弼，或见禄'),
 R('僕役.天相.本', None,
   '天相在僕役宮必對破軍，你的人際關係本質上有反覆。',
   'Tian Xiang in your Friends Palace always faces Po Jun, so relationships tend to swing back and forth.',
   '凡天相坐交友宫，必与破军相对，故本质上已有反复的性质，', '故本质上已有反复的性质', 'base'),
]})

# ── 天梁 ──
T.append({'id': '天梁.僕役', 'stars': ['天梁'], 'rules': [
 R('僕役.天梁.輔佐', {'any': [FUZUO, KUIYUE]},
   '天梁見〔輔佐吉星〕，你交遊廣闊，下屬眾多。',
   'Tian Liang meets 〔helper stars〕: your circle is wide and your staff are many.',
   '天梁为孤克之星，除非见辅佐吉曜，否则不主交游广阔，下属众多。', '除非见辅佐吉曜'),
 R('僕役.天梁.祿', {'any': [H('祿', '天梁'), {'star': '祿存', 'at': 'same'}]},
   '天梁化祿或與祿存同宮，你的朋友、下屬容易有私心。',
   'Tian Liang in Abundance or with Lu Cun: your friends and staff tend to look after themselves.',
   '天梁化禄，或禄存同度，则主友人、下属有利私之心。', '则主友人、下属有利私之心'),
 R('僕役.天梁.煞', {'star': ['擎羊', '陀羅', '火星', '鈴星'], 'at': 'sifang'},
   '天梁會到〔煞星〕，你容易因朋友或下屬生出是非糾紛。',
   'Tian Liang meets 〔harsh stars〕: friends or staff bring arguments and disputes.',
   '天梁与四煞会照，因友人或下属而起是非纠纷；', '因友人或下属而起是非纠纷'),
 R('僕役.天梁.吉', {'any': [H('權', '天梁'), H('科', '天梁')]},
   '天梁化權化科，結交到正直無私、有義氣的朋友和下屬。',
   'Tian Liang in Authority or Merit: you attract upright, selfless and loyal friends and staff.',
   '除非化权、化科，或与吉化会合，否则不主有助力，及招正直无私有义的友人及下属。', '及招正直无私有义的友人及下属'),
 R('僕役.天梁.馬', {'star': '天馬', 'at': 'same'},
   '同宮有天馬，你的知交容易離散，也常換手下。',
   'With Tian Ma in the palace, close friends drift away and staff keep changing.',
   '天梁天马同度，知交易散，亦主时时更换手下。故自身亦多奔忙。', '知交易散，亦主时时更换手下', 'limit'),
 R('僕役.天梁.本', {'not': {'any': [FUZUO, KUIYUE]}},
   '天梁是孤剋之星，不見輔佐吉星，交遊不廣，下屬也不多。',
   'Tian Liang is a loner star: without helper stars your circle is small and you have few staff.',
   '天梁为孤克之星，除非见辅佐吉曜，否则不主交游广阔，下属众多。', '天梁为孤克之星', 'base'),
]})

# ── 七殺 ──
T.append({'id': '七殺.僕役', 'stars': ['七殺'], 'rules': [
 R('僕役.七殺.本', None,
   '七殺在僕役宮，多落落寡合，不宜與人合作事業，也不宜聽信讒言。',
   'With Qi Sha in your Friends Palace, you tend to keep apart; avoid business partnerships, and do not listen to gossip.',
   '凡七杀在交友宫，多落落寡合，故不宜与人合作事业。亦不宜听信谗言。', '故不宜与人合作事业', 'base'),
]})

# ── 破軍 ──
T.append({'id': '破軍辰戌.僕役', 'stars': ['破軍'], 'branch': ['辰', '戌'], 'rules': [
 R('僕役.破軍辰戌.益友', None,
   '對宮紫微天相，可以結交令你敬畏的益友，也有老成持重的下屬。',
   'With Zi Wei and Tian Xiang opposite, you make friends you respect and learn from, and have steady, mature staff.',
   '辰戌宫破军，对[紫微天相]，主得交畏友及益友，亦主得老成持重之下属。', '主得交畏友及益友'),
]})
T.append({'id': '破軍.僕役', 'stars': ['破軍'], 'rules': [
 R('僕役.破軍.輔佐', {'all': [{'all': [{'star': ['左輔', '右弼', '天魁', '天鉞'], 'at': 'same'}, {'not': SHA}]}, {'not': {'star': '紫微', 'at': 'same'}}]},
   '同宮有〔輔佐吉星〕，你才得到朋友或下屬的助力。',
   'With 〔helper stars〕 in the palace, friends or staff do help you.',
   '破军独坐交友宫者，主孤立。见辅佐吉曜同度，然后始得友人或下属之助力。', '然后始得友人或下属之助力'),
 R('僕役.破軍.本', {'alone': True},
   '破軍獨坐僕役宮，你在朋友和下屬之中較為孤立。',
   'With Po Jun alone in your Friends Palace, you stand somewhat apart among friends and staff.',
   '破军独坐交友宫者，主孤立。', '破军独坐交友宫者，主孤立', 'base'),
]})

# ── 唔限主星（通則，排最後） ──
T.append({'id': '太陰.僕役', 'stars': ['太陰'], 'rules': [
 R('僕役.太陰.祿', {'all': [H('祿', '太陰'), {'not': {'star': '天機', 'at': 'same'}}]},
   '太陰化祿，你因朋友的助力或下屬的扶持而進財。',
   'Tai Yin in Abundance: money comes to you through friends’ help or your staff’s support.',
   '太阴化禄，主因友人助力，或下属匡扶而进财；', '主因友人助力'),
 R('僕役.太陰.權', H('權', '太陰'),
   '太陰化權，你在財權方面從朋友、下屬那裡得益。',
   'Tai Yin in Authority: friends and staff help you where control of money is concerned.',
   '化权，则主在财权方面得益；', '则主在财权方面得益'),
 R('僕役.太陰.科', H('科', '太陰'),
   '太陰化科，你得到忠誠可靠的朋友或下屬。',
   'Tai Yin in Merit: you gain loyal, dependable friends or staff.',
   '化科，主得忠诚可靠之友人贫下属。', '主得忠诚可靠之友人'),
 R('僕役.太陰.忌', H('忌', '太陰'),
   '太陰化忌，你容易受朋友牽連而破財，或受影響去投資而損失。',
   'Tai Yin in Hindrance: friends can drag you into losses, or talk you into investments that go wrong.',
   '若化忌星，则主受牵连而破财，亦主受友人影响而投资损失，或主下属破耗。', '则主受牵连而破财'),
 R('僕役.太陰.奔忙', {'any': [FIRE, {'star': '祿存', 'at': 'same'}]},
   '太陰與火星、鈴星或祿存同宮，你常為朋友或下屬的事奔忙。',
   'Tai Yin with Huo Xing, Ling Xing or Lu Cun: you are often busy running about for friends or staff.',
   '太阴与火铃同度，或与禄存同度，皆主为友人或下属之事而奔忙。', '皆主为友人或下属之事而奔忙'),
 R('僕役.太陰.吉煞', {'all': [GOOD, SHA]},
   '太陰見〔吉〕又見〔煞〕，你得力的下屬常常更換，友誼也難長久。',
   'Tai Yin meets 〔good signs〕 but also 〔harsh stars〕: capable staff come and go, and friendships rarely last.',
   '太阴见吉化、吉曜，但又同时见煞，则主时时更换得力下属，与友人之友谊亦难耐久。', '则主时时更换得力下属'),
]})
T.append({'id': '僕役通則', 'stars': [], 'rules': [
 R('僕役.通則.祿存', {'star': '祿存', 'at': 'same'},
   '僕役宮有祿存，羊陀必照命宮，一般主你為人奔波。',
   'Lu Cun in the Friends Palace means Qing Yang and Tuo Luo fall on your Life Palace: you generally run about for others.',
   '盖凡交友宫育禄存，则擎羊陀罗必照射命宫，故一般而言，主人奔波。', '故一般而言，主人奔波'),
]})
