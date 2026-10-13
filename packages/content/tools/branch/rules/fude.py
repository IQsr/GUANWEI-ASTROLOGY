# 福德宮規則（2026-10-12）。題目次序 = 合併輸出次序：組合／地支題目行先，單星通則其次，唔限主星嘅通則最後。
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

# ── 紫微 ──
T.append({'id': '紫微破軍.福德', 'stars': ['紫微', '破軍'], 'rules': [
 R('福德.紫破.親力', None,
   '紫微破軍在福德宮，你喜歡親力親為；就算有人幫忙，也不容易放心交出去。',
   'With Zi Wei and Po Jun in your Wellbeing Palace, you like to do things yourself; even with help on hand, you find it hard to let go.',
   '丑未[紫微破军1守福德，主其人好亲力亲为，纵有左辅右弼夹，只主助力多，但仍不易放心。', '主其人好亲力亲为', 'base'),
 R('福德.紫破.吉', GOOD,
   '見〔吉化吉星〕，你的創造力極強，適合需要開創的思考。',
   'With 〔good transformations or helper stars〕, your creativity is exceptional, suited to thinking that breaks new ground.',
   '[紫破]若见吉化，吉曜，吉夹，则创造力极强，故宜从事有开创性之思考。', '则创造力极强'),
 R('福德.紫破.火鈴', FIRE,
   '同宮有火星或鈴星，你特別勞心勞累。',
   'With Huo Xing or Ling Xing in the palace, you wear yourself out with effort and worry.',
   '[紫破]见煞，又见虚耗，主凡事事倍功半，见刑忌，则易为人破坏嫉妒，而招致麻烦困扰，特别劳心费力。见火铃或火铃夹者尤主劳累不堪。', '见火铃或火铃夹者尤主劳累不堪', 'limit'),
]})
T.append({'id': '紫微天府.福德', 'stars': ['紫微', '天府'], 'rules': [
 R('福德.紫府.朝拱', {'all': [FUZUO, KUIYUE]},
   '紫微天府得〔吉星〕拱照，你福厚，為人寬厚大度。',
   'Zi Wei with Tian Fu, surrounded by 〔helper stars〕: you are fortunate, generous and broad-minded.',
   '寅申宫[紫破天府]，有吉曜朝拱则福厚，且宽厚大度，无则劳心，', '有吉曜朝拱则福厚，且宽厚大度'),
 R('福德.紫府.無吉', {'not': {'any': [FUZUO, KUIYUE]}},
   '紫微天府不見吉星，你較為勞心，心思少有歇息。',
   'Zi Wei–Tian Fu meets no helper stars: you are mentally hard-worked, and your mind seldom rests.',
   '寅申宫[紫破天府]，有吉曜朝拱则福厚，且宽厚大度，无则劳心，再见煞则多迟疑不决，进退失据，以致劳累不安。', '无则劳心', 'limit'),
 R('福德.紫府.化', {'any': [H('科', '紫微'), H('權', '紫微'), H('科', '天府')]},
   '紫微或天府化科化權，你的自尊心很重。',
   'With Zi Wei or Tian Fu in Merit or Authority, your self-respect runs very deep.',
   '[紫府]化科、化权，自尊心极重。', '[紫府]化科、化权，自尊心极重'),
]})
T.append({'id': '紫微貪狼.福德', 'stars': ['紫微', '貪狼'], 'rules': [
 R('福德.紫貪.忌', H('忌', '貪狼'),
   '貪狼化忌，多奔波勞碌，也常因為不能當機立斷而事後追悔。',
   'Tan Lang in Hindrance: you rush about, and often regret not deciding sooner.',
   '倘贪狼化忌，则主多奔波劳碌，且往往因不能当机立断而常生追悔之心。', '且往往因不能当机立断而常生追悔之心', 'limit'),
 R('福德.紫貪.火鈴', FIRE,
   '紫微貪狼與火星或鈴星同宮，你的想法積極、向前看。',
   'Zi Wei–Tan Lang shares the palace with Huo Xing or Ling Xing: your outlook is energetic and forward-looking.',
   '[紫贪]躔火铃，思想积极，', '[紫贪]躔火铃，思想积极'),
]})
T.append({'id': '紫微天相.福德', 'stars': ['紫微', '天相'], 'rules': [
 R('福德.紫相.輔佐', {'any': [FUZUO, KUIYUE]},
   '紫微天相見〔輔佐吉星〕，你為人寬厚大度。',
   'Zi Wei with Tian Xiang and 〔helper stars〕: you are generous and broad-minded.',
   '[紫微天相]守福德宫，见辅佐吉曜则宽厚大度。', '见辅佐吉曜则宽厚大度'),
 R('福德.紫相.空劫', KONG,
   '紫微天相與地空地劫同宮，你很有哲學思考，愛想人生道理。',
   'Zi Wei–Tian Xiang shares the palace with Di Kong or Di Jie: you are a philosophical thinker who likes to ponder life.',
   '[紫相]躔空劫，见华盖，则其人极富哲思。', '则其人极富哲思'),
]})
T.append({'id': '紫微七殺.福德', 'stars': ['紫微', '七殺'], 'rules': [
 R('福德.紫殺.祿', LU,
   '紫微七殺見祿，你剛強的氣質得到調和，不會太硬。',
   'Zi Wei–Qi Sha meets Lu: your forceful temperament is brought into balance and does not turn too hard.',
   '[紫杀]必须见禄，然后气质始主调和。再见昌曲，则有礼义。', '[紫杀]必须见禄，然后气质始主调和'),
 R('福德.紫殺.廉祿', H('祿', '廉貞', 'sifang'),
   '紫微七殺會廉貞化祿，你待人處事最為寬厚。',
   'Zi Wei–Qi Sha meets Lian Zhen in Abundance: you treat people with real generosity.',
   '紫杀见化禄皆吉，唯以见廉贞化禄者行事最为宽厚，', '唯以见廉贞化禄者行事最为宽厚'),
 R('福德.紫殺.火', {'star': '火星', 'at': 'same'},
   '紫微七殺與火星同宮，你做事急如星火，等不得。',
   'Zi Wei–Qi Sha shares the palace with Huo Xing: you do everything in a hurry and cannot bear to wait.',
   '若躔火星，做事急如星火。', '若躔火星，做事急如星火'),
 R('福德.紫殺.本', None,
   '紫微七殺在福德宮，你主觀極強，認定了就很難改。',
   'With Zi Wei and Qi Sha in your Wellbeing Palace, your views are very firmly your own, and once set they are hard to shift.',
   '[紫相七杀]守福德宫者，主观极强，', '主观极强', 'base'),
]})

