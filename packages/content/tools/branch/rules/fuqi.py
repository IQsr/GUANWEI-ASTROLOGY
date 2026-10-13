# 夫妻宮規則（2026-10-12）。T.append(題目)；題目次序 = 合併輸出次序：地支／組合題目行先，通則行後。
FIRE = {'star': ['火星', '鈴星'], 'at': 'same'}
SHA = {'star': ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'], 'at': 'same'}
FUZUO = {'star': ['左輔', '右弼'], 'at': 'sifang'}
KUIYUE = {'star': ['天魁', '天鉞'], 'at': 'sifang'}
GOODHUA = {'hua': ['祿', '權', '科'], 'at': 'same'}
LU = {'any': [{'hua': '祿', 'at': 'sifang'}, {'star': '祿存', 'at': 'sifang'}]}
PAIR = {'any': [{'all': [{'star': '左輔', 'at': 'sifang'}, {'star': '右弼', 'at': 'sifang'}]},
                {'all': [{'star': '文昌', 'at': 'sifang'}, {'star': '文曲', 'at': 'sifang'}]},
                {'all': [{'star': '天魁', 'at': 'sifang'}, {'star': '天鉞', 'at': 'sifang'}]}]}
LUMA = {'all': [{'star': '天馬', 'at': ['same', 'opp']}, {'any': [{'star': '祿存', 'at': ['same', 'opp']}, {'hua': '祿', 'at': ['same', 'opp']}]}]}
def H(hua, star, at='same'): return {'hua': hua, 'star': star, 'at': at}
def R(id, when, text, en, src, quote, role='refine'):
    return {'id': id, 'when': when, 'text': text, 'en': en, 'src': src, 'quote': quote, 'role': role}

# ── 紫微 ──
T.append({'id': '紫微子午.夫妻', 'stars': ['紫微'], 'branch': ['子', '午'], 'rules': [
 R('夫妻.紫微子午.朝拱', {'all': [FUZUO, KUIYUE]},
   '你的夫妻宮紫微得眾星拱照：伴侶得力、地位高，主見也強。',
   'Zi Wei in your Partnership Palace is surrounded by helpers: your partner is capable and well placed, with strong views of their own.',
   '子午宫紫微独坐，百官朝拱，则配偶得力，地位高，主观亦强。', '则配偶得力，地位高，主观亦强'),
]})
T.append({'id': '紫微破軍.夫妻', 'stars': ['紫微', '破軍'], 'rules': [
 R('夫妻.紫破.波折', None,
   '紫微破軍在夫妻宮，你婚前多有波折。',
   'With Zi Wei and Po Jun in your Partnership Palace, the road to marriage tends to have its twists.',
   '丑未[紫破]，一般不利居夫妻宫。虽本持安定，亦主婚前有波折；', '亦主婚前有波折', 'base'),
 R('夫妻.紫破.年齡', None,
   '與年齡差距較大的伴侶，你比較合得來。',
   'A partner with a wider age gap tends to suit you better.',
   '[紫破]、[紫相]皆宜配偶年龄有大差距。', '皆宜配偶年龄有大差距'),
]})
T.append({'id': '紫微天府.夫妻', 'stars': ['紫微', '天府'], 'rules': [
 R('夫妻.紫府.對星', PAIR,
   '你的紫微天府會到〔成對的輔佐星〕，關係可以長久。',
   'Your Zi Wei–Tian Fu meets 〔helper stars in matched pairs〕, so the relationship can last.',
   '寅申宫『紫府]，必须见辅佐对星者，然后主白头偕老。', '必须见辅佐对星者，然后主白头偕老'),
 R('夫妻.紫府.祿存', {'star': '祿存', 'at': 'same'},
   '同宮有祿存：你的伴侶較顧自己，也想掌主導。',
   'With Lu Cun in the palace, your partner looks after their own interests and likes to be in charge.',
   '唯若禄存同度，仍主配偶自私，有支配欲。', '有支配欲', 'limit'),
]})
T.append({'id': '紫微貪狼.夫妻', 'stars': ['紫微', '貪狼'], 'rules': [
 R('夫妻.紫貪.合作', {'all': [{'any': [GOODHUA, FUZUO, KUIYUE]}, {'not': {'palace': '夫妻', 'is': 'bad'}}]},
   '你的紫微貪狼見〔吉〕，夫妻可以合作創業，但要以伴侶做事業的主體。',
   'Your Zi Wei–Tan Lang meets 〔good signs〕: you and your partner can build a business together, with your partner at its centre.',
   '『紫贪』见吉，不可作『桃花犯主』看。亦主夫妻可以合作创业，唯必须以配偶为事业主体。', '唯必须以配偶为事业主体'),
]})
T.append({'id': '紫微天相.夫妻', 'stars': ['紫微', '天相'], 'rules': [
 R('夫妻.紫相.合作', {'all': [FUZUO, {'not': {'palace': '夫妻', 'is': 'bad'}}]},
   '你的紫微天相見左輔右弼，利夫妻合作創業，可以一起興家。',
   'Your Zi Wei–Tian Xiang meets Zuo Fu or You Bi: working together as a couple pays off, and you can build the household side by side.',
   '辰戌『紫相』有情，见辅弼吉曜，利夫妻合作创业，谓之夫唱妇随，可以发达兴家，', '利夫妻合作创业'),
 R('夫妻.紫相.年齡', None,
   '與年齡差距較大的伴侶，你比較合得來。',
   'A partner with a wider age gap tends to suit you better.',
   '[紫破]、[紫相]皆宜配偶年龄有大差距。', '皆宜配偶年龄有大差距'),
]})
T.append({'id': '紫微七殺.夫妻', 'stars': ['紫微', '七殺'], 'rules': [
 R('夫妻.紫殺.遲婚', None,
   '紫微七殺在你的夫妻宮，晚一點結婚對你比較好，不必急著定下來。',
   'With Zi Wei and Qi Sha in your Partnership Palace, marrying later suits you better; there is no need to rush to settle down.',
   '『紫杀』在夫妻宫以迟婚为宜。', '在夫妻宫以迟婚为宜', 'base'),
 R('夫妻.紫殺.輔佐', {'any': [FUZUO, KUIYUE]},
   '見〔輔佐吉星〕，伴侶的事業做得大，只是兩人容易聚少離多。',
   'With 〔helper stars〕 present, your partner builds a large career, though the two of you may see less of each other.',
   '巳亥[紫杀]一般均主配偶弄权。若见辅佐吉曜，则配偶事业广大。唯易与自身会少离多，', '则配偶事业广大'),
]})

# ── 天機 ──
T.append({'id': '天機子午.夫妻', 'stars': ['天機'], 'branch': ['子', '午'], 'rules': [
 R('夫妻.天機子午.吉', {'all': [{'hua': ['祿', '權', '科'], 'at': 'sifang'}, {'not': SHA}]},
   '天機會到〔吉化〕，你和伴侶可以白頭偕老。',
   'Tian Ji meets 〔good transformations〕: you and your partner can grow old together.',
   '若见禄权科会，则夫妻可以白头。', '则夫妻可以白头'),
 R('夫妻.天機子午.煞', SHA,
   '天機在子午見〔煞〕，你和伴侶容易貌合神離。',
   'Tian Ji in Zi or Wu meets 〔harsh stars〕: you and your partner can look close while drifting apart inside.',
   '子午天机独坐，对宫巨门，稍带煞曜即己主夫妻貌合神离。', '即己主夫妻貌合神离'),
 R('夫妻.天機子午.同祿', {'hua': '祿', 'star': '天同', 'at': 'sifang'},
   '你的夫妻宮天機會天同化祿，夫妻可以白手興家。',
   'Tian Ji in your Partnership Palace meets Tian Tong in Abundance: together you can build a household from nothing.',
   '子午天机见天同化禄者吉，主夫妇白手兴家。', '主夫妇白手兴家'),
]})
T.append({'id': '天機丑未.夫妻', 'stars': ['天機'], 'branch': ['丑', '未'], 'rules': [
 R('夫妻.天機丑未.陀羅', {'star': '陀羅', 'at': 'same'},
   '同宮有陀羅，你的婚期較遲，也容易錯過好的緣份。',
   'With Tuo Luo in the palace, marriage comes later, and good matches are easily missed.',
   '丑未天机最怕陀罗同度，不但婚迟，而且多误良缘，', '不但婚迟，而且多误良缘', 'limit'),
 R('夫妻.天機丑未.波折', None,
   '天機在丑未，你婚前感情經過波折反而好；婚前太順，婚後反而容易聚少離多。',
   'In love, a bumpy road before marriage is actually better for you; if it is too smooth beforehand, you may see less of each other afterwards.',
   '丑未天机，以婚前饱经挫折，或婚前有风波阻碍者为佳。若婚前顺利，则婚后反易会少离多，或貌合神离。', '以婚前饱经挫折，或婚前有风波阻碍者为佳', 'base'),
]})
T.append({'id': '天機巨門.夫妻', 'stars': ['天機', '巨門'], 'rules': [
 R('夫妻.機巨.祿', LU,
   '你的天機巨門見祿，夫妻可以長久。',
   'Your Tian Ji–Ju Men meets Lu, so the marriage can last.',
   '卯酉宫[天机巨门]，必须见禄，然后夫妻始偕白发。', '必须见禄，然后夫妻始偕白发'),
 R('夫妻.機巨.風波', None,
   '訂婚後經過一些風波才走在一起，反而較好；太順利的，婚後多變故。',
   'Coming together only after some storms following an engagement is actually better; if everything goes too smoothly, more changes follow after the wedding.',
   '卯酉宫[天机巨门]，以订婚后即有风波，经历风波始谐连理者为宜。否则婚后多变故。', '经历风波始谐连理者为宜', 'base'),
]})
T.append({'id': '天機天梁.夫妻', 'stars': ['天機', '天梁'], 'rules': [
 R('夫妻.機梁.遲婚', None,
   '你的婚期較遲，或婚前有一段感情風波。',
   'Marriage tends to come late, or after a stormy spell in love.',
   '辰戌宫[天机天梁]同度，主迟婚，或婚前有恋爱风波，', '主迟婚，或婚前有恋爱风波', 'base'),
]})
T.append({'id': '天機巳亥.夫妻', 'stars': ['天機'], 'branch': ['巳', '亥'], 'rules': [
 R('夫妻.天機巳亥.吉', {'all': [GOODHUA, {'any': [FUZUO, KUIYUE]}]},
   '你的夫妻宮天機吉化，又見〔輔佐吉星〕：伴侶斯文秀氣，也能創出自己的事業。',
   'Tian Ji in your Partnership Palace is well transformed and meets 〔helper stars〕: your partner is refined, and able to build their own career.',
   '巳亥天机有吉化，见辅弼、魁钺，则主配偶文秀，且能创建事业。', '则主配偶文秀，且能创建事业'),
]})

# ── 太陽 ──
T.append({'id': '太陽子.夫妻', 'stars': ['太陽'], 'branch': ['子'], 'rules': [
 R('夫妻.太陽子.挑剔', None,
   '你的伴侶性情比較挑剔，對人對事都有自己的要求。',
   'Your partner tends to be particular, with their own standards for people and things.',
   '太阳在子，主配偶性情多挑剔，见火铃者尤甚。', '主配偶性情多挑剔', 'base'),
]})
T.append({'id': '太陽午.夫妻', 'stars': ['太陽'], 'branch': ['午'], 'rules': [
 R('夫妻.太陽午.賢明', None,
   '你的伴侶明白事理，有責任感，遇事靠得住。',
   'Your partner is sensible and responsible, someone you can rely on when things come up.',
   '太阳在午，主配偶贤明，有责任感。', '主配偶贤明，有责任感', 'base'),
 R('夫妻.太陽午.輔佐', FUZUO,
   '見左輔右弼，你的伴侶在事業上有良好的成就。',
   'With Zuo Fu or You Bi present, your partner does well in their career.',
   '女命太阳在午，会辅佐诸曜，主夫婿贵显。男命，古代主因妻得贵，在现代，妇女有自己事业，亦主妻子有良好事业。', '亦主妻子有良好事业'),
]})
T.append({'id': '太陽太陰.夫妻', 'stars': ['太陽', '太陰'], 'rules': [
 R('夫妻.陰陽.火鈴', FIRE,
   '同宮有火星或鈴星，你和伴侶兩家的關係較難融洽。',
   'With Huo Xing or Ling Xing in the palace, the two families find it harder to get along.',
   '[太阳太阴]在丑，见火铃，主亲家不和。', '主亲家不和', 'limit'),
]})
T.append({'id': '太陽巨門.夫妻', 'stars': ['太陽', '巨門'], 'branch': ['寅'], 'rules': [
 R('夫妻.陽巨寅.異族', {'all': [{'hua': ['祿', '權'], 'star': '太陽', 'at': 'same'}, {'not': FIRE}]},
   '你的伴侶容易來自不同的文化或地方。',
   'Your partner may well come from a different culture or place.',
   '太阳在寅，[太阳巨门]同度，见太阳化禄、化权、或太阳化忌而无火铃，均主异族通婚。', '均主异族通婚'),
]})
T.append({'id': '太陽天梁.夫妻', 'stars': ['太陽', '天梁'], 'rules': [
 R('夫妻.陽梁.波折', None,
   '你婚前多有波折，也可能是舊人重逢，再走在一起。',
   'The road to marriage has its twists; it may even be an old flame you meet again.',
   '[太阳天梁]在夫妻宫，主婚前有波折，或旧侣重逢而后结合。', '主婚前有波折，或旧侣重逢而后结合', 'base'),
]})
T.append({'id': '太陽巳亥.夫妻', 'stars': ['太陽'], 'branch': ['巳', '亥'], 'rules': [
 R('夫妻.太陽巳亥.波折', None,
   '即使盤面吉，你婚前的感情路也多波折，不會一帆風順。',
   'Even with good signs, your love life before marriage has its ups and downs; it will not be plain sailing.',
   '太阳在巳亥二垣，纵见吉，亦主婚前恋爱波折。', '纵见吉，亦主婚前恋爱波折', 'base'),
]})
T.append({'id': '太陽.夫妻', 'stars': ['太陽'], 'rules': [
 R('夫妻.太陽.火鈴', FIRE,
   '同宮有火星或鈴星：起初感情深厚，日子久了容易針鋒相對。',
   'With Huo Xing or Ling Xing in the palace, the feeling runs deep at first, but over time it can turn into friction.',
   '凡太阳在夫妻宫见火铃，初时感情深厚，久后即如水火。', '初时感情深厚，久后即如水火', 'limit'),
]})

# ── 武曲 ──
T.append({'id': '武曲天府.夫妻', 'stars': ['武曲', '天府'], 'rules': [
 R('夫妻.武府.祿', LU,
   '你的夫妻宮武曲天府見祿，這是婚姻和美的條件，兩人和睦。',
   'Your Wu Qu–Tian Fu meets Lu, which is what this pairing needs for a harmonious marriage: the two of you live in peace.',
   '子午宫[武曲天府]，必须见禄始主婚姻谐美。', '必须见禄始主婚姻谐美'),
]})
T.append({'id': '武曲貪狼.夫妻', 'stars': ['武曲', '貪狼'], 'rules': [
 R('夫妻.武貪.火鈴', FIRE,
   '同宮有火星或鈴星，你們的感情先熱後冷。',
   'With Huo Xing or Ling Xing in the palace, the feeling starts hot and cools.',
   '丑未宫[武曲贪狼]，与火铃同度，主感情始热终冷。', '主感情始热终冷', 'limit'),
 R('夫妻.武貪.財', {'not': LU},
   '伴侶看重錢財，也會想管你的財權。',
   'Your partner sets great store by money, and may want a say over yours.',
   '丑未宫[武曲贪狼]，一般主配偶吝啬，以钱财为重，时思左右配偶的财权。', '以钱财为重'),
 R('夫妻.武貪.祿', LU,
   '見祿存或化祿，你的伴侶經濟寬裕，或能靠自己經營。',
   'With Lu Cun or an Abundance transformation, your partner is well off, or can make their own way.',
   '禄存或化禄照会则不是，主夫婿富足，或妻子能凭自力经营。', '或妻子能凭自力经营'),
]})
T.append({'id': '武曲天相.夫妻', 'stars': ['武曲', '天相'], 'rules': [
 R('夫妻.武相.剛柔', None,
   '你和伴侶要剛柔互補，一方強硬時另一方肯讓，婚姻就圓滿。',
   'You and your partner need to balance firm with soft, one giving way when the other stands firm, and then the marriage is whole.',
   '寅申宫[武曲天相]，须刚柔互济然后始主婚姻完美。', '须刚柔互济然后始主婚姻完美', 'base'),
 R('夫妻.武相.左右', FUZUO,
   '見左輔右弼，你和伴侶之間更能互相幫助。',
   'With Zuo Fu or You Bi, you and your partner help each other all the more.',
   '若见左辅右弼，则更主夫妻间有助力。', '则更主夫妻间有助力'),
]})
T.append({'id': '武曲七殺.夫妻', 'stars': ['武曲', '七殺'], 'rules': [
 R('夫妻.武殺.遲婚', None,
   '晚一點結婚對你比較好，早婚容易後悔；這組星坐卯比坐酉好。',
   'Marrying later suits you better, since an early marriage is easily regretted; this pair sits better in Mao than in You.',
   '卯酉宫[武曲七杀]，每宜迟婚，否则婚姻多悔吝。坐酉宫者尤甚。', '每宜迟婚', 'base'),
 R('夫妻.武殺.性剛', None,
   '你的伴侶性格剛強，兩人要學會互相調和。',
   'Your partner has a forceful character, and the two of you need to learn to meet halfway.',
   '卯酉[武杀]，亦主配偶性刚。', '亦主配偶性刚'),
]})
T.append({'id': '武曲辰戌.夫妻', 'stars': ['武曲'], 'branch': ['辰', '戌'], 'rules': [
 R('夫妻.武曲辰戌.遲婚', None,
   '武曲獨坐你的夫妻宮，晚一點結婚對你比較好。',
   'With Wu Qu alone in your Partnership Palace, marrying later suits you better.',
   '辰戌宫武曲独坐，宜迟婚。', '武曲独坐，宜迟婚', 'base'),
 R('夫妻.武曲辰戌.火鈴', FIRE,
   '同宮有火星或鈴星，你的婚事容易來得倉卒。',
   'With Huo Xing or Ling Xing in the palace, marriage may come about in a hurry.',
   '火铃同度，主仓卒成婚。', '主仓卒成婚'),
 R('夫妻.武曲辰戌.吉', {'any': [GOODHUA, FUZUO, KUIYUE]},
   '夫妻宮見〔吉〕，你的伴侶精明能幹，處事俐落。',
   'With 〔good signs〕 in the palace, your partner is sharp and capable, and handles things deftly.',
   '见吉化吉曜，则配偶精明能干。', '则配偶精明能干'),
]})
T.append({'id': '武曲破軍.夫妻', 'stars': ['武曲', '破軍'], 'rules': [
 R('夫妻.武破.吉', {'any': [GOODHUA, FUZUO, KUIYUE]},
   '見〔吉化吉星〕，伴侶精明，你在關係裡往往由對方主導。',
   'With 〔good transformations or helper stars〕, your partner is shrewd, and tends to take the lead in the relationship.',
   '巳亥宫[武破]见吉化、吉曜，则主配偶精明，但自身仍受配偶控制。', '则主配偶精明'),
 R('夫妻.武破.祿馬', LUMA,
   '祿星與天馬相會，你和伴侶容易各在一方，聚少離多。',
   'With Lu and Tian Ma meeting, the two of you may often be in different places, together less than apart.',
   '若[武破]与禄马同躔，或与禄马拱照，则主夫妻各处一方，会少离多。', '则主夫妻各处一方，会少离多', 'limit'),
]})

# ── 天同 ──
T.append({'id': '天同太陰.夫妻', 'stars': ['天同', '太陰'], 'rules': [
 R('夫妻.同陰.貌', None,
   '你的伴侶外貌出眾，舉止大方，有風度。',
   'Your partner is good-looking, with an easy, graceful manner.',
   '子午宫[天同太阴]，男命主娶美妻；女命配夫亦风度翩翩。', '女命配夫亦风度翩翩', 'base'),
]})
T.append({'id': '天同巨門.夫妻', 'stars': ['天同', '巨門'], 'rules': [
 R('夫妻.同巨.對星', PAIR,
   '你的天同巨門會到〔成對的輔佐星〕，婚姻才穩定。',
   'Your Tian Tong–Ju Men meets 〔helper stars in matched pairs〕, which is what keeps the marriage steady.',
   '丑未『同巨』，见辅佐吉曜，且系成对会入，然后婚姻始主稳定。', '且系成对会入，然后婚姻始主稳定'),
]})
T.append({'id': '天同卯酉.夫妻', 'stars': ['天同'], 'branch': ['卯', '酉'], 'rules': [
 R('夫妻.天同卯酉.俊美', None,
   '天同在卯酉，對著太陰，你的伴侶外貌俊美。',
   'With Tian Tong in Mao or You facing Tai Yin, your partner is good-looking.',
   '卯酉天同独坐，对太阴，亦主配偶俊美。', '亦主配偶俊美', 'base'),
 R('夫妻.天同卯酉.吉', {'any': [GOODHUA, FUZUO, KUIYUE]},
   '天同見〔吉化和吉星〕，你的婚姻和美，兩人相處融洽。',
   'Tian Tong meets 〔good transformations and helper stars〕: your marriage is harmonious and the two of you get on well.',
   '见吉化、吉曜，可卜婚姻和美。', '可卜婚姻和美'),
]})
T.append({'id': '天同巳亥.夫妻', 'stars': ['天同'], 'branch': ['巳', '亥'], 'rules': [
 R('夫妻.天同巳亥.祿馬', LUMA,
   '祿星與天馬相會，夫妻容易聚少離多，或各住一方。',
   'With Lu and Tian Ma meeting, you and your partner may spend much time apart, or live in different places.',
   '巳亥天同与禄马拱照或同度，均主夫妻会少离多。或主与配偶备居一方。', '均主夫妻会少离多', 'limit'),
]})

# ── 廉貞 ──
T.append({'id': '廉貞天相.夫妻', 'stars': ['廉貞', '天相'], 'rules': [
 R('夫妻.廉相.己見', None,
   '你和伴侶各有主見，容易各顧各的，要多為對方著想。',
   'You each have strong views and can each go your own way; think of the other more.',
   '子午[廉贞天相]，与破军相对，性质不佳。即使有吉化、吉曜，亦主夫妻备怀己见，为己谋而不为配偶谋，以致彼此参商。', '以致彼此参商', 'base'),
]})
T.append({'id': '廉貞寅申.夫妻', 'stars': ['廉貞'], 'branch': ['寅', '申'], 'rules': [
 R('夫妻.廉貞寅申.昌曲', {'star': ['文昌', '文曲'], 'at': 'sifang'},
   '廉貞會文昌文曲，你和伴侶都守禮，彼此不會越界。',
   'Lian Zhen meets Wen Chang or Wen Qu: you and your partner both keep to proper bounds and do not overstep.',
   '若廉贞与昌曲同会，则夫妻能守礼，不致逾越。', '则夫妻能守礼，不致逾越'),
 R('夫妻.廉貞寅申.火鈴', FIRE,
   '廉貞與火星或鈴星同宮，你的婚事往往來得倉卒。',
   'With Lian Zhen beside Huo Xing or Ling Xing, marriage tends to come about in a rush.',
   '寅申宫廉贞与火铃同度，主仓卒成婚。', '主仓卒成婚'),
]})
T.append({'id': '廉貞破軍.夫妻', 'stars': ['廉貞', '破軍'], 'rules': [
 R('夫妻.廉破.不和', None,
   '即使見吉，兩人也容易不和，關係要多花心力經營。',
   'Even with good signs, friction comes easily; the relationship needs real effort.',
   '卯酉宫『廉贞破军』同度，破折的性质相当严重，纵有吉化及吉曜，亦主夫妻不和。', '亦主夫妻不和', 'base'),
]})
T.append({'id': '廉貞天府.夫妻', 'stars': ['廉貞', '天府'], 'rules': [
 R('夫妻.廉府.穩定', None,
   '廉貞天府結構較穩定：兩人或有不和，關係卻不至於散。',
   'Lian Zhen–Tian Fu is a steadier structure: you may clash, but the relationship holds.',
   '辰戌宫[廉贞天府]，结构较为稳定，多主不和，不主克离。', '结构较为稳定', 'base'),
]})
T.append({'id': '廉貞.夫妻', 'stars': ['廉貞'], 'rules': [
 R('夫妻.廉貞.年齡', None,
   '廉貞在夫妻宮，與年齡相差較大的伴侶，你比較合得來。',
   'With Lian Zhen in your Partnership Palace, a partner with a wider age gap tends to suit you better.',
   '廉贞在夫妻宫，男命宜配年少之妻，女命宜配年长之夫。年龄差距由六年至十二年不等，甚至可在十二年以上。', '年龄差距由六年至十二年不等', 'base'),
 R('夫妻.廉貞.火', {'star': '火星', 'at': 'same'},
   '同宮有火星，即使盤面吉，也容易因環境而兩地分隔。',
   'With Huo Xing in the palace, even with good signs, circumstances may keep you and your partner in different places.',
   '廉贞最忌火星同宫，即使见吉曜吉化，亦主因客观环境以致夫妇分居二地。', '亦主因客观环境以致夫妇分居二地', 'limit'),
]})

# ── 天府 ──
T.append({'id': '天府巳亥.夫妻', 'stars': ['天府'], 'branch': ['巳', '亥'], 'rules': [
 R('夫妻.天府巳亥.賢能', None,
   '天府在巳亥，對宮是紫微七殺，你的伴侶精明能幹。',
   'With Tian Fu in Si or Hai, facing Zi Wei–Qi Sha, your partner is sharp and capable.',
   '巳亥宫天府，性质较卯西尤佳。由于对宫为[紫杀]，主配偶精明贤能。', '主配偶精明贤能', 'base'),
]})
T.append({'id': '天府卯酉.夫妻', 'stars': ['天府'], 'branch': ['卯', '酉'], 'rules': [
 R('夫妻.天府卯酉.吉', {'all': [{'hua': ['祿', '權', '科'], 'at': 'sifang'}, {'any': [FUZUO, KUIYUE]}]},
   '會吉又見〔吉化〕：你們感情好，兩人也能互相扶持。',
   'With helper stars and 〔good transformations〕, the bond is warm and you support each other.',
   '卯酉宫天府会吉，见吉化，男女皆主美配，感情既佳，又能互相扶助。', '感情既佳，又能互相扶助'),
]})
T.append({'id': '天府.夫妻', 'stars': ['天府'], 'rules': [
 R('夫妻.天府.調和', None,
   '天府有調和夫妻關係的性質：盤上其他不利的地方，會因它而減輕。',
   'Tian Fu smooths the bond between partners: whatever else in the chart works against it is softened.',
   '由于天府有调和夫妻关系的性质，所以凡夫妻宫会天府者，一般皆有减少其凶危，啬其吉利的意味。', '由于天府有调和夫妻关系的性质', 'base'),
]})

# ── 太陰 ──
T.append({'id': '太陰辰戌.夫妻', 'stars': ['太陰'], 'branch': ['辰', '戌'], 'rules': [
 R('夫妻.太陰辰戌.長久', None,
   '太陰對著太陽，你和伴侶一般能長久；坐戌比坐辰好。',
   'Tai Yin facing Tai Yang generally points to a lasting marriage; Xu is the better seat than Chen.',
   '辰戌太阴与太阳相对，一般情况下均主白发齐眉，唯戌宫优于辰宫。', '一般情况下均主白发齐眉', 'base'),
]})
T.append({'id': '太陰酉.夫妻', 'stars': ['太陰'], 'branch': ['酉'], 'rules': [
 R('夫妻.太陰酉.事業', {'any': [GOODHUA, FUZUO, KUIYUE]},
   '太陰坐酉，伴侶的事業較好；見〔吉〕，更可以自己開創事業。',
   'With Tai Yin in You, your partner does well at work, and with 〔good signs〕 can found their own business.',
   '卯宫太阴对天同，不如酉宫。酉宫音主配偶事业较佳，见辅佐占曜及吉化，亦可以兴创事业。', '亦可以兴创事业'),
]})
T.append({'id': '太陰巳亥.夫妻', 'stars': ['太陰'], 'branch': ['巳', '亥'], 'rules': [
 R('夫妻.太陰巳.助人', {'branch': ['巳']},
   '你的伴侶熱心幫人，有時顧外多於顧家。',
   'Your partner is generous with help to others, and sometimes puts the outside world before home.',
   '巳亥太阴与天机相对，巳宫不如亥宫远甚。在巳宫者，常主配偶不顾家庭，但却乐于帮助别人。', '但却乐于帮助别人'),
 R('夫妻.太陰亥.富裕', {'branch': ['亥']},
   '太陰坐亥，你的伴侶一般手頭寬裕，經濟條件不錯。',
   'With Tai Yin in Hai, your partner is generally comfortably off.',
   '亥宫太阴一般主配偶富裕。', '亥宫太阴一般主配偶富裕'),
]})

# ── 貪狼 ──
T.append({'id': '貪狼辰戌.夫妻', 'stars': ['貪狼'], 'branch': ['辰', '戌'], 'rules': [
 R('夫妻.貪狼辰戌.和美', {'any': [GOODHUA, FUZUO, KUIYUE]},
   '辰戌的貪狼桃花意味較輕，見〔吉化吉星〕，夫妻和美。',
   'Tan Lang in Chen or Xu carries less of its romantic restlessness; with 〔good signs〕, the marriage is harmonious.',
   '辰戌贪狼为天罗地网，桃花的意味减轻，故性质较佳。若见吉化、吉曜，则夫妻和美。', '则夫妻和美'),
 R('夫妻.貪狼辰戌.火鈴', FIRE,
   '同宮有火星或鈴星，你們夫妻的感情反而較為長久。',
   'With Huo Xing or Ling Xing in the palace, the love between you actually lasts longer.',
   '辰戌[火贪]、『铃贪』，夫妻爱情较为久永。', '夫妻爱情较为久永'),
 R('夫妻.貪狼辰戌.遲婚', None,
   '貪狼在辰戌，晚一點結婚對你比較好。',
   'With Tan Lang in Chen or Xu, marrying later suits you better.',
   '辰戌贪狼，亦主迟婚。', '辰戌贪狼，亦主迟婚', 'base'),
]})
T.append({'id': '貪狼.夫妻', 'stars': ['貪狼'], 'rules': [
 R('夫妻.貪狼.忌', {'hua': '忌', 'star': '貪狼', 'at': 'same'},
   '貪狼化忌：婚前容易有人競爭，經過波折，婚後反而好。',
   'Tan Lang in Hindrance: there may be rivals before marriage, but after those twists, married life is better.',
   '贪狼化忌于夫妻宫，主为人夺爱，所以婚前多波折，则婚后反佳；', '所以婚前多波折，则婚后反佳'),
 R('夫妻.貪狼.火鈴', {'all': [FIRE, {'not': {'branch': ['辰', '戌']}}, {'not': {'with': '武曲'}}]},
   '同宮有火星或鈴星：起初熱戀，婚後不久就容易冷下來。',
   'With Huo Xing or Ling Xing in the palace, it starts as a passionate romance but can cool soon after marriage.',
   '『火贪』、『铃贪』守夫妻宫，主初时热恋，婚后不久即同冰炭。', '主初时热恋', 'limit'),
 R('夫妻.貪狼.煞', {'all': [{'all': [SHA, {'not': {'branch': ['辰', '戌']}}]}, {'not': {'hua': '忌', 'star': '貪狼', 'at': 'same'}}]},
   '同宮見〔煞〕，你以遲婚為宜；婚前經過波折，反而好。',
   'With 〔harsh stars〕 in the palace, marrying later suits you; twists beforehand actually help.',
   '必须迟婚，且婚前曾经波折，然后可免。', '必须迟婚，且婚前曾经波折'),
]})

# ── 巨門 ──
T.append({'id': '巨門子午.夫妻', 'stars': ['巨門'], 'branch': ['子', '午'], 'rules': [
 R('夫妻.巨門子午.吉', {'any': [GOODHUA, {'star': '祿存', 'at': 'same'}, KUIYUE, FUZUO]},
   '你的巨門見〔吉〕，伴侶聰慧，或事業良好。',
   'Your Ju Men meets 〔good signs〕: your partner is bright, or doing well in their career.',
   '子午巨门见吉化吉曜，如化禄、权、科、禄存、魁钺、辅弼者，男主配聪慧貌美之妻，女主配事业良好之夫。', '女主配事业良好之夫'),
]})
T.append({'id': '巨門辰戌.夫妻', 'stars': ['巨門'], 'branch': ['辰', '戌'], 'rules': [
 R('夫妻.巨門辰戌.任勞', {'all': [{'hua': ['祿', '權', '科'], 'at': 'sifang'}, {'not': SHA}]},
   '巨門會祿權科而煞星少，你的伴侶任勞任怨，肯為家裡付出。',
   'Ju Men meets Abundance, Authority or Merit with few harsh stars: your partner works hard without complaint and gives a lot to the home.',
   '辰戌巨门，见昌曲、辅弼皆不佳。会禄权科而少煞曜者，主配偶可以任劳任怨。', '主配偶可以任劳任怨'),
]})
T.append({'id': '巨門巳亥.夫妻', 'stars': ['巨門'], 'branch': ['巳', '亥'], 'rules': [
 R('夫妻.巨門巳亥.親眷', None,
   '你與伴侶的家人較難相處，坐巳更明顯。',
   'Getting along with your partner’s family is harder, more so in Si.',
   '巳亥巨门，女命主与夫家亲眷不和；男命主与岳家亲眷不和。巳宫者尤甚。', '巳宫者尤甚', 'base'),
]})
T.append({'id': '巨門.夫妻', 'stars': ['巨門'], 'rules': [
 R('夫妻.巨門.陀羅', {'star': '陀羅', 'at': 'same'},
   '同宮有陀羅，你們容易自找麻煩，小事變大事。',
   'With Tuo Luo in the palace, you can make trouble for yourselves, turning small things into big ones.',
   '巨门最不喜与陀罗同躔，主夫妻自找麻烦，往往小事化为大事。', '往往小事化为大事', 'limit'),
 R('夫妻.巨門.爭吵', None,
   '即使盤面吉，你和伴侶之間也多無謂的爭吵。',
   'Even with good signs, there is a fair amount of needless bickering.',
   '巨门守夫妻宫，虽吉，亦多无谓争吵。', '虽吉，亦多无谓争吵', 'base'),
]})

# ── 天相 ──
T.append({'id': '天相.夫妻', 'stars': ['天相'], 'rules': [
 R('夫妻.天相.熟人', None,
   '伴侶多由同學、同事、鄰居一類熟人變成，或是久別重逢的舊相識。',
   'Your partner is often someone you already knew, a classmate, colleague or neighbour, or an old acquaintance met again.',
   '天相坐夫妻宫，古人有『亲上加亲』的说法。在现代，则为由同学、同事、街坊关系变成夫妇。又或为旧相识，未有感情，经一段时期疏远，重逢后再发生感情。', '则为由同学、同事、街坊关系变成夫妇', 'base'),
 R('夫妻.天相.共事', {'not': {'palace': '夫妻', 'is': 'bad'}},
   '天相坐夫妻宮，你和伴侶適合一起做事，分工合作最順。',
   'With Tian Xiang in your Partnership Palace, you and your partner do well working together, each taking a share.',
   '天相坐夫妻宫，又为[夫唱妇随]，宜夫妻合作共事。', '宜夫妻合作共事'),
]})

# ── 天梁 ──
T.append({'id': '天梁巳亥.夫妻', 'stars': ['天梁'], 'branch': ['巳', '亥'], 'rules': [
 R('夫妻.天梁巳亥.同祿', {'hua': '祿', 'star': '天同', 'at': 'opp'},
   '對宮天同化祿，你和伴侶可以白手興家。',
   'With Tian Tong in Abundance opposite, you and your partner can build a household from nothing.',
   '巳亥天梁，对宫天同化禄，又有吉会，则主夫妻白手兴家。', '则主夫妻白手兴家'),
]})
T.append({'id': '天梁.夫妻', 'stars': ['天梁'], 'rules': [
 R('夫妻.天梁.情深', None,
   '你婚前多經波折，所以婚後感情往往更深。',
   'Because the road to marriage has its twists, the bond afterwards is often all the deeper.',
   '由于婚姻曾经波折。所以天梁坐夫妻宫的人，往往婚后情缘更高笃。', '往往婚后情缘更高笃', 'base'),
 R('夫妻.天梁.羊陀', {'star': ['擎羊', '陀羅'], 'at': 'same'},
   '同宮有擎羊或陀羅，容易有閒言是非，令兩人受壓。',
   'With Qing Yang or Tuo Luo in the palace, gossip and talk can put the two of you under pressure.',
   '天梁最忌羊陀，主谗言是非，以致夫妻受压力。', '主谗言是非，以致夫妻受压力', 'limit'),
]})

# ── 七殺 ──
T.append({'id': '七殺辰戌.夫妻', 'stars': ['七殺'], 'branch': ['辰', '戌'], 'rules': [
 R('夫妻.七殺辰戌.理想', {'any': [GOODHUA, FUZUO, KUIYUE]},
   '見〔吉化吉星〕，終能遇到理想的伴侶，只是婚前多有感情波折。',
   'With 〔good transformations or helper stars〕, you do find the partner you hoped for, though not without twists along the way.',
   '辰戌七杀见吉化吉曜，主终能获得理想的配偶，而婚前则有恋爱波折。', '主终能获得理想的配偶'),
]})
T.append({'id': '七殺.夫妻', 'stars': ['七殺'], 'rules': [
 R('夫妻.七殺.遲婚', {'not': {'any': [{'with': '紫微'}, {'with': '武曲'}]}},
   '七殺在夫妻宮，一般晚一點結婚對你比較好。',
   'With Qi Sha in your Partnership Palace, marrying later generally suits you better.',
   '七杀临夫妻宫，一般以迟婚为宜。', '一般以迟婚为宜', 'base'),
 R('夫妻.七殺.獨立', {'all': [{'hua': ['祿', '權', '科'], 'at': 'sifang'}, {'any': [FUZUO, KUIYUE]}]},
   '會到〔吉化〕又見〔輔佐吉星〕，兩人宜各有獨立的事業。',
   'With 〔good transformations〕 and 〔helper stars〕, you and your partner do best with separate careers of your own.',
   '七杀临夫妻宫，若会照吉化，且见辅佐诸曜，则宜配偶各有独立事业。', '则宜配偶各有独立事业'),
]})

# ── 破軍 ──
T.append({'id': '破軍.夫妻', 'stars': ['破軍'], 'rules': [
 R('夫妻.破軍.波折', {'not': {'with': '紫微'}},
   '你婚前多波折；就算破軍化祿也一樣。',
   'The road to marriage has its twists, even with Po Jun in Abundance.',
   '破军在夫妻宫并非善曜，即使破军化禄，亦主婚前多波折，引起争夺。', '即使破军化禄，亦主婚前多波折', 'base'),
 R('夫妻.破軍.駕御', None,
   '你在感情裡有想駕馭伴侶的傾向。',
   'In love, you have a tendency to want to steer your partner.',
   '凡破军在夫妻宫，男女皆有驾御配偶的倾向，', '男女皆有驾御配偶的倾向'),
 R('夫妻.破軍.羊陀', {'star': ['擎羊', '陀羅'], 'at': 'sifang'},
   '見擎羊陀羅，婚前或婚後，兩人容易有一段時間分開。',
   'With Qing Yang or Tuo Luo, the two of you are likely to spend a stretch apart, before or after marriage.',
   '破军为羊陀会照，主婚前或婚后，双方曾一度分离。', '主婚前或婚后，双方曾一度分离', 'limit'),
]})
T.append({'id': '天機太陰.夫妻', 'stars': ['天機', '太陰'], 'rules': [
 R('夫妻.機陰.情緒', None,
   '天機太陰在夫妻宮，你們的關係容易受情緒左右，情緒太重時婚姻就會起波折。',
   'With Tian Ji and Tai Yin in your Partnership Palace, the relationship is easily swayed by mood, and when feelings run too high the marriage hits rough water.',
   '寅申宫[机月]，若情绪化过甚，则易旨起婚姻波折，如配偶移情别恋之类。', '若情绪化过甚', 'base'),
 R('夫妻.機陰.同忌', H('忌', '天同', 'sifang'),
   '天機太陰會天同化忌，你的伴侶容易過份敏感，婚姻較易起風波。',
   'Tian Ji–Tai Yin meets Tian Tong in Hindrance: your partner can be oversensitive, and the marriage more easily runs into storms.',
   '寅申宫[机月]会天同化忌，易空劫、阴煞、天虚、大耗等曜，主配偶心志卑弱，或过份敏感，由是亦易发生婚姻风波。', '或过份敏感'),
]})
T.append({'id': '天同.夫妻', 'stars': ['天同'], 'rules': [
 R('夫妻.天同.年齡', None,
   '天同在夫妻宮，與年齡相差較大的伴侶，你比較合得來。',
   'With Tian Tong in your Partnership Palace, a partner with a wider age gap tends to suit you better.',
   '凡天同在夫妻宫，皆主配年少之妻，或年长之夫，以年龄相差八年为准，然后始可成结发。', '以年龄相差八年为准', 'base'),
]})
