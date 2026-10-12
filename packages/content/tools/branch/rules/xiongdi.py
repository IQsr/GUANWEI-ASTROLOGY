# 兄弟宮規則（2026-10-12）。原書兄弟宮兼論朋友、同事、合作夥伴。
# 題目次序 = 合併輸出次序：組合／地支題目行先，單星通則其次。
FIRE = {'star': ['火星', '鈴星'], 'at': 'same'}
KONG = {'star': ['地空', '地劫'], 'at': 'same'}
SHA = {'star': ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'], 'at': 'same'}
FUZUO = {'star': ['左輔', '右弼'], 'at': 'sifang'}
KUIYUE = {'star': ['天魁', '天鉞'], 'at': 'sifang'}
GOODHUA = {'hua': ['祿', '權', '科'], 'at': 'same'}
GOOD = {'any': [GOODHUA, FUZUO, KUIYUE]}
LU = {'any': [{'hua': '祿', 'at': 'sifang'}, {'star': '祿存', 'at': 'sifang'}]}
LUMA = {'all': [{'star': '天馬', 'at': ['same', 'opp']}, {'any': [{'star': '祿存', 'at': ['same', 'opp']}, {'hua': '祿', 'at': ['same', 'opp']}]}]}
def H(hua, star, at='same'): return {'hua': hua, 'star': star, 'at': at}
def R(id, when, text, en, src, quote, role='refine'):
    return {'id': id, 'when': when, 'text': text, 'en': en, 'src': src, 'quote': quote, 'role': role}

# ── 紫微 ──
T.append({'id': '紫微子午.兄弟', 'stars': ['紫微'], 'branch': ['子', '午'], 'rules': [
 R('兄弟.紫微子午.朝拱', {'all': [FUZUO, KUIYUE]},
   '紫微得眾星拱照，兄姊得力；與人合作共事，要甘心做副手。',
   'Zi Wei surrounded by helpers: your older siblings are a real support; in partnerships, be content to play second fiddle.',
   '子午紫微见[百官朝拱]，则长兄长姐得力。唯必须甘心处于[佐贰]之副手地位。始可与人合作共事，', '唯必须甘心处于[佐贰]之副手地位'),
]})
T.append({'id': '紫微破軍.兄弟', 'stars': ['紫微', '破軍'], 'rules': [
 R('兄弟.紫破.煞', SHA,
   '紫微破軍見煞，同事之間容易結成派系，捲入權力鬥爭。',
   'Zi Wei with Po Jun and harsh stars: colleagues split into factions, and power struggles follow.',
   '将此意义推广，自己与共事的同事关系，亦易成党派，且主政治、权力斗争。见煞曜尤确，见辅佐吉曜则较平和。', '自己与共事的同事关系，亦易成党派', 'limit'),
 R('兄弟.紫破.輔佐', {'all': [{'any': [FUZUO, KUIYUE]}, {'not': SHA}]},
   '紫微破軍見輔佐吉星，同事關係較平和。',
   'Zi Wei with Po Jun and helper stars: relations with colleagues are calmer.',
   '将此意义推广，自己与共事的同事关系，亦易成党派，且主政治、权力斗争。见煞曜尤确，见辅佐吉曜则较平和。', '见辅佐吉曜则较平和'),
]})
T.append({'id': '紫微天府.兄弟', 'stars': ['紫微', '天府'], 'rules': [
 R('兄弟.紫府.本', {'not': SHA},
   '紫微天府在兄弟宮，兄姊得力；合作夥伴、同事之間也一樣。',
   'Zi Wei with Tian Fu in your Siblings Palace: older siblings are a support, and the same goes for partners and colleagues.',
   '寅申宫[紫府]同度，亦主长兄长姐得力；见煞忌刑曜则反受剥削、拖累。亦可将此性质推广至合作伙伴或同事间关系。', '亦主长兄长姐得力', 'base'),
]})
T.append({'id': '紫微貪狼.兄弟', 'stars': ['紫微', '貪狼'], 'rules': [
 R('兄弟.紫貪.吉', GOOD,
   '紫微貪狼多吉星，兄長得力。',
   'Zi Wei with Tan Lang and plenty of helpful stars: your older brother is a support.',
   '卯酉宫[紫贪]多吉曜，亦主兄长得力；', '亦主兄长得力'),
]})
T.append({'id': '紫微天相.兄弟', 'stars': ['紫微', '天相'], 'rules': [
 R('兄弟.紫相.吉', GOOD,
   '紫微天相見吉，兄弟朋友和好，可以合作。',
   'Zi Wei with Tian Xiang and good signs: siblings and friends get on and can work together.',
   '辰戌[紫相]，见吉曜则主和好合作，见凶曜则各怀异见。', '见吉曜则主和好合作'),
 R('兄弟.紫相.煞', {'all': [SHA, {'not': GOOD}]},
   '紫微天相見煞，兄弟朋友各有己見。',
   'Zi Wei with Tian Xiang and harsh stars: siblings and friends each go their own way.',
   '辰戌[紫相]，见吉曜则主和好合作，见凶曜则各怀异见。', '见凶曜则各怀异见', 'limit'),
]})
T.append({'id': '紫微七殺.兄弟', 'stars': ['紫微', '七殺'], 'rules': [
 R('兄弟.紫殺.吉', GOOD,
   '紫微七殺見吉，兄弟有權貴，也可以依附有權勢的朋友。',
   'Zi Wei with Qi Sha and good signs: your siblings are influential, and you can lean on powerful friends.',
   '巳亥宫[紫杀]，见吉则兄弟有权贵，亦主可依附权贵之友人。若见煞，则受欺负。', '亦主可依附权贵之友人'),
]})

# ── 天機 ──
T.append({'id': '天機太陰.兄弟', 'stars': ['天機', '太陰'], 'rules': [
 R('兄弟.機陰.輔佐', {'any': [FUZUO, KUIYUE]},
   '天機太陰見輔佐吉星，一生得兄弟和朋友之力；合作雖不持久，卻常有可用的夥伴。',
   'Tian Ji with Tai Yin and helper stars: siblings and friends help you all your life; partnerships may not last, but there is always someone to work with.',
   '寅申[机阴]见辅佐吉曜，则一生得兄弟及友人之力。与人合作虽不持久，但时时有使用伙伴。', '则一生得兄弟及友人之力'),
 R('兄弟.機陰.祿馬', LUMA,
   '見祿馬交馳，有遠方朋友的助力。',
   'With Lu and Tian Ma meeting, friends far away help you.',
   '若更见禄马交驰，则有远方友人助力。', '则有远方友人助力'),
 R('兄弟.機陰.忌', {'hua': '忌', 'star': ['天機', '太陰'], 'at': 'same'},
   '天機或太陰化忌，兄弟朋友之間容易有權術。',
   'With Tian Ji or Tai Yin in Hindrance, scheming creeps in among siblings and friends.',
   '寅申宫[天机太阴]同度，见化忌，则兄弟朋友间皆易生权术阴谋。', '则兄弟朋友间皆易生权术阴谋', 'limit'),
]})
T.append({'id': '天機巨門.兄弟', 'stars': ['天機', '巨門'], 'rules': [
 R('兄弟.機巨.吉', GOOD,
   '天機巨門見吉，多是短暫的助力，不宜謀求長期合作。',
   'Tian Ji with Ju Men and good signs: help tends to be short-lived, so do not plan long partnerships.',
   '卯酉『天机巨门』守兄弟宫，见煞曜主始善终恶。见吉曜，则多短暂的助力，不宜谋求长期合作关系。', '不宜谋求长期合作关系'),
 R('兄弟.機巨.煞', SHA,
   '天機巨門見煞，朋友關係容易始善終惡。',
   'Tian Ji with Ju Men and harsh stars: friendships that start well tend to end badly.',
   '卯酉『天机巨门』守兄弟宫，见煞曜主始善终恶。', '见煞曜主始善终恶', 'limit'),
]})
T.append({'id': '天機天梁.兄弟', 'stars': ['天機', '天梁'], 'rules': [
 R('兄弟.機梁.諍友', None,
   '天機天梁在兄弟宮，身邊有能言善辯的朋友。',
   'Tian Ji with Tian Liang in your Siblings Palace: you have articulate friends.',
   '辰戌[机梁]主有能言善辩之友，见吉曜则诤谏之友。', '辰戌[机梁]主有能言善辩之友', 'base'),
 R('兄弟.機梁.吉', GOOD,
   '見吉，朋友中有肯直言規勸的諍友。',
   'With good signs, you have friends who will tell you hard truths.',
   '辰戌[机梁]主有能言善辩之友，见吉曜则诤谏之友。', '见吉曜则诤谏之友'),
]})
T.append({'id': '天機巳亥.兄弟', 'stars': ['天機'], 'branch': ['巳', '亥'], 'rules': [
 R('兄弟.天機巳亥.本', None,
   '知心朋友不多；不宜與人合作，容易有權術侵佔一類事。',
   'Close friends are few; partnerships do not suit you, and can bring scheming and grabbing.',
   '巳亥宫天机，不宜与人合作，主有权术侵占之类事端。见吉则多短暂助力。', '巳亥宫天机，不宜与人合作', 'base'),
]})
T.append({'id': '天機子午.兄弟', 'stars': ['天機'], 'branch': ['子', '午'], 'rules': [
 R('兄弟.天機子午.合作', {'not': {'all': [FUZUO, KUIYUE]}},
   '你喜歡與人合作，但除非吉星重重，否則各懷機心，難有好結果。',
   'You like to team up, but unless helper stars abound, everyone has their own agenda and it ends badly.',
   '子午天机，自身常喜与人合作，除非辅佐吉曜重重，否则必各怀机心，凶终隙末。', '否则必各怀机心', 'limit'),
 R('兄弟.天機子午.交友', None,
   '一生交友雖多，卻難得知己。',
   'You make many friends in life, but true confidants are rare.',
   '天机独坐子午见辅佐吉曜多者，亦主兄弟姐妹众多。但一生交友虽多，却难得有知交，或与知交半路分张。', '但一生交友虽多，却难得有知交', 'base'),
]})

# ── 太陽 ──
T.append({'id': '太陽太陰.兄弟', 'stars': ['太陽', '太陰'], 'rules': [
 R('兄弟.陰陽.本', None,
   '太陽太陰同在兄弟宮，一般兄弟朋友眾多。',
   'With Tai Yang and Tai Yin together in your Siblings Palace, you generally have many siblings and friends.',
   '丑未『太阴太阳]同守兄弟宫，一般情形下主兄弟朋友众多。', '一般情形下主兄弟朋友众多', 'base'),
]})
T.append({'id': '太陽巨門.兄弟', 'stars': ['太陽', '巨門'], 'rules': [
 R('兄弟.陽巨.吉', GOOD,
   '太陽巨門見吉，兄弟朋友都有助力，宜發展彼此有聯繫的業務。',
   'Tai Yang with Ju Men and good signs: siblings and friends all help, so build business that links you together.',
   '寅申[太阳巨门]同度，见吉曜则兄弟友人皆有助力，宜发展彼此有联系的业务。', '宜发展彼此有联系的业务'),
 R('兄弟.陽巨.祿權', {'hua': ['祿', '權'], 'star': ['太陽', '巨門'], 'at': 'same'},
   '太陽或巨門化祿化權，受外國朋友提攜。',
   'With Tai Yang or Ju Men in Abundance or Authority, friends from abroad give you a leg up.',
   '寅申[巨阳]化权禄，主受异族友人提携。', '主受异族友人提携'),
]})
T.append({'id': '太陽天梁.兄弟', 'stars': ['太陽', '天梁'], 'rules': [
 R('兄弟.陽梁.輔佐', {'any': [FUZUO, KUIYUE]},
   '太陽天梁見輔佐吉星，有可依靠的兄姊，或得朋友提攜。',
   'Tai Yang with Tian Liang and helper stars: an older sibling you can rely on, or friends who give you a leg up.',
   '见辅佐吉曜，则有可依靠之兄姊，或主得友人提携。', '则有可依靠之兄姊'),
]})
T.append({'id': '太陽巳亥.兄弟', 'stars': ['太陽'], 'branch': ['巳', '亥'], 'rules': [
 R('兄弟.太陽巳亥.廣', None,
   '交友廣闊；坐巳主動結交，坐亥較被動。',
   'You have a wide circle; in Si you reach out, in Hai you let others come to you.',
   '巳亥太阳皆主交友广阔。巳宫者主动；亥宫者被动。', '巳亥太阳皆主交友广阔'),
]})
T.append({'id': '太陽辰戌.兄弟', 'stars': ['太陽'], 'branch': ['辰', '戌'], 'rules': [
 R('兄弟.太陽辰.和', {'branch': ['辰']},
   '太陽坐辰，兄弟多和睦。',
   'With Tai Yang in Chen, siblings get on.',
   '辰戌宫太阳，辰宫者，兄弟多和，戌宫多不和。', '辰宫者，兄弟多和'),
 R('兄弟.太陽戌.不和', {'branch': ['戌']},
   '太陽坐戌，兄弟之間多不和。',
   'With Tai Yang in Xu, siblings often do not get on.',
   '辰戌宫太阳，辰宫者，兄弟多和，戌宫多不和。', '戌宫多不和', 'limit'),
]})

# ── 武曲 ──
T.append({'id': '武曲天府.兄弟', 'stars': ['武曲', '天府'], 'rules': [
 R('兄弟.武府.本', None,
   '武曲天府在兄弟宮，一般不宜與人合作。',
   'With Wu Qu and Tian Fu in your Siblings Palace, partnerships generally do not suit you.',
   '故凡『武府』守兄弟宫，一般不宜与人合作。', '一般不宜与人合作', 'base'),
]})
T.append({'id': '武曲貪狼.兄弟', 'stars': ['武曲', '貪狼'], 'rules': [
 R('兄弟.武貪.吉', GOOD,
   '武曲貪狼見吉，受兄弟朋友蔭庇，但不可爭權。',
   'Wu Qu with Tan Lang and good signs: siblings and friends shelter you, so long as you do not fight for control.',
   '丑未[武贪]，见吉化、吉曜，则可受兄弟友人之益荫，但不可争权。', '但不可争权'),
]})
T.append({'id': '武曲天相.兄弟', 'stars': ['武曲', '天相'], 'rules': [
 R('兄弟.武相.技藝', None,
   '武曲天相在兄弟宮，兄弟朋友可以在技藝上相助。',
   'With Wu Qu and Tian Xiang in your Siblings Palace, siblings and friends can help you with skills and craft.',
   '寅申[武相]又主兄弟或友人可以技艺相助。', '寅申[武相]又主兄弟或友人可以技艺相助', 'base'),
]})
T.append({'id': '武曲七殺.兄弟', 'stars': ['武曲', '七殺'], 'rules': [
 R('兄弟.武殺.本', None,
   '武曲七殺在兄弟宮，以不與人合作為宜，要防對方弄權。',
   'With Wu Qu and Qi Sha in your Siblings Palace, it is better not to go into partnership; watch for others grabbing control.',
   '卯酉『武杀』，若与人合作须防弄权侵吞。故以不与人合作为宜。', '故以不与人合作为宜', 'base'),
]})
T.append({'id': '武曲破軍.兄弟', 'stars': ['武曲', '破軍'], 'rules': [
 R('兄弟.武破.本', None,
   '武曲破軍在兄弟宮，兄弟朋友不主得力，合作也不耐久；結交外地或外國朋友情況較好。',
   'With Wu Qu and Po Jun in your Siblings Palace, siblings and friends are not much help and partnerships do not last; friends from other places or countries work out better.',
   '巳亥[武破]守兄弟宫，即使见吉曜，亦不主兄弟友人得力，合作亦不耐久。见煞忌刑曜，更主受掣肘。唯交异族、异乡友人，情形则较佳。', '唯交异族、异乡友人，情形则较佳', 'base'),
]})
T.append({'id': '武曲.兄弟', 'stars': ['武曲'], 'rules': [
 R('兄弟.武曲.羊火', {'star': ['擎羊', '火星'], 'at': 'same'},
   '同宮有擎羊或火星，兄弟朋友之間容易爭財。',
   'With Qing Yang or Huo Xing in the palace, money comes between you and your siblings or friends.',
   '凡武曲在兄弟宫，见擎羊或火星同度，皆主争财。', '皆主争财', 'limit'),
]})

# ── 天同 ──
T.append({'id': '天同巨門.兄弟', 'stars': ['天同', '巨門'], 'rules': [
 R('兄弟.同巨.本', None,
   '天同巨門在兄弟宮，見吉也只是一時的助力，不宜有長期合作計劃。',
   'With Tian Tong and Ju Men in your Siblings Palace, even good signs bring only passing help, so avoid long-term partnership plans.',
   '丑未[同巨]，见吉亦主一时助力。故不宜有长期合作计划。', '故不宜有长期合作计划', 'base'),
]})
T.append({'id': '天同天梁.兄弟', 'stars': ['天同', '天梁'], 'rules': [
 R('兄弟.同梁.吉', {'all': [GOOD, {'not': SHA}]},
   '天同天梁見吉，兄弟朋友和好，只是容易離散。',
   'Tian Tong with Tian Liang and good signs: siblings and friends get on, though they drift apart easily.',
   '见吉，则和好而易离散。', '见吉，则和好而易离散'),
 R('兄弟.同梁.煞', SHA,
   '天同天梁見煞，兄弟朋友表面和好，內心各有打算。',
   'Tian Tong with Tian Liang and harsh stars: siblings and friends look friendly but each has their own agenda.',
   '寅申宫『同梁]同度，稍见煞曜，即主兄弟或友人表面和好，内心各怀鬼胎。', '即主兄弟或友人表面和好', 'limit'),
]})
T.append({'id': '天同卯酉.兄弟', 'stars': ['天同'], 'branch': ['卯', '酉'], 'rules': [
 R('兄弟.天同卯酉.廣', None,
   '交友廣闊，只是實際助力不大。',
   'Your circle is wide, though the practical help is limited.',
   '卯酉天同，亦主交友广阔，唯实际助力不大。', '唯实际助力不大', 'base'),
]})
T.append({'id': '天同辰戌.兄弟', 'stars': ['天同'], 'branch': ['辰', '戌'], 'rules': [
 R('兄弟.天同辰戌.爭', None,
   '兄弟朋友之間常有無謂的爭執。',
   'There are often pointless arguments among siblings and friends.',
   '辰戌天同守兄弟宫，兄弟或友人间常多无谓争执。', '兄弟或友人间常多无谓争执', 'base'),
 R('兄弟.天同辰戌.輔佐', {'any': [FUZUO, KUIYUE]},
   '見輔佐吉星，交友廣，也多合作機會，但仍要事事親力親為。',
   'With helper stars, you have a wide circle and many chances to partner, though you still have to see to everything yourself.',
   '辰戌天同，见辅佐吉曜，亦主兄弟多，或交友广，且多与友人合作的机会，但仍必须事事亲力亲为。', '但仍必须事事亲力亲为'),
]})
T.append({'id': '天同巳亥.兄弟', 'stars': ['天同'], 'branch': ['巳', '亥'], 'rules': [
 R('兄弟.天同巳亥.廣', None,
   '交友面廣，尤其擅長結交地位不及自己的人。',
   'Your circle is wide, and you are especially good at befriending people of humbler standing.',
   '同时亦主交友面广，尤擅结交地位不如己者。', '尤擅结交地位不如己者', 'base'),
]})
T.append({'id': '天同.兄弟', 'stars': ['天同'], 'rules': [
 R('兄弟.天同.本', {'not': {'star': '巨門', 'at': 'same'}},
   '天同在兄弟宮，多主兄弟和好；也能結交中下層的朋友，只是實際助力不多。',
   'With Tian Tong in your Siblings Palace, siblings generally get on; you also make friends easily at every level, though practical help is limited.',
   '凡天同守兄弟宫，多主兄弟和好，有煞亦多表面和好。且主为人能结交中下层的朋友，唯无太多实际助力。', '多主兄弟和好', 'base'),
]})

# ── 廉貞 ──
T.append({'id': '廉貞天相.兄弟', 'stars': ['廉貞', '天相'], 'rules': [
 R('兄弟.廉相.無煞', {'not': SHA},
   '廉貞天相不見煞，兄弟感情融洽，也有朋友助力。',
   'Lian Zhen with Tian Xiang and no harsh stars: siblings are close, and friends help.',
   '子午宫[廉贞天相]在兄弟宫，无煞则主感情融洽，且亦有友人助力。', '无煞则主感情融洽，且亦有友人助力'),
 R('兄弟.廉相.濫', None,
   '結交不宜太濫，否則容易結黨紛爭。',
   'Do not make friends too freely, or cliques and quarrels follow.',
   '子午[廉相]，结交不宜太滥，否则易结党纷争。', '结交不宜太滥'),
]})
T.append({'id': '廉貞七殺.兄弟', 'stars': ['廉貞', '七殺'], 'rules': [
 R('兄弟.廉殺.吉', {'any': [GOODHUA, FUZUO, KUIYUE]},
   '廉貞七殺見吉，可得朋友合作之力，帶挈自己。',
   'Lian Zhen with Qi Sha and good signs: friends partner with you and carry you forward.',
   '丑未[廉杀]见辅佐吉曜及吉化，可得友人合作之力，因而带挈自身。', '可得友人合作之力'),
]})
T.append({'id': '廉貞破軍.兄弟', 'stars': ['廉貞', '破軍'], 'rules': [
 R('兄弟.廉破.吉', GOOD,
   '廉貞破軍見吉，關係融洽持久，也可以合作經營，得力。',
   'Lian Zhen with Po Jun and good signs: relationships are warm and lasting, and you can run a business together to good effect.',
   '卯酉宫『廉贞破军』同度，见火铃，兄弟或知交成仇。见吉曜及吉化，则可以融洽持久，且亦可合作营运事业，主得力。', '且亦可合作营运事业'),
]})
T.append({'id': '廉貞天府.兄弟', 'stars': ['廉貞', '天府'], 'rules': [
 R('兄弟.廉府.本', LU,
   '廉貞天府見祿，兄弟多，交友也廣。',
   'Lian Zhen with Tian Fu and Lu present: many siblings, and a wide circle of friends.',
   '辰戌[廉府]守兄弟宫，兄弟多，交友亦较广。唯必须天府不[空露]，然后始吉，否则反主受剥削拖累。', '兄弟多，交友亦较广'),
]})
T.append({'id': '廉貞寅申.兄弟', 'stars': ['廉貞'], 'branch': ['寅', '申'], 'rules': [
 R('兄弟.廉貞寅申.本', None,
   '兄弟感情和美，但沒有實際助力；交得太深反而容易招怨，以不與人合作事業為宜。',
   'Siblings are close but not much practical help; getting too close breeds resentment, so avoid business partnerships.',
   '寅申廉贞独坐兄弟宫，亦主兄弟感情和美，但无实际助力。与人交往，交深则反易招怨。故以不与人合作事业为宜。', '交深则反易招怨', 'base'),
]})
T.append({'id': '廉貞.兄弟', 'stars': ['廉貞'], 'rules': [
 R('兄弟.廉貞.本', {'not': GOOD},
   '廉貞在兄弟宮，兄弟朋友之間以君子之交淡如水為宜。',
   'With Lian Zhen in your Siblings Palace, keep relations with siblings and friends light and gentlemanly.',
   '凡廉贞守兄弟宫，兄弟宫及朋友之间，以[君子之交淡如水]为宜。', '以[君子之交淡如水]为宜', 'base'),
]})

# ── 天府 ──
T.append({'id': '天府.兄弟', 'stars': ['天府'], 'rules': [
 R('兄弟.天府.輔佐', {'any': [FUZUO, KUIYUE]},
   '天府見輔佐吉星，兄弟眾多。',
   'Tian Fu with helper stars: many siblings.',
   '天府守兄弟宫，见煞忌刑曜主兄弟少或主多而刑克；见辅佐诸曜始主兄弟众多。', '见辅佐诸曜始主兄弟众多'),
 R('兄弟.天府.廉忌', H('忌', '廉貞', 'sifang'),
   '會廉貞化忌，兄弟或知己容易反目。',
   'Meeting Lian Zhen in Hindrance, siblings or close friends can turn against you.',
   '天府守兄弟宫，最嫌会廉贞化忌，主兄弟或知交反目，恩反成仇。', '主兄弟或知交反目', 'limit'),
 R('兄弟.天府.武忌', H('忌', '武曲', 'sifang'),
   '會武曲化忌，容易為兄弟或朋友破財。',
   'Meeting Wu Qu in Hindrance, you can lose money over siblings or friends.',
   '亦嫌会武曲化忌，主为兄弟或友人破财，煞重则为争财之兆。', '主为兄弟或友人破财', 'limit'),
]})

# ── 太陰 ──
T.append({'id': '太陰.兄弟', 'stars': ['太陰'], 'rules': [
 R('兄弟.太陰.忌', {'all': [H('忌', '太陰'), {'not': SHA}]},
   '太陰化忌而無煞，雖然會受兄弟或夥伴所累，但多是無心之失。',
   'Tai Yin in Hindrance without harsh stars: siblings or partners may cause you trouble, but usually without meaning to.',
   '太阴化忌守兄弟宫，无煞，虽主受兄弟或伙伴之累，但多属无心之失。', '但多属无心之失', 'limit'),
]})

# ── 貪狼 ──
T.append({'id': '貪狼.兄弟', 'stars': ['貪狼'], 'rules': [
 R('兄弟.貪狼.和', {'all': [{'not': {'branch': ['巳', '亥']}}, GOOD]},
   '貪狼在兄弟宮見吉，兄弟和睦，交友也廣闊。',
   'Tan Lang in your Siblings Palace with good signs: siblings get on, and your circle is wide.',
   '贪狼守兄弟宫，除巳亥二宫为贪狼陷地外，一般情形下均主兄弟和睦，亦主人交友广阔。', '一般情形下均主兄弟和睦'),
 R('兄弟.貪狼.酒肉', {'all': [{'not': {'branch': ['巳', '亥']}}, {'not': GOOD}]},
   '貪狼在兄弟宮，兄弟和睦、交友廣闊，只是不見吉星，多是酒肉朋友。',
   'Tan Lang in your Siblings Palace: siblings get on and your circle is wide, but without helpful stars, many are fair-weather friends.',
   '贪狼守兄弟宫，除巳亥二宫为贪狼陷地外，一般情形下均主兄弟和睦，亦主人交友广阔。唯不见吉化吉曜者，则多酒肉之交。', '则多酒肉之交'),
]})

# ── 巨門 ──
T.append({'id': '巨門.兄弟', 'stars': ['巨門'], 'rules': [
 R('兄弟.巨門.陽', {'star': '太陽', 'at': ['same', 'opp']},
   '巨門與太陽同宮或相對，可以與外國人合作。',
   'With Ju Men beside or facing Tai Yang, partnering with people from abroad works for you.',
   '故巨门守兄弟宫者，绝不宜与人合作事业。唯[太阳巨门]守兄弟宫者，可与异族人合作。', '可与异族人合作'),
 R('兄弟.巨門.淡', None,
   '巨門交人始善終惡：兄弟朋友之間，不宜酒肉深交，以君子之交為宜。',
   'Ju Men’s friendships start well and end badly: keep relations with siblings and friends light rather than close.',
   '『巨门交人，始善终恶』。故巨门在兄弟宫者，不宜酒肉深交，以君子之交为宜。', '不宜酒肉深交，以君子之交为宜', 'base'),
 R('兄弟.巨門.合作', {'not': {'star': '太陽', 'at': ['same', 'opp']}},
   '巨門在兄弟宮，絕不宜與人合作事業。',
   'With Ju Men in your Siblings Palace, never go into business partnership.',
   '故巨门守兄弟宫者，绝不宜与人合作事业。', '故巨门守兄弟宫者，绝不宜与人合作事业', 'limit'),
]})

# ── 天相 ──
# ── 天梁 ──
T.append({'id': '天梁.兄弟', 'stars': ['天梁'], 'rules': [
 R('兄弟.天梁.輔佐', {'any': [FUZUO, KUIYUE]},
   '天梁見輔佐吉星，兄弟和美；吉凶都在暗處，朋友多是暗中相助。',
   'Tian Liang with helper stars: siblings are close; everything happens behind the scenes, so friends help you quietly.',
   '天梁吉，则主兄弟或友人暗生助力。凶恶则主暗争、排挤。吉凶皆在暗面而不在明面。', '则主兄弟或友人暗生助力'),
 R('兄弟.天梁.合作', None,
   '天梁帶孤剋之性，即使見吉也不主可與人合作；除非合作者完全退居幕後，做你的後台。',
   'Tian Liang is a loner: even with good signs, partnership does not suit you, unless your partner stays entirely behind the scenes as your backer.',
   '天梁有孤克之性，所以即使见吉曜，亦不主可与人合作。除非合作者完全退居幕后，作为自己的后台。', '除非合作者完全退居幕后'),
]})

# ── 七殺 ──
T.append({'id': '七殺.兄弟', 'stars': ['七殺'], 'rules': [
 R('兄弟.七殺.吉', {'all': [{'hua': ['祿', '權', '科'], 'at': 'sifang'}, FUZUO]},
   '七殺會到祿權科又見左輔右弼，兄弟眾多。',
   'Qi Sha meeting Abundance, Authority or Merit with Zuo Fu or You Bi: many siblings.',
   '七杀守兄弟宫，见禄、权、科及辅弼，兄弟众多。', '见禄、权、科及辅弼，兄弟众多'),
 R('兄弟.七殺.煞', {'star': ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'], 'at': 'sifang'},
   '七殺會到煞星，兄弟少，較孤單。',
   'Qi Sha meeting harsh stars: few siblings, and a more solitary path.',
   '七杀守兄弟宫，煞曜聚合者，则主孤单。', '煞曜聚合者，则主孤单', 'limit'),
]})

# ── 破軍 ──
T.append({'id': '破軍.兄弟', 'stars': ['破軍'], 'rules': [
 R('兄弟.破軍.吉', {'all': [FUZUO, KUIYUE, {'not': {'star': '祿存', 'at': 'same'}}]},
   '破軍見齊輔佐吉星，可以借別人之力創業。',
   'Po Jun with helper stars all round: you can build a venture on others’ strength.',
   '破军守兄弟宫而辅佐吉曜咸集，则可藉他人之力创业。(注意禄存同度时情形恰恰相反)。', '则可藉他人之力创业'),
 R('兄弟.破軍.年齡', None,
   '破軍在兄弟宮，兄弟之間年齡差距較大。',
   'With Po Jun in your Siblings Palace, siblings are far apart in age.',
   '破军守兄弟宫，除非孤单，否则兄弟年龄有差距，由八年至十二年以上不等。', '否则兄弟年龄有差距', 'base'),
]})