# ── 天機 ──
T.append({'id': '天機太陰.福德', 'stars': ['天機', '太陰'], 'rules': [
 R('福德.機陰.陰祿', H('祿', '太陰'),
   '天機太陰而太陰化祿，你精於盤算，計劃周密。',
   'Tian Ji–Tai Yin with Tai Yin in Abundance: you are a skilled reckoner and plan carefully.',
   '天机太阴而太阴化禄者，主精于筹算。', '主精于筹算'),
]})
T.append({'id': '天機.福德', 'stars': ['天機'], 'rules': [
 R('福德.天機.權', H('權', '天機'),
   '天機化權，你的心較安定，思想也更周密。',
   'Tian Ji in Authority: your mind settles, and your thinking becomes more thorough.',
   '天机化禄不如化权，化权则能增加安定，减少动荡', '化权则能增加安定，减少动荡'),
 R('福德.天機.火鈴', FIRE,
   '同宮有火星或鈴星，你身勞心勞，不得安寧。',
   'With Huo Xing or Ling Xing in the palace, body and mind are both kept busy, with little rest.',
   '天机如火铃，或火铃夹者，主身劳心劳，不得安宁。', '主身劳心劳，不得安宁', 'limit'),
 R('福德.天機.巨門', {'all': [{'star': '巨門', 'at': ['same', 'opp']}, {'not': H('權', '天機')}]},
   '天機遇上巨門，你的心思更容易動盪不安。',
   'Tian Ji meeting Ju Men stirs your mind further.',
   '天机不喜巨门，无论同度或会合，皆增加其动荡。即使巨门化禄，亦仅主敏于思考，劳丽有获，', '皆增加其动荡'),
 R('福德.天機.巨祿', H('祿', '巨門', ['same', 'opp']),
   '巨門化祿，你敏於思考，勞心之後也有收穫。',
   'Ju Men in Abundance: you think quickly, and the effort pays off.',
   '天机不喜巨门，无论同度或会合，皆增加其动荡。即使巨门化禄，亦仅主敏于思考，劳丽有获，', '亦仅主敏于思考'),
 R('福德.天機.本', {'not': {'any': [H('權', '天機'), H('祿', '太陰')]}},
   '天機在福德宮，思慮多、興趣多，思想不易集中，考慮有時欠周密。',
   'With Tian Ji in your Wellbeing Palace, you think a lot and have many interests; focus comes hard, and plans are not always thorough.',
   '天机守福德宫，一般情形下主多思多虚，兴趣多端，思想不集中，考虑欠周密。', '兴趣多端，思想不集中', 'base'),
]})

