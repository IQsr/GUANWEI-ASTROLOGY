# 遷移宮規則（2026-10-12）。題目次序 = 合併輸出次序：組合／地支題目行先，單星通則其次。
FIRE = {'star': ['火星', '鈴星'], 'at': 'same'}
KONG = {'star': ['地空', '地劫'], 'at': 'same'}
YANGTUO = {'star': ['擎羊', '陀羅'], 'at': 'same'}
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
T.append({'id': '紫微天府.遷移', 'stars': ['紫微', '天府'], 'rules': [
 R('遷移.紫府.波折', None,
   '紫微天府在遷移宮，不一定代表遷移有利：往往要先經歷波折，然後才安定下來。',
   'Zi Wei with Tian Fu in your Travel Palace does not automatically make moving good for you: there are usually twists before you settle.',
   '七杀坐命，迁移宫为『紫微天府』，并不一定代表迁移有利，往往迁移后经历波折艰危，然后始能安定，', '往往迁移后经历波折艰危，然后始能安定', 'base'),
]})
T.append({'id': '紫微貪狼.遷移', 'stars': ['紫微', '貪狼'], 'rules': [
 R('遷移.紫貪.輔佐', {'any': [FUZUO, KUIYUE]},
   '紫微貪狼在遷移宮，又見〔輔佐吉星〕，遷移多有利；離開出生地發展，也利經商。',
   'Zi Wei with Tan Lang in your Travel Palace, joined by 〔helper stars〕, generally makes moving worthwhile; developing away from home and trading both suit you.',
   '在卯西二富无正曜，迁移宫为『紫微贪狼』，又见辅佐吉曜同会，多主迁移有利。', '多主迁移有利'),
]})
T.append({'id': '紫微破軍.遷移', 'stars': ['紫微', '破軍'], 'rules': [
 R('遷移.紫破.兩面', None,
   '紫微破軍在遷移宮，你在外既有助力，也有破壞力。',
   'Zi Wei with Po Jun in your Travel Palace brings both help and disruption when you are away.',
   '天相坐命，迁移宫为『紫微破军』；若破军坐命，迁移宫为『紫微天相』；是否利于迁移，须详实际星曜组合而定。一般情形为既有助力，亦有破坏力，', '一般情形为既有助力，亦有破坏力', 'base'),
]})
T.append({'id': '紫微天相.遷移', 'stars': ['紫微', '天相'], 'rules': [
 R('遷移.紫相.無煞', {'not': SHA},
   '紫微天相在遷移宮而不見煞，大利遷移：在外受人尊崇，容易建立事業。',
   'Zi Wei with Tian Xiang in your Travel Palace and no harsh stars strongly favours moving: people respect you away from home, and you build a career easily.',
   '[紫徽天相]守迁移宫，不见煞忌，则大利迁移，在外受人尊崇，易于建立事业。', '在外受人尊崇，易于建立事业'),
 R('遷移.紫相.煞', SHA,
   '紫微天相在遷移宮而見〔煞〕，在外容易招人嫉妒是非。',
   'Zi Wei with Tian Xiang in your Travel Palace alongside 〔harsh stars〕 draws envy and gossip when you are away.',
   '若见煞忌则招嫉妒是非。', '若见煞忌则招嫉妒是非', 'limit'),
]})
T.append({'id': '紫微七殺.遷移', 'stars': ['紫微', '七殺'], 'rules': [
 R('遷移.紫殺.敬畏', None,
   '紫微七殺在遷移宮，出外為人敬畏，在外能建立事功。',
   'Zi Wei with Qi Sha in your Travel Palace earns you respect away from home, and you can make your mark there.',
   '紫微与七杀同拱，主出外为人敬畏，亦多人禄。', '主出外为人敬畏', 'base'),
]})
T.append({'id': '紫微.遷移', 'stars': ['紫微'], 'rules': [
 R('遷移.紫微.朝拱', {'all': [FUZUO, KUIYUE]},
   '紫微在遷移宮得眾星拱照，宜遷移：在外有人提攜，也有助力。',
   'Zi Wei in your Travel Palace surrounded by helpers favours moving: people abroad lift you up and lend a hand.',
   '紫迁移富有百官朝拱，则宜迁移，主有人提携，或有助力；', '则宜迁移，主有人提携，或有助力'),
 R('遷移.紫微.科', {'all': [H('科', '紫微'), {'any': [FUZUO, KUIYUE]}]},
   '紫微化科又見〔輔佐吉星〕，你在外受人敬重。',
   'Zi Wei in Recognition with 〔helper stars〕: people away from home hold you in high regard.',
   '紫微化科在迁移宫，见辅佐吉曜?主在外有人敬重；', '主在外有人敬重'),
 R('遷移.紫微.權', H('權', '紫微'),
   '紫微化權，你在外只宜憑自己的力量打開局面。',
   'Zi Wei in Authority: away from home, rely on your own strength to open doors.',
   '化权，只宜凭一己力量打开局面，', '只宜凭一己力量打开局面'),
]})

