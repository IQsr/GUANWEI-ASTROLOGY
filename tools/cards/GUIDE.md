# 命宮條件卡：寫卡指引（2026-10-19）

你會負責幾個「六十星系」（命宮主星組合），為每個星系寫一個 `tools/cards/ming/NN.json`（NN = 兩位數星系編號）。
範例：`tools/cards/ming/11.json`（紫微破軍坐丑未）。**寫之前先讀晒範例。**

背景：星敘本書以前每粒星各自出句，同一章自相矛盾。新架構改為：先由原文寫「條件卡」，判斷層按盤揀卡，每個話題只講一次。
你寫嘅卡就係判斷層嘅資料，**寫得唔準，讀者就會讀到錯嘢**。

## 一、原文喺邊（只用王亭之）

喺專案根目錄（`C:/Users/issac/OneDrive/Documents/guanwei`）用 Bash 跑。輸出係 JSON，**一定要加 `python -X utf8`**，唔好 pipe 落另一個 python（會撞編碼）；要篩就寫落 scratchpad 檔再讀。

```bash
# 星系整節（主要材料：本質、比較軸兩頭、條件、經行各類運限）
python -X utf8 tools/wang-reference/deep.py show --section deep.system.11
# 命宮章：十四主星守命喜行／忌行運限、「一生命運的樞紐」（p.335–366）
python -X utf8 tools/wang-reference/deep.py show --section deep.ming.紫微
# 搜尋（組合／星／條件）
python -X utf8 tools/wang-reference/deep.py search --pair 紫破
python -X utf8 tools/wang-reference/deep.py search --part ming --stars 破軍
# 單段（要 text_sha256 就睇呢度）
python -X utf8 tools/wang-reference/deep.py show --id wtz.deep.p071.b006 --context 0
# 初階（第三方轉錄，只作補充；同深造唔同以深造為準）
python -X utf8 tools/wang-reference/initial.py search --pair 紫破
```

`reference.py` 會警告「索引輸入已變，先重新build」：**唔好理，唔好 build**。

其他參考（唔係出處，只係舊稿）：
- `tools/wang-reference/deep/SYSTEMS.md`：每節比較軸同「核對」提示。
- `packages/content/src/xingxi/systems.json`：每個星系嘅 `poles`（比較軸兩頭，卡嘅 `pole` 一定要用呢兩個字串之一）、點票規則。
- `packages/content/src/branch/xingxi/NN.json`（第 17 係 `branch/tongliang-ming.json`）：舊版細讀規則，已經有讀者文字同英文。**可以借用佢哋嘅講法**，但出處一定要改做索引段落 id，條件要重新對原文。

## 二、卡嘅格式

Schema 喺 `packages/content/src/card.ts`。每張卡：

| 欄 | 寫乜 |
|---|---|
| `id` | `card.ming.<星系拼音短名>.<短名>`，例如 `card.ming.zipo.core`。全部細楷英文、數字、`-`。同一星系內唔重複；唔同星系唔好撞（用星系短名做第三段：zipo、ziwei-ziwu、pojun-yinshen…）。 |
| `palace` | `"命宮"` |
| `topic` | `本質`／`格局`／`處事`／`待人`／`運程`（見第三節） |
| `kind` | `claim`（結論）／`caveat`（修飾、代價、限制）／`advice`（點做） |
| `system` | 星系編號 |
| `pole` | 只啱比較軸其中一頭先寫。兩頭都啱就唔寫。 |
| `when` | 原文明寫嘅前提（條件語言見第四節）。冇前提唔寫。 |
| `none` | 原文明寫嘅排除。 |
| `decades` | 只用喺本命「運程」卡：講「邊幾個十年」，寫大限層條件；claim 入面要有 `{decades}`，程式會填歲數。 |
| `layer` | `natal`（寫入命宮章）／`decade`（呢十年）／`annual`（呢一年）。大限、流年卡只可以係「運程」。 |
| `claim` | 讀者讀到嘅中文（繁體），見第五節 |
| `en` | 英文版，同 claim 意思一樣 |
| `limit` | 原文嘅界線：唔可以推到幾遠、條件語言計唔到嘅部分 |
| `sources` | `[{ "id": "wtz.deep.p071.b006", "sha256": "<text_sha256>" }]`。初階段落冇 sha256。 |
| `status` | `draft`；原文前提條件語言寫唔出 → `needs_atom`（照寫 claim，喺 `note` 講缺乜） |
| `rare` | 條件真係罕見（例如三層四化齊備）先寫 `true` |
| `note` | 俾人睇嘅備註 |

## 三、話題同「一把聲」