# ── 太陽 ──
T.append({'id': '太陽太陰.福德', 'stars': ['太陽', '太陰'], 'rules': [
 R('福德.陰陽.調和', None,
   '太陽太陰同在福德宮，陰陽調和：雖然奔忙，也懂得忙裡偷閒，忙中得靜趣。',
   'Tai Yang with Tai Yin in your Wellbeing Palace balances light and shade: busy as you are, you find quiet moments and enjoy them.',
   '[太阳太阴]同度者，最能忙里偷闲，忙中得静趣。', '最能忙里偷闲，忙中得静趣', 'base'),
 R('福德.陰陽.陽祿', H('祿', '太陽'),
   '太陽化祿，你的性格開朗，待人爽快。',
   'Tai Yang in Abundance: you are open and cheerful, and straightforward with people.',
   '太阳化禄则开朗；太阴化禄则沉潜。', '太阳化禄则开朗'),
 R('福德.陰陽.陰祿', H('祿', '太陰'),
   '太陰化祿，你的性格沉潛，喜歡靜靜地想事情。',
   'Tai Yin in Abundance: you are calm and deep, and like to think things over quietly.',
   '太阳化禄则开朗；太阴化禄则沉潜。', '太阴化禄则沉潜'),
]})
T.append({'id': '太陽天梁.福德', 'stars': ['太陽', '天梁'], 'rules': [
 R('福德.陽梁.幕後', None,
   '太陽天梁在福德宮，不宜替人強出頭，宜在幕後策劃；正面出頭容易招是非煩惱。',
   'With Tai Yang and Tian Liang in your Wellbeing Palace, do not stick your neck out for others; plan from behind the scenes, as stepping forward brings trouble.',
   '太阳天粱在福德宫者，不宜为人强出头。陀罗、钤星同度者，或太阳化忌者尤甚。亦不宜正面出头，仅宜幕后策划，', '仅宜幕后策划', 'base'),
 R('福德.陽梁.昌曲', {'star': ['文昌', '文曲'], 'at': 'sifang'},
   '見文昌文曲，聰明好思考；情緒的不寧，多由思考學問而來。',
   'With Wen Chang or Wen Qu, you are bright and love to think; what unsettles you usually comes from wrestling with ideas.',
   '太阳天梁的组合，须仔细分别。见科文诸曜者，主聪明且好思考，其情绪不宁亦由学术、问题的思考而来。', '主聪明且好思考'),
]})
T.append({'id': '太陽巨門.福德', 'stars': ['太陽', '巨門'], 'rules': [
 R('福德.陽巨.勞心', None,
   '太陽巨門在福德宮，你常常勞心費神，腦子停不下來。',
   'With Tai Yang and Ju Men in your Wellbeing Palace, you often wear yourself out thinking; your mind does not stop.',
   '太阳巨门的组合，主劳心费神。', '太阳巨门的组合，主劳心费神', 'base'),
 R('福德.陽巨.巨吉', {'any': [H('祿', '巨門'), H('權', '巨門')]},
   '巨門化祿化權，常以口才、方言或外語得人賞識，精神上因此得到滿足。',
   'Ju Men in Abundance or Authority: your way with words, dialects or foreign languages wins you appreciation, and that is deeply satisfying.',
   '若巨门化禄、权者，则常以口才得人赏识，或以方言，外语而得人欣赏。由是精神上得到满足。', '由是精神上得到满足'),
]})
T.append({'id': '太陽.福德', 'stars': ['太陽'], 'rules': [
 R('福德.太陽.本', {'not': {'star': '太陰', 'at': 'same'}},
   '太陽在福德宮，好動不好靜；入廟的話個性開朗，任勞任怨也有精神上的享受。',
   'With Tai Yang in your Wellbeing Palace, you prefer action to stillness; when it is bright, you are open-hearted and find joy even in hard work.',
   '太阳守福德宫，入庙者，主个性开朗，虽任劳任怨亦有精神享受。落陷者，则招是非口舌，且烦躁不宁。太阳主发射，故在福德宫时，无论入庙落陷，均主人好动不好静。', '均主人好动不好静', 'base'),
]})

# ── 武曲 ──
T.append({'id': '武曲破軍.福德', 'stars': ['武曲', '破軍'], 'rules': [
 R('福德.武破.昌曲', {'star': ['文昌', '文曲'], 'at': 'sifang'},
   '見文昌文曲，你有獨特見解，尤其擅長打破僵局。',
   'With Wen Chang or Wen Qu, you have original views, and are especially good at breaking deadlocks.',
   '唯[武曲破军]与科文诸曜同度，则主其人有独特见解，尤擅长于打破僵局。', '尤擅长于打破僵局'),
]})
T.append({'id': '武曲七殺.福德', 'stars': ['武曲', '七殺'], 'rules': [
 R('福德.武殺.奔忙', None,
   '武曲七殺在福德宮，你一生奔忙，閒不下來。',
   'With Wu Qu and Qi Sha in your Wellbeing Palace, you are always on the go and find it hard to sit still.',
   '[武曲七杀]同度者，主奔忙。见煞，主身心俱劳。见天马，主宗旨不定，作事反复进退。', '[武曲七杀]同度者，主奔忙', 'base'),
 R('福德.武殺.馬', {'star': '天馬', 'at': 'same'},
   '同宮有天馬，你宗旨不定，做事反覆進退。',
   'With Tian Ma in the palace, your aims shift, and you go back and forth.',
   '见天马，主宗旨不定，作事反复进退。', '主宗旨不定，作事反复进退', 'limit'),
]})
T.append({'id': '武曲天相.福德', 'stars': ['武曲', '天相'], 'rules': [
 R('福德.武相.吉', GOOD,
   '武曲天相見〔吉〕，你善於乘勢、利用機會。',
   'Wu Qu with Tian Xiang and 〔good signs〕: you ride the tide and make good use of opportunities.',
   '[武曲天相]在福德宫，主其人易随波逐流。见吉，然后始主能乘势，善于利用机会。', '善于利用机会'),
 R('福德.武相.空劫', KONG,
   '武曲天相與地空地劫同宮，你想得多、做得少，容易流於空想。',
   'Wu Qu–Tian Xiang shares the palace with Di Kong or Di Jie: you think more than you act and can drift into daydreams.',
   '[武曲天相]最不喜与空劫同度，则主其人过空想，能坐言而不能起行。', '能坐言而不能起行', 'limit'),
]})
T.append({'id': '武曲貪狼.福德', 'stars': ['武曲', '貪狼'], 'rules': [
 R('福德.武貪.火', {'star': '火星', 'at': 'same'},
   '同宮有火星，你追求快樂，今朝有酒今朝醉。',
   'With Huo Xing in the palace, you chase enjoyment and live for today.',
   '武贪见火星同度，主追求快乐，今朝有酒今朝醉。', '主追求快乐，今朝有酒今朝醉'),
]})
T.append({'id': '武曲.福德', 'stars': ['武曲'], 'rules': [
 R('福德.武曲.廉祿', H('祿', '廉貞', 'sifang'),
   '武曲會廉貞化祿，你的精神愉快，心境開朗。',
   'Wu Qu meets Lian Zhen in Abundance: your spirits are high and your mind is at ease.',
   '武曲喜与廉贞化禄、贪狼化禄相会或同度，前者主精神愉快，后者主多应酬之乐。', '前者主精神愉快'),
 R('福德.武曲.貪祿', H('祿', '貪狼', 'sifang'),
   '武曲會貪狼化祿，你多有應酬交際的樂趣。',
   'Wu Qu meets Tan Lang in Abundance: you get a lot of pleasure from socialising.',
   '武曲喜与廉贞化禄、贪狼化禄相会或同度，前者主精神愉快，后者主多应酬之乐。', '后者主多应酬之乐'),
 R('福德.武曲.本', None,
   '武曲是財星，在福德宮，精神享受要以物質享受為基礎。',
   'Wu Qu is the wealth star: in your Wellbeing Palace, your peace of mind rests on material comfort.',
   '武曲为财星，故福建省德宫。其精神享受亦必以物质享受为基础，', '其精神享受亦必以物质享受为基础', 'base'),
]})

