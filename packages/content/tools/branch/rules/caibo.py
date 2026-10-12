# 財帛宮規則（2026-10-12）。T.append(題目)；題目次序 = 合併輸出次序：組合／地支題目行先，單星通則其次，唔限主星嘅通則最後（最多四條，排後嘅先被截）。
FIRE = {'star': ['火星', '鈴星'], 'at': 'same'}
KONG = {'star': ['地空', '地劫'], 'at': 'same'}
SHA = {'star': ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'], 'at': 'same'}
FUZUO = {'star': ['左輔', '右弼'], 'at': 'sifang'}
KUIYUE = {'star': ['天魁', '天鉞'], 'at': 'sifang'}
LU = {'any': [{'hua': '祿', 'at': 'sifang'}, {'star': '祿存', 'at': 'sifang'}]}
LUSAME = {'any': [{'hua': '祿', 'at': ['same', 'opp']}, {'star': '祿存', 'at': ['same', 'opp']}]}
LUMA = {'all': [{'star': '天馬', 'at': ['same', 'opp']}, {'star': '祿存', 'at': ['same', 'opp']}]}
def H(hua, star, at='same'): return {'hua': hua, 'star': star, 'at': at}
def R(id, when, text, en, src, quote, role='refine'):
    return {'id': id, 'when': when, 'text': text, 'en': en, 'src': src, 'quote': quote, 'role': role}

# ── 宮位連動（2026-10-12）：排最前，見 branch.ts palaceState() ──
def PS(name, st): return {'palace': name, 'is': st}
T.append({'id': '財帛連動', 'stars': [], 'link': True, 'rules': [
 R('財帛.連動.財吉官凶', {'all': [PS('財帛', 'good'), PS('官祿', 'bad')]},
   '你的財帛宮星曜吉利，官祿宮卻不吉利：事業未必顯赫，卻能得財、儲財，所以宜不出鋒頭。',
   'Your Wealth Palace is favourable but your Career Palace is not: your career may not shine, yet you can earn and save, so keep a low profile.',
   '财帛宫星曜吉，而事业宫疆曜不吉，基本性质为事业并不峥嵘，但却可以得财或储财，因此往往就以不出锋头为宜。', '但却可以得财或储财'),
 R('財帛.連動.官吉財凶', {'all': [PS('官祿', 'good'), PS('財帛', 'bad')]},
   '你的官祿宮星曜吉利，財帛宮卻不吉利：事業可以做大，但錢財不易聚，宜受雇或與人合夥，不宜獨立經營。',
   'Your Career Palace is favourable but your Wealth Palace is not: the career can grow large, but money is hard to keep, so salaried work or partnership suits you better than going it alone.',
   '反之，则事业虽大，或所从事者为受人注意的行业，但却以任职或合伙为宜，不宜独立经营，因财不易聚之故也。', '但却以任职或合伙为宜，不宜独立经营'),
 R('財帛.連動.田宅', {'all': [PS('財帛', 'bad'), PS('田宅', 'good')]},
   '你的財帛宮不吉利，田宅宮卻吉利：可以靠置業保存、累積財富，或者做小本經營。',
   'Your Wealth Palace is unfavourable but your Property Palace is favourable: property is how you hold on to and build wealth, or a small business of your own.',
   '推断财帛有时亦须参考田宅宫，因为若财帛宫不吉而田宅宫吉利时，常可藉置业以保存及积累财雷，或小本经营以维持生计，', '常可藉置业以保存及积累'),
]})

# ── 紫微 ──
T.append({'id': '紫微破軍.財帛', 'stars': ['紫微', '破軍'], 'rules': [
 R('財帛.紫破.意外', None,
   '紫微破軍在財帛宮，一生會有一次意外之財；坐未比坐丑好。',
   'With Zi Wei and Po Jun in your Wealth Palace, a windfall comes once in your life; Wei is the better seat than Chou.',
   '丑未宫[紫微破军]在财帛宫，主一生必可得一次意外财。以程度言，未宫优于丑宫；', '主一生必可得一次意外财', 'base'),
 R('財帛.紫破.權', H('權', '破軍'),
   '破軍化權，你運用金錢的能力強，經過波折而成富。',
   'Po Jun in Authority: you handle money with real skill, and grow well off after some ups and downs.',
   '若破军化权，对主运用金钱的能力强，经波折而成富。', '运用金钱的能力强，经波折而成富'),
 R('財帛.紫破.守', None,
   '你發了之後最要緊的是守，不要再妄圖開創。',
   'Once the gain comes, what matters most is holding on to it, not reaching for the next venture.',
   '凡[紫破]、[紫贪]、『紫杀』皆主骤发骤败，但其间亦有区别，『紫破』之败，必因发后又妄图开创所致；', '必因发后又妄图开创所致', 'limit'),
]})
T.append({'id': '紫微天府.財帛', 'stars': ['紫微', '天府'], 'rules': [
 R('財帛.紫府.祿', LU,
   '你的紫微天府見祿，可以積聚成富。',
   'Your Zi Wei–Tian Fu meets Lu, so you can build up savings into real wealth.',
   '寅申宫[紫微天府]，需视有禄无禄以厘定其吉凶。若有禄，煲唾可积聚而成富，', '可积聚而成富'),
 R('財帛.紫府.無祿', {'not': LU},
   '你的紫微天府不見祿，財帛充足，但談不上積聚成富。',
   'Your Zi Wei–Tian Fu does not meet Lu: you have enough, though not the kind that builds into wealth.',
   '无禄，则不外充足而已；', '无禄，则不外充足而已'),
]})
T.append({'id': '紫微貪狼.財帛', 'stars': ['紫微', '貪狼'], 'rules': [
 R('財帛.紫貪.科', H('科', '紫微'),
   '紫微化科，你的錢來得比較長久，不是一陣風。',
   'Zi Wei in Merit: your money comes in more lastingly, not as a passing gust.',
   '卯酉宫『紫微贪狼』亦主骤发，若紫徽化科，则财来较悠久，', '则财来较悠久'),
 R('財帛.紫貪.祿', H('祿', '貪狼'),
   '貪狼化祿，你的錢來得較急，但也藏著破耗。',
   'Tan Lang in Abundance: money comes fast, but with losses hidden in it.',
   '若贪狼化禄，剥财来较急骤，然而亦隐藏破耗之机。', '然而亦隐藏破耗之机'),
]})
T.append({'id': '紫微七殺.財帛', 'stars': ['紫微', '七殺'], 'rules': [
 R('財帛.紫殺.驟發', None,
   '紫微七殺在財帛宮，財帛能驟然發起來，只是較難持久。',
   'With Zi Wei and Qi Sha in your Wealth Palace, money can rise suddenly, though it is hard to sustain.',
   '[紫杀]在财帛宫亦主能骤发，唯较难持久。', '唯较难持久', 'base'),
 R('財帛.紫殺.祿馬', {'all': [LUMA, {'not': SHA}]},
   '祿星與天馬相會而無煞，在外地能發，在出生地反多波折。',
   'With Lu Cun and Tian Ma meeting and no harsh stars, you prosper away from home, while your birthplace brings more setbacks.',
   '唯[紫杀]见[禄马交驰]之局者，无煞，在外埠外国能发，在出生地反多波折。', '在外埠外国能发，在出生地反多波折'),
]})
T.append({'id': '紫微子午.財帛', 'stars': ['紫微'], 'branch': ['子', '午'], 'rules': [
 R('財帛.紫微子午.左右', FUZUO,
   '紫微會左輔右弼，你的財源來自多方面，不靠單一收入。',
   'Zi Wei meets Zuo Fu or You Bi: your income comes from several directions, not from a single source.',
   '子午宫紫微在财帛宫，有左辅右弼同会，主财源来自多方面。', '主财源来自多方面'),
]})
T.append({'id': '紫微.財帛', 'stars': ['紫微'], 'rules': [
 R('財帛.紫微.科', H('科', '紫微'),
   '紫微化科，你適合憑名聲和信譽賺錢，口碑就是本錢。',
   'Zi Wei in Merit: you do well earning on your name and reputation; your good name is your capital.',
   '紫微化科，则宜凭名誉、商誉以求财。', '则宜凭名誉、商誉以求财'),
 R('財帛.紫微.本', {'not': {'star': '天府', 'at': 'same'}},
   '紫微不是財星：你的財源可以充裕，卻不主積聚。',
   'Zi Wei is not a wealth star: income can be ample, but it does not tend to accumulate.',
   '紫微守财帛宫，在最好的情形下，亦仅主财源充裕，并不主能积聚。盖紫微偏重于名誉与权力，不是财星。', '亦仅主财源充裕，并不主能积聚', 'base'),
]})

# ── 天機 ──
T.append({'id': '天機太陰.財帛', 'stars': ['天機', '太陰'], 'rules': [
 R('財帛.機陰.祿馬', LUMA,
   '你的天機太陰遇上祿星與天馬，財發於遠方，宜離開出生地。',
   'Your Tian Ji–Tai Yin meets Lu Cun and Tian Ma: your money is made far away, so leaving your birthplace suits you.',
   '『天机太阴』最喜与『禄马交驰』同度，则主发财于远方。故以离开出生地为宜。', '则主发财于远方'),
]})
T.append({'id': '天機巨門.財帛', 'stars': ['天機', '巨門'], 'rules': [
 R('財帛.機巨.競爭', None,
   '天機巨門在財帛宮，求財競爭大，經手的事容易惹人覬覦。',
   'With Tian Ji and Ju Men in your Wealth Palace, competition is fierce, and what passes through your hands draws envious eyes.',
   '卯酉宫『天机巨门』，主竞争甚重，经手之事每惹人垂涎。', '主竞争甚重，经手之事每惹人垂涎', 'base'),
 R('財帛.機巨.巨祿', H('祿', '巨門'),
   '巨門化祿，你容易得到外地或外國人的財。',
   'Ju Men in Abundance: money tends to come from people of other places or countries.',
   '若巨门化禄，则主得异族之财。', '则主得异族之财'),
 R('財帛.機巨.巨忌', H('忌', '巨門'),
   '巨門化忌，往往功敗垂成；不如隨緣，或做競爭較小的行業。',
   'Ju Men in Hindrance: success often slips away at the last step; go with the flow, or choose a less competitive line.',
   '若巨门化忌，则往往功败垂成，枉抛心力。此时不如随缘，或从事竞争较小的行业。', '或从事竞争较小的行业', 'limit'),
]})
T.append({'id': '天機天梁.財帛', 'stars': ['天機', '天梁'], 'rules': [
 R('財帛.機梁.科', {'any': [H('科', '天機'), H('科', '天梁')]},
   '天機或天梁化科，你名和利可以兼得。',
   'With Tian Ji or Tian Liang in Merit, you can gain both name and money.',
   '天机化科或天梁化科，均主名利双收。', '均主名利双收'),
 R('財帛.機梁.梁祿', H('祿', '天梁'),
   '天梁化祿，暗中競爭多，容易受人排擠，要費心思求財。',
   'Tian Liang in Abundance: there is much hidden rivalry and you are easily edged out, so earning takes real effort.',
   '『机梁』不宜化禄，天梁化禄尤主多暗争，每易受人排挤，故必须劳心费神以求财。', '天梁化禄尤主多暗争', 'limit'),
 R('財帛.機梁.兼職', {'any': [FUZUO, KUIYUE]},
   '見〔輔佐吉星〕，你的財源不只一端，往往兼職兼業。',
   'With 〔helper stars〕, your income has more than one source, often from side jobs alongside the main one.',
   '『机梁』多变动，故见辅弼、魁钺者，指财源不只一端，往往兼职兼业。', '往往兼职兼业'),
]})
T.append({'id': '天機子午.財帛', 'stars': ['天機'], 'branch': ['子', '午'], 'rules': [
 R('財帛.天機子午.唇舌', None,
   '天機對著巨門，你賺錢要花心思、費唇舌，靠腦也靠口。',
   'Tian Ji faces Ju Men: you earn through effort of mind and plenty of talking.',
   '子午宫天机入庙，必与巨门相对，故主劳心费神，破唇费舌以求财。', '破唇费舌以求财', 'base'),
 R('財帛.天機子午.經紀', {'any': [H('祿', '天機'), {'star': '祿存', 'at': 'same'}]},
   '天機化祿或有祿存，錢財流通，適合經紀一類行業。',
   'With Tian Ji in Abundance or Lu Cun present, money flows through your hands, which suits brokerage-type work.',
   '子午天机化禄，或禄存同度，表征为钱财流通，故可从事经纪行业，', '故可从事经纪行业'),
]})
T.append({'id': '天機丑未.財帛', 'stars': ['天機'], 'branch': ['丑', '未'], 'rules': [
 R('財帛.天機丑未.策劃', None,
   '最適合費心思計劃的行業，例如電腦程式、市場策劃。',
   'You are best suited to work that runs on planning and clever design, such as programming or marketing strategy.',
   '丑未宫天机落陷，与天梁相对，主机关巧计以求财。因此最宜从事费心机计谋人行业，如计算机程序、市场策划之类。', '如计算机程序、市场策划之类', 'base'),
]})
T.append({'id': '天機巳亥.財帛', 'stars': ['天機'], 'branch': ['巳', '亥'], 'rules': [
 R('財帛.天機巳亥.服務', None,
   '不宜自己經營，適合服務性行業或居間代理；也可以做財經、稅務、核數。',
   'Running your own business does not suit you; service work or acting as an agent does, as does finance, tax or audit work.',
   '巳亥宫天机与太阴相对，不宜自行经营，但却可从事服务性行业，或居间代理。', '不宜自行经营', 'base'),
]})
T.append({'id': '天機.財帛', 'stars': ['天機'], 'rules': [
 R('財帛.天機.權', H('權', '天機'),
   '天機化權，財帛較穩定，但仍要轉換財源；以自由職業或專業較合適。',
   'Tian Ji in Authority: money is steadier, but the sources still change; freelance or professional work suits you best.',
   '天机化权，则性质比较稳定，然而仍必须转换财源，表征为转行转业。故以自由职业为佳；', '故以自由职业为佳'),
 R('財帛.天機.祿', H('祿', '天機'),
   '天機化祿，財源不只一端；見吉星，有多方面的財路。',
   'Tian Ji in Abundance: income comes from more than one place, and with helpful stars, from many.',
   '天机化禄，则气佳，但仍主财源不只一端，会吉曜，主有多方面的财路。', '主有多方面的财路'),
 R('財帛.天機.忌', H('忌', '天機'),
   '天機化忌，財運稍順就容易受打擊或排擠；逆境時處之泰然，才守得住。',
   'Tian Ji in Hindrance: as soon as money starts flowing, setbacks or pushback follow; stay calm through the hard spells to keep what you have.',
   '天机化忌，主财运稍顺即遭破坏，打击或排挤。必须于逆境时处之泰然，', '必须于逆境时处之泰然', 'limit'),

]})

# ── 太陽 ──
T.append({'id': '太陽太陰.財帛', 'stars': ['太陽', '太陰'], 'rules': [
 R('財帛.陰陽.先散後聚', None,
   '太陽太陰同在財帛宮，先散後聚；坐丑後聚的力量比坐未大。',
   'With Tai Yang and Tai Yin together in your Wealth Palace, money first scatters, then gathers; the gathering is stronger in Chou than in Wei.',
   '丑未宫『太阳太阴』同度，基本性质主先散后聚。尤以丑宫者，『后聚』的力量大于未宫。', '基本性质主先散后聚', 'base'),
]})
T.append({'id': '太陽巨門.財帛', 'stars': ['太陽', '巨門'], 'rules': [
 R('財帛.陽巨.異族', {'all': [H('權', '太陽'), H('祿', '巨門')]},
   '太陽化權、巨門化祿，容易受外地或外國人提拔而得財，也可以憑口才得財。',
   'Tai Yang in Authority and Ju Men in Abundance: you are likely to be lifted by people from elsewhere, and can also earn through your way with words.',
   '寅申宫[太阳巨门]同度。太阳化权，巨门化禄者，主受异族提拔得财。亦主凭口舌以得财。', '主受异族提拔得财'),
 R('財帛.陽巨.自創', None,
   '財由自己創立，不主承接現成產業，而且要經過競爭才得到。',
   'Your money is built by your own hand rather than inherited, and it comes only through competition.',
   '[太阳巨门]纵使见吉化、吉曜，亦主财由自身创立，不主得现成产业。亦主必须竞争而后得。', '亦主财由自身创立', 'base'),
]})
T.append({'id': '太陽天梁.財帛', 'stars': ['太陽', '天梁'], 'rules': [
 R('財帛.陽梁.空劫', KONG,
   '地空地劫同宮，財帛虛而不實：表面浮華，內裡困乏。',
   'With Di Kong or Di Jie in the palace, money is more show than substance: a bright surface over thin reserves.',
   '『太阳天梁]最不喜空劫，主虚空不实，表面浮华而内在困乏。', '表面浮华而内在困乏', 'limit'),
 R('財帛.陽梁.地位', None,
   '太陽天梁在財帛宮，你財富的多寡由社會地位決定。',
   'With Tai Yang and Tian Liang in your Wealth Palace, how much you earn depends on your standing in society.',
   '卯酉宫[太阳天梁]同度，成[阳梁昌禄]格者，由社会地位决定其财富之多寡。', '由社会地位决定其财富之多寡', 'base'),
]})
T.append({'id': '太陽辰戌.財帛', 'stars': ['太陽'], 'branch': ['辰', '戌'], 'rules': [
 R('財帛.太陽辰戌.魁鉞夾', {'jia': ['天魁', '天鉞']},
   '天魁天鉞夾著太陽，你求財時有人提拔、引路。',
   'Tian Kui and Tian Yue flank Tai Yang: when you go after money, there are people who lift you up and show you the way.',
   '辰戌太阳喜魁钺夹，主有人提拔。', '主有人提拔'),
 R('財帛.太陽辰戌.火鈴夾', {'jia': ['火星', '鈴星']},
   '火星鈴星夾著太陽，你的錢容易花掉，難以存下來。',
   'Huo Xing and Ling Xing flank Tai Yang: your money is easy to spend and hard to keep.',
   '若火铃夹者，则主财易散难聚。', '则主财易散难聚', 'limit'),
]})
T.append({'id': '太陽巳亥.財帛', 'stars': ['太陽'], 'branch': ['巳', '亥'], 'rules': [
 R('財帛.太陽巳亥.巨祿', H('祿', '巨門', 'opp'),
   '對宮巨門化祿，受外地或外國人賞識，地位提高，財源也因此暢順。',
   'With Ju Men in Abundance opposite, people from abroad value you, your standing rises, and money flows more freely.',
   '巳亥太阳喜巨门化禄拱照，则受异邦人赏识，由是提高社会地位，财源亦因之畅顺。', '则受异邦人赏识'),
]})
T.append({'id': '太陽.財帛', 'stars': ['太陽'], 'rules': [
 R('財帛.太陽.本', None,
   '太陽主貴不主富：你的財憑社會地位而來，所以要先爭取地位。',
   'Tai Yang brings standing rather than riches: your money follows your position, so win the position first.',
   '太阳主贵不主富，故太阳守财帛宫者，其财皆凭社会地位而来。因此必须争取地位，', '其财皆凭社会地位而来', 'base'),
 R('財帛.太陽.權', H('權', '太陽'),
   '太陽化權較穩定，你可以靠人事安排作補救。',
   'Tai Yang in Authority is steadier, and planning can make up for the rest.',
   '唯太阳化权较为稳定，可以藉人事控制，作后天补救。', '唯太阳化权较为稳定'),
]})

# ── 武曲 ──
T.append({'id': '武曲天府.財帛', 'stars': ['武曲', '天府'], 'rules': [
 R('財帛.武府.祿', LU,
   '武曲是財星，天府是財庫，見祿才成格局，你的財帛宮正是這樣。',
   'Wu Qu is the wealth star and Tian Fu the treasury; with Lu present the pattern is complete, and that is what your Wealth Palace has.',
   '子午宫[武曲天府]，为财星喜得财库，故必须见禄然后始成格局。', '故必须见禄然后始成格局'),
]})
T.append({'id': '武曲貪狼.財帛', 'stars': ['武曲', '貪狼'], 'rules': [
 R('財帛.武貪.火鈴', FIRE,
   '同宮有火星或鈴星，容易突然發財；再見煞忌，就會暴起暴跌。',
   'With Huo Xing or Ling Xing in the palace, money can arrive suddenly; with further harsh stars, it rises and falls just as fast.',
   '丑未宫[武曲贪狼]同度，有火星或铃星同踞，主暴富。若同时再见煞忌，则暴起暴跌。', '若同时再见煞忌，则暴起暴跌'),
 R('財帛.武貪.偏財', None,
   '武曲貪狼在財帛宮，你一般會得到偏財。',
   'With Wu Qu and Tan Lang in your Wealth Palace, you tend to gain from side or unexpected sources.',
   '丑未[武贪]，一般情况下主得偏财，', '一般情况下主得偏财', 'base'),
]})
T.append({'id': '武曲天相.財帛', 'stars': ['武曲', '天相'], 'rules': [
 R('財帛.武相.技能', None,
   '武曲天相不擅理財，你宜憑特殊技能求財。',
   'Wu Qu with Tian Xiang is not good at managing money; earn through a special skill.',
   '『武曲天相』亦主凭特殊技能以求财。', '亦主凭特殊技能以求财', 'base'),
 R('財帛.武相.祿馬', LUMA,
   '祿星與天馬相會，你離鄉別井建立事業，因此成富。',
   'With Lu Cun and Tian Ma meeting, you build your career away from home, and that is how you prosper.',
   '[武相]喜禄马交驰，主离乡背井以建立事业，因此成富。', '主离乡背井以建立事业，因此成富'),
]})
T.append({'id': '武曲七殺.財帛', 'stars': ['武曲', '七殺'], 'rules': [
 R('財帛.武殺.白手', None,
   '武曲七殺在財帛宮，你靠自己白手興家，不靠家底。',
   'With Wu Qu and Qi Sha in your Wealth Palace, you build your fortune from nothing, not from family money.',
   '卯酉宫『武风七杀』，主白手兴家。', '主白手兴家', 'base'),
 R('財帛.武殺.投資', {'any': [FUZUO, KUIYUE, {'hua': ['祿', '權', '科'], 'at': 'same'}]},
   '見〔吉〕，投資規模大，資財多在企業資產上，不主積蓄。',
   'With 〔good signs〕, you invest on a large scale; your wealth sits in business assets rather than savings.',
   '[武杀]见吉曜，投资额巨大，其资财往往在企业资产上。不主积蓄。', '其资财往往在企业资产上'),
]})
T.append({'id': '武曲破軍.財帛', 'stars': ['武曲', '破軍'], 'rules': [
 R('財帛.武破.忌', H('忌', '武曲'),
   '武曲化忌，你不宜經商，以受雇為宜，更不宜投機。',
   'Wu Qu in Hindrance: business is not for you; salaried work suits you better, and speculation even less.',
   '若武曲化忌，则不宜经商，以任职为宜。更不宜投机，', '则不宜经商，以任职为宜'),
 R('財帛.武破.克服', {'hua': ['祿', '權', '科'], 'at': 'sifang'},
   '會到祿權科，一生至少有一次困境，克服之後仍能致富。',
   'Meeting Abundance, Authority or Merit, you face at least one hard patch in life, and come through it to prosper.',
   '『武破』得禄权科会者，一生人亦至少有一次困境，但克服困难之后，仍能致富。', '但克服困难之后，仍能致富'),
 R('財帛.武破.起伏', None,
   '武曲破軍在財帛宮，你一生財帛起伏較大。',
   'With Wu Qu and Po Jun in your Wealth Palace, your finances rise and fall more than most.',
   '巳亥宫『武曲破军』，性质不良，因一生起伏波澜甚大。', '因一生起伏波澜甚大', 'base'),
]})
T.append({'id': '武曲辰戌.財帛', 'stars': ['武曲'], 'branch': ['辰', '戌'], 'rules': [
 R('財帛.武曲辰戌.艱辛', None,
   '武曲獨坐，對著貪狼，你要先經歷一番艱辛，然後才富起來。',
   'Wu Qu sits alone facing Tan Lang: you go through real hardship first, and only then grow wealthy.',
   '辰戌宫武曲独坐，与贪狼相对。必须经历艰辛而后成富。', '必须经历艰辛而后成富', 'base'),
 R('財帛.武曲辰戌.祿', LU,
   '武曲得祿，你的財帛宮具備致富的條件。',
   'Wu Qu gains Lu: your Wealth Palace has what it takes to build wealth.',
   '辰戌武曲得禄，可成富局。', '辰戌武曲得禄，可成富局'),
]})
T.append({'id': '武曲.財帛', 'stars': ['武曲'], 'rules': [
 R('財帛.武曲.本', {'not': H('忌', '武曲')},
   '武曲是財星，主求財的行動：先有事業，才有錢財；一般最利經商。',
   'Wu Qu is the wealth star of action: the business comes first and the money after; trade generally suits you best.',
   '武曲为财星，主求财的行动，故必先有事业然后有钱财。一般而言一最利经商，', '故必先有事业然后有钱财', 'base'),
]})

# ── 天同 ──
T.append({'id': '天同太陰.財帛', 'stars': ['天同', '太陰'], 'rules': [
 R('財帛.同陰.最利', None,
   '天同太陰同在財帛宮，是天同各組合中最利財源的一組。',
   'Tian Tong and Tai Yin together make the most favourable of all Tian Tong pairings for income.',
   '子午宫[天同太阴]同度，为天同坐财帛宫众星系中，最利财源的星系。', '最利财源的星系', 'base'),
 R('財帛.同陰.陰祿', H('祿', '太陰'),
   '太陰化祿，你一生至少有一次意外的財源。',
   'Tai Yin in Abundance: at least once in life, money comes from an unexpected source.',
   '太阴化禄，则一生至少有一次意外财源。', '则一生至少有一次意外财源'),
 R('財帛.同陰.忌', {'any': [H('忌', '天同'), H('忌', '太陰')]},
   '天同或太陰化忌，你的錢較難積聚，要刻意去存。',
   'With Tian Tong or Tai Yin in Hindrance, money is hard for you to build up; saving takes deliberate effort.',
   '『天同太阴』若天同化忌，或太阴化忌，财帛皆难积聚。', '财帛皆难积聚', 'limit'),
]})
T.append({'id': '天同巨門.財帛', 'stars': ['天同', '巨門'], 'rules': [
 R('財帛.同巨.唇舌', None,
   '天同巨門在財帛宮，容易因財生是非口舌，所以最宜費唇舌求財。',
   'With Tian Tong and Ju Men in your Wealth Palace, money tends to bring talk and dispute, so earning by talking suits you best.',
   '丑未宫『天同巨门』，基本性质主因财而生是非口舌，故最宜费唇舌以求财。', '故最宜费唇舌以求财', 'base'),
 R('財帛.同巨.吉', {'any': [{'hua': ['祿', '權', '科'], 'at': 'same'}, FUZUO, KUIYUE]},
   '見〔吉化吉星〕，你也適合從事傳播或專業工作。',
   'With 〔good transformations or helper stars〕, media or professional work also suits you.',
   '『天同巨门』见吉化、吉曜，亦宜传播工作，或专业工作以求财。', '亦宜传播工作'),
]})
T.append({'id': '天同辰戌.財帛', 'stars': ['天同'], 'branch': ['辰', '戌'], 'rules': [
 R('財帛.天同辰戌.服務', None,
   '即使天同化祿，也只宜服務他人；自己經營，財更難聚。',
   'Even with Tian Tong in Abundance, working for others suits you; running your own business makes money harder to keep.',
   '辰戌天同即使化禄，亦只宜服务他人。自行经营，财更难聚。', '亦只宜服务他人', 'base'),
]})
T.append({'id': '天同巳亥.財帛', 'stars': ['天同'], 'branch': ['巳', '亥'], 'rules': [
 R('財帛.天同巳亥.弱', None,
   '巳亥的天同在財帛宮是弱宮，稍見煞就要勞心費力；晚年才能富裕。',
   'Tian Tong in Si or Hai is weak in the Wealth Palace: the slightest harsh star means hard work, and comfort comes later in life.',
   '巳亥天同于财帛为弱宫，稍见煞即主劳心费力。', '稍见煞即主劳心费力', 'base'),
]})

# ── 廉貞 ──
T.append({'id': '廉貞天相.財帛', 'stars': ['廉貞', '天相'], 'rules': [
 R('財帛.廉相.應酬', None,
   '廉貞天相加強交際應酬的色彩，是長袖善舞的生意人。',
   'Lian Zhen with Tian Xiang strengthens the social touch: you are a deft dealmaker.',
   '子午『廉贞天相』，加强廉贞的交际应酬色彩，为长袖善舞的商人。', '为长袖善舞的商人', 'base'),
 R('財帛.廉相.祿', H('祿', '廉貞'),
   '廉貞化祿，你的財多在交際應酬中得來。',
   'Lian Zhen in Abundance: your money comes mostly through socialising and dealings with people.',
   '最喜廉贞化禄，则于交际中得财，可以成富局。', '则于交际中得财'),
]})
T.append({'id': '廉貞七殺.財帛', 'stars': ['廉貞', '七殺'], 'rules': [
 R('財帛.廉殺.實', None,
   '廉貞七殺在財帛宮，浮華最少，你的財帛較為實在。',
   'Lian Zhen with Qi Sha is the least showy pairing in the Wealth Palace: your money is real.',
   '『廉贞七杀』在财帛宫，为浮华性质至少之星系。', '为浮华性质至少之星系', 'base'),
 R('財帛.廉殺.理財', None,
   '廉貞七殺在財帛宮，你擅長積攢錢財，卻不擅長打理和運用。',
   'With Lian Zhen and Qi Sha in your Wealth Palace, you are good at building up money but less good at managing it.',
   '『廉杀』在财帛宫，擅积财而不擅理财，辅佐诸曜同会者，则理财能力较佳。', '擅积财而不擅理财'),
 R('財帛.廉殺.輔佐', {'any': [{'star': ['左輔', '右弼'], 'at': 'sifang'}, {'star': ['天魁', '天鉞'], 'at': 'sifang'}]},
   '廉貞七殺見〔輔佐吉星〕，你打理錢財的能力較好。',
   'Lian Zhen–Qi Sha meets 〔helper stars〕: you handle money better.',
   '『廉杀』在财帛宫，擅积财而不擅理财，辅佐诸曜同会者，则理财能力较佳。', '则理财能力较佳'),
]})
T.append({'id': '廉貞破軍.財帛', 'stars': ['廉貞', '破軍'], 'rules': [
 R('財帛.廉破.不穩', None,
   '廉貞破軍在財帛宮，財源不穩定；破軍化祿的話，往往要兼行兼職。',
   'With Lian Zhen and Po Jun in your Wealth Palace, income is unsteady; with Po Jun in Abundance you often hold more than one job.',
   '卯酉宫[廉贞破军]同度，财源不稳定。若破军化禄，往往须兼行兼职。', '财源不稳定', 'base'),
]})
T.append({'id': '廉貞貪狼.財帛', 'stars': ['廉貞', '貪狼'], 'rules': [
 R('財帛.廉貪.偏財', {'all': [{'hua': '祿', 'star': ['廉貞', '貪狼'], 'at': 'same'}, FIRE]},
   '廉貞或貪狼化祿，又與火星或鈴星同宮，可得偏財，但來得快、去得也快。',
   'With Lian Zhen or Tan Lang in Abundance alongside Huo Xing or Ling Xing, windfalls come, but go as quickly as they came.',
   '巳亥宫『廉贞贪狼』同度，二者任一化禄，与火铃同度，均主得偏财，但暴得暴失，', '均主得偏财，但暴得暴失'),
]})
T.append({'id': '廉貞寅申.財帛', 'stars': ['廉貞'], 'branch': ['寅', '申'], 'rules': [
 R('財帛.廉貞寅申.理財', None,
   '你理財能力很強，最宜從事財經事業。',
   'You handle money very well, and finance is your natural field.',
   '寅申宫廉贞独坐，与贪狼相对，理财能力甚强。与火星同度者，亦主横发横破，且对钱财相当重视。廉贞坐寅申，最宜从事财经事业。', '最宜从事财经事业', 'base'),
 R('財帛.廉貞寅申.祿馬', LUMA,
   '祿星與天馬相會，你不但善於理財，做貿易也得利。',
   'With Lu Cun and Tian Ma meeting, you not only manage money well but profit from trade.',
   '寅申宫廉贞，最喜禄马交驰，不但善于理财，且主贸适得利。', '不但善于理财'),
]})
T.append({'id': '廉貞.財帛', 'stars': ['廉貞'], 'rules': [
 R('財帛.廉貞.祿', {'any': [H('祿', '廉貞'), {'star': '祿存', 'at': 'same'}]},
   '廉貞化祿或有祿存，容易成富，錢財多由交際應酬而來。',
   'With Lian Zhen in Abundance or Lu Cun present, wealth comes readily, mostly through your social dealings.',
   '但廉贞化禄，或禄存同度，却易成富格。其财每由交际应酬而来。', '其财每由交际应酬而来'),
 R('財帛.廉貞.本', None,
   '廉貞在財帛宮，你靠競爭求財，要與人爭才有所得。',
   'With Lian Zhen in your Wealth Palace, you earn through competition; you have to vie with others to gain.',
   '廉贞主竞争是非以求财，此为其基本性质。', '此为其基本性质', 'base'),
]})

# ── 天府 ──
T.append({'id': '天府卯酉.財帛', 'stars': ['天府'], 'branch': ['卯', '酉'], 'rules': [
 R('財帛.天府卯酉.武科', H('科', '武曲', 'opp'),
   '對宮武曲化科，理財能力很好，善於以錢生錢，容易得人信任。',
   'With Wu Qu in Merit opposite, you manage money very well, make money work for you, and win people’s trust.',
   '若武曲化科，则理财能力甚佳，所渭『以钱生钱』，易得人信任，最宜积集资金。', '则理财能力甚佳'),
]})
T.append({'id': '天府巳亥.財帛', 'stars': ['天府'], 'branch': ['巳', '亥'], 'rules': [
 R('財帛.天府巳亥.掌財', {'all': [H('權', '紫微', 'opp'), H('科', '天府')]},
   '對宮紫微化權、天府化科，一生掌財權，適合基金、財務一類機構。',
   'With Zi Wei in Authority opposite and Tian Fu in Merit, you hold the purse strings all your life; fund or finance houses suit you.',
   '巳亥天府为『紫微七杀』相对，最喜紫微化权，天府同时化科，则一生职掌财权。在现代，宜经营基金、财务机构等。', '则一生职掌财权'),
 R('財帛.天府巳亥.惜財', None,
   '你很惜財，手上沒有現金就沒有安全感。',
   'You treasure money, and feel insecure without cash in hand.',
   '巳亥天府最为惜财，非见现金则无安全感，', '非见现金则无安全感', 'base'),
]})
T.append({'id': '天府丑未.財帛', 'stars': ['天府'], 'branch': ['丑', '未'], 'rules': [
 R('財帛.天府丑未.掌權', {'any': [{'star': ['文昌', '文曲'], 'at': 'same'}, {'star': ['左輔', '右弼'], 'at': 'same'}]},
   '同宮有文昌文曲或左輔右弼，你會掌管財權。',
   'With Wen Chang, Wen Qu, Zuo Fu or You Bi in the palace, you take charge of the money.',
   '丑未宫天府亦宜昌曲、左右同度，则亦主掌财权。', '则亦主掌财权'),
]})
T.append({'id': '天府.財帛', 'stars': ['天府'], 'rules': [
 R('財帛.天府.祿', LU,
   '天府見祿，可以成富：你不只會理財，還有致富的條件。',
   'Tian Fu meets Lu, which can make real wealth: you are not only good at managing money but have what it takes to build it.',
   '天府守财帛宫，不主富厚，仅主其人有储财及理财能力。必须见禄，然后始可成富局，禄存或化禄均可。', '必须见禄，然后始可成富局'),
 R('財帛.天府.科', {'all': [{'not': LU}, H('科', '天府')]},
   '不見祿而天府化科，在理財投資上有信譽，別人信得過你。',
   'Without Lu, Tian Fu in Merit gives you a reputation in managing and investing money; people trust you.',
   '若不见禄，则宜天府化科。此主有信誉，特别于理财及投资方面，必有人予以信赖，', '此主有信誉'),
 R('財帛.天府.本', {'not': LU},
   '天府在財帛宮不主富厚，主的是儲財和理財的能力。',
   'Tian Fu in the Wealth Palace does not mean riches as such; it means the ability to save and manage money.',
   '天府守财帛宫，不主富厚，仅主其人有储财及理财能力。', '仅主其人有储财及理财能力', 'base'),
]})

# ── 太陰 ──
T.append({'id': '太陰辰戌.財帛', 'stars': ['太陰'], 'branch': ['辰', '戌'], 'rules': [
 R('財帛.太陰辰戌.祿', H('祿', '太陰'),
   '太陰化祿最好，你先富起來，然後地位也跟著來。',
   'Tai Yin in Abundance is the best case: you grow wealthy first, and standing follows.',
   '辰戌太阴最喜太阴化禄，主宫而后贵；', '辰戌太阴最喜太阴化禄'),
]})
T.append({'id': '太陰亥.財帛', 'stars': ['太陰'], 'branch': ['亥'], 'rules': [
 R('財帛.太陰亥.名譽', None,
   '太陰坐亥，先有地位名譽，然後有財富；不是靠經商致富。',
   'With Tai Yin in Hai, standing and reputation come first and wealth follows; trade is not how you get rich.',
   '亥宫太阴守财帛宫，却主先有地位名誉然后有财富，故绝非经商致富之命。', '却主先有地位名誉然后有财富'),
]})
T.append({'id': '太陰卯酉.財帛', 'stars': ['太陰'], 'branch': ['卯', '酉'], 'rules': [
 R('財帛.太陰卯酉.白手', None,
   '太陰坐卯酉，你白手興家；坐酉比坐卯好。',
   'With Tai Yin in Mao or You, you build your fortune from nothing; You is the better seat.',
   '卯酉宫太阴独坐，与天同相对，在酉宫入庙，故优于在卯宫落陷，唯二者皆主白手兴家。', '唯二者皆主白手兴家', 'base'),
]})

# ── 貪狼 ──
T.append({'id': '貪狼辰戌.財帛', 'stars': ['貪狼'], 'branch': ['辰', '戌'], 'rules': [
 R('財帛.貪狼辰戌.火貪', {'all': [FIRE, H('祿', '貪狼')]},
   '火貪或鈴貪而貪狼化祿，財運會突然亨通，帶點投機色彩；記得見好就收。',
   'With Huo Xing or Ling Xing and Tan Lang in Abundance, fortune turns suddenly in your favour, with a speculative edge; know when to stop.',
   '辰戌宫[火贪]、[铃贪]以得贪狼化禄为贵；主突然财运亨通，且略带投机色彩，但必须见好收篷，', '主突然财运亨通'),
]})
T.append({'id': '貪狼.財帛', 'stars': ['貪狼'], 'rules': [
 R('財帛.貪狼.煞', {'star': ['擎羊', '陀羅', '地空', '地劫'], 'at': 'sifang'},
   '貪狼會到羊陀空劫，你不宜投機，穩穩地賺比快錢好。',
   'Tan Lang meets Qing Yang, Tuo Luo, Di Kong or Di Jie: speculation is not for you, and steady earning beats quick money.',
   '贪狼与羊陀、空劫、大耗会同，则以不投机为宜，', '则以不投机为宜', 'limit'),
 R('財帛.貪狼.本', None,
   '貪狼在財帛宮，擅長運用金錢，卻不擅守財，常常以攻為守。',
   'With Tan Lang in your Wealth Palace, you are good at putting money to work but not at keeping it, and often treat attack as the best defence.',
   '贪狼守财帛，主擅长运用金钱，但却不擅长守财，且常常有以攻为守的倾向，', '但却不擅长守财', 'base'),
 R('財帛.貪狼.闊綽', None,
   '你出手闊綽大方，心裡卻精於盤算計較。',
   'Open-handed on the outside, you keep careful accounts on the inside.',
   '贪狼守财帛宫，手段阔绰大方，但仍精于盘算汁较，', '手段阔绰大方'),
]})

# ── 巨門 ──
T.append({'id': '巨門子午.財帛', 'stars': ['巨門'], 'branch': ['子', '午'], 'rules': [
 R('財帛.巨門子午.隱玉', LU,
   '巨門見祿，成「石中隱玉」：早年辛苦，中年後脫穎而出；發達之後不宜鋒芒太露。',
   'Ju Men meeting Lu forms the hidden-jade pattern: hard early years, then you stand out after midlife; once you rise, keep a low profile.',
   '子午宫巨门与天机相对，见禄，为『石中隐玉格』，主中年后脱颖而出，突成巨富。唯早年必受艰辛。发达之后，若锋芒太露者，又易成为他人攻击目标。', '主中年后脱颖而出'),
 R('財帛.巨門子午.異族', None,
   '你也適合在外資機構服務，先得信譽，再發展事業。',
   'Working for a foreign-owned organisation also suits you: reputation first, then the career grows.',
   '子午巨门居财帛宫，亦宜在异族经营之机构服务，则主先得信誉，然后事业发展而富裕。', '亦宜在异族经营之机构服务'),
]})
T.append({'id': '巨門辰戌.財帛', 'stars': ['巨門'], 'branch': ['辰', '戌'], 'rules': [
 R('財帛.巨門辰戌.專業', None,
   '主白手創業，以專業為宜，因此可以成富；但工作多奔波。',
   'You start from nothing, best in a profession, and can prosper that way, though the work keeps you on the move.',
   '辰戌宫巨门与天同相对，主白手创业，且以专业为宜，因之可以成富。', '且以专业为宜', 'base'),
]})
T.append({'id': '巨門.財帛', 'stars': ['巨門'], 'rules': [
 R('財帛.巨門.太陽', {'all': [{'star': '太陽', 'at': ['same', 'opp']}, {'hua': ['祿', '權', '科'], 'star': ['巨門', '太陽'], 'at': ['same', 'opp']}]},
   '巨門與太陽同宮或相對而有〔吉化〕，一生受外地或外國人信賴而成富，也有語言天份。',
   'With Ju Men facing or sharing with Tai Yang under 〔good transformations〕, people from abroad trust you and that is how you prosper; you also have a gift for languages.',
   '巨门与太阳同度或对照，有吉化者，或命宫见禄马交驰者，主一生受异族信赖而成富。且主其人有语言天才，', '主一生受异族信赖而成富'),
]})

# ── 天相 ──
T.append({'id': '天相丑未.財帛', 'stars': ['天相'], 'branch': ['丑', '未'], 'rules': [
 R('財帛.天相丑未.突發', None,
   '可以突然發起來，但之前會有一段經濟較緊的日子。',
   'Money can arrive suddenly, but only after a tight stretch.',
   '丑未宫天相，与[紫微破军]相对，可主突发。但突发前必有一段时期经济困难，', '但突发前必有一段时期经济困难', 'base'),
]})
T.append({'id': '天相巳亥.財帛', 'stars': ['天相'], 'branch': ['巳', '亥'], 'rules': [
 R('財帛.天相巳亥.祿馬', LUMA,
   '祿星與天馬相會，你常有外地來的生財機會。',
   'With Lu Cun and Tian Ma meeting, money-making chances often come from elsewhere.',
   '巳亥天相见禄马交驰，主常得外地提供之生财机会。', '主常得外地提供之生财机会'),
 R('財帛.天相巳亥.武吉', {'all': [{'hua': ['權', '科'], 'star': '武曲', 'at': 'opp'}, {'any': [FUZUO, KUIYUE]}]},
   '對宮武曲化權或化科，又有〔吉星〕，財源較穩定，終有積蓄。',
   'With Wu Qu in Authority or Merit opposite and 〔helper stars〕 present, income is steadier and you end up with savings.',
   '巳亥天相见武曲化权、化科，又有吉曜同拱，则财源较为稳定，且主终有积蓄。', '且主终有积蓄'),
]})
T.append({'id': '天相.財帛', 'stars': ['天相'], 'rules': [
 R('財帛.天相.財印', LUSAME,
   '天相見祿存或化祿，成「財印」，你因此富足。',
   'Tian Xiang meeting Lu Cun or Abundance becomes a seal of wealth, and points to comfort.',
   '成财印的天相，如得财荫夹印，与禄存、化禄同度或对拱者皆是。此主富厚发达。', '此主富厚发达'),
 R('財帛.天相.慷慨', None,
   '你對錢財謹慎，但常能慷慨解囊，幫人渡過難關。',
   'Careful with money, you can still be generous when someone is in need.',
   '唯与天府不同之处，则在于天相守财帛时，常能慷慨解囊以济人之危，', '常能慷慨解囊以济人之危'),
]})

# ── 天梁 ──
T.append({'id': '天梁巳亥.財帛', 'stars': ['天梁'], 'branch': ['巳', '亥'], 'rules': [
 R('財帛.天梁巳亥.白手', None,
   '天梁對著天同，你靠自己白手興家。',
   'Tian Liang faces Tian Tong: you build your fortune from nothing.',
   '巳亥天梁与天同相对，主白手兴家。', '巳亥天梁与天同相对，主白手兴家', 'base'),
 R('財帛.天梁巳亥.祿馬', LUMA,
   '祿存或化祿遇上天馬，你一生的財源多在外地。',
   'Lu meets Tian Ma: your income comes mostly from far away, all your life.',
   '若禄马交驰，决主一生财源在于异域。', '决主一生财源在于异域'),
]})
T.append({'id': '天梁丑未.財帛', 'stars': ['天梁'], 'branch': ['丑', '未'], 'rules': [
 R('財帛.天梁丑未.左右夾', {'jia': ['左輔', '右弼']},
   '天梁的財本來動盪，有左輔右弼相夾，你才存得住錢。',
   'Tian Liang’s money tends to swing, but with Zuo Fu and You Bi flanking it, you are able to save.',
   '丑未宫天梁独坐，与天机相对，财帛动荡。唯左辅右弼夹者，始主能积存。', '唯左辅右弼夹者，始主能积存'),
 R('財帛.天梁丑未.昌曲夾', {'jia': ['文昌', '文曲']},
   '文昌文曲相夾，你一生名大於利，求利不如求名。',
   'Flanked by Wen Chang and Wen Qu, your name outweighs your earnings; seek reputation rather than profit.',
   '丑未天梁，有昌曲夹，一生名大于利。故求利不如求名。', '一生名大于利'),
]})
T.append({'id': '天梁.財帛', 'stars': ['天梁'], 'rules': [
 R('財帛.天梁.祿', {'all': [H('祿', '天梁'), {'not': {'star': '天機', 'at': 'same'}}]},
   '天梁化祿反而帶來糾紛困擾；求財宜以不損害別人為前提。',
   'Tian Liang in Abundance actually brings disputes; make sure your earning never comes at others’ expense.',
   '天梁不宜化禄，若化禄，反主有纠纷、困扰。', '反主有纠纷、困扰', 'limit'),
 R('財帛.天梁.科', H('科', '天梁'),
   '天梁化科，你先有名聲，錢隨後才來。',
   'Tian Liang in Merit: reputation comes first for you, and money follows.',
   '天梁守财帛宫，亦先名后利。故天梁化科，优于天梁化禄。', '故天梁化科，优于天梁化禄'),
 R('財帛.天梁.服務', None,
   '天梁在財帛宮宜以服務為目的，不宜以求財為目的；從商也以受雇為宜。',
   'With Tian Liang in your Wealth Palace, aim to serve rather than to earn; even in business, being employed suits you better.',
   '天梁守财帛宫，宜以服务为目的，不宜以求财为目的。', '宜以服务为目的，不宜以求财为目的', 'base'),
]})

# ── 七殺 ──
T.append({'id': '七殺子午.財帛', 'stars': ['七殺'], 'branch': ['子', '午'], 'rules': [
 R('財帛.七殺子午.意外', {'any': [{'hua': ['祿', '權', '科'], 'at': 'sifang'}, {'star': '祿存', 'at': 'sifang'}]},
   '見〔吉化〕或祿存，你常得意外之財，而且來路正當。',
   'With 〔good transformations〕 or Lu Cun, unexpected money often comes your way, and from honest sources.',
   '子午宫七杀独坐，对宫『武曲天府』，见吉化或禄存者，常得意外财。唯此意外财并非由非法途径得来。', '常得意外财'),
]})
T.append({'id': '七殺寅申.財帛', 'stars': ['七殺'], 'branch': ['寅', '申'], 'rules': [
 R('財帛.七殺寅申.祿馬', LUMA,
   '祿星與天馬相會，一生至少有一次事業上的重大改變，而且多是好的改變。',
   'With Lu Cun and Tian Ma meeting, your career takes at least one major turn in life, usually for the better.',
   '寅申七杀见禄马交驰，主一生必至少有一次事业上的重大改变。此改变且倾向于良好的转变。', '此改变且倾向于良好的转变'),
 R('財帛.七殺寅申.科', {'any': [H('科', '紫微', 'opp'), H('科', '天府', 'opp')]},
   '對宮紫微或天府化科，你的財雖不橫發，風波也小。',
   'With Zi Wei or Tian Fu in Merit opposite, no sudden fortune, but few storms either.',
   '喜会紫微化科、天府化科，则虽不横发，但风波亦小。', '则虽不横发，但风波亦小'),
]})
T.append({'id': '七殺辰戌.財帛', 'stars': ['七殺'], 'branch': ['辰', '戌'], 'rules': [
 R('財帛.七殺辰戌.吉', {'any': [{'hua': ['祿', '權', '科'], 'at': 'sifang'}, FUZUO, KUIYUE]},
   '見〔吉化吉星〕，你會富裕，但不宜投機賭博。',
   'With 〔good transformations or helper stars〕, you prosper, but gambling and speculation are not for you.',
   '辰戌七杀独坐，对宫为[廉贞天府]，若见吉化吉曜，亦主富裕。', '若见吉化吉曜，亦主富裕'),
]})
T.append({'id': '七殺.財帛', 'stars': ['七殺'], 'rules': [
 R('財帛.七殺.羊', {'star': '擎羊', 'at': 'same'},
   '七殺和擎羊同宮，你求財多要和人爭奪。',
   'Qi Sha shares the palace with Qing Yang: earning often means fighting others for it.',
   '七杀躔擎羊主争夺；', '七杀躔擎羊主争夺', 'limit'),
 R('財帛.七殺.本', None,
   '七殺在財帛宮，主掌財權；與天府主守不同，七殺主攻，主創出新局面。',
   'With Qi Sha in your Wealth Palace, you control the purse; unlike Tian Fu’s holding, Qi Sha attacks and opens new ground.',
   '七杀守财帛宫，主掌财权。这种掌财权的性质与天府不同。大致而言，天府主守，七杀主攻。天府主在现成局面下发展，七杀则主创出新局面。', '七杀守财帛宫，主掌财权', 'base'),
]})

# ── 破軍 ──
T.append({'id': '破軍辰戌.財帛', 'stars': ['破軍'], 'branch': ['辰', '戌'], 'rules': [
 R('財帛.破軍辰戌.魁鉞', {'jia': ['天魁', '天鉞']},
   '天魁天鉞相夾，你一生多發展、創新的機會。',
   'Flanked by Tian Kui and Tian Yue, you have many chances to grow and innovate.',
   '辰肢破军喜魁钺夹，或对宫魁钺夹，则一生多发展或创新的机会。', '则一生多发展或创新的机会'),
 R('財帛.破軍辰戌.陀羅', {'star': '陀羅', 'at': 'same'},
   '同宮有陀羅，你有突破的機會也容易失去。',
   'With Tuo Luo in the palace, chances to break through are easily lost.',
   '辰戌破军最不喜陀罗同度，则主有突破机会亦易失却。', '则主有突破机会亦易失却', 'limit'),
]})
T.append({'id': '破軍.財帛', 'stars': ['破軍'], 'rules': [
 R('財帛.破軍.祿', H('祿', '破軍'),
   '破軍化祿，你要身兼幾份工作或幾門生意來賺錢。',
   'Po Jun in Abundance: you make money by holding several jobs or lines of business at once.',
   '倘破军本身化禄，则必兼行兼职以生财。', '则必兼行兼职以生财'),
 R('財帛.破軍.本', None,
   '破軍在財帛宮不擅理財，擅長開創財源；財源也來自多方面。',
   'With Po Jun in your Wealth Palace, managing money is not your strength; your nature is to open new sources, and income comes from several directions.',
   '破军守财帛宫，不擅理财，其本质为开创财源。', '其本质为开创财源', 'base'),
 R('財帛.破軍.轉行', None,
   '破軍坐財帛，你多數要轉換行業，然後才能致富。',
   'With Po Jun in the palace, you usually need to change line of work before you prosper.',
   '破军守财帛宫者，多主转变行业然后始能致富。', '多主转变行业然后始能致富'),
]})

# ── 唔限主星（通則，排最後） ──
T.append({'id': '財帛通則', 'stars': [], 'rules': [
 R('財帛.通則.祿馬', LUMA,
   '財帛宮見祿存與天馬相會，成「祿馬交馳」，是求財最喜歡的配搭。',
   'Lu Cun and Tian Ma meeting in the Wealth Palace form the galloping-fortune pattern, the most welcome combination for earning.',
   '财帛宫最喜『禄马交驰』，即禄存与天马同度或相对。', '财帛宫最喜『禄马交驰』'),
 R('財帛.通則.文書', {'hua': '忌', 'star': ['文昌', '文曲'], 'at': 'sifang'},
   '文昌或文曲化忌，帶文書失誤的性質：簽約、支票一類事要格外小心。',
   'Wen Chang or Wen Qu in Hindrance carries a risk of paperwork errors: take extra care with contracts and cheques.',
   '尤不喜文昌化忌及文曲化忌。此二星化忌皆有文书失误的性质，须防空头支票，合同纠纷等损失。', '此二星化忌皆有文书失误的性质', 'limit'),
 R('財帛.通則.空劫', KONG,
   '地空或地劫在財帛宮，財帛容易突然有挫折性的變化。',
   'With Di Kong or Di Jie in the Wealth Palace, money is prone to sudden setbacks.',
   '地空地劫基本上不利财帛，主突然产生挫折性的变化，', '主突然产生挫折性的变化', 'limit'),
 R('財帛.通則.擎羊', {'star': '擎羊', 'at': 'same'},
   '擎羊在財帛宮，求財多要面對競爭，你常要與人相爭。',
   'With Qing Yang in your Wealth Palace, earning usually means facing competition, and you often have to contend with others.',
   '擎羊坐财帛宫，基本主竞争，', '擎羊坐财帛宫，基本主竞争'),
 R('財帛.通則.陀羅', {'star': '陀羅', 'at': 'same'},
   '陀羅在財帛宮，你的錢常常來得慢，要有耐性。',
   'With Tuo Luo in your Wealth Palace, money often arrives late, so patience helps.',
   '陀罗坐财帛宫，主拖延。', '陀罗坐财帛宫，主拖延'),
 R('財帛.通則.火鈴', {'all': [FIRE, {'not': {'star': '貪狼', 'at': 'same'}}]},
   '火星或鈴星在財帛宮，你進財較困難，要勞心勞力。',
   'With Huo Xing or Ling Xing in the Wealth Palace, money is harder to come by and takes effort of mind and body.',
   '火铃在财帛宫的毖本性质，为增加进财的困难，日主劳心劳力。', '为增加进财的困难'),
 R('財帛.通則.輔弼', {'all': [FUZUO, {'not': {'palace': '財帛', 'is': 'bad'}}]},
   '見左輔右弼，可以憑別人的助力生財，也可以考慮自己經營。',
   'With Zuo Fu or You Bi, others help you earn, and running your own business is worth considering.',
   '财帛宫见辅弼，则可凭别人助力以生财，所以可考虑独立经营；', '则可凭别人助力以生财'),
 R('財帛.通則.魁鉞', KUIYUE,
   '見天魁天鉞，有生財的機會，往往隨制度改變而來。',
   'With Tian Kui or Tian Yue, chances to earn come your way, often when rules or systems change.',
   '见魁钺，则有生财的机会，往往牵涉曲章制度的改变而来；', '则有生财的机会'),
 R('財帛.通則.昌曲', {'star': ['文昌', '文曲'], 'at': 'sifang'},
   '見文昌文曲，主要是增加聲譽；也可能憑文藝或學術生財。',
   'With Wen Chang or Wen Qu, the main gain is reputation; money may also come through writing, the arts or scholarship.',
   '见昌曲，则不过增加声誉，化科时声誉尤隆，有时亦为凭文艺或学术以生财的表征。', '则不过增加声誉'),
]})