# ── 天機 ──
T.append({'id': '天機太陰.遷移', 'stars': ['天機', '太陰'], 'rules': [
 R('遷移.機陰.浮動', None,
   '天機太陰在遷移宮較浮動：即使見吉，也勞心勞力，不專一業，不守一地。',
   'Tian Ji with Tai Yin in your Travel Palace is restless: even with good signs you work hard, without settling on one job or one place.',
   '太阴天机的组合，亦嫌浮动，故虽见吉亦主劳心劳力，不专一业，不守一地。', '不专一业，不守一地', 'base'),
]})
T.append({'id': '天機巨門.遷移', 'stars': ['天機', '巨門'], 'rules': [
 R('遷移.機巨.忌', H('忌', '天機'),
   '天機化忌，你在外人緣較少，容易失意。',
   'Tian Ji in Obstruction: fewer friends away from home, and disappointment comes easily.',
   '巨门天机的组合，若天机化忌，则主少人缘及失意。', '则主少人缘及失意', 'limit'),
 R('遷移.機巨.吉', {'any': [H('祿', '天機'), H('權', '天機'), H('祿', '巨門')]},
   '天機化祿化權或巨門化祿，可以出外創業；以巨門化祿最好。',
   'With Tian Ji in Abundance or Authority, or Ju Men in Abundance, you can start a venture away from home; Ju Men in Abundance is best.',
   '巨门天机，若天机化禄、权者，亦主可出外创业。唯不及巨门化禄之佳。', '亦主可出外创业'),
]})
T.append({'id': '天機天梁.遷移', 'stars': ['天機', '天梁'], 'rules': [
 R('遷移.機梁.機遇', GOOD,
   '天機天梁見〔吉〕，你在外機遇多，只是不安定。',
   'Tian Ji with Tian Liang and 〔good signs〕: plenty of opportunities away from home, though little stability.',
   '天梁、天机的组合，若逢吉化、吉曜，则多机遇而不安定，', '则多机遇而不安定'),
]})
T.append({'id': '天機.遷移', 'stars': ['天機'], 'rules': [
 R('遷移.天機.祿馬', LUMA,
   '祿星與天馬相會，你雖然常常走動，卻多享受。',
   'With Lu and Tian Ma meeting, you move about often, but enjoy it.',
   '迁移宫天机见禄马交驰，则虽主经常迁动，但却多享受；', '但却多享受'),
 R('遷移.天機.火鈴', FIRE,
   '同宮有火星或鈴星，你出外奔忙，不安一地。',
   'With Huo Xing or Ling Xing in the palace, you are always on the move, never settling in one place.',
   '迁移宫天机与火铃同度，主出外奔忙，风露辛酸，不安一地；与羊陀同度，主是非口舌；与空劫同度，主阻碍挫折。', '主出外奔忙，风露辛酸，不安一地', 'limit'),
 R('遷移.天機.羊陀', YANGTUO,
   '同宮有擎羊或陀羅，你在外多是非口舌。',
   'With Qing Yang or Tuo Luo in the palace, there is talk and dispute when you are away.',
   '迁移宫天机与火铃同度，主出外奔忙，风露辛酸，不安一地；与羊陀同度，主是非口舌；与空劫同度，主阻碍挫折。', '与羊陀同度，主是非口舌', 'limit'),
 R('遷移.天機.本', None,
   '天機在遷移宮，利出門離鄉發展；不一定離鄉定居，也可能是經常要離家的工作，或常轉工轉業。',
   'With Tian Ji in your Travel Palace, leaving home to develop suits you; not necessarily settling elsewhere, but perhaps work that keeps you travelling, or frequent changes of job.',
   '天机居迁移宫，主利出门离乡发展。此乃由于星曜性质浮动之故。但却不一定离乡定居，', '主利出门离乡发展', 'base'),
]})

# ── 太陽 ──
T.append({'id': '太陽太陰.遷移', 'stars': ['太陽', '太陰'], 'rules': [
 R('遷移.陰陽.忙碌', None,
   '太陽太陰在遷移宮，即使見吉，也變動不居、多忙碌。',
   'Tai Yang with Tai Yin in your Travel Palace keeps you moving and busy even with good signs.',
   '太阴太阳的组合，虽见吉亦主变动不居，每多忙碌。见煞轻亦主进退失据。必须吉化，然后始主在外事业有成。', '虽见吉亦主变动不居，每多忙碌', 'base'),
]})
T.append({'id': '太陽天梁.遷移', 'stars': ['太陽', '天梁'], 'rules': [
 R('遷移.陽梁.求學', None,
   '太陽天梁在遷移宮，在外以求名、求學為主，也利專業。',
   'Tai Yang with Tian Liang in your Travel Palace makes time away about reputation and study, and favours professional work.',
   '太阳天梁的组合，以求名、求学为主。见昌曲更佳。不然，亦利于专业。', '以求名、求学为主', 'base'),
]})
T.append({'id': '太陽.遷移', 'stars': ['太陽'], 'rules': [
 R('遷移.太陽.巨門', {'star': '巨門', 'at': ['same', 'opp']},
   '太陽與巨門同宮或相對，一般較利經商，容易得外地或外國人賞識，只是較勞心。',
   'With Tai Yang beside or facing Ju Men, trade generally suits you, and people from elsewhere appreciate you, though it takes mental effort.',
   '太阳与巨门同度或对拱，一般较利经商，可得异乡或外邦人赏识，唯主劳心。', '可得异乡或外邦人赏识'),
 R('遷移.太陽.求名', {'not': {'star': '巨門', 'at': ['same', 'opp']}},
   '太陽在遷移宮，在外利於求名、求學進修，增加資歷；不利於聚財，未必適合在外經商。',
   'With Tai Yang in your Travel Palace, time away is good for reputation, study and credentials; it does not gather money, and trading abroad may not suit you.',
   '太阳主贵，亦即对社会地位的争取相鼍重要，居迁移宫亦有同样意味，故往往表现为适宜任外求学、进修，增加资历，未必适宜在外经商。', '增加资历，未必适宜在外经商'),
 R('遷移.太陽.本', None,
   '太陽宜動不宜靜，在遷移宮，你離鄉別井發福。',
   'Tai Yang thrives on movement, and in your Travel Palace it means prospering away from home.',
   '太阳宜动不宜静，宜发散不宜收敛，居迁移宫，主不利祖业，离乡背井发福。', '离乡背井发福', 'base'),
]})