# ── 天同 ──
T.append({'id': '天同.福德', 'stars': ['天同'], 'rules': [
 R('福德.天同.文', {'star': ['文昌', '文曲'], 'at': 'sifang'},
   '天同見文昌文曲，你享受生活的方式高雅，有品味。',
   'Tian Tong meets Wen Chang or Wen Qu: you enjoy life in refined ways, with real taste.',
   '天同喜见科文诸曜同会，则主精神享受情趣高雅。', '则主精神享受情趣高雅'),
 R('福德.天同.祿', H('祿', '天同'),
   '天同化祿，你有時過份天真，把人想得太好。',
   'Tian Tong in Abundance: at times you are a little too innocent and think too well of people.',
   '天同化禄，有时嫌过份天真。', '天同化禄，有时嫌过份天真'),
 R('福德.天同.本', None,
   '天同在福德宮，精神生活豐足，尤其喜愛音樂；但不一定代表物質生活充裕。',
   'With Tian Tong in your Wellbeing Palace, your inner life is rich, with a special love of music, though that does not necessarily mean material plenty.',
   '福德宫喜见天同，主共人精神生活丰足，尤主性喜音乐。然而有时并不代表物质生活充裕。', '尤主性喜音乐', 'base'),
]})

# ── 廉貞 ──
T.append({'id': '廉貞天府.福德', 'stars': ['廉貞', '天府'], 'rules': [
 R('福德.廉府.自得', None,
   '廉貞天府在福德宮，一生自得其樂，能忙裡偷閒，忙碌中也有樂趣。',
   'With Lian Zhen and Tian Fu in your Wellbeing Palace, you find your own happiness all your life, snatching rest in busy times and enjoying the busyness too.',
   '廉贞天府愤}；不加，一生自得其乐。能忙里偷闲，或虽忙碌而仍多乐趣。', '能忙里偷闲，或虽忙碌而仍多乐趣', 'base'),
 R('福德.廉府.科', H('科', '天府'),
   '天府化科，你外表平易近人，其實自尊心很重。',
   'Tian Fu in Merit: easy-going on the surface, but proud underneath.',
   '[廉贞天府]而天府化科者，外表平易，其实自尊心甚重。', '外表平易，其实自尊心甚重'),
]})
T.append({'id': '廉貞天相.福德', 'stars': ['廉貞', '天相'], 'rules': [
 R('福德.廉相.昌曲夾', {'jia': ['文昌', '文曲']},
   '廉貞天相被文昌文曲相夾，你頭腦聰明，領悟力強。',
   'Lian Zhen–Tian Xiang is flanked by Wen Chang and Wen Qu: you are bright and quick to understand.',
   '[廉贞天相]喜昌曲夹，主聪明。', '[廉贞天相]喜昌曲夹，主聪明'),
 R('福德.廉相.文', CHANGQU,
   '同宮有文昌文曲，氣質優雅，藝術感很強，也喜歡談論政治。',
   'With Wen Chang or Wen Qu in the palace, you are refined, with a strong artistic sense and a taste for political talk.',
   '又喜与科文诸曜同度，则气质优雅，艺术感极强。且喜谈论政治，或参与政治活动。', '则气质优雅，艺术感极强'),
 R('福德.廉相.煞夾', {'any': [{'jia': ['火星', '鈴星']}, {'jia': ['擎羊', '陀羅']}]},
   '被〔煞星〕相夾，你心理上自然有壓迫感。',
   'Flanked by 〔harsh stars〕, you naturally feel pressed in.',
   '[廉贞天相]若为火铃夹、羊陀夹，则心理上自然产生压逼感。', '则心理上自然产生压逼感', 'limit'),
 R('福德.廉相.自得', None,
   '廉貞天相在福德宮，你懂得自得其樂，不必靠別人來開心。',
   'With Lian Zhen and Tian Xiang in your Wellbeing Palace, you know how to enjoy yourself without needing others to make you happy.',
   '廉贞星系在福德宫，有两种截然不同的性质。[廉贞天府]、[廉贞天相]、[廉贞贪狼]皆主自得其乐；', '[廉贞贪狼]皆主自得其乐', 'base'),
]})
T.append({'id': '廉貞貪狼.福德', 'stars': ['廉貞', '貪狼'], 'rules': [
 R('福德.廉貪.火', {'star': '火星', 'at': 'same'},
   '同宮有火星，你容易無事奔忙，或做無謂的應酬。',
   'With Huo Xing in the palace, you can rush about for nothing, or socialise for its own sake.',
   '[廉贞贪狼]与火星同度，主无事奔忙，或喜无谓应酬。', '主无事奔忙，或喜无谓应酬', 'limit'),
 R('福德.廉貪.自得', None,
   '廉貞貪狼在福德宮，你懂得自得其樂，自己找得到樂趣。',
   'With Lian Zhen and Tan Lang in your Wellbeing Palace, you know how to enjoy yourself and find your own pleasures.',
   '廉贞星系在福德宫，有两种截然不同的性质。[廉贞天府]、[廉贞天相]、[廉贞贪狼]皆主自得其乐；', '皆主自得其乐', 'base'),
]})
T.append({'id': '廉貞破軍.福德', 'stars': ['廉貞', '破軍'], 'rules': [
 R('福德.廉破.吉', {'hua': ['祿', '權', '科'], 'star': '破軍', 'at': 'same'},
   '破軍吉化，你雖然勞碌，付出卻有成果。',
   'Po Jun has a favourable transformation: you work hard, but the effort pays off.',
   '[廉贞破军]在福德宫主劳碌。破军吉化者则劳而有成，若廉贞化忌，则劳而无功。', '破军吉化者则劳而有成'),
 R('福德.廉破.煞', SHA,
   '同宮有〔煞〕，凡事容易生改變之心；無煞才有決斷力。',
   'With 〔harsh stars〕 in the palace, you are quick to change your mind; without them, you are decisive.',
   '[廉贞破军]有煞，凡事易生改变之心。无煞者始有决断力。', '[廉贞破军]有煞，凡事易生改变之心', 'limit'),
 R('福德.廉破.本', None,
   '廉貞破軍在福德宮，你勞碌、多思慮。',
   'With Lian Zhen and Po Jun in your Wellbeing Palace, you work hard and think a lot.',
   '[廉贞破军]在福德宫主劳碌。', '[廉贞破军]在福德宫主劳碌', 'base'),
]})
T.append({'id': '廉貞七殺.福德', 'stars': ['廉貞', '七殺'], 'rules': [
 R('福德.廉殺.平衡', {'all': [{'not': SHA}, {'star': ['文昌', '文曲'], 'at': 'sifang'}]},
   '無煞又見文昌文曲，你的精神容易平衡。',
   'With no harsh stars and Wen Chang or Wen Qu present, your mind finds its balance easily.',
   '无煞，有科文诸曜同度，精神始易平衡。', '精神始易平衡'),
 R('福德.廉殺.本', None,
   '廉貞七殺在福德宮，思慮不休，凡事容易往壞處想。',
   'With Lian Zhen and Qi Sha in your Wellbeing Palace, your thoughts never stop, and you tend to expect the worst.',
   '[廉贞七杀]思想消极。凡事喜从坏方面着想。', '凡事喜从坏方面着想', 'base'),
]})
T.append({'id': '廉貞.福德', 'stars': ['廉貞'], 'rules': [
 R('福德.廉貞.忌', H('忌', '廉貞'),
   '廉貞化忌，你多憂多慮，心事放不下。',
   'Lian Zhen in Hindrance: you worry a great deal and find it hard to put things down.',
   '廉贞化忌，主多忧多虑，', '廉贞化忌，主多忧多虑'),
 R('福德.廉貞.祿', H('祿', '廉貞'),
   '廉貞化祿，你懂得享受書畫琴棋之樂。',
   'Lian Zhen in Abundance: you know how to enjoy painting, calligraphy, music and games.',
   '廉贞化禄者，无科文诸曜同度，则情操平庸，有则情操高雅，唯皆能享受书画琴棋之乐。', '唯皆能享受书画琴棋之乐'),
 R('福德.廉貞.本', {'alone': True},
   '廉貞獨坐福德宮，你閒不下來；就算自得其樂，樂趣也從忙碌而來，興趣多在繪畫、攝影。',
   'With Lian Zhen alone in your Wellbeing Palace, you are busy, and even your pleasures come from being busy; your interests often lie in painting or photography.',
   '6廉贞廉贞守福德宫，主忙碌。即使能自得其乐，其乐趣仍由忙碌而来。一般兴趣在于绘画及摄影。', '一般兴趣在于绘画及摄影', 'base'),
]})

