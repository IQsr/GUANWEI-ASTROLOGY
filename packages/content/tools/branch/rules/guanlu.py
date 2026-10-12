# 官祿宮規則（2026-10-12）。天機見 tianji-guanlu.json（試點，唔喺度重寫）。
# 題目次序 = 合併輸出次序：組合／地支題目行先，單星通則其次，唔限主星嘅通則最後（主星規則少過兩條先出）。
FIRE = {'star': ['火星', '鈴星'], 'at': 'same'}
KONG = {'star': ['地空', '地劫'], 'at': 'same'}
SHA = {'star': ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'], 'at': 'same'}
YANGTUO = {'star': ['擎羊', '陀羅'], 'at': 'same'}
FUZUO = {'star': ['左輔', '右弼'], 'at': 'sifang'}
KUIYUE = {'star': ['天魁', '天鉞'], 'at': 'sifang'}
CHANGQU = {'star': ['文昌', '文曲'], 'at': 'sifang'}
GOODHUA = {'hua': ['祿', '權', '科'], 'at': 'same'}
LU = {'any': [{'hua': '祿', 'at': 'sifang'}, {'star': '祿存', 'at': 'sifang'}]}
LUMA = {'all': [{'star': '天馬', 'at': ['same', 'opp']}, {'any': [{'star': '祿存', 'at': ['same', 'opp']}, {'hua': '祿', 'at': ['same', 'opp']}]}]}
def H(hua, star, at='same'): return {'hua': hua, 'star': star, 'at': at}
def R(id, when, text, en, src, quote, role='refine'):
    return {'id': id, 'when': when, 'text': text, 'en': en, 'src': src, 'quote': quote, 'role': role}

# ── 宮位連動（2026-10-12）：排最前，見 branch.ts palaceState() ──
def PS(name, st): return {'palace': name, 'is': st}
T.append({'id': '官祿連動', 'stars': [], 'link': True, 'rules': [
 R('官祿.連動.官夫皆吉', {'all': [PS('官祿', 'good'), PS('夫妻', 'good')]},
   '你的官祿宮和夫妻宮星曜都吉利：夫妻可以合作事業，或者各自發展都成功，夫妻關係也和美。',
   'Your Career and Partnership Palaces are both favourable: you and your partner can work together, or both succeed separately, and the relationship stays warm.',
   '若事业宫星曜吉，夫妻宫星曜变吉，则主夫妻可合作事业，或彼此发展成功，而夫妻关系亦和美；', '则主夫妻可合作事业'),
 R('官祿.連動.官吉夫凶', {'all': [PS('官祿', 'good'), PS('夫妻', 'bad')]},
   '你的官祿宮吉利，夫妻宮卻不吉利：夫妻只宜各自發展事業。',
   'Your Career Palace is favourable but your Partnership Palace is not: you and your partner should each pursue your own careers.',
   '倘事业宫星曜吉，夫妻宫星曜不吉，则只宜夫妻各自发展事业；', '则只宜夫妻各自发展事业', 'limit'),
 R('官祿.連動.官夫皆凶', {'all': [PS('官祿', 'bad'), PS('夫妻', 'bad')]},
   '你的官祿宮和夫妻宮星曜都不吉利：夫妻在事業上互相幫不上忙，夫妻之間不宜合作。',
   'Your Career and Partnership Palaces are both unfavourable: you and your partner cannot help each other’s careers, so the two of you should not work together.',
   '若事业宫星曜不吉，而夫妻宫星曜亦不吉，则夫妻彼此事业无助，绝对不宜合作。', '绝对不宜合作', 'limit'),
 R('官祿.連動.空劫分', {'any': [{'all': [{'palace': '官祿', 'star': '地空'}, {'palace': '夫妻', 'star': '地劫'}]}, {'all': [{'palace': '官祿', 'star': '地劫'}, {'palace': '夫妻', 'star': '地空'}]}]},
   '你的官祿宮和夫妻宮，一宮有地空、一宮有地劫：事業容易因遷就伴侶而受影響，例如為伴侶放棄較好的職位；彼此又未必遷就得到底，也會影響感情。',
   'Your Career and Partnership Palaces hold Di Kong and Di Jie between them: your career can suffer from accommodating your partner, such as giving up a better post; yet neither of you can accommodate forever, and the relationship feels it too.',
   '事业夫妻两宫，最不喜一麓地空，一隧地劫(此唯寅申两富有之则主因受配偶影响而致事业不利(例如因迁就配偶，自己牺牲一份较优厚的职位等)但彼此又不能迁就到底，故亦常影响婚姻。', '例如因迁就配偶，自己牺牲一份较优厚的职位等', 'limit'),
]})

# ── 紫微 ──
T.append({'id': '紫微破軍.官祿', 'stars': ['紫微', '破軍'], 'rules': [
 R('官祿.紫破.開創', None,
   '紫微破軍在官祿宮，以發揮開創力為佳：無論從商從政，都主開創而不主守成，所以常有勞累之感。',
   'With Zi Wei and Po Jun in your Career Palace, you do best when you break new ground: in business or public life you build rather than hold, which is why it so often feels tiring.',
   '丑未宫[紫微破军]在事业宫，以能发挥开创力者为佳。故无论从商从政，皆主开创而不主守成，因而便有劳累之感。', '皆主开创而不主守成', 'base'),
 R('官祿.紫破.祿', H('祿', '破軍'),
   '破軍化祿，一生事業多變，也常要負擔額外的工作。',
   'Po Jun in Abundance: your career changes often, and you frequently carry extra work.',
   '若破军化禄，则一生事业多变，且常负担额外工作。', '则一生事业多变，且常负担额外工作'),
 R('官祿.紫破.左右', FUZUO,
   '紫微破軍見左輔右弼，你開創新局面時多人幫手。',
   'Zi Wei–Po Jun meets Zuo Fu or You Bi: when you break new ground, plenty of people lend a hand.',
   '[紫破]之开创，乃指凭空打开局面，或以崭新手法营运而言。故喜左辅右弼同度，则自多助力。', '则自多助力'),
]})
T.append({'id': '紫微天府.官祿', 'stars': ['紫微', '天府'], 'rules': [
 R('官祿.紫府.朝拱', {'all': [FUZUO, KUIYUE]},
   '你的紫微天府得輔佐吉星拱照，事業可以有成。',
   'Your Zi Wei–Tian Fu is surrounded by helper stars, so your career can come to something.',
   '寅申宫[紫微天府]同度，必须见百官司朝拱然后施主有成，', '必须见百官司朝拱然后施主有成'),
 R('官祿.紫府.無吉', {'not': {'any': [FUZUO, KUIYUE]}},
   '你的紫微天府不見輔佐吉星，事業上容易進退失據；目標要配合實力。',
   'Your Zi Wei–Tian Fu lacks helper stars, so you can lose your footing at work; match your aims to your means.',
   '若无吉曜，则往往进退失据，或志大才疏。', '则往往进退失据', 'limit'),
 R('官祿.紫府.科', {'any': [H('科', '紫微'), H('科', '天府')]},
   '紫微化科主白手開創事業；天府化科則在現成的局面下發展。',
   'Zi Wei in Merit means building a career from scratch; Tian Fu in Merit means growing within something already in place.',
   '[紫府]而紫微化科，主白手与创事业；若天府化科，则主在现成局面下兴创。', '则主在现成局面下兴创'),
]})
T.append({'id': '紫微貪狼.官祿', 'stars': ['紫微', '貪狼'], 'rules': [
 R('官祿.紫貪.消費', None,
   '紫微貪狼在官祿宮，你以從事消費性行業為宜。',
   'With Zi Wei and Tan Lang in your Career Palace, consumer-facing industries suit you.',
   '卯酉宫f紫微贪狼I以从事消费性待业为宜。', '以从事消费性待业为宜', 'base'),
 R('官祿.紫貪.左右', {'star': ['左輔', '右弼'], 'at': ['same', 'opp']},
   '見左輔右弼，手下人多；記得與下屬分享成果，事業才能長久。',
   'With Zuo Fu or You Bi, you lead many people; share the rewards with them and the business will last.',
   '『紫贪』躔左辅或右弼，对宫为右弼或左辅，则构成良好格局，主下属众多。唯必须分润下属。然后事业始能持久。', '唯必须分润下属'),
 R('官祿.紫貪.忌', H('忌', '貪狼'),
   '貪狼化忌，你與人合作往往不能長久。',
   'Tan Lang in Hindrance: partnerships tend not to last.',
   '紫贪而贪狼化忌，常主与人合作不能长久。', '常主与人合作不能长久', 'limit'),
]})
T.append({'id': '紫微天相.官祿', 'stars': ['紫微', '天相'], 'rules': [
 R('官祿.紫相.副貳', None,
   '紫微天相在官祿宮，常做副手：實際上獨當一面，名義卻不及實際。',
   'With Zi Wei and Tian Xiang in your Career Palace, you often serve as deputy: you run things in practice, but your title falls short of what you do.',
   '[紫相]守事业宫，常居副贰，虽实际工作独当～面，而名义则不如实际。', '而名义则不如实际', 'base'),
 R('官祿.紫相.合作', None,
   '你宜與人合作，但一定要真正參與領導核心。',
   'Working with partners suits you, as long as you are genuinely part of the leadership.',
   '[紫相]守事业宫，亦宜与人合作，唯必须实际参加领导核心工作。', '唯必须实际参加领导核心工作'),
]})
T.append({'id': '紫微七殺.官祿', 'stars': ['紫微', '七殺'], 'rules': [
 R('官祿.紫殺.管理', None,
   '紫微七殺在官祿宮，長處在管理，最宜管人、帶團隊。',
   'With Zi Wei and Qi Sha in your Career Palace, your strength is management; leading people suits you best.',
   '巳亥[紫微七杀]在事业宫，其特长在于管理，故宜以人力资源为主。', '其特长在于管理', 'base'),
 R('官祿.紫殺.科', H('科', '紫微'),
   '紫微化科，加強你管理和領導的力量。',
   'Zi Wei in Merit strengthens your management and leadership.',
   '『紫杀』最喜紫微化科，可加强管理领导之力。', '可加强管理领导之力'),
 R('官祿.紫殺.祿馬', LUMA,
   '見祿馬交馳，你一生要轉幾次行業，然後才安定。',
   'With Lu and Tian Ma meeting, you change line of work a few times before you settle.',
   '[紫杀]见禄马交驰，一生三度转业然后始安定。', '一生三度转业然后始安定'),
]})
T.append({'id': '紫微.官祿', 'stars': ['紫微'], 'rules': [
 R('官祿.紫微.科', H('科', '紫微'),
   '紫微化科，你名大於利，以自由職業或專業為宜。',
   'Zi Wei in Merit: reputation outweighs money, so freelance or professional work suits you.',
   '紫微化科在事业宫，主名大于利，故以自由职业，或专业人士为宜。', '故以自由职业，或专业人士为宜'),
 R('官祿.紫微.權', H('權', '紫微'),
   '紫微化權，你的工作獨立性強，能獨當一面。',
   'Zi Wei in Authority: your work is highly independent, and you can run things on your own.',
   '紫微化权在事业宫，仅主独当一面，或所从事工作独立性强。', '或所从事工作独立性强'),
 R('官祿.紫微.本', None,
   '紫微在官祿宮，主獨當一面：多是獨立工作或負責一個部門，不一定是自己經營或做領袖。',
   'With Zi Wei in your Career Palace, you work on your own terms: usually independently or in charge of a department, not necessarily as owner or leader.',
   '紫微在事业宫，主独当一面。但却并不意味其人可以宁行经营，亦不主其人可为领袖。一般情况下仅主独立工作，或负责部门工作。', '一般情况下仅主独立工作，或负责部门工作', 'base'),
]})

# ── 太陽 ──
T.append({'id': '太陽太陰.官祿', 'stars': ['太陽', '太陰'], 'rules': [
 R('官祿.陰陽.內務', None,
   '太陽太陰在官祿宮，較傾向內務：行政、管理、財務、計劃一類工作較合適。',
   'With Tai Yang and Tai Yin in your Career Palace, you lean to internal roles: administration, management, finance and planning suit you.',
   '太阳太阴的星系，在事业宫，比较倾向于内务。故以行政管理财务计划等为宜。', '故以行政管理财务计划等为宜', 'base'),
]})
T.append({'id': '太陽巨門.官祿', 'stars': ['太陽', '巨門'], 'rules': [
 R('官祿.陽巨.外務', None,
   '太陽巨門在官祿宮，工作的性質離不開口才、外地或外國，以及對外的事務。',
   'With Tai Yang and Ju Men in your Career Palace, your work revolves around speaking, people from other places, and outward-facing affairs.',
   '寅申宫『太阳巨门』同度，基本性质为口舌、为异族、为外务', '基本性质为口舌、为异族、为外务', 'base'),
 R('官祿.陽巨.吉', {'hua': ['祿', '權', '科'], 'star': ['太陽', '巨門'], 'at': 'same'},
   '太陽或巨門吉化，容易在傳播、廣告一類行業成名。',
   'With Tai Yang or Ju Men well transformed, you can make your name in media or advertising.',
   '太阳巨门见吉化，均主传播、广告等业成名。', '均主传播、广告等业成名'),
]})
T.append({'id': '太陽天梁.官祿', 'stars': ['太陽', '天梁'], 'rules': [
 R('官祿.陽梁.服務', None,
   '太陽天梁在官祿宮，名重於利，宜專業工作；最適合醫藥、保險一類服務性行業。',
   'With Tai Yang and Tian Liang in your Career Palace, reputation counts for more than money; professional work suits you, above all service fields such as medicine or insurance.',
   '太阳天梁的星系，最宜从事医药、保险等服务性行业。', '最宜从事医药、保险等服务性行业', 'base'),
]})
T.append({'id': '太陽子午.官祿', 'stars': ['太陽'], 'branch': ['子', '午'], 'rules': [
 R('官祿.太陽子午.專業', None,
   '名重於利，最宜專業工作，或建立自己的品牌商譽。',
   'Reputation counts for more than money; professional work suits you best, or building a brand of your own.',
   '子午宫太阳，与天梁对拱，名重于利，最宜专业工作，或建立商标商誉。', '最宜专业工作，或建立商标商誉', 'base'),
]})
T.append({'id': '太陽.官祿', 'stars': ['太陽'], 'rules': [
 R('官祿.太陽.祿', H('祿', '太陽'),
   '太陽化祿，事業以名聲為主；經商的話，尤其要重視品牌商譽。',
   'Tai Yang in Abundance: your career runs on reputation; in business, look after your brand above all.',
   '太阳化禄，、事业以声名为主，若经商，尤须注意商标、商誉。', '尤须注意商标、商誉'),
 R('官祿.太陽.權', H('權', '太陽'),
   '太陽化權，事業容易受外地或外國人提拔賞識；多學外語，對事業有幫助。',
   'Tai Yang in Authority: people from other places or countries tend to lift you up; learning their languages helps your career.',
   '太阳化权，则巨门必同时化禄。在事业宫，此为受异族提拔、赏识之星系，或一生事业与异族有莫大关系，因此须提高外语知识，俾便适应。', '此为受异族提拔、赏识之星系'),
 R('官祿.太陽.科', H('科', '太陽'),
   '太陽化科，你宜做有榮譽感的專業工作。',
   'Tai Yang in Merit: work that carries honour, in a profession, suits you.',
   '太阳化科，宜事业有荣誉感。例如名医、名律师，或有声誉的社会工作者之类，皆不出专业人士范围。', '宜事业有荣誉感'),
 R('官祿.太陽.忌', H('忌', '太陽'),
   '太陽化忌，宜做帶排難解紛或靠口才的工作，例如教學、演唱。',
   'Tai Yang in Hindrance: work that resolves disputes or relies on speaking suits you, such as teaching or performing.',
   '太阳化忌，所从事行业必须有排难解纷，或是非口舌的色彩。但所谓口舌是非却未必指纷争，如教学、演唱等，', '所从事行业必须有排难解纷'),
 R('官祿.太陽.左右', FUZUO,
   '太陽見左輔右弼，你工作上可以少些奔波勞碌。',
   'Tai Yang meets Zuo Fu or You Bi: your work involves less running around.',
   '太阳喜左辅、右弼同会事业宫，则可减少其发射力，亦即较少奔劳。', '亦即较少奔劳'),
 R('官祿.太陽.本', None,
   '太陽主貴，在官祿宮很合適：順的話在行內有名聲，不順也有號召力。',
   'Tai Yang brings standing and sits well in the Career Palace: in good times you are known in your field, and even in bad times people follow you.',
   '太阳主贵，故守事业宫颇为适合。吉则在行业中必有声名，纵凶亦主有号召力。', '纵凶亦主有号召力', 'base'),
]})

# ── 武曲 ──
T.append({'id': '武曲天府.官祿', 'stars': ['武曲', '天府'], 'rules': [
 R('官祿.武府.祿', {'all': [LU, {'not': SHA}]},
   '你的武曲天府見祿而無煞，適合財經、稅務一類的工作。',
   'Your Wu Qu–Tian Fu meets Lu without harsh stars, which suits finance or tax work.',
   '子午宫[武曲天府]对宫为七杀，无煞忌刑而有禄，则主为财赋之官，', '则主为财赋之官'),
 R('官祿.武府.煞', SHA,
   '武曲天府與煞星同宮，你適合往工程、技藝方面發展。',
   'Wu Qu–Tian Fu shares the palace with harsh stars: engineering and technical skills are the direction for you.',
   '[武曲天府]与煞曜同度，则宜工程技艺。亦以有禄为佳。', '则宜工程技艺'),
]})
T.append({'id': '武曲貪狼.官祿', 'stars': ['武曲', '貪狼'], 'rules': [
 R('官祿.武貪.合作', None,
   '武曲貪狼在官祿宮，喜與人合作，所做的事業也不只一門。',
   'With Wu Qu and Tan Lang in your Career Palace, you like working with partners, and run more than one line of business.',
   '[武曲贪狼]守事业宫，喜与人合作，故所业亦不只一端。', '故所业亦不只一端', 'base'),
 R('官祿.武貪.忌', H('忌', '貪狼'),
   '貪狼化忌，你一生奔波勞碌，事業多頭並進。',
   'Tan Lang in Hindrance: a life of rushing about, with many ventures at once.',
   '丑未[武曲贪狼]，见贪狼化忌者，终生不得闲暇，奔波劳碌，事业多端，', '终生不得闲暇，奔波劳碌，事业多端', 'limit'),
]})
T.append({'id': '武曲天相.官祿', 'stars': ['武曲', '天相'], 'rules': [
 R('官祿.武相.文武', None,
   '武曲天相在官祿宮，主文職武做，或武職文做：內外兼顧的工作最合適。',
   'With Wu Qu and Tian Xiang in your Career Palace, you bring a hands-on edge to desk work, or a careful hand to field work; roles that span both suit you.',
   '寅申宫[武曲天相]，主文职武做，或武职文做。', '主文职武做，或武职文做', 'base'),
 R('官祿.武相.吉', GOODHUA,
   '見吉化，你宜與人合作，而且要負實際責任。',
   'With good transformations, partnership suits you, with real responsibility in your hands.',
   '[武曲天相]守事业宫，有吉化，亦主与人合作，且须负实际责任。', '且须负实际责任'),
]})
T.append({'id': '武曲七殺.官祿', 'stars': ['武曲', '七殺'], 'rules': [
 R('官祿.武殺.本煞', SHA,
   '同宮有煞，宜從事工程技藝，以帶金屬性質的為佳。',
   'With harsh stars in the palace, engineering and technical work suits you, especially with metal.',
   '若煞在本宫，则仅主工程技艺。亦以带金属性质者为宜', '则仅主工程技艺'),
 R('官祿.武殺.紀律', {'all': [{'star': ['擎羊', '陀羅', '火星', '鈴星'], 'at': 'trine'}, {'not': SHA}]},
   '三方有煞而本宮無煞，適合紀律部隊或制度嚴謹的機構出身。',
   'With harsh stars in the trines but not in the palace itself, a disciplined service or tightly run organisation is a good start for you.',
   '卯酉宫[武曲七杀]有煞曜在三方者，宜军旅出身。', '宜军旅出身'),
]})
T.append({'id': '武曲破軍.官祿', 'stars': ['武曲', '破軍'], 'rules': [
 R('官祿.武破.工程', {'not': {'star': ['擎羊', '陀羅', '火星', '鈴星'], 'at': 'same'}},
   '武曲破軍煞星輕，你適合由工程技術起家。',
   'Wu Qu–Po Jun with only light harsh stars: engineering and technical work is a good way for you to start.',
   '[武破]煞轻，亦宜工程技术起家，', '亦宜工程技术起家', 'base'),
 R('官祿.武破.破祿', H('祿', '破軍'),
   '破軍化祿，點子多而不愛務實：見天魁天鉞才多機會，見左輔右弼才多助力。',
   'Po Jun in Abundance: full of ideas but impatient with the practical; Tian Kui and Tian Yue bring chances, Zuo Fu and You Bi bring help.',
   '[武破h丽玻军化禄，擅开剑而不擅守戚，鼠主意多而不喜务实。故必须与魁钺同会，然后始主翳得机会；与辅弼同会，然后始主多得助力。', '主意多而不喜务实'),
]})
T.append({'id': '武曲.官祿', 'stars': ['武曲'], 'rules': [
 R('官祿.武曲.財經', GOODHUA,
   '武曲是財星，又有吉化，你利於從事財經工作。',
   'Wu Qu is the wealth star, and well transformed it favours work in finance.',
   '武曲为财星，守事业宫时，利于从事财经工作，或为赋税官吏。此以得化禄、化权、化科者为宜。', '利于从事财经工作'),
 R('官祿.武曲.左右', FUZUO,
   '武曲主行動，見左輔右弼，你的行動有人相助。',
   'Wu Qu is about action, and with Zuo Fu or You Bi your actions have backing.',
   '所以喜见左辅右弼，主行动有助力。', '主行动有助力'),
]})

# ── 天同 ──
T.append({'id': '天同太陰.官祿', 'stars': ['天同', '太陰'], 'rules': [
 R('官祿.同陰.多方', None,
   '天同太陰在官祿宮，事業多變，而且往往同時有幾方面；是內外兼顧、有責任感的人才。',
   'With Tian Tong and Tai Yin in your Career Palace, work changes often and runs on several fronts; you handle inside and outside alike, with a strong sense of duty.',
   '[天同太阴]守事业宫，亦主事业多变，且主有多方面的事业。', '且主有多方面的事业', 'base'),
]})
T.append({'id': '天同巨門.官祿', 'stars': ['天同', '巨門'], 'rules': [
 R('官祿.同巨.煞忌', {'any': [SHA, {'hua': '忌', 'at': 'same'}]},
   '天同巨門見煞忌，你的事業反而要經歷艱難，然後成就大業。',
   'Tian Tong–Ju Men meets harsh stars or Hindrance: your career goes through hardship, and that is how you build something great.',
   '[天同巨门]见煞忌，反主历艰危而成大业。', '反主历艰危而成大业'),
 R('官祿.同巨.半途', None,
   '天同巨門在官祿宮，事業容易半途而廢；要選本質就要勞心的工作，才有成就。',
   'With Tian Tong and Ju Men in your Career Palace, ventures are easily dropped halfway; choose work that demands mental effort by its very nature, and you will get somewhere.',
   '丑未宫[天同巨门]，即使吉辅诸曜毕集，亦主事业每半途而废。', '亦主事业每半途而废', 'base'),
]})
T.append({'id': '天同天梁.官祿', 'stars': ['天同', '天梁'], 'rules': [
 R('官祿.同梁.內務', None,
   '天同天梁在官祿宮，宜擔任公職，工作以計劃、管理一類內務為宜。',
   'With Tian Tong and Tian Liang in your Career Palace, public-sector work suits you, in internal roles such as planning and management.',
   '[天同天梁]所从事者必以内务为宜。如计划、管理之类。', '如计划、管理之类', 'base'),
]})
T.append({'id': '天同.官祿', 'stars': ['天同'], 'rules': [
 R('官祿.天同.忌', H('忌', '天同'),
   '天同化忌，往往很早就要出來工作，但事業的起步也可能更早。',
   'Tian Tong in Hindrance: you often start working young, but your career may also take off earlier.',
   '天同化忌，往往早年即须工作，但事业之创兴却可能比化禄者为早，', '但事业之创兴却可能比化禄者为早'),
 R('官祿.天同.享受', None,
   '天同主享受，適合經營講究美觀或帶享受色彩的行業。',
   'Tian Tong loves comfort, so businesses built around beauty or enjoyment suit you.',
   '天同又主享受，故居事业宫，每主适宜经营美观或带享受色彩之行业。', '每主适宜经营美观或带享受色彩之行业'),
 R('官祿.天同.白手', None,
   '天同在官祿宮，事業由白手創起；往往宜離鄉發展。',
   'With Tian Tong in your Career Palace, you build your career from nothing, often away from home.',
   '天同守事业宫，主事业必由白手创兴。', '主事业必由白手创兴', 'base'),
]})

# ── 廉貞 ──
T.append({'id': '廉貞天相.官祿', 'stars': ['廉貞', '天相'], 'rules': [
 R('官祿.廉相.合作', None,
   '廉貞天相在官祿宮，常與人合作事業，所以夥伴的好壞很重要。',
   'With Lian Zhen and Tian Xiang in your Career Palace, you often work in partnership, so the quality of your partners matters a great deal.',
   '子午宫[廉贞天相]，常主与人合作事业，故须注意兄弟宫的星曜组是否吉利，', '常主与人合作事业', 'base'),
 R('官祿.廉相.魁鉞', KUIYUE,
   '見天魁天鉞，你從政或在公營機構的路會較順。',
   'With Tian Kui or Tian Yue, a path in public office or public bodies runs more smoothly.',
   '[廉贞天相]，亦为从政之星，或至少对政治有兴趣，则必须见天魁天钺，仕途始觉亨通。', '仕途始觉亨通'),
]})
T.append({'id': '廉貞破軍.官祿', 'stars': ['廉貞', '破軍'], 'rules': [
 R('官祿.廉破.祿', LU,
   '廉貞破軍見祿，你的事業有了成功的基礎。',
   'Lian Zhen–Po Jun meets Lu: your career has the footing it needs to succeed.',
   '卯酉宫[廉贞破军]]必须见禄然后始主事业有成。', '必须见禄然后始主事业有成'),
 R('官祿.廉破.應酬', {'any': [GOODHUA, FUZUO, KUIYUE]},
   '見吉，多因事業而應酬，又由應酬發展事業，所做的不只一門。',
   'With good signs, work brings socialising and socialising brings work, so you run more than one line.',
   '廉破守事业宫见吉，多因事业而应酗，又由应酬发展事业，故其所经营，不只一端。', '又由应酬发展事业'),
]})
T.append({'id': '廉貞天府.官祿', 'stars': ['廉貞', '天府'], 'rules': [
 R('官祿.廉府.財經', None,
   '廉貞天府在官祿宮，你的事業傾向財經。',
   'With Lian Zhen and Tian Fu in your Career Palace, your career leans towards finance.',
   '辰戌宫廉贞天府同度，事业倾向于财经。', '事业倾向于财经', 'base'),
 R('官祿.廉府.科', H('科', '天府'),
   '天府化科，你的事業和名聲緊扣在一起，口碑直接影響發展。',
   'Tian Fu in Merit: your career and reputation are tightly bound, and your standing shapes how far you go.',
   '天府化科，则事业与声誉有密切关系。', '则事业与声誉有密切关系'),
]})
T.append({'id': '廉貞貪狼.官祿', 'stars': ['廉貞', '貪狼'], 'rules': [
 R('官祿.廉貪.場面', None,
   '廉貞貪狼在官祿宮，從商場面必大；有祿才實在，無祿容易外表豪華、內裡空虛。',
   'With Lian Zhen and Tan Lang in your Career Palace, any business you run is on a grand scale; with Lu it has substance, without Lu it can be all show.',
   '若从商，场面必大。有禄则可，无禄者易流为外表豪华，内在空虚。', '若从商，场面必大', 'base'),
]})
T.append({'id': '廉貞寅申.官祿', 'stars': ['廉貞'], 'branch': ['寅', '申'], 'rules': [
 R('官祿.廉貞寅申.財經', None,
   '你以從商為宜，最適合財經金融行業，負責買賣。',
   'Business suits you, above all finance and banking, in a trading role.',
   '寅申宫廉贞，亦带投机性质，故若从商，最宜投身财经金融行业，负买卖之责。', '最宜投身财经金融行业'),
]})

# ── 天府 ──
T.append({'id': '天府.官祿', 'stars': ['天府'], 'rules': [
 R('官祿.天府.祿', LU,
   '天府得祿，你的事業發展順利，路越走越寬。',
   'Tian Fu gains Lu: your career goes smoothly, and the road widens as you go.',
   '天府必须得禄，然后事业始主亨通。', '天府必须得禄，然后事业始主亨通'),
 R('官祿.天府.無祿', {'not': LU},
   '天府不見祿，你的事業就算好，也容易外強中乾。',
   'Without Lu, even a good career can be stronger on the outside than within.',
   '否则事业虽佳，亦不过外强中干而已。', '亦不过外强中干而已', 'limit'),
 R('官祿.天府.空劫', KONG,
   '同宮有地空地劫，既想改革又保守，宜做實業，切忌投機。',
   'With Di Kong or Di Jie in the palace, you want change but cling to caution; stick to real business and avoid speculation.',
   '天府有空劫同度者，事业多进退失据，既思改革，又保守，以致事业发展受到障碍。故以从事实业为宜。切忌投机。', '故以从事实业为宜。切忌投机'),
 R('官祿.天府.踏實', None,
   '天府不主浮華，你做任何事業都以腳踏實地為佳。',
   'Tian Fu is not for show: whatever you do, keep your feet on the ground.',
   '天府不主浮华，凡有经营，皆以脚踏实地为佳，', '凡有经营，皆以脚踏实地为佳', 'base'),
]})

# ── 太陰 ──
T.append({'id': '太陰卯酉.官祿', 'stars': ['太陰'], 'branch': ['卯', '酉'], 'rules': [
 R('官祿.太陰酉.外國', {'branch': ['酉']},
   '太陰坐酉，事業廣大，可以擴展到外國，或一生事業與外國有關。',
   'With Tai Yin in You, your career is broad and can reach abroad, or be tied to other countries all your life.',
   '卯酉太阴守事业宫，天同对拱。一一般情形下西优于卯，在酉事业广大，可以扩展至外国，或一生事业与外国有关，在卯者，以任职为宜。', '在酉事业广大，可以扩展至外国', 'base'),
 R('官祿.太陰卯.任職', {'branch': ['卯']},
   '太陰坐卯，你適合受僱任職，不必自己當老闆。',
   'With Tai Yin in Mao, salaried employment suits you; you need not run your own business.',
   '卯酉太阴守事业宫，天同对拱。一一般情形下西优于卯，在酉事业广大，可以扩展至外国，或一生事业与外国有关，在卯者，以任职为宜。', '在卯者，以任职为宜', 'base'),
]})
T.append({'id': '太陰.官祿', 'stars': ['太陰'], 'rules': [
 R('官祿.太陰.昌曲', CHANGQU,
   '太陰主富不主貴，見文昌文曲才有社會地位；也適合文藝、傳播。',
   'Tai Yin brings wealth rather than standing; with Wen Chang or Wen Qu you gain standing too, and the arts or media suit you.',
   '太阴主富不主贵，故守事业宫时，必以见文昌文曲同会，然后始主其人有社会地位。', '必以见文昌文曲同会，然后始主其人有社会地位'),
 R('官祿.太陰.梁科', H('科', '天梁', 'sifang'),
   '會天梁化科，你宜做監督、管理一類工作。',
   'Meeting Tian Liang in Merit, supervisory or management work suits you.',
   '太阴会天梁化科，宜从事监督、管理工作，或如公证行之类。', '宜从事监督、管理工作'),
 R('官祿.太陰.同祿', H('祿', '天同', 'sifang'),
   '太陰會天同化祿，你的事業靠自己白手建立。',
   'Tai Yin meets Tian Tong in Abundance: you build your career from nothing on your own.',
   '太阴最喜欢天同化禄，则亦主白手与家。', '太阴最喜欢天同化禄'),
]})

# ── 貪狼 ──
T.append({'id': '貪狼子午.官祿', 'stars': ['貪狼'], 'branch': ['子', '午'], 'rules': [
 R('官祿.貪狼子午.自由', None,
   '主獨當一面，或從事自由職業；以帶藝術、美觀、享受色彩的工作為宜。',
   'You work on your own, or freelance; work with an artistic, aesthetic or pleasurable side suits you.',
   '子午贪狼与紫微对拱，主独当一面，或主自由职业。以带艺术、美观、享受色彩者为宜。', '以带艺术、美观、享受色彩者为宜', 'base'),
]})
T.append({'id': '貪狼寅申.官祿', 'stars': ['貪狼'], 'branch': ['寅', '申'], 'rules': [
 R('官祿.貪狼寅申.開創', None,
   '以開創性的行業為宜，或在原有行業中別開生面、以特殊作風經營。',
   'Pioneering work suits you, or bringing a fresh, distinctive approach to an established field.',
   '寅申宫贪狼，以开创性行业为宜。或从事某一行业，却能别开生面，以特殊作风经营，', '以开创性行业为宜', 'base'),
 R('官祿.貪狼寅申.合作', None,
   '貪狼在寅申，你傾向與人合作，但合作多半中途改變。',
   'With Tan Lang in Yin or Shen, you lean towards working with partners, though the arrangements often change course midway.',
   '寅申贪狼守事业宫，时倾向于与人合作，唯多中道更张。', '唯多中道更张'),
]})
T.append({'id': '貪狼.官祿', 'stars': ['貪狼'], 'rules': [
 R('官祿.貪狼.忌', H('忌', '貪狼'),
   '貪狼化忌，你插手的事業必引起競爭。',
   'Tan Lang in Hindrance: whatever you take on draws competition.',
   '贪狼化忌在事业宫者，主凡插手事业必引起竞争。', '主凡插手事业必引起竞争', 'limit'),
 R('官祿.貪狼.左右', {'star': ['左輔', '右弼'], 'at': 'same'},
   '同宮有左輔右弼，你下屬眾多，事業有相當氣派。',
   'With Zuo Fu or You Bi in the palace, you lead many people, and your business has real presence.',
   '贪狼与左辅右弼同度，则主下属众多，故所经营之事业说必有相当气派。', '则主下属众多'),
 R('官祿.貪狼.羊陀', YANGTUO,
   '同宮有擎羊陀羅，以從商為宜，尤其消費、娛樂、裝飾一類行業。',
   'With Qing Yang or Tuo Luo in the palace, business suits you, especially consumer goods, entertainment or decoration.',
   '贪狼与羊陀同茺，则以从商为宜。亦须从事消费行业或行业性质与装饰、娱乐、消费品有关。', '则以从商为宜'),
]})

# ── 巨門 ──
T.append({'id': '巨門巳亥.官祿', 'stars': ['巨門'], 'branch': ['巳', '亥'], 'rules': [
 R('官祿.巨門巳亥.名', None,
   '先有社會地位，財富才隨名譽而來；見文昌文曲為貴。',
   'Standing comes first and money follows reputation; Wen Chang and Wen Qu are a real asset here.',
   '巳亥宫巨门，亦主先有社会地位，然后财富始随名誉而来。故以同会文昌、文曲为贵。', '然后财富始随名誉而来'),
]})
T.append({'id': '巨門.官祿', 'stars': ['巨門'], 'rules': [
 R('官祿.巨門.忌', H('忌', '巨門'),
   '巨門化忌，要從事靠口才或費唇舌的行業，否則反招是非。',
   'Ju Men in Hindrance: choose work that relies on speaking, or the talk turns against you.',
   '尤其当巨门化忌之时，若不从事依赖口才，或费劳唇舌的行业，则反招是非口舌。', '则反招是非口舌', 'limit'),
 R('官祿.巨門.祿', {'any': [H('祿', '巨門'), {'star': '祿存', 'at': 'same'}]},
   '巨門化祿或有祿存，口才可以轉化為名聲；但以不主動出鋒頭為宜。',
   'With Ju Men in Abundance or Lu Cun present, your way with words becomes a reputation, so long as you do not push yourself forward.',
   '巨门喜化禄，或与禄存同度，则有时可将口舌的性质转化为声名。但以不主动出锋头为宜。', '则有时可将口舌的性质转化为声名'),
 R('官祿.巨門.本', None,
   '巨門在官祿宮，靠口才謀生：律師、教師、推銷、外交、傳播一類工作都屬此類。',
   'With Ju Men in your Career Palace, you earn by speaking: law, teaching, sales, diplomacy and media all fit.',
   '凡巨门在事业宫，基本性质，为[口舌生财故以口才为主，或须费唇舌以谋生。', '故以口才为主', 'base'),
]})

# ── 天相 ──
T.append({'id': '天相卯酉.官祿', 'stars': ['天相'], 'branch': ['卯', '酉'], 'rules': [
 R('官祿.天相卯酉.代理', None,
   '從商最宜做商品代理；任職則適合做跨國機構的地區主管。',
   'In business, acting as an agent for a product line suits you best; as an employee, heading a multinational’s local office.',
   '卯酉天相，在一般情形下权重一时，但究非事业主脑。若从商，最宜为商品代理，若任职，则宜为跨国机构一地之首脑。', '最宜为商品代理'),
]})
T.append({'id': '天相巳亥.官祿', 'stars': ['天相'], 'branch': ['巳', '亥'], 'rules': [
 R('官祿.天相巳亥.親力', None,
   '天相對著武曲破軍，你一生事業多勞，很多事要親力親為。',
   'Tian Xiang faces Wu Qu–Po Jun: your working life is busy, and you often have to do things yourself.',
   '巳亥天相与[武曲破军]相对，一生事业多劳，往往须亲力亲为。', '往往须亲力亲为', 'base'),
]})
T.append({'id': '天相.官祿', 'stars': ['天相'], 'rules': [
 R('官祿.天相.煞', {'star': ['擎羊', '陀羅', '火星', '鈴星'], 'at': 'same'},
   '同宮見羊陀火鈴，你的事業多糾紛，也容易受人掣肘。',
   'With Qing Yang, Tuo Luo, Huo Xing or Ling Xing in the palace, work brings disputes, and others tie your hands.',
   '天相与羊陀火铃同会，或为羊陀夹、火铃夹者，事业多纠纷，且易受人掣肘。', '事业多纠纷，且易受人掣肘', 'limit'),
 R('官祿.天相.副貳', None,
   '天相在官祿宮，無論處甚麼位置，名義上都不宜佔最高的位置，做副手最好。',
   'With Tian Xiang in your Career Palace, whatever your position, avoid holding the top title; the deputy’s role suits you best.',
   '天相守事业宫，无论处何地位，均不宜在名义上占取最高位置，以副贰为宜，', '以副贰为宜', 'base'),
]})

# ── 天梁 ──
T.append({'id': '天梁巳亥.官祿', 'stars': ['天梁'], 'branch': ['巳', '亥'], 'rules': [
 R('官祿.天梁巳亥.幕後', None,
   '你不宜出鋒頭；即使獨當一面，也以退居幕後為佳。',
   'Stay out of the limelight; even when you run things, it is better to work from behind the scenes.',
   '巳亥天梁在事业宫，以不现锋头为宜，虽独当一面工作，亦以退居幕后为佳。', '亦以退居幕后为佳', 'base'),
]})
T.append({'id': '天梁.官祿', 'stars': ['天梁'], 'rules': [
 R('官祿.天梁.祿', H('祿', '天梁'),
   '天梁化祿，最適合財務稽核一類工作；工作與財務無關的話，反因財受困擾。',
   'Tian Liang in Abundance suits financial audit work best; if your work has nothing to do with money, money brings you trouble instead.',
   '天梁化禄于事业宫，若从事财务稽核之职者，最为适宜。若所业兴财务无关，则反因财而受困扰。', '若从事财务稽核之职者，最为适宜'),
 R('官祿.天梁.權', H('權', '天梁'),
   '天梁化權，你利於權威性的工作，例如法律、監察。',
   'Tian Liang in Authority favours work that carries authority, such as law or oversight.',
   '天梁化权，利于权威性工作，法律固有权威，', '利于权威性工作'),
 R('官祿.天梁.科', H('科', '天梁'),
   '天梁化科，以清貴為宜：先爭取社會地位，財富隨之而來。',
   'Tian Liang in Merit: aim for respected rather than lucrative roles; win your standing first and the money follows.',
   '天梁化科，以清贵为宜，故须极力争取社会地位，然后财富始随之而来。', '然后财富始随之而来'),
 R('官祿.天梁.本', None,
   '天梁是清貴之星：即使吉星齊會，也較少負行政之責，適合監察、審核、司法一類工作。',
   'Tian Liang is a star of respected integrity: even with every helper star, you rarely carry executive duties; oversight, audit or judicial work suits you.',
   '天梁为清贵之星，纵见禄、权、。科，及辅佐吉曜，亦不负行政之责，仅宜居监察、申核、司法、刑政之职。', '天梁为清贵之星', 'base'),
]})

# ── 七殺 ──
T.append({'id': '七殺辰戌.官祿', 'stars': ['七殺'], 'branch': ['辰', '戌'], 'rules': [
 R('官祿.七殺辰戌.工商', None,
   '經商以資金周轉大的生意為宜；無論工商，都不宜投機。',
   'In business, large-turnover trades suit you; in industry or commerce alike, avoid speculation.',
   '辰戌七杀守事业宫者，若经商，以周转数目巨大者为宜。若从事工业，亦必须自行销售。无论工商，皆不宜投机。', '无论工商，皆不宜投机'),
]})
T.append({'id': '七殺.官祿', 'stars': ['七殺'], 'rules': [
 R('官祿.七殺.剛柔', {'all': [{'any': [FUZUO, KUIYUE]}, {'not': SHA}]},
   '見輔佐吉星，管理上能剛柔相濟，號令得動很多人。',
   'With helper stars, you manage with both firmness and warmth, and can command many people.',
   '凡管理，必须恩威并济，七杀守事业宫者，威有余而恩不足，[紫微七杀]尤然。故以得辅弼、魁铖、三台八座朝拱同会者为贵，得此则自能则柔相济，虽千万人皆能号令。', '虽千万人皆能号令'),
 R('官祿.七殺.技', {'all': [SHA, {'not': {'star': '紫微', 'at': 'same'}}]},
   '同宮有煞，你最好有一技傍身，不宜做管理。',
   'With harsh stars in the palace, a specialist skill serves you better than management.',
   '七杀有煞曜同度，最宜一技傍身，故必需学习专门技术，不宜管理。', '最宜一技傍身'),
 R('官祿.七殺.本', {'not': SHA},
   '七殺在官祿宮，管理能力強；現代適合工廠管理或大企業的人事部門。',
   'With Qi Sha in your Career Palace, you are a strong manager; today that means running operations or a large firm’s HR.',
   '七杀居事业宫，主管理能力强，', '主管理能力强', 'base'),
]})

# ── 破軍 ──
T.append({'id': '破軍子午.官祿', 'stars': ['破軍'], 'branch': ['子', '午'], 'rules': [
 R('官祿.破軍子午.合作', None,
   '傾向與人合作創業，而且合作的事業不只一門；行業雖多，不專就只是表面風光。',
   'You lean towards starting ventures with partners, more than one at a time; but many lines without focus are only for show.',
   '若从工从商，则倾向于与人合作创业，且合作事业不只一端。化禄、权时尤甚。然而行业虽多，若不专，则徒然表面风光。', '则倾向于与人合作创业'),
]})
T.append({'id': '破軍辰戌.官祿', 'stars': ['破軍'], 'branch': ['辰', '戌'], 'rules': [
 R('官祿.破軍辰戌.副貳', None,
   '你要借別人的財力或勢力興家，最喜見天魁天鉞。',
   'You build on other people’s money or influence, and Tian Kui or Tian Yue help most.',
   '辰戌破军亦主为[副贰]必须藉别人财力或势力兴家。故最喜见魁铖。', '必须藉别人财力或势力兴家'),
]})
T.append({'id': '破軍.官祿', 'stars': ['破軍'], 'rules': [
 R('官祿.破軍.祿', H('祿', '破軍'),
   '破軍化祿，兼職兼差，往往從不起眼的行業或職位起家。',
   'Po Jun in Abundance: you hold side jobs, and often rise from a line or post no one took seriously.',
   '若破军化禄，则主兼行漆业，兼职兼差且往往由不以为重点的行业或职务起家。', '兼职兼差'),
 R('官祿.破軍.輔弼', FUZUO,
   '破軍見左輔右弼，工作上的辛勞你可以少一些。',
   'Po Jun meets Zuo Fu or You Bi: the strain of your work is eased.',
   '破军喜见辅弼，则能减少辛劳。', '破军喜见辅弼，则能减少辛劳'),
 R('官祿.破軍.羊陀', YANGTUO,
   '同宮有擎羊陀羅，一定要有一技傍身，才能有所作為。',
   'With Qing Yang or Tuo Luo in the palace, you need a specialist skill to get anywhere.',
   '破军与羊陀同度，若无一技防身，则必终生不能有为，以致晚年困苦。', '若无一技防身', 'limit'),
 R('官祿.破軍.創新', None,
   '破軍在官祿宮，長處在創新：新產品、新技術最合適。',
   'With Po Jun in your Career Palace, your gift is innovation: new products and new technology suit you.',
   '但-七杀之特长在于管理，而破军之特长却在创新。故宜注意新产品，新技术，或从事冒险性行业。', '而破军之特长却在创新', 'base'),
]})

# ── 唔限主星（通則，排最後） ──
T.append({'id': '官祿通則', 'stars': [], 'rules': [
 R('官祿.通則.陀羅', {'star': '陀羅', 'at': 'same'},
   '陀羅在官祿宮，事業發展較慢，往往有名無實、權力被架空。',
   'With Tuo Luo in the Career Palace, progress is slow, and you often hold the title without the power.',
   '事业宫最不宜见陀罗，不但事业发展缓慢，而且往往有名无实，权力被挂空，', '而且往往有名无实，权力被挂空', 'limit'),
 R('官祿.通則.擎羊', {'star': '擎羊', 'at': 'same'},
   '擎羊在官祿宮，現代往往是工程科技一類的人才。',
   'With Qing Yang in the Career Palace, today you are often an engineer or technologist.',
   '事业富见擎羊，古人认为只宜武职，在现代则往往为工程科技人员。', '在现代则往往为工程科技人员'),
 R('官祿.通則.火鈴', FIRE,
   '火星或鈴星在官祿宮，事業多波折，往往經過艱苦才站穩。',
   'With Huo Xing or Ling Xing in the Career Palace, your career has its upheavals, and you find your footing only after hard times.',
   '事业宫见火铃，主波折。故往往经艰苦而始能底定事业。', '故往往经艰苦而始能底定事业'),
 R('官祿.通則.空劫', KONG,
   '地空或地劫在官祿宮，宜做較冷門的行業，或以出人意料的手法經營。',
   'With Di Kong or Di Jie in the Career Palace, offbeat fields suit you, or running things in ways no one expects.',
   '事业宫见地劫地空，一般情况下宜从事较冷僻的行业，或奇兵突出，', '一般情况下宜从事较冷僻的行业'),
 R('官祿.通則.祿存', {'star': '祿存', 'at': 'same'},
   '祿存在官祿宮，宜經營現成的事業，或做受薪的工作。',
   'With Lu Cun in the Career Palace, running an established business or salaried work suits you.',
   '事业宫与禄存同度，一般只宜经营现成事业，或作受薪阶级，', '一般只宜经营现成事业，或作受薪阶级'),
]})