# ── 武曲 ──
T.append({'id': '武曲貪狼.遷移', 'stars': ['武曲', '貪狼'], 'rules': [
 R('遷移.武貪.經商', None,
   '武曲貪狼在遷移宮，你最宜在外經商。',
   'Wu Qu with Tan Lang in your Travel Palace: trading away from home suits you best.',
   '武曲与贪狼同度或相会，最宜在外经商，', '最宜在外经商', 'base'),
 R('遷移.武貪.火鈴', FIRE,
   '同宮有火星或鈴星，你發財之後最宜回到本土。',
   'With Huo Xing or Ling Xing in the palace, once you have made your money, coming home is best.',
   '凡武曲与『火贪』、『铃贪]同度或相对，则于发财之后，最宜回本土本根。', '最宜回本土本根'),
]})
T.append({'id': '武曲天相.遷移', 'stars': ['武曲', '天相'], 'rules': [
 R('遷移.武相.吉', GOOD,
   '武曲天相見〔吉〕，利遷移外地經商，常有意料不到的機會。',
   'Wu Qu with Tian Xiang and 〔good signs〕 favours moving away to trade, often bringing chances you never expected.',
   '[武曲天相]在迁移宫，见吉即利迁移外地经商。常主可得意料不及的机会。', '常主可得意料不及的机会'),
]})
T.append({'id': '武曲七殺.遷移', 'stars': ['武曲', '七殺'], 'rules': [
 R('遷移.武殺.祿', H('祿', '武曲'),
   '武曲化祿，你遷移異地後活動能力很強，因此獲利。',
   'Wu Qu in Abundance: once you move, you are very active, and that is how you profit.',
   '武曲与七杀同拱，化禄，则迁移异地后，活动能力甚强，因此获利。', '则迁移异地后，活动能力甚强，因此获利'),
]})
T.append({'id': '武曲.遷移', 'stars': ['武曲'], 'rules': [
 R('遷移.武曲.祿', LU,
   '武曲見祿，你到外地做買賣能夠得利。',
   'Wu Qu meets Lu: trading away from home pays off for you.',
   '武曲守迁移宫，主迁移异地后必多忙碌。能否有收获，则须视是否会吉曜而定，尤喜见禄，则主在外贸迁得利。', '则主在外贸迁得利'),
 R('遷移.武曲.本', None,
   '武曲在遷移宮，你到了異地後必多忙碌。',
   'With Wu Qu in your Travel Palace, life away from home is busy.',
   '武曲守迁移宫，主迁移异地后必多忙碌。能否有收获，则须视是否会吉曜而定，', '主迁移异地后必多忙碌', 'base'),
]})