# ── 天府 ──
T.append({'id': '天府.福德', 'stars': ['天府'], 'rules': [
 R('福德.天府.科', H('科', '天府'),
   '天府化科，你重信用，答應了的事會做到。',
   'Tian Fu in Merit: you value trust, and what you promise you deliver.',
   '天府化科，则重信诺。', '天府化科，则重信诺'),
 R('福德.天府.輔佐', FUZUO,
   '見左輔右弼，你內心安靜，也有決斷力。',
   'With Zuo Fu or You Bi, your mind is calm and you are decisive.',
   '天府喜同会辅佐诸曜。主内心安静，且有决断力。', '主内心安静，且有决断力'),
 R('福德.天府.魁鉞', {'all': [KUIYUE, {'not': {'star': '紫微', 'at': 'same'}}]},
   '天府會天魁天鉞，你心胸寬大，有泱泱大度。',
   'Tian Fu meets Tian Kui or Tian Yue: you are broad-minded and magnanimous.',
   '天府与魁钺同会，泱泱大度。', '天府与魁钺同会，泱泱大度'),
 R('福德.天府.火', {'star': '火星', 'at': 'same'},
   '天府與火星同宮，你常有不必要的思慮，為小事費神。',
   'Tian Fu shares the palace with Huo Xing: you often worry needlessly and spend your mind on small things.',
   '火星同度，常多不必要的思虑；', '常多不必要的思虑', 'limit'),
 R('福德.天府.本', None,
   '天府在福德宮，你為人謹慎，做事先想清楚。',
   'With Tian Fu in your Wellbeing Palace, you are careful by nature and think before you act.',
   '天府在福德宫，主为人谨慎。', '天府在福德宫，主为人谨慎', 'base'),
]})