| 話題 | 講乜 |
|---|---|
| 本質 | 你係點樣嘅人：星系比較軸偏向邊頭。**每個星系一張冇 pole 嘅 claim（核心），再每頭一張 caveat**（好似範例 core／dongdang／anding）。 |
| 格局 | 成格／破格（百官朝拱、在野孤君、石中隱玉、火貪、財蔭夾印…），原文有先寫。 |
| 處事 | 做決定、做事嘅方式。 |
| 待人 | 同人相處嘅方式同代價。唔講對方性格（「你的朋友多勢利」唔得）。 |
| 運程 | 本命層：你適合乜性質嘅十年、邊幾個十年係關鍵（用 `decades`）。大限／流年層：呢十年／呢一年合唔合你。 |

**硬規矩（測試會驗）**：同一張盤、同一層、同一話題，**最多一張 `claim` 命中**。所以同話題嘅幾張 claim，條件要互相排斥（用 `pole`、`when`、`none`）。修飾、代價寫 `caveat`，做法寫 `advice`，佢哋可以同 claim 一齊出。

**唔可以同核心矛盾**：同一星系所有卡讀落要係同一個人。只啱一頭嘅講法一定要加 `pole`。原文講「兩頭可以調和」嘅，唔好寫成兩張互相打架嘅 claim。

## 四、條件語言

喺 `packages/content/src/condition.ts`。命盤上嘅星位置係本命；`layer` 揀邊層嘅宮名／四化。

常用：

```jsonc
{ "star": "紫微", "in": { "name": "命宮" } }                       // 星坐本命命宮
{ "star": "天府", "in": { "name": "命宮", "layer": "decade" } }     // 大限命宮有天府（= 行到天府守垣嘅十年）
{ "star": "武曲", "hua": "忌" }                                     // 生年武曲化忌
{ "star": "太陽", "hua": "忌", "layer": "annual" }                   // 流年太陽化忌
{ "hua": "忌", "in": { "name": "命宮", "layer": "decade" }, "layer": "decade" } // 大限化忌入大限命宮
{ "sanfangOf": { "name": "命宮" }, "count": "malefic", "op": "gte", "n": 1 }   // 命宮三方四正見煞（羊陀火鈴空劫）
{ "sanfangOf": { "name": "命宮" }, "contains": "祿存" }
{ "together": ["紫微", "左輔"] }                                    // 同宮
{ "star": "天相", "between": ["巨門", "天梁"] }                       // 夾
{ "star": "太陽", "brightness": ["廟", "旺"] }                        // 廟旺：廟 旺 得 利 平 不 陷
{ "all": [ ... ] }  { "any": [ ... ] }  { "not": { ... } }
```

2026-10-19 新原子（以星為錨）：

```jsonc
{ "meets": "紫微", "stars": ["左輔","右弼","天魁","天鉞"], "n": 2 }        // 紫微三方四正見其中兩粒或以上（預設 reach sanfang、gte 1）
{ "meets": "天府", "stars": ["地空"], "reach": "same" }                  // 同度
{ "meets": "天相", "stars": ["化忌"], "reach": "jia" }                   // 左右夾；「化祿／化權／化科／化忌」= 本命四化
{ "flow": "擎羊", "layer": "decade", "in": { "name": "命宮", "layer": "decade" } }  // 大限流羊入大限命宮（reach 可 sanfang）
{ "deLu": "天府" }                                                     // 得祿：三方四正見祿存或化祿（layer decade/annual 連該層四化同流祿）
{ "geju": "baiguan" }   // 百官朝拱｜zaiye 在野孤君｜kongku 空庫｜luku 露庫｜caiyin 財蔭夾印｜xingji 刑忌夾印
```

2026-10-19 第二批原子（寫卡中途補）：

```jsonc
{ "star": "巨門", "at": ["午"] }                  // 星坐邊個地支（唔使再用廟旺頂替）
{ "star": "天刑", "at": ["卯"] }   { "meets": "天梁", "stars": ["天刑"], "reach": "same" }  // 天刑而家睇得到
{ "decadeOrder": "forward" }                       // 大限順行（backward = 逆行）
{ "decadeAge": { "lt": 30 } }                      // 行緊嘅大限起運歲數（虛歲）< 30，即「早年大運」
```

`pole` 亦可以寫 `"平衡"`（兩頭點票一樣多）。

格局定義見 `condition.ts` 嘅 `GEJU_DEF`（每個有 note，講清楚計唔到嘅部分）。**引擎冇**：天刑以外雜曜（三台八座、恩光天貴、龍池鳳閣、天才天壽、華蓋、天德…）、天空、截空旬空、流昌曲以外嘅流雜曜、性別。原文條件靠呢啲 → `needs_atom`。原文講男命／女命 → 唔寫（引擎唔分）。

「行到 X 嘅十年／年」= 大限／流年命宮有 X：`{ "star": "X", "in": { "name": "命宮", "layer": "decade" } }`。兩粒星同度就兩條 `all`。