# ── 天同 ──
T.append({'id': '天同太陰.遷移', 'stars': ['天同', '太陰'], 'rules': [
 R('遷移.同陰.忌', H('忌', '太陰'),
   '天同太陰而太陰化忌，你絕不宜到外地投資。',
   'Tian Tong–Tai Yin with Tai Yin in Obstruction: you should never invest away from home.',
   '天同太阴的组合，若太阴化忌，绝不宜在外投资。', '绝不宜在外投资', 'limit'),
 R('遷移.同陰.祿', {'all': [LU, GOOD]},
   '見祿又見〔吉星〕，你可以遠走他方，白手興家。',
   'With Lu and 〔helpful stars〕, you can go far and build a home from nothing.',
   '太阴与天同的组合，见禄，又见吉曜，主因远涉重洋而白手兴家。', '主因远涉重洋而白手兴家'),
]})
T.append({'id': '天同巨門.遷移', 'stars': ['天同', '巨門'], 'rules': [
 R('遷移.同巨.口舌', None,
   '天同巨門在遷移宮，你在外多是非口舌。',
   'Tian Tong with Ju Men in your Travel Palace brings talk and dispute away from home.',
   '天同巨门的组合，主是非口舌。唯见吉则主劳心得财。', '天同巨门的组合，主是非口舌', 'base'),
 R('遷移.同巨.吉', GOOD,
   '天同巨門見〔吉〕，你在外雖然勞心，卻能得財。',
   'Tian Tong–Ju Men meets 〔good signs〕: away from home you work your mind hard, but it brings money.',
   '天同巨门的组合，主是非口舌。唯见吉则主劳心得财。', '唯见吉则主劳心得财'),
]})
T.append({'id': '天同天梁.遷移', 'stars': ['天同', '天梁'], 'rules': [
 R('遷移.同梁.提拔', GOOD,
   '天同天梁在遷移宮而見〔吉〕，出外受人提拔，或在外地有現成的機會。',
   'Tian Tong with Tian Liang in your Travel Palace, with 〔good signs〕: people away from home lift you up, or an opening is waiting for you there.',
   '[天同天梁]同度，命宫必无正曜，若命宫不会吉，而迁移宫会吉，则主出外受人提拔，或在异地有现成机会。', '则主出外受人提拔，或在异地有现成机会'),
]})
T.append({'id': '天同.遷移', 'stars': ['天同'], 'rules': [
 R('遷移.天同.祿', H('祿', '天同'),
   '天同化祿，你出外不一定發財，但安定享福，遇事有人幫忙。',
   'Tian Tong in Abundance: travel brings comfort rather than money; things settle, and others help when needed.',
   '天同化禄，不主出外发财，但主纳福。必须何禄存迭冲，然后始主发财。所谓纳福，但主安定，而不必劳心劳力，或遇事可得他人助力。', '或遇事可得他人助力'),
 R('遷移.天同.忌', H('忌', '天同'),
   '天同化忌，你出門在外時多擔心、放不下。',
   'Tian Tong in Obstruction: when you are away from home, you worry a lot and find it hard to let go.',
   '天同守迁移宫，一般主出门得福。唯天同化忌者。则主多担心。', '则主多担心', 'limit'),
 R('遷移.天同.火鈴', FIRE,
   '同宮有火星或鈴星，在外多挫折不安，往往功虧一簣，要費盡心力才扭轉得來。',
   'With Huo Xing or Ling Xing in the palace, there are setbacks away from home, often at the last step, and it takes real effort to turn things round.',
   '倘天同与火铃同度，则每多挫折不安，往往功亏一篑。必费尽心力然后始可扭转局面。', '往往功亏一篑', 'limit'),
 R('遷移.天同.本', {'not': H('忌', '天同')},
   '天同在遷移宮，你出門在外一般是得福的。',
   'With Tian Tong in your Travel Palace, going out into the world generally brings you good fortune.',
   '天同守迁移宫，一般主出门得福。', '一般主出门得福', 'base'),
]})

# ── 廉貞 ──
T.append({'id': '廉貞天相.遷移', 'stars': ['廉貞', '天相'], 'rules': [
 R('遷移.廉相.行政', None,
   '廉貞天相在遷移宮，適合離鄉到大機構做行政管理。',
   'Lian Zhen with Tian Xiang in your Travel Palace suits leaving home for administrative work in a large organisation.',
   '廉贞坐迁移宫，古代认为利于仕宦，尤其是『廉贞天相]的组合，为离乡出仕，或任职僚幕之兆。在现代，可将大企业机构的行政管理职务，视为与僚幕有同一性质。', '为离乡出仕，或任职僚幕之兆', 'base'),
]})
T.append({'id': '廉貞七殺.遷移', 'stars': ['廉貞', '七殺'], 'rules': [
 R('遷移.廉殺.聲譽', None,
   '廉貞七殺在遷移宮，你遷移異地能建立聲譽。',
   'Lian Zhen with Qi Sha in your Travel Palace: moving away lets you build a reputation.',
   '廉贞与七杀同拱，主迁移异地能建立声誉。', '主迁移异地能建立声誉', 'base'),
 R('遷移.廉殺.祿', H('祿', '廉貞'),
   '廉貞化祿，你在外順利得財，而且多助力。',
   'Lian Zhen in Abundance: money comes smoothly away from home, with plenty of help.',
   '廉贞化禄者，顺利得财，且多助力；', '顺利得财，且多助力'),
]})
T.append({'id': '廉貞貪狼.遷移', 'stars': ['廉貞', '貪狼'], 'rules': [
 R('遷移.廉貪.艱辛', None,
   '廉貞貪狼在遷移宮，你出外要經歷艱辛。',
   'Lian Zhen with Tan Lang in your Travel Palace: life away from home takes hardship.',
   '[廉贞贪狼]同守迁移，主出外须历艰辛。', '主出外须历艰辛', 'base'),
]})
T.append({'id': '廉貞.遷移', 'stars': ['廉貞'], 'rules': [
 R('遷移.廉貞.祿', H('祿', '廉貞'),
   '廉貞化祿，你在外得意，人緣也好，但不一定發財。',
   'Lian Zhen in Abundance: you do well and are well liked away from home, though it does not bring wealth.',
   '廉贞化禄，只主在外得意，并不主发财。亦主多缘。', '只主在外得意，并不主发财'),
 R('遷移.廉貞.忌', {'all': [H('忌', '廉貞'), SHA]},
   '廉貞化忌又見〔煞〕，出外容易因遊樂應酬而生是非。',
   'Lian Zhen in Obstruction with 〔harsh stars〕: outings and socialising away from home can stir up trouble.',
   '若仅廉贞化忌，见煞曜，则仅主出外因游乐应酬而生是非；', '则仅主出外因游乐应酬而生是非', 'limit'),
 R('遷移.廉貞.本', {'not': {'star': '天相', 'at': 'same'}},
   '廉貞在遷移宮，你通常宜離開出生地發展。',
   'With Lian Zhen in your Travel Palace, developing away from your birthplace usually suits you.',
   '廉贞守迁移宫，通常均主宜离开出生地发展。', '通常均主宜离开出生地发展', 'base'),
]})