# ── 太陰 ──
T.append({'id': '太陰亥.福德', 'stars': ['太陰'], 'branch': ['亥'], 'rules': [
 R('福德.太陰亥.計劃', None,
   '太陰坐亥，與天機相對，你擅長計劃，凡事先有安排。',
   'With Tai Yin in Hai facing Tian Ji, you are good at planning and arrange things ahead.',
   '太阴在亥宫入庙者。与天机相对：故擅长计划。有煞则主心计。', '故擅长计划', 'base'),
]})
T.append({'id': '太陰辰戌.福德', 'stars': ['太陰'], 'branch': ['辰', '戌'], 'rules': [
 R('福德.太陰辰戌.權變', None,
   '太陰坐辰戌，你擅長權變，懂得隨形勢調整。',
   'With Tai Yin in Chen or Xu, you adapt skilfully and adjust to circumstances.',
   '太阴在辰戌二富，主擅权变。', '主擅权变', 'base'),
]})
T.append({'id': '太陰.福德', 'stars': ['太陰'], 'rules': [
 R('福德.太陰.忌', H('忌', '太陰'),
   '太陰化忌，你內心不容易安寧，常有牽掛。',
   'Tai Yin in Hindrance: inner peace does not come easily, and something is often on your mind.',
   '太阴化忌，不见煞!亦主内心不安宁。', '亦主内心不安宁', 'limit'),
 R('福德.太陰.本', {'not': {'star': ['太陽', '天機'], 'at': 'same'}},
   '太陰性靜，在福德宮，你喜歡寧靜；就算環境熱鬧，也能鬧中取靜，只是競爭心不強。',
   'Tai Yin is still, so in your Wellbeing Palace you love quiet; even in a busy setting you find calm, though you are not very competitive.',
   '太阴主静，故居福德宫，一般主喜宁静。即使太阴落陷，有煞，亦主其人闹中有静趣，或能忙里偷闲。唯无论入庙落陷，均主竞争力不强、。', '一般主喜宁静', 'base'),
]})

# ── 貪狼 ──
T.append({'id': '貪狼.福德', 'stars': ['貪狼'], 'rules': [
 R('福德.貪狼.羊陀', YANGTUO,
   '同宮有擎羊或陀羅，喜歡交遊，卻偏偏因交遊惹是非煩惱。',
   'With Qing Yang or Tuo Luo in the palace, you love company, yet company is just what brings you trouble.',
   '贪狼与羊陀同躔，一生多困扰纠纷，喜交游而偏因交游惹是非烦恼。', '喜交游而偏因交游惹是非烦恼', 'limit'),
 R('福德.貪狼.火鈴', FIRE,
   '貪狼與火星或鈴星同宮，你性子急，想到就要做。',
   'Tan Lang shares the palace with Huo Xing or Ling Xing: you are impatient and want to act the moment an idea comes.',
   '贪狼与火铃同度，主性急。', '贪狼与火铃同度，主性急'),
 R('福德.貪狼.昌曲', CHANGQU,
   '同宮有文昌文曲，你傾向藝術，而且偏動態。',
   'With Wen Chang or Wen Qu in the palace, you lean towards the arts, especially active ones.',
   '贪狼昌曲同度，倾向于艺术。但多动态倾向。', '倾向于艺术'),
 R('福德.貪狼.本', None,
   '貪狼在福德宮，你容易醉心於一種嗜好。',
   'With Tan Lang in your Wellbeing Palace, you easily lose yourself in a passion.',
   '贪狼在福德宫，主放纵。见煞者固然放纵享乐，即使见吉星同会，亦主醉心于一种嗜好。', '亦主醉心于一种嗜好', 'base'),
]})

