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
   '文昌文曲相夾，子女聰明。',
   'Flanked by Wen Chang and Wen Qu, your children are bright.',
   '只见昌曲夹，主子女聪明，只见左右夹，主子女得力，且富创造力。', '只见昌曲夹，主子女聪明'),
 R('子女.紫破.左右夾', {'jia': ['左輔', '右弼']},
   '左輔右弼相夾，子女得力，而且富創造力。',
   'Flanked by Zuo Fu and You Bi, your children are capable and creative.',
   '只见昌曲夹，主子女聪明，只见左右夹，主子女得力，且富创造力。', '只见左右夹，主子女得力，且富创造力'),
 R('子女.紫破.煞', SHA,
   '紫微破軍見煞，下屬晚輩帶反叛性。',
   'Zi Wei with Po Jun and harsh stars: younger colleagues and staff have a rebellious streak.',
   '『紫破』见煞，一般主下属其反叛性。', '一般主下属其反叛性', 'limit'),
]})
T.append({'id': '紫微天相.子女', 'stars': ['紫微', '天相'], 'rules': [
 R('子女.紫相.晚輩', {'not': SHA},
   '紫微天相在子女宮，一般有晚輩扶助你的事業。',
   'With Zi Wei and Tian Xiang in your Children Palace, younger people generally support your work.',
   '[紫相]守子女宫，一般主有晚辈扶助自己的事业，若煞忌刑曜重重，则反为所累。', '一般主有晚辈扶助自己的事业'),
 R('子女.紫相.秀', GOOD,
   '紫微天相見吉，子女出色，富同情心，只是仍然主觀，愛惡分明。',
   'Zi Wei with Tian Xiang and good signs: your children shine and are compassionate, though opinionated, with strong likes and dislikes.',
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
   '見祿馬交馳，子女能在遠方創業；你自己也桃李滿天下。',
   'With Lu and Tian Ma meeting, your children can start ventures far away, and your own students and protégés spread far and wide.',
   '巳亥『紫杀』躔禄马，或与禄马对拱，主：子女能于远方创业。又主自己桃李满天下。', '又主自己桃李满天下'),
]})
T.append({'id': '紫微子午.子女', 'stars': ['紫微'], 'branch': ['子', '午'], 'rules': [
 R('子女.紫微子午.性', None,
   '子女性格倔強，愛惡隨心。',
   'Your children are strong-willed and follow their own likes and dislikes.',
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
   '見文昌文曲，子女聰敏機智。',
   'With Wen Chang or Wen Qu, your children are quick and clever.',
   '寅申『太阳巨门』，子女三人以上。主有辩才，及有学习外语、方言的能力。见昌曲，主聪敏机智；见魁钺，主有说服别人的能力；见辅弼，主有领导力。', '见昌曲，主聪敏机智'),
 R('子女.陽巨.魁鉞', KUIYUE,
   '見天魁天鉞，子女有說服別人的能力。',
   'With Tian Kui or Tian Yue, your children are persuasive.',
   '寅申『太阳巨门』，子女三人以上。主有辩才，及有学习外语、方言的能力。见昌曲，主聪敏机智；见魁钺，主有说服别人的能力；见辅弼，主有领导力。', '见魁钺，主有说服别人的能力'),
 R('子女.陽巨.輔弼', FUZUO,
   '見左輔右弼，子女有領導力。',
   'With Zuo Fu or You Bi, your children have leadership.',
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
   '太陽坐辰，子女聰敏，有魄力。',
   'With Tai Yang in Chen, your children are bright and bold.',
   '辰宫太阳主聪敏及具魄力，戌宫者平常。', '辰宫太阳主聪敏及具魄力', 'base'),
]})
T.append({'id': '太陽巳亥.子女', 'stars': ['太陽'], 'branch': ['巳', '亥'], 'rules': [
 R('子女.太陽巳亥.吉', GOOD,
   '太陽見吉，子女是創業或專業人才，而且偏商業。',
   'Tai Yang with good signs: your children are entrepreneurs or professionals, with a commercial bent.',
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
   '武曲天相在子女宮，與晚輩親信的關係欠佳。',
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
 R('子女.同巨.巨忌', H('忌', '巨門'),
   '巨門化忌，兩代之間不和，也容易與自己提拔的人反目。',
   'Ju Men in Hindrance: the generations clash, and you may fall out with people you promoted.',
   '丑未[天同巨门]若巨门化忌，则主骨肉参商，亦主与自己提拔扶持的人反目；', '亦主与自己提拔扶持的人反目', 'limit'),
]})
T.append({'id': '天同天梁.子女', 'stars': ['天同', '天梁'], 'rules': [
 R('子女.同梁.馬', {'star': '天馬', 'at': ['same', 'opp']},
   '見天馬，子女離家發展。',
   'With Tian Ma, your children leave home to make their way.',
   '寅申『天同天梁』见天马，主子女离家发展。', '主子女离家发展'),
]})
T.append({'id': '天同辰戌.子女', 'stars': ['天同'], 'branch': ['辰', '戌'], 'rules': [
 R('子女.天同辰戌.情', None,
   '子女感情重於理智。',
   'Your children are led more by feeling than by reason.',
   '辰戌宫天同，主子女感1青重于理智。见昌曲桃花者，感情尤重。', '重于理智', 'base'),
 R('子女.天同辰戌.祿', H('祿', '天同'),
   '天同化祿，子女不靠祖業，自己興家。',
   'Tian Tong in Abundance: your children build their own lives without relying on family wealth.',
   '辰戌宫天同化禄，主子女不享祖业而自兴。', '主子女不享祖业而自兴'),
]})
T.append({'id': '天同巳亥.子女', 'stars': ['天同'], 'branch': ['巳', '亥'], 'rules': [
 R('子女.天同巳亥.離', {'any': [FIRE, LUMA]},
   '見火鈴或祿馬，子女離家發展，性格難以捉摸，反叛性強。',
   'With Huo Xing, Ling Xing, or Lu and Tian Ma, your children leave home to find their way; they are hard to read and strongly independent.',
   '见火铃、或见禄马，均主子女离家发展，且性格难以捉摸，反叛性强。', '且性格难以捉摸，反叛性强'),
 R('子女.天同巳亥.祿', H('祿', '天同'),
   '天同化祿，子女離鄉別井。',
   'Tian Tong in Abundance: your children leave their home town.',
   '巳亥天同化禄，虽不见马，亦主子女离乡背井。', '亦主子女离乡背井'),
]})

# ── 廉貞 ──
T.append({'id': '廉貞七殺.子女', 'stars': ['廉貞', '七殺'], 'rules': [
 R('子女.廉殺.吉', {'all': [{'hua': ['祿', '權', '科'], 'at': 'same'}, {'any': [FUZUO, KUIYUE]}]},
   '見吉化又見輔佐吉星，子女成才。',
   'With good transformations and helper stars, your children make something of themselves.',
   '丑未[廉贞七杀]见吉化，及见辅佐吉曜则子女成才。', '则子女成才'),
 R('子女.廉殺.忌', H('忌', '廉貞'),
   '廉貞化忌，兩代意見不合；晚輩也容易以怨報德。',
   'Lian Zhen in Hindrance: the generations disagree, and protégés may repay kindness with resentment.',
   '廉贞化禄，则感情仍深厚；化忌，则主父子参商。又主晚辈以怨报德。', '又主晚辈以怨报德', 'limit'),
]})
T.append({'id': '廉貞天府.子女', 'stars': ['廉貞', '天府'], 'rules': [
 R('子女.廉府.吉', GOOD,
   '廉貞天府見吉，子女出色顯達。',
   'Lian Zhen with Tian Fu and good signs: your children shine and rise.',
   '辰戌宫[廉贞天府]，见吉化吉曜主子女秀发贵显。', '见吉化吉曜主子女秀发贵显'),
]})
T.append({'id': '廉貞寅申.子女', 'stars': ['廉貞'], 'branch': ['寅', '申'], 'rules': [
 R('子女.廉貞寅申.財經', {'all': [H('祿', '廉貞'), H('科', '武曲', 'sifang')]},
   '廉貞化祿會武曲化科，子女可在財經方面發展，但以任公職為宜。',
   'Lian Zhen in Abundance meeting Wu Qu in Merit: your children can do well in finance, best in the public sector.',
   '寅申廉贞化禄会武曲化科，为相当优美的结构，子女可在财政经济方面发展，唯需以任公职为宜。', '子女可在财政经济方面发展'),
 R('子女.廉貞寅申.商', None,
   '子女不宜從商。',
   'Business is not the path for your children.',
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
   '天府見吉化或見祿，子女必能獨當一面，宜發展他們的組織力和領導力。',
   'Tian Fu with good transformations or Lu: your children can certainly stand on their own; develop their organising and leadership skills.',
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
   '天府在子女宮，子女孝順友愛、敦厚誠篤。',
   'With Tian Fu in your Children Palace, your children are dutiful, loving, honest and sincere.',
   '子女宫喜天府加临，主子女孝顺友爱、敦厚诚笃。且数目众多。', '主子女孝顺友爱、敦厚诚笃', 'base'),
]})

# ── 貪狼 ──
T.append({'id': '貪狼寅申.子女', 'stars': ['貪狼'], 'branch': ['寅', '申'], 'rules': [
 R('子女.貪狼寅申.情', {'all': [{'not': H('忌', '廉貞', 'opp')}, {'not': FIRE}]},
   '兩代有感情，比坐子午更深厚。',
   'There is real warmth between the generations, more than when Tan Lang sits in Zi or Wu.',
   '寅申贪狼子女宫，两代有感情。较居子午者为厚。', '两代有感情。较居子午者为厚'),
 R('子女.貪狼寅申.桃李', {'all': [FUZUO, KUIYUE, LUMA]},
   '輔佐吉星齊集又見祿馬，桃李遍天下。',
   'With helper stars gathered and Lu meeting Tian Ma, your students and protégés spread across the world.',
   '故倘辅佐诸曜华集而见禄马，又往往为桃李遍天下。', '又往往为桃李遍天下'),
]})
T.append({'id': '貪狼.子女', 'stars': ['貪狼'], 'rules': [
 R('子女.貪狼.火鈴', FIRE,
   '同宮有火星或鈴星，兩代感情起初融洽，後來卻冷淡。',
   'With Huo Xing or Ling Xing in the palace, the generations start close, but cool over time.',
   '贪狼与火铃同度，主两代感情起初融洽，至后来却冷如冰炭。', '主两代感情起初融洽'),
 R('子女.貪狼.吉', {'all': [GOOD, {'not': FIRE}]},
   '貪狼見吉，兩代和好。',
   'Tan Lang with good signs: the generations get on.',
   '贪狼在子女宫，见吉，主父子和好；若见煞忌则父子不和。', '贪狼在子女宫，见吉，主父子和好'),
 R('子女.貪狼.煞', {'all': [SHA, {'not': GOOD}]},
   '貪狼見煞忌，兩代不和。',
   'Tan Lang with harsh stars: the generations clash.',
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
   '天相與廉貞同宮而見吉，子女是行政人才。',
   'Tian Xiang with Lian Zhen and good signs: your children are natural administrators.',
   '若与廉贞同度或对拱，则仅主二人，吉则子女为行政人才，凶则刑克，且主代沟。', '吉则子女为行政人才'),
]})

# ── 天梁 ──
T.append({'id': '天梁子午.子女', 'stars': ['天梁'], 'branch': ['子', '午'], 'rules': [
 R('子女.天梁子午.出頭', None,
   '要防子女強出頭惹麻煩。',
   'Watch that your children do not stick their necks out and get into trouble.',
   '子午宫天梁，均须防子女因强出头而惹祸。', '均须防子女因强出头而惹祸', 'base'),
 R('子女.天梁子午.陽忌', H('忌', '太陽', 'opp'),
   '對宮太陽化忌，子女宜從事法律、醫藥、社會工作，以救助為一生事業。',
   'With Tai Yang in Hindrance opposite, law, medicine or social work suits your children: a life spent helping others.',
   '子午天梁会太阳化忌，子女宜从事法律、医药、社会工作，即以救助为一生事业。', '即以救助为一生事业'),
]})
T.append({'id': '天梁丑未.子女', 'stars': ['天梁'], 'branch': ['丑', '未'], 'rules': [
 R('子女.天梁丑未.煞', SHA,
   '同宮有煞，子女宜學工程或工藝，現代多是電訊、電子、電腦工程。',
   'With harsh stars in the palace, your children should study engineering or a craft, these days telecoms, electronics or computing.',
   '丑未天梁，煞曜同度，子女宜学习工程或工艺。在现代又往往为电讯、电子、计算机工程。', '在现代又往往为电讯、电子、计算机工程'),
 R('子女.天梁丑未.少', None,
   '親近你的晚輩不多。',
   'Few younger people are close to you.',
   '丑未天梁子女固不多，亲近的晚辈亦不多，或主得力者易难。', '亲近的晚辈亦不多', 'base'),
]})
T.append({'id': '天梁.子女', 'stars': ['天梁'], 'rules': [
 R('子女.天梁.吉', {'all': [GOOD, {'not': SHA}]},
   '天梁見吉，手下人眾多而且得力。',
   'Tian Liang with good signs: you have many capable people working under you.',
   '天梁见吉化吉曜，亦主手下人众多，且得力，唯若同时见煞，则亦主手下人可能对自己不利。', '亦主手下人众多，且得力'),
]})

# ── 七殺 ──
T.append({'id': '七殺寅申.子女', 'stars': ['七殺'], 'branch': ['寅', '申'], 'rules': [
 R('子女.七殺寅申.倔', None,
   '子女倔強、孤立，要特別注意培養他們處理人際關係。',
   'Your children are stubborn and solitary, so take special care to help them learn to handle people.',
   '寅申七杀，子女倔强，孤立，须注意培育，特别须注意训练其处理人际关系。', '特别须注意训练其处理人际关系', 'base'),
 R('子女.七殺寅申.晚輩', None,
   '晚輩較倨傲、不受駕馭，提拔親信時要留意。',
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
   '與紫微化權同宮，子女性格極剛。',
   'With Zi Wei in Authority in the palace, your children are extremely forceful.',
   '七杀与紫微化权同度者，得子三人，但性格极刚，', '但性格极刚'),
 R('子女.七殺.下屬', None,
   '七殺在子女宮，門生弟子和追隨你的晚輩較少。',
   'With Qi Sha in your Children Palace, you have few students or younger followers.',
   '七杀在子女宫虽主子女少，唯若本身命宫见辅佐诸曜或为紫微、天府等主星见『百官朝拱』，则仍主自身下属众多，仅门生弟子，及追随自己的晚辈稀少。', '及追随自己的晚辈稀少', 'base'),
]})

# ── 破軍 ──
T.append({'id': '破軍子午.子女', 'stars': ['破軍'], 'branch': ['子', '午'], 'rules': [
 R('子女.破軍子午.廉祿', H('祿', '廉貞', 'opp'),
   '對宮廉貞化祿，兩代情深。',
   'With Lian Zhen in Abundance opposite, the generations are deeply close.',
   '子午破军见廉贞化禄，则两代情深。', '子午破军见廉贞化禄，则两代情深'),
 R('子女.破軍子午.本', None,
   '子女個性強，容易有代溝；與晚輩要注意調和，但門下會出好子弟。',
   'Your children are strong characters and a generation gap opens easily; take care to keep things smooth with protégés, though some fine talent will come from your circle.',
   '子午宫破军，见辅佐对星，主子女三人。唯个性强，易有代沟。与晚辈的关系，宜注意调和。但主门下出佳子弟。', '但主门下出佳子弟', 'base'),
]})
T.append({'id': '破軍.子女', 'stars': ['破軍'], 'rules': [
 R('子女.破軍.火', {'star': '火星', 'at': 'same'},
   '同宮有火星，兩代分隔兩地。',
   'With Huo Xing in the palace, the generations live apart.',
   '破军火星同度，主父子分离。', '破军火星同度，主父子分离', 'limit'),
 R('子女.破軍.祿', {'all': [LU, {'not': SHA}]},
   '破軍得祿而煞輕，子女可以白手興家。',
   'Po Jun meeting Lu with few harsh stars: your children can build their fortunes from scratch.',
   '破军得禄，煞轻，则子女有惊险灾病，但终能化解。亦主子女可白手兴家。', '亦主子女可白手兴家'),
]})

# ── 唔限主星（通則，排最後） ──
T.append({'id': '子女通則', 'stars': [], 'rules': [
 R('子女.通則.離', {'any': [FIRE, {'all': [{'star': '天馬', 'at': 'same'}, {'star': '祿存', 'at': 'same'}]}]},
   '子女宮見火鈴，或見天馬祿存，子女多離家遠行。',
   'With Huo Xing, Ling Xing, or Tian Ma and Lu Cun in the Children Palace, your children tend to live far from home.',
   '子女宫见火铃同度，或见天马禄存，主子女远离膝下。', '主子女远离膝下'),
]})