# ── 天府 ──
T.append({'id': '天府巳亥.遷移', 'stars': ['天府'], 'branch': ['巳', '亥'], 'rules': [
 R('遷移.天府巳亥.紫權', H('權', '紫微', 'opp'),
   '對宮紫微化權，最宜離鄉別井創立事業，可以遠涉重洋開創。',
   'With Zi Wei in Authority opposite, leaving home to build your own enterprise suits you best, even across the sea.',
   '天府在巳亥宫，命宫必为[紫微七杀]，若紫微化权，最宜离乡背井创立事业，主远涉重洋兴创。', '最宜离乡背井创立事业'),
]})
T.append({'id': '天府.遷移', 'stars': ['天府'], 'rules': [
 R('遷移.天府.本', None,
   '天府在遷移宮，你在外一般安定，遷移之後可以穩步發展。',
   'With Tian Fu in your Travel Palace, life away from home is generally steady, and after a move you can build up step by step.',
   '天府在，迁移宫，一般安定。即迁移后町稳步发展。', '一般安定', 'base'),
 R('遷移.天府.科', H('科', '天府'),
   '天府化科，你在外特別受當地人尊敬。',
   'Tian Fu in Recognition: people where you go hold you in particular respect.',
   '天府化科尤主受异乡人尊敬。', '尤主受异乡人尊敬'),
 R('遷移.天府.廉祿', H('祿', '廉貞', 'sifang'),
   '會廉貞化祿，你在外談笑用兵，求財順利。',
   'Meeting Lian Zhen in Abundance, you handle things with ease away from home, and money comes smoothly.',
   '天储喜廉贞化禄，主谈笑用兵，求财顺利。', '主谈笑用兵，求财顺利'),
 R('遷移.天府.武祿', H('祿', '武曲', 'sifang'),
   '天府會武曲化祿，你在外地經商大有利益。',
   'Tian Fu meets Wu Qu in Abundance: doing business away from home is very profitable for you.',
   '天府与武曲化禄同会，经商大利，', '天府与武曲化禄同会，经商大利'),
 R('遷移.天府.陀羅', {'star': '陀羅', 'at': 'same'},
   '同宮有陀羅，你出門往往拖延，回鄉也容易受阻。',
   'With Tuo Luo in the palace, trips drag on, and getting home can be held up.',
   '天府与陀罗同度，出门往往迁延，致回乡受阻。', '出门往往迁延，致回乡受阻', 'limit'),
 R('遷移.天府.紫', {'all': [{'star': '紫微', 'at': 'same'}, GOOD]},
   '天府與紫微同宮又見〔吉〕，你出門近貴。',
   'Tian Fu beside Zi Wei with 〔good signs〕 brings you close to influential people when away.',
   '天府在迁移宫，喜与紫微同度，主出门近贵。亦喜与武曲同度，主经商可以致富。唯必须见吉曜吉化始确。', '主出门近贵'),
 R('遷移.天府.武', {'all': [{'star': '武曲', 'at': 'same'}, GOOD]},
   '天府與武曲同宮又見〔吉〕，你在外經商可以致富。',
   'Tian Fu beside Wu Qu with 〔good signs〕: trade away from home can make you rich.',
   '天府在迁移宫，喜与紫微同度，主出门近贵。亦喜与武曲同度，主经商可以致富。唯必须见吉曜吉化始确。', '主经商可以致富'),
]})

# ── 太陰 ──
T.append({'id': '太陰.遷移', 'stars': ['太陰'], 'rules': [
 R('遷移.太陰.忌', {'all': [H('忌', '太陰'), {'not': {'star': '天同', 'at': 'same'}}]},
   '太陰化忌，你不宜在外地投資，更不宜見獵心喜。',
   'Tai Yin in Obstruction: avoid investing away from home, and do not chase what looks tempting.',
   '太阴化忌守迁移宫，不宜在外乡异域投资。更不宜见猎心喜，主反招损失破败。', '不宜在外乡异域投资'),
 R('遷移.太陰.魁鉞', KUIYUE,
   '太陰見天魁天鉞，你在外機會接二連三地來。',
   'Tai Yin meets Tian Kui or Tian Yue: away from home, opportunities come to you one after another.',
   '太阴与辅弼同度，不外得人助。与魁钺同度，则机会迭来。', '则机会迭来'),
 R('遷移.太陰.輔弼', {'star': ['左輔', '右弼'], 'at': 'same'},
   '太陰與左輔右弼同宮，你在外總有人幫忙。',
   'Tai Yin shares the palace with Zuo Fu or You Bi: away from home, there is always someone to help you.',
   '太阴与辅弼同度，不外得人助。', '太阴与辅弼同度，不外得人助'),
 R('遷移.太陰.人緣', None,
   '太陰在遷移宮，容易被外地或外國人接受；不宜與人競爭爭奪。',
   'With Tai Yin in your Travel Palace, people from other places accept you readily; avoid head-on competition.',
   '月光则多为人所喜，而且光泽柔和，因此居迁移宫时，便亦主易为异邦人接受。', '便亦主易为异邦人接受', 'base'),
]})