# ── 巨門 ──
T.append({'id': '巨門.福德', 'stars': ['巨門'], 'rules': [
 R('福德.巨門.祿權', {'any': [H('祿', '巨門'), H('權', '巨門')]},
   '巨門化祿化權，事無大小都要過問，很難接受別人的決定。',
   'Ju Men in Abundance or Authority: you want a say in everything, big or small, and find it hard to accept others’ decisions.',
   '巨门化禄、化权，主人事无大小必须过问，而且很难接受别人的决定，遇事必加己见。', '而且很难接受别人的决定'),
 R('福德.巨門.忌', H('忌', '巨門'),
   '巨門化忌，你常常追悔，也過份追求理想。',
   'Ju Men in Hindrance: you often have regrets, and chase ideals too hard.',
   '巨门化忌则常追悔，而且过份追求理想。', '巨门化忌则常追悔', 'limit'),
 R('福德.巨門.本', None,
   '巨門在福德宮，你容易費神：往往決定得太快，事後又後悔；或者事事都要親力親為。',
   'With Ju Men in your Wellbeing Palace, your mind is taxed: you decide too quickly and regret it later, or insist on doing everything yourself.',
   '巨门临福德宫，其基本意义为费神。原因在于凡事轻于决定，然后生追悔之心。或喜事事亲力亲为，事无大小皆必过问。', '原因在于凡事轻于决定，然后生追悔之心', 'base'),
]})

# ── 天相 ──
T.append({'id': '天相.福德', 'stars': ['天相'], 'rules': [
 R('福德.天相.廉破', {'star': '廉貞', 'at': 'opp'},
   '對宮廉貞破軍，你最有正義感和同情心。',
   'With Lian Zhen and Po Jun opposite, you have a strong sense of justice and compassion.',
   '天相与[廉贞破军l相对，最有正义感及同情心。', '最有正义感及同情心'),
 R('福德.天相.武破', {'star': '武曲', 'at': 'opp'},
   '對宮武曲破軍，你最有責任心，只是臨事欠主張，容易受人慫恿。',
   'With Wu Qu and Po Jun opposite, you are deeply responsible, but unsure in the moment and easily talked into things.',
   '天相与武曲破军相对最有责任心，却临事欠主张，因而易受人怂恿，', '却临事欠主张，因而易受人怂恿'),
 R('福德.天相.空劫', KONG,
   '同宮有地空地劫，你偏於空想，說得到做不到。',
   'With Di Kong or Di Jie in the palace, you lean towards daydreams, saying more than you do.',
   '与空劫同会者，偏于空想，坐言不能起行。', '偏于空想，坐言不能起行', 'limit'),
 R('福德.天相.祿', LU,
   '天相得祿，你的精神生活充足，內心不空虛。',
   'Tian Xiang gains Lu: your inner life is full, and you do not feel empty.',
   '三相得禄，主精神生活充足。', '主精神生活充足'),
]})

# ── 天梁 ──
T.append({'id': '天梁.福德', 'stars': ['天梁'], 'rules': [
 R('福德.天梁.科', H('科', '天梁'),
   '天梁化科，你聰明敏銳，宜做學術研究。',
   'Tian Liang in Merit: sharp and quick, suited to scholarship.',
   '天梁化禄主招忌；化权，则自尊心极重；化科则主聪明敏睿，宜学术研究。', '化科则主聪明敏睿，宜学术研究'),
 R('福德.天梁.權', H('權', '天梁'),
   '天梁化權，你的自尊心很重，受不得輕視。',
   'Tian Liang in Authority: your self-respect runs deep, and you cannot bear to be slighted.',
   '天梁化禄主招忌；化权，则自尊心极重；', '化权，则自尊心极重'),
 R('福德.天梁.同', {'star': '天同', 'at': ['same', 'opp']},
   '天梁與天同同宮或相對，你樂天知命。',
   'With Tian Liang beside or facing Tian Tong, you are content with your lot.',
   '天梁与天同同拱，主乐天知命。', '主乐天知命'),
 R('福德.天梁.空劫', KONG,
   '天梁與地空地劫同宮，你的理想太高，不易落地。',
   'Tian Liang shares the palace with Di Kong or Di Jie: your ideals run too high to land easily.',
   '空劫同度，主理想太高。', '空劫同度，主理想太高', 'limit'),
 R('福德.天梁.本', None,
   '天梁是清貴之星，在福德宮，你重視精神享受。',
   'Tian Liang stands for integrity: in your Wellbeing Palace it puts the life of the mind first.',
   '天梁主清贵，故居福德宫时，主人重视精神享受。', '主人重视精神享受', 'base'),
]})

# ── 七殺 ──
T.append({'id': '七殺.福德', 'stars': ['七殺'], 'rules': [
 R('福德.七殺.府', {'all': [{'star': '天府', 'at': 'opp'}, LU]},
   '對宮的天府見祿，你的福分厚，內心少憂煎。',
   'The Tian Fu opposite meets Lu: you are well blessed, and your mind is spared much worry.',
   '七杀与空露的天府相对，主内心多忧煎。倘府库充盈，则主福厚。', '倘府库充盈，则主福厚'),
 R('福德.七殺.決定', None,
   '七殺在福德宮，喜忙碌不得清閒，常常匆忙作決定。',
   'With Qi Sha in your Wellbeing Palace, you like to keep busy and rarely rest, and often decide in a hurry.',
   '七杀在福德宫者，每主冒昧作出决定。', '每主冒昧作出决定', 'base'),
]})

