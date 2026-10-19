# 抽樣覆核發現（2026-10-19，120 張）

逐張建議，修正輪照做。總結見 docs/ming-cards-2026-10-19.md。

## 錯（10）

- `taiyang-chenxu.visit-jumen`：石中隱玉要子午巨門＋祿或權＋三方無煞（p029.b001、p081.b011）。when：巨門入大限命宮＋巨門化祿或化權；none：巨門三方四正見煞，或巨門化忌。
- `lianpo.visit-zisha-wg`：要「見吉化、吉曜」（p200.b005）。when 加 `{meets:紫微, stars:[化祿,化權,化科,輔弼魁鉞昌曲]}`；none：紫微同度見羊陀火鈴。
- `pojun-ziwu.d-tanlang-lu`：「且有吉星祥曜會合」（p127.b003）。when 加 `{meets:貪狼, stars:[輔弼魁鉞昌曲]}`。
- `wuxiang.caiyin-ju`：要得祿天府＋輔佐會（p059.b003）；巨門化祿必帶文昌化忌（p059.b006）。when 加 `deLu 天府`、天相會輔佐；none：天相會化忌。或者 claim 收窄。
- `liansha-chouwei.xiaokang`：條件係見輔佐吉曜、無四煞刑忌空劫（p348.b006）。when：廉貞 at 丑＋會輔佐；none：會煞、化忌、天刑。唔要求昌曲同祿。
- `tongju-chouwei.minglang`：「情緒來得快也去得快」原文冇；白手興家只限巨門吉化（p056.b010）。claim 改「你偏明朗：心裡的陰影較少，外來的壓力也較頂得住。」白手興家另開一張卡，when 巨門祿權科。
- `lianxiang.zi`：子宮少是非屬佳格句（p108.b009），條件要廉貞化祿、見昌曲、無火鈴；用 at 子。
- `jumen-chenxu.d-jiyin-zu`：要見煞忌；陰謀陷害要兩曜同化忌，多見於流年（p137.b011）。分開做兩張：大限卡同流年卡。
- `liansha-chouwei.zitan-tired`：疲累跟化忌（p145.b009）。when 加貪狼化忌，最少要 none 紫微或貪狼化權。
- `wutan-chouwei.zs-yx`：只喺權星過重先不利（p208.b005）；「切勿弄權」屬 b007 煞忌刑湊。when 加化權會大限命宮；advice 另開一張卡。

## 小問題（40，節錄類型）

- **加料或講強咗**：
  - 有原文冇嘅講法：`tongyin-ziwu.core`、`zisha.duty`、`zisha.quanwei`、`tanlang-yinshen.social`、`tianliang-ziwu.core`、`jiju-maoyou.core`、`jumen-ziwu.yinglian`、`taiyin-chenxu.geju-good`、`taiyin-chenxu.chen-dim`、`lianfu-chenxu.lizhi`（出處唔夠）；
  - 原文「尚可」寫成「適合」：`yangju-yinshen.koucai`。
- **未用新原子**：
  - 未用 at：`tanlang-ziwu.zi-fu`；
  - 未計天刑：`qisha-chenxu.baiguan-clean`、`tianji-chouwei.d-tanlang-bad`；
  - 未用 decadeOrder：`zifu-yinshen.pivot`；
  - 未計流煞：`zipo.visit-sha-anding`（另外「把醞釀已久的改變推出去」係加料）。
- **範圍或門檻唔啱**：
  - `zipo.huoling`：應該睇三方四正，唔係只睇同度；
  - `zipo.changqu-sha`：n 應該係 1；
  - `liantan-sihai.geju-fuzuo`：n 應該係 2，另外要排除見煞忌；
  - `lianpo.visit-jiliang-bad-wj`：應該睇同度，計埋忌刑；
  - `tianfu-sihai.wt-bad-xh`：門檻 3 粒煞太高；
  - `pojun-ziwu.d-taiyin-good`：只限魁鉞輔弼；
  - `tianxiang-chouwei.visit-taiyin-bright-suisu`：只留吉曜；
  - `zifu-yinshen.visit-jumen-good`：應該係任何祿權科會大限命宮。
- **漏咗前提或例外**：
  - `jumen-chenxu.core`：要排除奇格；
  - `tanlang-yinshen.huotan-po`：羊陀加輔佐另作論；
  - `wutan-chouwei.huotan-ji`：漏咗「作見煞論」；
  - `wusha-maoyou.annual-tianji-ji-duanlv`：要計天同、太陰化忌；
  - `riyue.visit-tianliang-ke`：本命化科都算；
  - `yangju-yinshen.wt-dz`：早年武貪火鈴用 decadeAge 排除；
  - `tong-maoyou.xiang-bad-kong`：要加天刑同大限忌；
  - `tianxiang-maoyou.jl-bad-qm`：要用刑忌，同排除吉化；
  - `taiyin-sihai.lian-buxi`：漏咗孤立紫微見煞忌破軍，另一個 none 分支冇出處。
- **條件多咗**：
  - `qisha-ziwu.xiongsu`：多咗「最多一粒煞忌」嘅上限；
  - `tianfu-chouwei.yang-b`：none 太陽化忌冇出處。
- **語氣**：
  - `pojun-yinshen.gj-gui`：要寫成結果（名位高過財富），唔係價值取向；
  - `yang-sihai.xiang-bad`：隨遇而安只限消極者。
- **rare 標錯**：`taiyin-maoyou.yangtuo`、`liansha-chouwei.jiyin-ji`、`qisha-ziwu.pojun-lu`、`taiyin-maoyou.visit-jumen-strong-good`。
- **原文內部張力**：`tongju-chouwei.lu`（p346.b002，見待決 B16）。

（id 前面省略 `card.ming.`）