# ── 貪狼 ──
T.append({'id': '貪狼辰戌.遷移', 'stars': ['貪狼'], 'branch': ['辰', '戌'], 'rules': [
 R('遷移.貪狼辰戌.魁鉞', KUIYUE,
   '見天魁天鉞，你在外受人提攜，或有現成的機會。',
   'With Tian Kui or Tian Yue, people away from home lift you up, or an opening is waiting for you.',
   '唯喜见魁钺，则主受人提携，或主有现成机会。', '则主受人提携，或主有现成机会'),
 R('遷移.貪狼辰戌.火鈴', FIRE,
   '同宮有火星或鈴星，你遷移可以致富。',
   'With Huo Xing or Ling Xing in the palace, moving can make you rich.',
   '辰戌贪狼，火铃同度，迁移可以致富，见煞则防横发横破。', '迁移可以致富'),
]})
T.append({'id': '貪狼.遷移', 'stars': ['貪狼'], 'rules': [
 R('遷移.貪狼.本', None,
   '貪狼在遷移宮，你在外應酬多，人際往來頻繁。',
   'With Tan Lang in your Travel Palace, there is a lot of socialising when you are away, with people coming and going.',
   '贪狼守迁移宫，在外多应酬。', '在外多应酬', 'base'),
 R('遷移.貪狼.忌', H('忌', '貪狼'),
   '貪狼化忌，你在外常因無謂的應酬惹上麻煩、爭奪。',
   'Tan Lang in Obstruction: away from home, pointless socialising often drags you into trouble and rivalry.',
   '但若贪狼化忌，则每因无谓应酬而招惹麻烦、争夺。', '每因无谓应酬而招惹麻烦'),
 R('遷移.貪狼.吉', {'any': [H('祿', '貪狼'), H('權', '貪狼'), H('祿', '廉貞', 'sifang')]},
   '貪狼見〔吉化〕，你遷移在外，生活精彩，事業發達。',
   'Tan Lang meets 〔good transformations〕: away from home, life is lively and your career thrives.',
   '贪狼独坐迁移宫，化禄、化权，或与廉贞化禄同会，即使不与火铃同度；亦主迁移在外精彩发达。', '亦主迁移在外精彩发达'),
 R('遷移.貪狼.火鈴', {'all': [FIRE, {'not': {'branch': ['辰', '戌']}}]},
   '同宮有火星或鈴星，在外熱鬧，多是場面應酬，知心朋友難得。',
   'With Huo Xing or Ling Xing in the palace, life away from home is lively but mostly social show; true friends are rare.',
   '贪狼与火星、铃星同度，在外热闹，唯仅多场面上的应酬，知交难得。', '知交难得'),
 R('遷移.貪狼.羊陀', YANGTUO,
   '同宮有擎羊或陀羅，出門多是非困擾，往往由應酬遊宴而起。',
   'With Qing Yang or Tuo Luo in the palace, trouble follows you away from home, usually out of socialising.',
   '贪狼与羊陀同度，主出门每多是非之挠，且往往由应酬、游宴而致。', '且往往由应酬、游宴而致', 'limit'),
]})

# ── 巨門 ──
T.append({'id': '巨門.遷移', 'stars': ['巨門'], 'rules': [
 R('遷移.巨門.權', H('權', '巨門'),
   '巨門化權，你在外能以言詞取信於人。',
   'Ju Men in Authority: away from home, your words win people’s trust.',
   '巨门化杈者，在外能以言词舌辩取信于人，', '在外能以言词舌辩取信于人'),
 R('遷移.巨門.祿', H('祿', '巨門'),
   '巨門化祿，你遷移後容易受外地或外國人提拔。',
   'Ju Men in Abundance: after moving, people from elsewhere tend to promote you.',
   '巨门化禄，则太是必同时化杈，倘太阳庙旺，则主迁移后受外国人或异乡有提拔、常识。', '则主迁移后受外国人或异乡有提拔'),
 R('遷移.巨門.忌', H('忌', '巨門'),
   '巨門化忌，你在外進退不安，勞碌奔波。',
   'Ju Men in Obstruction: away from home you are unsettled, rushing about.',
   '巨门化忌，主进退不安，劳碌奔波。', '主进退不安，劳碌奔波', 'limit'),
 R('遷移.巨門.本', None,
   '巨門在遷移宮，你在外也是靠口才求財。',
   'With Ju Men in your Travel Palace, you earn by speaking when away from home too.',
   '巨门在迁移宫，基本性质与在命宫相同，亦主[口舌以求财]。', '基本性质与在命宫相同', 'base'),
]})