# ── 破軍 ──
T.append({'id': '破軍.福德', 'stars': ['破軍'], 'rules': [
 R('福德.破軍.輔佐', {'all': [{'any': [FUZUO, KUIYUE]}, {'not': {'star': '紫微', 'at': 'same'}}]},
   '破軍見〔左輔右弼等吉星〕，你多創見，常有新點子。',
   'Po Jun meets 〔helper stars〕: you are full of original ideas.',
   '破军见辅佐吉曜，则主多创见。', '破军见辅佐吉曜，则主多创见'),
 R('福德.破軍.火鈴', FIRE,
   '同宮有火星或鈴星，你內心急躁焦慮。',
   'With Huo Xing or Ling Xing in the palace, you are inwardly restless and anxious.',
   '破军与火铃同度，内心急躁焦虑；', '内心急躁焦虑', 'limit'),
 R('福德.破軍.空劫', KONG,
   '同宮有地空地劫，你多空想而少實行。',
   'With Di Kong or Di Jie in the palace, you dream more than you do.',
   '见空劫同度，多空想而少实行之心。', '多空想而少实行之心', 'limit'),
 R('福德.破軍.本', None,
   '破軍在福德宮，喜親力親為，勞心勞力而不推辭，也容易生改變之心。',
   'With Po Jun in your Wellbeing Palace, you like to do things yourself, never shirking effort, and are quick to want change.',
   '然二者皆主喜亲力亲为，劳心劳力而不辞，且易生改变之心。', '劳心劳力而不辞', 'base'),
]})

# ── 唔限主星（通則，排最後） ──
T.append({'id': '福德通則', 'stars': [], 'rules': [
 R('福德.通則.火', {'star': '火星', 'at': 'same'},
   '火星在福德宮，你的精神比較浮躁，難以安定下來。',
   'With Huo Xing in your Wellbeing Palace, your mind tends to be restless and hard to settle.',
   '火星及铃星入[福德宫]各主精神浮躁不安，铃星尤主内心的焦虑。', '火星及铃星入[福德宫]各主精神浮躁不安', 'limit'),
 R('福德.通則.鈴', {'star': '鈴星', 'at': 'same'},
   '鈴星在福德宮，你內心容易焦慮，常暗自擔心。',
   'With Ling Xing in your Wellbeing Palace, you are prone to inner anxiety and quiet worry.',
   '火星及铃星入[福德宫]各主精神浮躁不安，铃星尤主内心的焦虑。', '铃星尤主内心的焦虑', 'limit'),
 R('福德.通則.羊', {'star': '擎羊', 'at': 'same'},
   '擎羊在福德宮，你一生多勞，事情常落在自己身上。',
   'With Qing Yang in your Wellbeing Palace, you take on a great deal, and things often land on you.',
   '擎羊入[福德宫]主多劳，陀罗则主多优，唯空劫入度，却有时主人思想独特，未必不吉。', '擎羊入[福德宫]主多劳', 'limit'),
 R('福德.通則.陀', {'star': '陀羅', 'at': 'same'},
   '陀羅在福德宮，你多憂慮，心事容易反覆纏繞。',
   'With Tuo Luo in your Wellbeing Palace, you worry a lot, and concerns tend to circle back.',
   '擎羊入[福德宫]主多劳，陀罗则主多优，唯空劫入度，却有时主人思想独特，未必不吉。', '陀罗则主多优', 'limit'),
 R('福德.通則.空劫', KONG,
   '地空地劫在福德宮，有時令你思想獨特，未必不吉。',
   'Di Kong or Di Jie in the Wellbeing Palace can mean an original mind, which is not necessarily a bad thing.',
   '擎羊入[福德宫]主多劳，陀罗则主多优，唯空劫入度，却有时主人思想独特，未必不吉。', '却有时主人思想独特'),
 R('福德.通則.祿存', {'star': '祿存', 'at': 'same'},
   '祿存在福德宮，你雖然欠衝勁，卻安樂。',
   'Lu Cun in the Wellbeing Palace: not much drive, but contentment.',
   '[福德宫]亦喜禄存入守，虽欠冲劲，但却安乐。', '虽欠冲劲，但却安乐'),
 R('福德.通則.魁鉞', {'star': ['天魁', '天鉞'], 'at': 'same'},
   '天魁或天鉞在福德宮，你身邊有人照顧你。',
   'With Tian Kui or Tian Yue in your Wellbeing Palace, there are people around who look after you.',
   '魁铖守[福德宫卜主有人照拂。', '主有人照拂'),
 R('福德.通則.昌曲', CHANGQU,
   '文昌文曲在福德宮，是福德宮最喜歡的星，令你聰明有才智。',
   'Wen Chang or Wen Qu are the stars the Wellbeing Palace welcomes most, pointing to intelligence and talent.',
   '[福德宫]最喜昌曲，亦喜龙池，凤阁，天才，华盖等曜。盖本宫亦可用来辅助[命宫]，推断人之聪明才智。', '[福德宫]最喜昌曲'),
]})
