# 子女宮規則（2026-10-12）。原書：子女宮兼論後輩、門生、親信下屬（「自己所提拔扶助，或亲切关系的下属」）。
# 題目次序 = 合併輸出次序：組合／地支題目行先，單星通則其次，唔限主星嘅通則最後。
FIRE = {'star': ['火星', '鈴星'], 'at': 'same'}
KONG = {'star': ['地空', '地劫'], 'at': 'same'}
YANGTUO = {'star': ['擎羊', '陀羅'], 'at': 'same'}
SHA = {'star': ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'], 'at': 'same'}
FUZUO = {'star': ['左輔', '右弼'], 'at': 'sifang'}
KUIYUE = {'star': ['天魁', '天鉞'], 'at': 'sifang'}
CHANGQU = {'star': ['文昌', '文曲'], 'at': 'sifang'}
GOODHUA = {'hua': ['祿', '權', '科'], 'at': 'same'}
GOOD = {'any': [GOODHUA, FUZUO, KUIYUE]}
LU = {'any': [{'hua': '祿', 'at': 'sifang'}, {'star': '祿存', 'at': 'sifang'}]}
LUMA = {'all': [{'star': '天馬', 'at': ['same', 'opp']}, {'any': [{'star': '祿存', 'at': ['same', 'opp']}, {'hua': '祿', 'at': ['same', 'opp']}]}]}
def H(hua, star, at='same'): return {'hua': hua, 'star': star, 'at': at}
def R(id, when, text, en, src, quote, role='refine'):
    return {'id': id, 'when': when, 'text': text, 'en': en, 'src': src, 'quote': quote, 'role': role}

# ── 紫微 ──
T.append({'id': '紫微破軍.子女', 'stars': ['紫微', '破軍'], 'rules': [
 R('子女.紫破.昌曲夾', {'jia': ['文昌', '文曲']},
   '文昌文曲夾著子女宮，你的子女聰明，學東西快。',
   'Wen Chang and Wen Qu flank your Children Palace: your children are bright and quick to learn.',
   '只见昌曲夹，主子女聪明，只见左右夹，主子女得力，且富创造力。', '只见昌曲夹，主子女聪明'),
 R('子女.紫破.左右夾', {'jia': ['左輔', '右弼']},
   '左輔右弼相夾，你的子女得力，而且富創造力。',
   'Flanked by Zuo Fu and You Bi, your children are capable and creative.',
   '只见昌曲夹，主子女聪明，只见左右夹，主子女得力，且富创造力。', '只见左右夹，主子女得力，且富创造力'),
 R('子女.紫破.煞', SHA,
   '紫微破軍見〔煞〕，你的下屬晚輩帶反叛性。',
   'Zi Wei with Po Jun and 〔harsh stars〕: younger colleagues and staff have a rebellious streak.',
   '『紫破』见煞，一般主下属其反叛性。', '一般主下属其反叛性', 'limit'),
]})
T.append({'id': '紫微天相.子女', 'stars': ['紫微', '天相'], 'rules': [
 R('子女.紫相.晚輩', {'not': SHA},
   '紫微天相在子女宮，一般有晚輩扶助你的事業。',
   'With Zi Wei and Tian Xiang in your Children Palace, younger people generally support your work.',
   '[紫相]守子女宫，一般主有晚辈扶助自己的事业，若煞忌刑曜重重，则反为所累。', '一般主有晚辈扶助自己的事业'),
 R('子女.紫相.秀', GOOD,
   '紫微天相見〔吉〕，子女出色，富同情心，只是仍然主觀，愛惡分明。',
   'Zi Wei with Tian Xiang and 〔good signs〕: your children shine and are compassionate, though opinionated, with strong likes and dislikes.',
   '天相与紫微同度或对拱，主子女三人。见吉，子女秀发，富同情心，但仍主观，且爱恶随心而强烈。', '子女秀发，富同情心，但仍主观'),
]})
T.append({'id': '紫微七殺.子女', 'stars': ['紫微', '七殺'], 'rules': [
 R('子女.紫殺.祿', LU,
   '紫微七殺的子女性格很強；見祿得以調和。晚輩的性格也一樣。',
   'Zi Wei with Qi Sha makes for very strong-willed children; Lu present brings balance. The same goes for the younger people around you.',
   '巳亥『紫杀』，子女极强头。须见禄以调和，否则有代沟，晚辈性：质亦如是。', '须见禄以调和'),
 R('子女.紫殺.無祿', {'not': LU},
   '紫微七殺的子女性格很強；不見祿，兩代容易有代溝。晚輩的性格也一樣。',
   'Zi Wei with Qi Sha makes for very strong-willed children; without Lu, a generation gap opens. The same goes for the younger people around you.',
   '巳亥『紫杀』，子女极强头。须见禄以调和，否则有代沟，晚辈性：质亦如是。', '否则有代沟', 'limit'),
 R('子女.紫殺.祿馬', LUMA,
   '祿星與天馬相會，子女能在遠方創業；你自己也桃李滿天下。',
   'With Lu and Tian Ma meeting, your children can start ventures far away, and your own students and protégés spread far and wide.',
   '巳亥『紫杀』躔禄马，或与禄马对拱，主：子女能于远方创业。又主自己桃李满天下。', '又主自己桃李满天下'),
]})
T.append({'id': '紫微子午.子女', 'stars': ['紫微'], 'branch': ['子', '午'], 'rules': [
 R('子女.紫微子午.性', None,
   '紫微在子午，你的子女性格倔強，愛惡隨心。',
   'With Zi Wei in Zi or Wu, your children are strong-willed and follow their own likes and dislikes.',
   '紫微在子午宫，主子女性格倔强，爱恶随心。', '主子女性格倔强，爱恶随心', 'base'),
]})
T.append({'id': '紫微.子女', 'stars': ['紫微'], 'rules': [
 R('子女.紫微.輔弼', FUZUO,
   '紫微見左輔右弼，子女和晚輩能成為你的助力。',
   'Zi Wei with Zuo Fu or You Bi: your children and protégés become a real help to you.',
   '紫微在子女宫，须见辅弼，然后才可以成为自己的助力，', '须见辅弼，然后才可以成为自己的助力'),
 R('子女.紫微.遲', None,
   '紫微在子女宮，門生弟子和追隨你的晚輩都來得較遲，也以遲來為宜。',
   'With Zi Wei in your Children Palace, students and followers come to you late, and that is how it should be.',
   '凡紫微在子女宫，均主迟得子，门生弟子以及追随自己的晚辈亦主迟得。亦以迟得为宜。', '门生弟子以及追随自己的晚辈亦主迟得', 'base'),
]})

# ── 天機 ──
T.append({'id': '天機天梁.子女', 'stars': ['天機', '天梁'], 'rules': [
 R('子女.機梁.羊陀', YANGTUO,
   '同宮有擎羊或陀羅，宜培養子女在理工方面的興趣。',
   'With Qing Yang or Tuo Luo in the palace, nurture your children’s interest in science and engineering.',
   '与羊陀同度，则宜培养其理工方面的兴趣。', '则宜培养其理工方面的兴趣'),
 R('子女.機梁.口才', None,
   '天機天梁借會太陽巨門，太陽巨門主口才，宜培養子女這方面的發展。',
   'Tian Ji with Tian Liang borrows Tai Yang and Ju Men, which are about speaking, so develop your children’s way with words.',
   '辰戌『天机天梁』，借会『太阳巨门』，以借会寅宫耆为佳。『太阳巨门』主口才，故亦宜培养子女这方面的发展。', '故亦宜培养子女这方面的发展', 'base'),
]})
T.append({'id': '天機丑未.子女', 'stars': ['天機'], 'branch': ['丑', '未'], 'rules': [
 R('子女.天機丑未.挑剔', None,
   '子女可能發展成喜歡挑剔的性格；宜引導到監察、管理、計劃一類，把挑剔化為心思縝密。',
   'Your children may grow up fault-finding; steer it towards oversight, management or planning, turning it into careful thoroughness.',
   '丑未天机在子女宫，子女可能发展为喜挑剔的性格，宜加以改善，发展为监察、管理、计划等，即将挑剔化为心思缜密。', '即将挑剔化为心思缜密', 'base'),
]})

# ── 太陽 ──
T.append({'id': '太陽巨門.子女', 'stars': ['太陽', '巨門'], 'rules': [
 R('子女.陽巨.昌曲', CHANGQU,
   '太陽巨門見文昌文曲，你的子女聰敏機智。',
   'Tai Yang–Ju Men meets Wen Chang or Wen Qu: your children are quick and clever.',
   '寅申『太阳巨门』，子女三人以上。主有辩才，及有学习外语、方言的能力。见昌曲，主聪敏机智；见魁钺，主有说服别人的能力；见辅弼，主有领导力。', '见昌曲，主聪敏机智'),
 R('子女.陽巨.魁鉞', KUIYUE,
   '見天魁天鉞，你的子女有說服別人的能力。',
   'With Tian Kui or Tian Yue, your children are persuasive.',
   '寅申『太阳巨门』，子女三人以上。主有辩才，及有学习外语、方言的能力。见昌曲，主聪敏机智；见魁钺，主有说服别人的能力；见辅弼，主有领导力。', '见魁钺，主有说服别人的能力'),
 R('子女.陽巨.輔弼', FUZUO,
   '太陽巨門見左輔右弼，你的子女有領導能力。',
   'Tai Yang–Ju Men meets Zuo Fu or You Bi: your children have leadership ability.',
   '寅申『太阳巨门』，子女三人以上。主有辩才，及有学习外语、方言的能力。见昌曲，主聪敏机智；见魁钺，主有说服别人的能力；见辅弼，主有领导力。', '见辅弼，主有领导力'),
 R('子女.陽巨.本', None,
   '太陽巨門在子女宮，子女有辯才，也有學外語、方言的能力；用同樣的方法看晚輩、親信，就能知人善用。',
   'With Tai Yang and Ju Men in your Children Palace, your children are articulate and good with languages and dialects; read your protégés and close staff the same way and you will use their talents well.',
   '寅申『太阳巨门』，子女三人以上。主有辩才，及有学习外语、方言的能力。', '主有辩才，及有学习外语、方言的能力', 'base'),
]})
T.append({'id': '太陽天梁.子女', 'stars': ['太陽', '天梁'], 'rules': [
 R('子女.陽梁.研究', {'all': [{'star': '文昌', 'at': 'sifang'}, LU]},
   '太陽天梁見文昌又見祿，子女是學術、專業研究的人才。',
   'Tai Yang with Tian Liang, Wen Chang and Lu: your children are scholars or professional researchers.',
   '卯酉『太阳天梁』若成『阳梁昌禄格』，主子女为学术、专业研究人才。', '主子女为学术、专业研究人才'),
 R('子女.陽梁.遠', None,
   '太陽天梁帶孤剋之性，子女往往遠離；坐酉更明顯。',
   'Tai Yang with Tian Liang is a solitary pairing: children often live far away, especially in You.',
   '『太阳天梁』为孤克之星，故往往主子女远离。太阳在酉宫者尤甚。', '故往往主子女远离', 'base'),
]})
T.append({'id': '太陽辰.子女', 'stars': ['太陽'], 'branch': ['辰'], 'rules': [
 R('子女.太陽辰.聰', None,
   '太陽坐辰，你的子女聰敏，做事有魄力。',
   'With Tai Yang in Chen, your children are bright and act with boldness.',
   '辰宫太阳主聪敏及具魄力，戌宫者平常。', '辰宫太阳主聪敏及具魄力', 'base'),
]})
T.append({'id': '太陽巳亥.子女', 'stars': ['太陽'], 'branch': ['巳', '亥'], 'rules': [
 R('子女.太陽巳亥.吉', GOOD,
   '太陽見〔吉〕，你的子女是創業或專業人才，而且偏商業。',
   'Tai Yang with 〔good signs〕: your children are entrepreneurs or professionals, with a commercial bent.',
   '巳亥宫太阳见占化、古曜同会，子女亦为创业或专业人才，可参考『太阳巨门』，唯巳亥宫者，商业性质更重。', '子女亦为创业或专业人才'),
]})

# ── 武曲 ──
T.append({'id': '武曲貪狼.子女', 'stars': ['武曲', '貪狼'], 'rules': [
 R('子女.武貪.火鈴', FIRE,
   '同宮有火星或鈴星，兩代感情到晚年有隔膜；看與晚輩親信的關係，也是始吉終凶。',
   'With Huo Xing or Ling Xing in the palace, a distance grows between the generations in later life; with protégés and close staff too, things start well and end badly.',
   '父子感情至晚年有隔膜。推断跟晚辈亲信的关系，亦主始吉终凶。', '亦主始吉终凶', 'limit'),
]})
T.append({'id': '武曲天相.子女', 'stars': ['武曲', '天相'], 'rules': [
 R('子女.武相.晚輩', None,
   '武曲天相在子女宮，你與晚輩親信的關係欠佳。',
   'With Wu Qu and Tian Xiang in your Children Palace, relations with protégés and close staff are poor.',
   '在现代，亦主婚外生子。与晚辈亲信人际关系不佳。', '与晚辈亲信人际关系不佳', 'base'),
]})
T.append({'id': '武曲.子女', 'stars': ['武曲'], 'rules': [
 R('子女.武曲.本', {'not': FUZUO},
   '武曲在子女宮，追隨你的後輩較少。',
   'With Wu Qu in your Children Palace, few younger people follow you.',
   '武曲临子女宫，一般情形下主子女少，又较利女不利子，故多先生女。亦主追随自己的后辈较少(此则同时须视左辅右弼)。', '亦主追随自己的后辈较少', 'base'),
]})

# ── 天同 ──
T.append({'id': '天同巨門.子女', 'stars': ['天同', '巨門'], 'rules': [
 R('子女.同巨.無煞', {'not': SHA},
   '天同巨門沒有煞星激發，你的子女意志較弱。',
   'Tian Tong–Ju Men without harsh stars to spur them: your children’s will is on the soft side.',
   '喜煞曜激发，否则主子女意志薄弱，', '否则主子女意志薄弱'),
 R('子女.同巨.祿', {'hua': '祿', 'at': 'same'},
   '天同巨門化祿最好，只是你的子女剛毅不足。',
   'Tian Tong–Ju Men in Abundance is the best case, though your children lack some grit.',
   '丑未[天同巨门]，以化禄为宜，但却又主子女刚毅不足。', '但却又主子女刚毅不足'),
 R('子女.同巨.巨忌', H('忌', '巨門'),
   '巨門化忌，兩代之間不和，也容易與自己提拔的人反目。',
   'Ju Men in Hindrance: the generations clash, and you may fall out with people you promoted.',
   '丑未[天同巨门]若巨门化忌，则主骨肉参商，亦主与自己提拔扶持的人反目；', '亦主与自己提拔扶持的人反目', 'limit'),
]})
T.append({'id': '天同天梁.子女', 'stars': ['天同', '天梁'], 'rules': [
 R('子女.同梁.馬', {'star': '天馬', 'at': ['same', 'opp']},
   '天同天梁見天馬，你的子女會離家到外地發展。',
   'Tian Tong–Tian Liang meets Tian Ma: your children leave home to make their way elsewhere.',
   '寅申『天同天梁』见天马，主子女离家发展。', '主子女离家发展'),
]})
T.append({'id': '天同辰戌.子女', 'stars': ['天同'], 'branch': ['辰', '戌'], 'rules': [
 R('子女.天同辰戌.情', None,
   '天同在辰戌，你的子女感情重於理智，容易感情用事。',
   'With Tian Tong in Chen or Xu, your children are led more by feeling than by reason, and act on emotion easily.',
   '辰戌宫天同，主子女感1青重于理智。见昌曲桃花者，感情尤重。', '重于理智', 'base'),
 R('子女.天同辰戌.祿', H('祿', '天同'),
   '天同化祿，你的子女不靠祖業，自己興家。',
   'Tian Tong in Abundance: your children build their own lives without relying on family wealth.',
   '辰戌宫天同化禄，主子女不享祖业而自兴。', '主子女不享祖业而自兴'),
]})
T.append({'id': '天同巳亥.子女', 'stars': ['天同'], 'branch': ['巳', '亥'], 'rules': [
 R('子女.天同巳亥.離', {'any': [FIRE, LUMA]},
   '見火鈴或祿馬，子女離家發展，性格難以捉摸，反叛性強。',
   'With Huo Xing, Ling Xing, or Lu and Tian Ma, your children leave home to find their way; they are hard to read and strongly independent.',
   '见火铃、或见禄马，均主子女离家发展，且性格难以捉摸，反叛性强。', '且性格难以捉摸，反叛性强'),
 R('子女.天同巳亥.祿', H('祿', '天同'),
   '天同化祿，你的子女會離開家鄉發展。',
   'Tian Tong in Abundance: your children leave their home town to make their way.',
   '巳亥天同化禄，虽不见马，亦主子女离乡背井。', '亦主子女离乡背井'),
]})

# ── 廉貞 ──
T.append({'id': '廉貞七殺.子女', 'stars': ['廉貞', '七殺'], 'rules': [
 R('子女.廉殺.吉', {'all': [{'hua': ['祿', '權', '科'], 'at': 'same'}, {'any': [FUZUO, KUIYUE]}]},
   '廉貞七殺見〔吉化〕，又有〔左輔右弼等吉星〕，你的子女成才。',
   'Lian Zhen–Qi Sha meets 〔favourable transformations〕 and 〔helper stars〕: your children make something of themselves.',
   '丑未[廉贞七杀]见吉化，及见辅佐吉曜则子女成才。', '则子女成才'),
 R('子女.廉殺.忌', H('忌', '廉貞'),
   '廉貞化忌，你和子女意見不合；晚輩也容易以怨報德。',
   'Lian Zhen in Hindrance: the generations disagree, and protégés may repay kindness with resentment.',
   '廉贞化禄，则感情仍深厚；化忌，则主父子参商。又主晚辈以怨报德。', '又主晚辈以怨报德', 'limit'),
]})
T.append({'id': '廉貞天府.子女', 'stars': ['廉貞', '天府'], 'rules': [
 R('子女.廉府.吉', GOOD,
   '廉貞天府見〔吉〕，你的子女出色，有所成就。',
   'Lian Zhen–Tian Fu meets 〔good signs〕: your children are outstanding and go far.',
   '辰戌宫[廉贞天府]，见吉化吉曜主子女秀发贵显。', '见吉化吉曜主子女秀发贵显'),
]})
T.append({'id': '廉貞寅申.子女', 'stars': ['廉貞'], 'branch': ['寅', '申'], 'rules': [
 R('子女.廉貞寅申.財經', {'all': [H('祿', '廉貞'), H('科', '武曲', 'sifang')]},
   '廉貞化祿會武曲化科，子女可在財經方面發展，但以任公職為宜。',
   'Lian Zhen in Abundance meeting Wu Qu in Merit: your children can do well in finance, best in the public sector.',
   '寅申廉贞化禄会武曲化科，为相当优美的结构，子女可在财政经济方面发展，唯需以任公职为宜。', '子女可在财政经济方面发展'),
 R('子女.廉貞寅申.商', None,
   '廉貞在寅申，你的子女不宜從商，走其他路較好。',
   'With Lian Zhen in Yin or Shen, business is not the path for your children; other routes suit them better.',
   '寅申廉贞，子女不宜从商。', '寅申廉贞，子女不宜从商', 'base'),
]})
T.append({'id': '廉貞.子女', 'stars': ['廉貞'], 'rules': [
 R('子女.廉貞.本', {'not': H('忌', '廉貞')},
   '廉貞在子女宮，一般兩代感情濃厚，有隔膜也能互相諒解。',
   'With Lian Zhen in your Children Palace, the bond between the generations is usually deep, and any distance is bridged by understanding.',
   '6廉贞廉贞喜入子女宫，一般情形下，主两代感情浓厚，有隔膜亦能互相谅解。', '主两代感情浓厚，有隔膜亦能互相谅解', 'base'),
]})

# ── 天府 ──
T.append({'id': '天府巳亥.子女', 'stars': ['天府'], 'branch': ['巳', '亥'], 'rules': [
 R('子女.天府巳亥.吉', {'any': [GOODHUA, LU]},
   '天府見〔吉化〕或見祿，子女必能獨當一面，宜發展他們的組織力和領導力。',
   'Tian Fu with 〔good transformations〕 or Lu: your children can certainly stand on their own; develop their organising and leadership skills.',
   '巳亥天府若见吉化、吉曜，或府库充盈，则子女必能独当一面，宜发展其组织力及领导力。', '则子女必能独当一面'),
 R('子女.天府巳亥.火鈴', FIRE,
   '同宮有火星或鈴星，子女宜離家發展；守在出生地反而不得意。',
   'With Huo Xing or Ling Xing in the palace, your children do better away from home; staying put holds them back.',
   '巳亥天府与火铃同度，子女宜离家发展。株守于出生地，则反不得意。', '子女宜离家发展'),
]})
T.append({'id': '天府卯酉.子女', 'stars': ['天府'], 'branch': ['卯', '酉'], 'rules': [
 R('子女.天府卯酉.武祿', H('祿', '武曲', 'opp'),
   '對宮武曲化祿，子女宜從事財經、貿易；親近你的晚輩也有這方面的才能。',
   'With Wu Qu in Abundance opposite, finance or trade suits your children, and the younger people close to you have the same gift.',
   '若武曲化禄，天府见吉曜，则主子女宜从事财经、贸易，可由此方面善于培养。亦主亲近自己的晚辈有这方面的才能。', '亦主亲近自己的晚辈有这方面的才能'),
]})
T.append({'id': '天府.子女', 'stars': ['天府'], 'rules': [
 R('子女.天府.本', None,
   '天府在子女宮，你的子女孝順友愛、敦厚誠篤。',
   'With Tian Fu in your Children Palace, your children are dutiful, loving, honest and sincere.',
   '子女宫喜天府加临，主子女孝顺友爱、敦厚诚笃。且数目众多。', '主子女孝顺友爱、敦厚诚笃', 'base'),
]})

# ── 貪狼 ──
T.append({'id': '貪狼寅申.子女', 'stars': ['貪狼'], 'branch': ['寅', '申'], 'rules': [
 R('子女.貪狼寅申.情', {'all': [{'not': H('忌', '廉貞', 'opp')}, {'not': FIRE}]},
   '貪狼在寅申，你和子女有感情，比坐子午的更深厚。',
   'With Tan Lang in Yin or Shen, there is real warmth between you and your children, deeper than when it sits in Zi or Wu.',
   '寅申贪狼子女宫，两代有感情。较居子午者为厚。', '两代有感情。较居子午者为厚'),
 R('子女.貪狼寅申.桃李', {'all': [FUZUO, KUIYUE, LUMA]},
   '輔佐吉星齊集又見祿馬，你桃李遍天下。',
   'With helper stars gathered and Lu meeting Tian Ma, your students and protégés spread across the world.',
   '故倘辅佐诸曜华集而见禄马，又往往为桃李遍天下。', '又往往为桃李遍天下'),
]})
T.append({'id': '貪狼.子女', 'stars': ['貪狼'], 'rules': [
 R('子女.貪狼.火鈴', FIRE,
   '同宮有火星或鈴星，兩代感情起初融洽，後來卻冷淡。',
   'With Huo Xing or Ling Xing in the palace, the generations start close, but cool over time.',
   '贪狼与火铃同度，主两代感情起初融洽，至后来却冷如冰炭。', '主两代感情起初融洽'),
 R('子女.貪狼.吉', {'all': [GOOD, {'not': FIRE}]},
   '貪狼見〔吉〕，你和子女兩代和好，相處融洽。',
   'Tan Lang meets 〔good signs〕: you and your children get on well.',
   '贪狼在子女宫，见吉，主父子和好；若见煞忌则父子不和。', '贪狼在子女宫，见吉，主父子和好'),
 R('子女.貪狼.煞', {'all': [SHA, {'not': GOOD}, {'not': {'star': ['火星', '鈴星'], 'at': 'same'}}]},
   '貪狼見〔煞忌〕，你和子女兩代不和，容易起衝突。',
   'Tan Lang meets 〔harsh stars or Hindrance〕: you and your children do not get on, and clashes come easily.',
   '贪狼在子女宫，见吉，主父子和好；若见煞忌则父子不和。', '若见煞忌则父子不和', 'limit'),
]})

# ── 巨門 ──
T.append({'id': '巨門巳亥.子女', 'stars': ['巨門'], 'branch': ['巳', '亥'], 'rules': [
 R('子女.巨門巳亥.陽吉', {'hua': ['祿', '權', '科'], 'star': '太陽', 'at': ['opp', 'trine']},
   '會太陽吉化，兩代感情和洽；與晚輩的關係也一樣。',
   'Meeting Tai Yang well transformed, the generations get on warmly, and so do you with your protégés.',
   '巳亥巨门最喜太阳吉化来会。日生人尤佳。则宫度祥和，不特无刑克，而且主两代感情和洽。', '而且主两代感情和洽'),
]})

# ── 天相 ──
T.append({'id': '廉貞天相.子女', 'stars': ['廉貞', '天相'], 'rules': [
 R('子女.廉相.吉', GOOD,
   '天相與廉貞同宮而見〔吉〕，你的子女是行政人才。',
   'Tian Xiang with Lian Zhen and 〔good signs〕: your children are natural administrators.',
   '若与廉贞同度或对拱，则仅主二人，吉则子女为行政人才，凶则刑克，且主代沟。', '吉则子女为行政人才'),
]})

# ── 天梁 ──
T.append({'id': '天梁子午.子女', 'stars': ['天梁'], 'branch': ['子', '午'], 'rules': [
 R('子女.天梁子午.出頭', None,
   '天梁在子午，你要提防子女強出頭而惹上麻煩。',
   'With Tian Liang in Zi or Wu, watch that your children do not stick their necks out and get into trouble.',
   '子午宫天梁，均须防子女因强出头而惹祸。', '均须防子女因强出头而惹祸', 'base'),
 R('子女.天梁子午.陽忌', H('忌', '太陽', 'opp'),
   '對宮太陽化忌，子女宜從事法律、醫藥、社會工作，以救助為一生事業。',
   'With Tai Yang in Hindrance opposite, law, medicine or social work suits your children: a life spent helping others.',
   '子午天梁会太阳化忌，子女宜从事法律、医药、社会工作，即以救助为一生事业。', '即以救助为一生事业'),
]})
T.append({'id': '天梁丑未.子女', 'stars': ['天梁'], 'branch': ['丑', '未'], 'rules': [
 R('子女.天梁丑未.煞', SHA,
   '同宮有〔煞〕，子女宜學工程或工藝，現代多是電訊、電子、電腦工程。',
   'With 〔harsh stars〕 in the palace, your children should study engineering or a craft, these days telecoms, electronics or computing.',
   '丑未天梁，煞曜同度，子女宜学习工程或工艺。在现代又往往为电讯、电子、计算机工程。', '在现代又往往为电讯、电子、计算机工程'),
 R('子女.天梁丑未.少', None,
   '天梁在丑未，真正親近你的晚輩不多。',
   'With Tian Liang in Chou or Wei, few younger people are truly close to you.',
   '丑未天梁子女固不多，亲近的晚辈亦不多，或主得力者易难。', '亲近的晚辈亦不多', 'base'),
]})
T.append({'id': '天梁.子女', 'stars': ['天梁'], 'rules': [
 R('子女.天梁.吉', {'all': [GOOD, {'not': SHA}]},
   '天梁見〔吉〕，你手下的人眾多而且得力。',
   'Tian Liang meets 〔good signs〕: you have many capable people working under you.',
   '天梁见吉化吉曜，亦主手下人众多，且得力，唯若同时见煞，则亦主手下人可能对自己不利。', '亦主手下人众多，且得力'),
]})

# ── 七殺 ──
T.append({'id': '七殺寅申.子女', 'stars': ['七殺'], 'branch': ['寅', '申'], 'rules': [
 R('子女.七殺寅申.倔', None,
   '子女倔強、孤立，要特別注意培養他們處理人際關係。',
   'Your children are stubborn and solitary, so take special care to help them learn to handle people.',
   '寅申七杀，子女倔强，孤立，须注意培育，特别须注意训练其处理人际关系。', '特别须注意训练其处理人际关系', 'base'),
 R('子女.七殺寅申.晚輩', None,
   '你的晚輩較倨傲、不受駕馭，提拔親信時要留意。',
   'Protégés can be proud and hard to manage, so take care whom you promote.',
   '寅申七杀，主晚辈踞傲，不受驾驭。于提拔亲信时务须留意。', '于提拔亲信时务须留意', 'limit'),
]})
T.append({'id': '七殺辰戌.子女', 'stars': ['七殺'], 'branch': ['辰', '戌'], 'rules': [
 R('子女.七殺辰戌.理工', CHANGQU,
   '七殺坐辰戌氣質較純和，見文昌文曲，可以培養成理工人才。',
   'Qi Sha in Chen or Xu is gentler; with Wen Chang or Wen Qu, your children can be trained in science and engineering.',
   '辰戌宫七杀，气质较为纯和，宜见昌曲，则可培养为理工人才。', '则可培养为理工人才'),
]})
T.append({'id': '七殺.子女', 'stars': ['七殺'], 'rules': [
 R('子女.七殺.紫權', H('權', '紫微'),
   '七殺與紫微化權同宮，你的子女性格極為剛強。',
   'Qi Sha shares the palace with Zi Wei in Authority: your children are extremely forceful.',
   '七杀与紫微化权同度者，得子三人，但性格极刚，', '但性格极刚'),
 R('子女.七殺.下屬', {'not': {'star': '武曲', 'at': 'same'}},
   '七殺在子女宮，門生弟子和追隨你的晚輩較少。',
   'With Qi Sha in your Children Palace, you have few students or younger followers.',
   '七杀在子女宫虽主子女少，唯若本身命宫见辅佐诸曜或为紫微、天府等主星见『百官朝拱』，则仍主自身下属众多，仅门生弟子，及追随自己的晚辈稀少。', '及追随自己的晚辈稀少', 'base'),
]})

# ── 破軍 ──
T.append({'id': '破軍子午.子女', 'stars': ['破軍'], 'branch': ['子', '午'], 'rules': [
 R('子女.破軍子午.廉祿', H('祿', '廉貞', 'opp'),
   '對宮廉貞化祿，你和子女兩代感情深厚。',
   'Lian Zhen in Abundance opposite: you and your children are deeply close.',
   '子午破军见廉贞化禄，则两代情深。', '子午破军见廉贞化禄，则两代情深'),
 R('子女.破軍子午.本', None,
   '你的子女個性強，容易有代溝；與晚輩要注意調和，但你門下會出好子弟。',
   'Your children are strong characters and a generation gap opens easily; take care to keep things smooth with protégés, though some fine talent will come from your circle.',
   '子午宫破军，见辅佐对星，主子女三人。唯个性强，易有代沟。与晚辈的关系，宜注意调和。但主门下出佳子弟。', '但主门下出佳子弟', 'base'),
]})
T.append({'id': '破軍.子女', 'stars': ['破軍'], 'rules': [
 R('子女.破軍.火', {'star': '火星', 'at': 'same'},
   '破軍與火星同宮，你和子女分隔兩地生活。',
   'Po Jun shares the palace with Huo Xing: you and your children live apart.',
   '破军火星同度，主父子分离。', '破军火星同度，主父子分离', 'limit'),
 R('子女.破軍.祿', {'all': [LU, {'not': SHA}]},
   '破軍得祿而煞輕，你的子女可以白手興家。',
   'Po Jun meeting Lu with few harsh stars: your children can build their fortunes from scratch.',
   '破军得禄，煞轻，则子女有惊险灾病，但终能化解。亦主子女可白手兴家。', '亦主子女可白手兴家'),
]})

# ── 唔限主星（通則，排最後） ──
T.append({'id': '天機.子女', 'stars': ['天機'], 'rules': [
 R('子女.天機.本', None,
   '天機在子女宮，追隨你的下屬和晚輩不多，或者常常更換，關係不長久。',
   'With Tian Ji in your Children Palace, the juniors who follow you are few, or keep changing, and the ties do not last.',
   '在社会人际关系而言，亦主随自己的下属及晚辈稀少，或时时更换，关系不常。', '或时时更换，关系不常', 'base'),
]})
T.append({'id': '天機子午.子女', 'stars': ['天機'], 'branch': ['子', '午'], 'rules': [
 R('子女.天機子午.吉', {'all': [{'hua': ['祿', '權', '科'], 'at': 'same'}, {'any': [FUZUO, KUIYUE]}, {'not': FIRE}]},
   '天機見〔吉化〕又有吉星，你的子女宜培養成專業人才，例如計劃、管理、財務。',
   'Tian Ji meets 〔good transformations〕 and helper stars: raise your children towards a profession, such as planning, management or finance.',
   '天机在子午宫见吉化，又得吉曜扶持，而无火铃同躔毒：宜培养子女为专业人材，不宜从商。尤以计划、管理、财务等业为宜。', '宜培养子女为专业人材'),
 R('子女.天機子午.忌', {'any': [H('忌', '天機'), H('忌', '巨門', 'opp')]},
   '天機或巨門化忌，你要留意子女理想過高、不肯腳踏實地的毛病。',
   'Tian Ji or Ju Men in Hindrance: watch for your children aiming too high and not keeping their feet on the ground.',
   '天机在子午宫，巨门化忌，或天机化忌者，宜注意子女性格，须改善其过高理想，不肯脚踏实地的缺点，否则易自误。', '不肯脚踏实地的缺点'),
]})
T.append({'id': '天機太陰.子女', 'stars': ['天機', '太陰'], 'rules': [
 R('子女.機陰.本', None,
   '天機太陰在子女宮，你的子女心思較浮動不定。',
   'With Tian Ji and Tai Yin in your Children Palace, your children’s minds tend to wander and shift.',
   '一般主心思浮荡不定，化忌则内向，且精神紧张。古则主聪敏。', '一般主心思浮荡不定', 'base'),
 R('子女.機陰.忌', {'any': [H('忌', '天機'), H('忌', '太陰')]},
   '天機或太陰化忌，你的子女性格內向，精神容易緊張。',
   'Tian Ji or Tai Yin in Hindrance: your children are inward-looking and prone to nervous tension.',
   '一般主心思浮荡不定，化忌则内向，且精神紧张。古则主聪敏。', '化忌则内向'),
 R('子女.機陰.吉', {'all': [{'any': [GOODHUA, FUZUO, KUIYUE]}, {'not': {'hua': '忌', 'at': 'same'}}]},
   '天機太陰見〔吉〕，你的子女聰敏機靈，領悟力強。',
   'Tian Ji–Tai Yin meets 〔good signs〕: your children are quick and bright.',
   '一般主心思浮荡不定，化忌则内向，且精神紧张。古则主聪敏。', '古则主聪敏'),
]})
T.append({'id': '天機巨門.子女', 'stars': ['天機', '巨門'], 'rules': [
 R('子女.機巨.本', None,
   '天機巨門在子女宮，即使盤面吉，兩代之間也容易意見不合，和晚輩也有隔膜。',
   'With Tian Ji and Ju Men in your Children Palace, even with good signs the generations tend to disagree, and there is distance with juniors too.',
   '卯酉『天机巨门』纵使吉化，亦主两代参商。见煞忌则更甚。用来推算跟晚辈的关系，则主隔膜，', '纵使吉化，亦主两代参商', 'base'),
 R('子女.機巨.祿', {'hua': '祿', 'at': 'same'},
   '天機巨門見化祿，你和子女表面融和，內心仍有顧忌。',
   'Tian Ji–Ju Men with Abundance: on the surface the generations get along, though reservations remain underneath.',
   '必须见禄然后能改良性质，但只主彼此表面融和，内心仍多顾忌。', '但只主彼此表面融和'),
]})
T.append({'id': '太陽子午.子女', 'stars': ['太陽'], 'branch': ['子', '午'], 'rules': [
 R('子女.太陽子午.輔佐', {'any': [FUZUO, KUIYUE]},
   '太陽見〔輔佐吉星〕，你的子女有社會地位。',
   'Tai Yang meets 〔helper stars〕: your children have standing in society.',
   '子午太阳亦喜辅佐诸曜同会，子女数目可增加，且主子女有社会地位。', '且主子女有社会地位'),
 R('子女.太陽子午.子忌', {'all': [{'branch': ['子']}, H('忌', '太陽')]},
   '太陽在子化忌，你和子女之間有代溝，和晚輩、親信也一樣。',
   'Tai Yang in Zi in Hindrance: there is a generation gap with your children, and with your juniors too.',
   '子育太阳，化忌，主父子有代沟；午宫太阳，化禄，则须防子玄虚浮。与晚辈亲信关系亦可同断。', '主父子有代沟'),
 R('子女.太陽子午.午祿', {'all': [{'branch': ['午']}, H('祿', '太陽')]},
   '太陽在午化祿，你要留意子女流於虛浮。',
   'Tai Yang in Wu in Abundance: watch that your children do not become showy and shallow.',
   '子育太阳，化忌，主父子有代沟；午宫太阳，化禄，则须防子玄虚浮。与晚辈亲信关系亦可同断。', '则须防子玄虚浮'),
]})
T.append({'id': '太陽太陰.子女', 'stars': ['太陽', '太陰'], 'rules': [
 R('子女.陰陽.昌曲', {'star': ['文昌', '文曲'], 'at': 'same'},
   '太陽太陰與文昌或文曲同宮，你的子女聰明。',
   'Tai Yang–Tai Yin beside Wen Chang or Wen Qu: your children are bright.',
   '丑未[阴阳]与昌曲、龙池凤阁、天才等曜同度，主子女聪明。见魁钺则主受贵人提拔。', '主子女聪明。见魁钺'),
 R('子女.陰陽.魁鉞', KUIYUE,
   '太陽太陰見天魁天鉞，你的子女受貴人提拔。',
   'Tai Yang–Tai Yin with Tian Kui or Tian Yue: your children are lifted up by influential people.',
   '丑未[阴阳]与昌曲、龙池凤阁、天才等曜同度，主子女聪明。见魁钺则主受贵人提拔。', '见魁钺则主受贵人提拔'),
 R('子女.陰陽.忌', {'any': [H('忌', '太陽'), H('忌', '太陰')]},
   '太陽或太陰化忌，你的子女主觀強，人生也較多挫折。',
   'Tai Yang or Tai Yin in Hindrance: your children are strong-minded, and meet more setbacks in life.',
   '有一化忌，主子女主观横蛮，人生亦较多挫折。', '人生亦较多挫折'),
]})
T.append({'id': '太陽辰戌.子女', 'stars': ['太陽'], 'branch': ['辰', '戌'], 'rules': [
 R('子女.太陽辰戌.巨吉', {'hua': ['祿', '權'], 'star': '巨門', 'at': 'opp'},
   '對宮巨門化祿或化權，你的子女是開創事業的人才。',
   'Ju Men opposite in Abundance or Authority: your children are made for founding ventures.',
   '茂门化禄权，则子女为兴创事业人材。', '则子女为兴创事业人材'),
]})
T.append({'id': '天同.子女', 'stars': ['天同'], 'rules': [
 R('子女.天同.本', {'not': H('忌', '巨門', ['same', 'opp'])},
   '天同在子女宮，你和子女感情容易溝通，和晚輩也一樣，只是對方稍嫌怕事。',
   'With Tian Tong in your Children Palace, feelings flow easily between you and your children, and with juniors too, though they can be a little timid.',
   '天同在子女宫，主与子女感情易沟通。亦可持此论断跟晚辈的关系，唯嫌其怕事。', '主与子女感情易沟通', 'base'),
 R('子女.天同.祿', {'all': [H('祿', '天同'), {'not': {'branch': ['辰', '戌', '巳', '亥']}}]},
   '天同化祿，你的子女可以白手興家；追隨你的晚輩也容易自立門戶。',
   'Tian Tong in Abundance: your children can build their lives from nothing, and the juniors who follow you tend to strike out on their own.',
   '天同化禄，主子女白手可以兴家。但亦主追随自己的晚辈易脱离自己，另起炉灶。', '主子女白手可以兴家'),
]})
T.append({'id': '天同太陰.子女', 'stars': ['天同', '太陰'], 'rules': [
 R('子女.同陰.昌曲', {'star': ['文昌', '文曲'], 'at': 'sifang'},
   '天同太陰見文昌文曲，你的子女極聰明。',
   'Tian Tong–Tai Yin meets Wen Chang or Wen Qu: your children are very bright.',
   '子午[天同太阴]见昌曲、龙凤、天才，主子女极聪明。', '主子女极聪明'),
 R('子女.同陰.火鈴', FIRE,
   '天同太陰與火星或鈴星同宮，你的子女要防聰明太露。',
   'Tian Tong–Tai Yin beside Huo Xing or Ling Xing: your children should take care not to show off their cleverness.',
   '若躔火铃，则防聪明太露。', '则防聪明太露'),
]})
T.append({'id': '天同卯酉.子女', 'stars': ['天同'], 'branch': ['卯', '酉'], 'rules': [
 R('子女.天同卯酉.理想', None,
   '天同在卯酉，你的子女理想高而不夠實際。',
   'With Tian Tong in Mao or You, your children aim high but can lack realism.',
   '故性格较为好高鹜远，且理想高而少实际。', '且理想高而少实际', 'base'),
]})
T.append({'id': '巨門.子女', 'stars': ['巨門'], 'rules': [
 R('子女.巨門.機', {'all': [{'star': '天機', 'at': 'opp'}, {'not': {'star': '天機', 'at': 'same'}}]},
   '巨門對著天機，你和子女各有主見、各有心思。',
   'Ju Men facing Tian Ji: you and your children each have your own views and your own plans.',
   '巨门与天机同度或拱照，主两代各怀巳见、各有机心。', '主两代各怀巳见'),
 R('子女.巨門.祿', LU,
   '巨門得祿，你和子女之間的疏離會減少。',
   'Ju Men with Lu: the distance between you and your children narrows.',
   '巨门在子女宫得禄，即能减少其孤克之性。', '即能减少其孤克之性'),
 R('子女.巨門辰戌.煞', {'all': [{'branch': ['辰', '戌']}, SHA]},
   '巨門在辰戌見〔煞〕，兩代不和，和晚輩也容易恩將仇報。',
   'Ju Men in Chen or Xu meets 〔harsh stars〕: the generations clash, and juniors may repay kindness badly.',
   '辰戌巨门与煞忌空劫刑耗同会，则刑克甚重，且主两代不和。与晚辈更易恩反成仇。', '且主两代不和'),
]})
T.append({'id': '天相.子女', 'stars': ['天相'], 'rules': [
 R('子女.天相.財蔭夾', {'jia': ['天梁', '祿存']},
   '天相被祿存和天梁相夾，你和子女感情融洽。',
   'Tian Xiang flanked by Lu Cun and Tian Liang: you and your children are close.',
   '则荫夹印，主两代感情融洽；刑忌夹印，主两代感情冰炭。', '主两代感情融洽'),
 R('子女.天相.卯酉煞', {'all': [{'branch': ['卯', '酉']}, SHA]},
   '天相在卯酉見〔煞〕，你和子女的感情常常不夠融洽。',
   'Tian Xiang in Mao or You meets 〔harsh stars〕: feelings between you and your children are often not easy.',
   '卯酉天相，见煞，常主感情不能融洽。', '常主感情不能融洽'),
 R('子女.天相.巳亥煞', {'all': [{'branch': ['巳', '亥']}, SHA]},
   '天相在巳亥見〔煞〕，你的子女性格帶叛逆。',
   'Tian Xiang in Si or Hai meets 〔harsh stars〕: your children have a rebellious streak.',
   '巳亥天相，见煞，主子女有叛逆性格。', '主子女有叛逆性格'),
]})
T.append({'id': '太陰.子女', 'stars': ['太陰'], 'rules': [
 R('子女.太陰.巳亥', {'branch': ['巳', '亥']},
   '太陰在巳亥，你的子女容易為感情所困。',
   'With Tai Yin in Si or Hai, your children are easily caught up in matters of the heart.',
   '巳亥太阴主子女易受情困。', '巳亥太阴主子女易受情困'),
 R('子女.太陰.辰戌昌曲', {'all': [{'branch': ['辰', '戌']}, {'star': ['文昌', '文曲'], 'at': 'same'}, {'star': ['文昌', '文曲'], 'at': 'opp'}]},
   '太陰和對面的太陽各見文昌或文曲，你的子女聰明，將來顯達。',
   'Tai Yin and the Tai Yang opposite each have Wen Chang or Wen Qu: your children are bright and rise high.',
   '辰戌太阴对宫太阳，各躔文昌或文曲，则子女聪明而且贵显。', '则子女聪明而且贵显'),
 R('子女.太陰.辰戌同忌', {'all': [{'branch': ['辰', '戌']}, H('忌', '天同', 'sifang')]},
   '太陰在辰戌會天同化忌，你的子女年紀小小就離家。',
   'Tai Yin in Chen or Xu meets Tian Tong in Hindrance: your children leave home young.',
   '辰戌太阴亦不喜见天同化忌，主子女少小离家；', '主子女少小离家'),
]})
T.append({'id': '子女通則', 'stars': [], 'rules': [
 R('子女.通則.離', {'any': [FIRE, {'all': [{'star': '天馬', 'at': 'same'}, {'star': '祿存', 'at': 'same'}]}]},
   '子女宮見火鈴，或見天馬祿存，你的子女多離家遠行。',
   'With Huo Xing, Ling Xing, or Tian Ma and Lu Cun in the Children Palace, your children tend to live far from home.',
   '子女宫见火铃同度，或见天马禄存，主子女远离膝下。', '主子女远离膝下'),
]})