# ── 天相 ──
T.append({'id': '天相.遷移', 'stars': ['天相'], 'rules': [
 R('遷移.天相.本', {'not': {'any': [{'star': '廉貞', 'at': ['same', 'opp']}, {'star': '武曲', 'at': 'opp'}, {'jia': ['擎羊', '陀羅']}, {'jia': ['火星', '鈴星']}]}},
   '天相在遷移宮，一般吉利，你在外容易接近有地位的人而得利。',
   'With Tian Xiang in your Travel Palace, things generally go well: away from home you come close to people of standing, and gain by it.',
   '天相守迁移宫，一般情形下吉利，主近贵得利。', '主近贵得利', 'base'),
 R('遷移.天相.魁鉞', {'any': [{'jia': ['天魁', '天鉞']}, {'star': ['天魁', '天鉞'], 'at': 'same'}]},
   '天相見天魁天鉞，你在外受人提拔；只是宜與人合作或做副手，不宜出鋒頭。',
   'Tian Xiang with Tian Kui or Tian Yue: people away from home lift you up, though partnering or playing second fiddle suits you better than the limelight.',
   '见魁钺夹或同度相会者，更主受人提拔，唯仅利与人合作，或退居副贰，以不出锋头为宜，否则即受排挤。', '更主受人提拔'),
 R('遷移.天相.武破', {'star': '武曲', 'at': 'opp'},
   '天相對著武曲破軍，遷移對你較為不利。',
   'Tian Xiang facing Wu Qu–Po Jun makes moving away less favourable for you.',
   '天相与[武曲破军]对拱者，迁移较为不利，不见吉化，只见吉曜，亦主在外浮沉。', '迁移较为不利'),
 R('遷移.天相.廉破', {'star': '廉貞', 'at': 'opp'},
   '天相對著廉貞破軍，你在外地一般較孤立，遷移不算有利。',
   'Tian Xiang facing Lian Zhen–Po Jun: you tend to stand alone away from home, so moving is not really in your favour.',
   '天相与[廉贞破军]相对，夹天相的正曜已有睽离的性质，故一般主在外地孤立，除非天相所会的天府有禄马，否则不利迁移。', '故一般主在外地孤立'),
 R('遷移.天相.紫權', H('權', '紫微', 'opp'),
   '命宮的紫微化權，你以離開出生地發展為宜。',
   'Zi Wei in Authority in your Life Palace: developing away from your birthplace suits you.',
   '天相与[紫微破军]相对，若原局贪狼化禄者，主动静皆利；原局紫微化权，则以离开出生地发展为宜。', '则以离开出生地发展为宜'),
 R('遷移.天相.吉夾', {'all': [{'any': [{'jia': ['左輔', '右弼']}, {'jia': ['天魁', '天鉞']}, {'jia': ['文昌', '文曲']}]}, {'not': {'any': [{'jia': ['擎羊', '陀羅']}, {'jia': ['火星', '鈴星']}]}}]},
   '天相被〔吉星〕相夾，你在外人緣好，容易得人好感。',
   'Tian Xiang is flanked by 〔helper stars〕: you are well liked away from home and win people over easily.',
   '大致而言，天相遇吉夹则多人缘，遇凶夹则主孤立。', '天相遇吉夹则多人缘'),
 R('遷移.天相.凶夾', {'any': [{'jia': ['擎羊', '陀羅']}, {'jia': ['火星', '鈴星']}]},
   '天相被〔煞星〕相夾，你在外容易孤立，少人照應。',
   'Tian Xiang is flanked by 〔harsh stars〕: away from home you can end up isolated, with few to look out for you.',
   '大致而言，天相遇吉夹则多人缘，遇凶夹则主孤立。', '遇凶夹则主孤立', 'limit'),
]})

# ── 天梁 ──
T.append({'id': '天梁.遷移', 'stars': ['天梁'], 'rules': [
 R('遷移.天梁.輔佐', {'any': [FUZUO, KUIYUE]},
   '見〔輔佐吉星〕，你在外機會多，受人敬重，也多助力。',
   'With 〔helper stars〕, you have many chances away from home, are respected, and get plenty of help.',
   '天梁与魁钺、辅弼同会于迁移宫，主在外多机会，且主受人敬畏，因而自多助力。', '主在外多机会'),
 R('遷移.天梁.火鈴', FIRE,
   '同宮有火星或鈴星，漂泊的意味較大，遷移後仍會一遷再遷。',
   'With Huo Xing or Ling Xing in the palace, there is more drifting; even after moving, you keep moving.',
   '天梁与火铃同度者，飘流的意味较大。故迁移在外，仍主一迁再迁，客中作客。', '仍主一迁再迁', 'limit'),
 R('遷移.天梁.本', None,
   '天梁在遷移宮，你一般出外得人蔭庇。',
   'With Tian Liang in your Travel Palace, people generally look after you when you are away.',
   '天梁守迁移宫，一般主出外得人荫庇，', '一般主出外得人荫庇', 'base'),
]})