### 已定嘅讀法（2026-10-19 用戶定）

- **空曜（A1）**：暫定地空、地劫一齊計。依據係初階第 8 篇（`wtz.initial.08.p0007`）「空曜：指空劫與天空。截空、旬空亦可算作空曜，但力量較弱」。引擎冇天空、截空、旬空，所以實際只計地空、地劫。深造亦有分開寫嘅地方，例如 p008.b004 將「空劫」同「空曜」並列，p229.b001 講「地空最劣、天空次之」。原文點名邊粒，就跟原文：例如 p354.b004 地劫同躔反主挫折，就唔好當空曜計。
- **刑忌夾同財蔭夾（A2）**：用 `{geju: 'caiyin'}` 寫卡，刑忌夾優先。財蔭嘅構形記喺 `caiyinShape`；刑忌夾成立時，binding 會註明「同時有財蔭夾印構形」。
- **格名（A5）**：卡引用格名，條件就要展開成完整嘅原文條件，唔可以見名就套。有原子嘅就用原子：`baiguan`、`zaiye`、`kongku`、`luku`、`caiyin`、`xingji`、`shizhong`（石中隱玉）。冇原子嘅，就喺 `when` 寫齊原文條件，並喺 note 講明出處。百官朝拱統一以錨星三方四正見輔佐兩粒或以上計。
- **反背（A6）**：按星系同具體條件分開定義，各自跟所引段落，唔設通用原子。
- **破軍辰戌（A7）**：比較軸叫「偏枯」；讀者文字講「配合失衡」。
- **吉化（A9）**：原文寫「X 得吉化」「X 吉化」，係 X 自己化。寫「X 見／會／遇吉化」，係同宮嘅星本命或大限化祿權科：本命用 `{meets: X, stars: [化祿, 化權, 化科], reach: same}`；大限化就寫 `{hua, in: 大限命宮, layer: decade}`，前提係 X 喺大限命宮。
- **待核（hold）**：原文有疑字或者前後矛盾，未核清之前，卡標 `status: "hold"`，並喺 note 講原因。呢類卡唔會出。
- **數量字眼（A8）**：維持各卡原本嘅讀法。
- **煞忌（A10）**：煞同忌兩樣都要。
- **空庫露庫（A3）**：大限、流年都論。

## 五、讀者文字（claim／en）

- 繁體中文，對住「你」講。本命 `claim` 卡第一句要有「你」。大限卡用「這十年」，流年卡用「這一年」開頭。
- **唔准有術語**：十四主星、輔佐煞曜名、化祿權科忌、廟旺落陷全部唔准出現（`FORBIDDEN_TERMS`）。證據由程式由條件自動列出。
- 唔講方法（「要看」「要分清」「這一章」）；唔列條件（「如果」「若見」「見吉則」）——條件寫落 `when`。
- **唔講病、災、手術、死、官非、牢獄、僧道**；唔講事件預測（離婚、破產、遲婚）、唔講金額、唔講對方性格；唔用侮辱標籤（原文「為臣不忠」之類唔用）。原文係咁講就改寫成方向／風險，或者唔寫。
- 唔好比原文講得更強：原文「每每」「多」→ 可以講「往往」「容易」；原文明確 → 可以肯定。
- 一張卡一兩句，四十字左右，最多八十字。
- `en`：自然英文，唔逐字譯；同樣唔用星名術語。

## 六、每個星系要做到

1. 讀晒星系整節（`deep.system.NN`）同命宮章入面講呢個組合／呢粒星（喺呢兩個地支）嘅段落。單星守命章嘅段落，只有地支同組合對得上先用；「凡紫微皆…」呢類通論，每個相關星系都可以用。
2. 本質：一張核心 claim ＋ 每頭一張 caveat。
3. 原文其餘有條件嘅講法，逐條寫卡（大約 6–15 張）。原文冇講嘅話題唔使硬寫。
4. 「經行」段（行到某類運限點樣）寫成 `decade` 卡；原文講「一生命運的樞紐」寫成本命 `decades` 卡。
5. 驗證（喺 `packages/content`）：

```bash
cd packages/content && CARD_DRAFT=../../tools/cards/ming/NN.json npx vitest run test/card.test.ts
```

全部綠先算完。常見錯：sha256 抄錯（訊息會講應該係乜）、同話題兩張 claim 同時中（加 pole／none 令佢哋互斥）、卡一次都唔中（條件寫錯；真係罕見先標 `rare`）。

**唔好改** `packages/content/src` 任何檔、`tools/cards/ming/` 入面其他人嘅檔、索引。只寫你負責嘅 `NN.json`。

## 七、交回

每個星系一兩句：寫咗幾張卡（各話題幾張）、幾張 needs_atom（缺乜原子）、原文入面有冇自相矛盾或者疑字要人拍板（附段落 id）。