# ── 七殺 ──
T.append({'id': '七殺.遷移', 'stars': ['七殺'], 'rules': [
 R('遷移.七殺.本', {'not': {'branch': ['卯', '酉']}},
   '七殺在遷移宮，你在外一般有權，令人敬畏。',
   'With Qi Sha in your Travel Palace, you generally carry authority away from home, and people hold you in awe.',
   '除卯酉二宫，七杀守迁移一般利外出，主在外有权，令人敬畏。', '主在外有权，令人敬畏', 'base'),
 R('遷移.七殺.輔佐', {'all': [{'any': [FUZUO, KUIYUE]}, {'not': {'star': '紫微', 'at': 'same'}}]},
   '七殺見〔輔佐吉星〕，你在外有地位，也多發展的機會。',
   'Qi Sha meets 〔helper stars〕: away from home you have standing and plenty of room to grow.',
   '其余宫度的七杀星系，喜魁钺，亦喜辅弼，主在外有地位，且多发展的机会。', '主在外有地位，且多发展的机会'),
 R('遷移.七殺.羊陀', YANGTUO,
   '七殺與擎羊或陀羅同宮，你在外人緣較少，現代可從事工藝。',
   'Qi Sha with Qing Yang or Tuo Luo: you have fewer friends away from home; these days, skilled trades suit you.',
   '七杀与羊陀同度，利武职，否则少人缘。在现代，可从事工艺。', '否则少人缘'),
 R('遷移.七殺.火', {'star': '火星', 'at': 'same'},
   '同宮有火星，在外會突然發起來；只是易得易失，要見好就收。',
   'With Huo Xing in the palace, sudden success comes away from home; but what comes easily goes easily, so know when to stop.',
   '七杀与火星同度，在命宫主孤克，在迁移宫的驻突发，见禄且主得意外财，唯易得易失，横发横破，必须见好收篷，', '唯易得易失'),
 R('遷移.七殺.鈴', {'star': '鈴星', 'at': 'same'},
   '同宮有鈴星，你在外適合從事工藝、工業。',
   'With Ling Xing in the palace, craft or industrial work suits you away from home.',
   '七杀与铃星同度于迁移宫，前人认为主武职峥嵘。现代亦可从事工艺、工业。', '现代亦可从事工艺、工业'),
 R('遷移.七殺.空劫', KONG,
   '同宮有地空地劫，理想常超過現實，不守一業、不守一地；宜做工藝、工業，靠新意念開創。',
   'With Di Kong or Di Jie in the palace, your ideals outrun reality, and you do not stay in one job or place; craft or industry suits you, where new ideas can build something.',
   '七杀与空劫同度守迁移宫，主进退失据，理想常超过现实，以致不守一业，不守一地，', '理想常超过现实', 'limit'),
]})

# ── 破軍 ──
T.append({'id': '破軍子午.遷移', 'stars': ['破軍'], 'branch': ['子', '午'], 'rules': [
 R('遷移.破軍子午.經商', GOOD,
   '見〔吉〕，也可在外經商，但經營的要帶專門性質，例如在外地開家鄉菜館。',
   'With 〔good signs〕, you can trade away from home, so long as it is something specialised, like opening a restaurant of your home cuisine abroad.',
   '破军在子午二宫，见吉化、吉曜，则亦可经商，但所经营者仍须带有专门的性质。如在异邦开家乡菜馆，即是一例。', '但所经营者仍须带有专门的性质'),
]})
T.append({'id': '破軍.遷移', 'stars': ['破軍'], 'rules': [
 R('遷移.破軍.本', None,
   '破軍在遷移宮，你在外要靠專門技能起家。',
   'With Po Jun in your Travel Palace, you make your way away from home through a specialist skill.',
   '凡破军在迁移宫，必须靠专门技能起家。', '必须靠专门技能起家', 'base'),
 R('遷移.破軍.魁鉞', KUIYUE,
   '破軍見天魁天鉞最吉，你的技能有發揮的機會，而且受人賞識。',
   'Po Jun with Tian Kui or Tian Yue is the best case: your skills get their chance, and people value them.',
   '破军见魁钺最吉，主自己的技能有发挥的机会，且受赏识。', '主自己的技能有发挥的机会'),
 R('遷移.破軍.祿', H('祿', '破軍'),
   '破軍化祿，你可以憑專門技能在異鄉立足。',
   'Po Jun in Abundance: your specialist skill lets you put down roots far from home.',
   '破军在迁移宫亦得禄为佳，则可藉专门技能在异乡立足。', '则可藉专门技能在异乡立足'),
 R('遷移.破軍.無祿', {'not': {'hua': '祿', 'at': 'sifang'}},
   '破軍沒有化祿，你不利在異地落地生根，卻利於在各地流動生財。',
   'Po Jun without Abundance: putting down roots elsewhere is not for you, but moving between places to earn is.',
   '凡破军守迁移宫，若不见化禄，则不利迁居异地生根，但却利流动各地以生财。', '但却利流动各地以生财'),
 R('遷移.破軍.權', H('權', '破軍'),
   '破軍化權，你宜在外地憑技藝為人服務。',
   'Po Jun in Authority: away from home, serve others through a skill.',
   '破军化权，宜在异乡凭技艺为人服务。', '宜在异乡凭技艺为人服务'),
 R('遷移.破軍.火鈴', FIRE,
   '同宮有火星或鈴星，你在外容易漂泊。',
   'With Huo Xing or Ling Xing in the palace, you tend to drift when away from home.',
   '破军与四煞同度守迁移宫，火铃主流离，羊陀主破败；', '火铃主流离', 'limit'),
 R('遷移.破軍.羊陀', YANGTUO,
   '同宮有擎羊或陀羅，你在外容易破耗。',
   'With Qing Yang or Tuo Luo in the palace, you tend to lose money when away from home.',
   '破军与四煞同度守迁移宫，火铃主流离，羊陀主破败；', '羊陀主破败', 'limit'),
]})
