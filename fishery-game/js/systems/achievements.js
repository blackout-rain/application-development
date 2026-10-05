/* ---------- 実績 ---------- */
const dexN=()=>NORM.filter(s=>G.dex[s.n]).length;
const ACH=[
  {id:'c1',n:T("はじめの一匹"),d:T("魚を1匹釣る"),ok:()=>G.catches>=1,r:{bp:1}},
  {id:'c100',n:T("釣り人"),d:T("魚を100匹釣る"),ok:()=>G.catches>=100,r:{bp:2}},
  {id:'c1000',n:T("釣りの達人"),d:T("魚を1000匹釣る"),ok:()=>G.catches>=1000,r:{bp:4,auto:3}},
  {id:'d10',n:T("図鑑ハンター"),d:T("10種類の魚を図鑑に登録"),ok:()=>dexN()>=10,r:{bp:2}},
  {id:'d30',n:T("魚博士"),d:T("30種類の魚を図鑑に登録"),ok:()=>dexN()>=30,r:{bp:3,meal:2}},
  {id:'dall',n:T("図鑑コンプリート"),d:T("主以外のすべての魚を登録"),ok:()=>dexN()>=NORM.length,r:{bp:8,auto:5}},
  {id:'big',n:T("大物ハンター"),d:T("★5サイズの魚を釣る"),ok:()=>Object.entries(G.dex).some(([n,x])=>{const sp=SPM.get(n);return sp&&!sp.boss&&x.best>=sp.min+.8*(sp.max-sp.min)}),r:{bp:2}},
  {id:'b1',n:T("主を討伐"),d:T("初めて主を釣り上げる"),ok:()=>Object.keys(G.bossGot).length>=1,r:{bp:3,meal:2}},
  {id:'b6',n:T("海の覇者"),d:T("すべての海域の主を討伐"),ok:()=>Object.keys(G.bossGot).length>=AREAS.length,r:{bp:10,auto:5,meal:3}},
  {id:'cp1',n:T("海域コンプ"),d:T("いずれかの海域の魚をコンプ"),ok:()=>Object.keys(G.comp).length>=1,r:{bp:2}},
  {id:'cp6',n:T("全海域コンプ"),d:T("すべての海域の魚をコンプ"),ok:()=>Object.keys(G.comp).length>=AREAS.length,r:{bp:8}},
  {id:'e10k',n:T("商売はじめ"),d:T("累計の売上が1万円"),ok:()=>G.earned>=1e4,r:{bp:1}},
  {id:'e100k',n:T("小さな商店"),d:T("累計の売上が10万円"),ok:()=>G.earned>=1e5,r:{bp:2}},
  {id:'e1m',n:T("百万長者"),d:T("累計の売上が100万円"),ok:()=>G.earned>=1e6,r:{bp:3,auto:2}},
  {id:'e10m',n:T("海の大商人"),d:T("累計の売上が1000万円"),ok:()=>G.earned>=1e7,r:{bp:5,meal:3}},
  {id:'e100m',n:T("海運王"),d:T("累計の売上が1億円"),ok:()=>G.earned>=1e8,r:{bp:8,auto:5}},
  {id:'m1m',n:T("ミリオネア"),d:T("所持金が100万円"),ok:()=>G.money>=1e6,r:{bp:3}},
  {id:'pf',n:T("大黒字"),d:T("1日の営業利益が10万円以上"),ok:()=>G.hist.some(h=>recOf(h).pf>=1e5),r:{bp:3}},
  {id:'cr5',n:T("小さな船団"),d:T("従業員が5人"),ok:()=>G.crew>=5,r:{bp:2}},
  {id:'cr10',n:T("大所帯"),d:T("従業員が10人"),ok:()=>G.crew>=10,r:{bp:4}},
  {id:'crL5',n:T("ベテラン揃い"),d:T("Lv5の従業員が3人"),ok:()=>G.cr.filter(m=>clv(m)>=5).length>=3,r:{bp:4,meal:2}},
  {id:'o10',n:T("常連さん"),d:T("注文を10件納品"),ok:()=>G.orderDone>=10,r:{bp:2,auto:2}},
  {id:'o50',n:T("信頼の漁師"),d:T("注文を50件納品"),ok:()=>G.orderDone>=50,r:{bp:4,meal:3}},
  {id:'loan',n:T("借金完済"),d:T("お金を借りて、全額返す"),ok:()=>G.borrowed&&G.debt<=0,r:{bp:2}},
  {id:'lv10',n:T("一人前"),d:T("レベル10に到達"),ok:()=>G.level>=10,r:{auto:2}},
  {id:'lv30',n:T("ベテラン"),d:T("レベル30に到達"),ok:()=>G.level>=30,r:{bp:3,meal:2}},
  {id:'lv50',n:T("伝説の釣り人"),d:T("レベル50に到達"),ok:()=>G.level>=50,r:{bp:5,auto:3}},
  {id:'rk10',n:T("漁業王"),d:T("ランク「漁業王」に到達"),ok:()=>rankIdx()>=10,r:{bp:10,auto:5,meal:3}},
  {id:'nr1',n:T("のれん分け"),d:T("はじめてのれん分けをする"),ok:()=>lapOf()>=1,r:{bp:5,auto:3}},
  {id:'nr3',n:T("老舗の主人"),d:T("3回のれん分けをする（4周目）"),ok:()=>lapOf()>=3,r:{bp:8,auto:4,meal:3}},
  {id:'lg1',n:T("伝説に挑む者"),d:T("伝説の主を1体釣り上げる"),ok:()=>Object.keys(G.leg).length>=1,r:{bp:5,meal:3}},
  {id:'lgall',n:T("伝説の覇者"),d:T("すべての海域の伝説の主を討伐"),ok:()=>Object.keys(G.leg).length>=AREAS.length,r:{bp:15,auto:6,meal:4}},
  {id:'t1',n:T("大会デビュー"),d:T("釣り大会に初出場"),ok:()=>G.tourN>=1,r:{bp:1}},
  {id:'tw1',n:T("大会優勝"),d:T("釣り大会で優勝"),ok:()=>G.tourWin>=1,r:{bp:3,auto:2}},
  {id:'tw5',n:T("大会の常連王者"),d:T("釣り大会で5回優勝"),ok:()=>G.tourWin>=5,r:{bp:6,meal:3}},
  {id:'rep3',n:T("町の評判者"),d:T("評判がLv3に到達"),ok:()=>repLv()>=3,r:{bp:3,meal:2}},
  {id:'rep5',n:T("海の名士の誉れ"),d:T("評判がLv5に到達"),ok:()=>repLv()>=5,r:{bp:6,auto:3}},
  {id:'tech1',n:T("研究者"),d:T("研究所で初めて研究する"),ok:()=>Object.keys(G.tech).length>=1,r:{bp:2}},
  {id:'tech18',n:T("技術立国"),d:T("すべての研究を最大まで"),ok:()=>TECH.every(t=>techLv(t.k)>=t.c.length),r:{bp:8,auto:5,meal:3}},
  {id:'br3',n:T("多角経営"),d:T("3つの海域に支店を出す"),ok:()=>AREAS.filter((_,a)=>brLv(a)>0).length>=3,r:{bp:3,auto:2}},
  {id:'brall',n:T("海の商社"),d:T("すべての支店を最大まで"),ok:()=>AREAS.every((_,a)=>brLv(a)>=BR_MAX),r:{bp:8,auto:5,meal:3}},
  {id:'rv1',n:T("週間チャンピオン"),d:T("週間売上ランキングで1位"),ok:()=>G.rv.wins>=1,r:{bp:3,auto:2}},
  {id:'tr5',n:T("宝探し"),d:T("漂流物を5回見つける"),ok:()=>G.treasure>=5,r:{bp:2,auto:1}},
  {id:'tr20',n:T("海のトレジャーハンター"),d:T("漂流物を20回見つける"),ok:()=>G.treasure>=20,r:{bp:5,meal:3}},
  {id:'pet1',n:T("相棒ができた"),d:T("ペットを仲間にする"),ok:()=>Object.keys(G.pets).length>=1,r:{bp:2}},
  {id:'deco6',n:T("おしゃれな我が家"),d:T("飾りを6個ぜんぶ飾る"),ok:()=>DECOS.every(d=>G.deco[d.k]),r:{bp:4,meal:2}},
  {id:'msn10',n:T("ミッションこなし"),d:T("ミッションを10個達成"),ok:()=>G.msnDone>=10,r:{bp:2,auto:2}},
  {id:'msn50',n:T("毎日の習慣"),d:T("ミッションを50個達成"),ok:()=>G.msnDone>=50,r:{bp:5,meal:3}},
  {id:'v1',n:T("色違いを発見"),d:T("色違いの魚を釣る"),ok:()=>Object.values(G.dex).some(d=>d.vc>0),r:{bp:2,auto:1}},
  {id:'v10',n:T("色違いコレクター"),d:T("10種類の色違いを集める"),ok:()=>Object.values(G.dex).filter(d=>d.vc>0).length>=10,r:{bp:4,meal:2}},
  {id:'v30',n:T("虹色の網"),d:T("30種類の色違いを集める"),ok:()=>Object.values(G.dex).filter(d=>d.vc>0).length>=30,r:{bp:6,auto:3,meal:2}},
  {id:'pair1',n:T("つがい"),d:T("1種類で、オスとメスの両方を釣る"),ok:()=>Object.values(G.dex).some(d=>d.pair),r:{bp:1,auto:1}},
  {id:'pair20',n:T("ペア・コレクター"),d:T("20種類で、オスとメスの両方を釣る"),ok:()=>Object.values(G.dex).filter(d=>d.pair).length>=20,r:{bp:4,meal:2}},
  {id:'pair60',n:T("命をつなぐ"),d:T("60種類で、オスとメスの両方を釣る"),ok:()=>Object.values(G.dex).filter(d=>d.pair).length>=60,r:{bp:6,auto:3,meal:2}},
  {id:'born1',n:T("稚魚が生まれた"),d:T("養殖で、稚魚を誕生させる"),f:'farm',ok:()=>(G.born||0)>=1,r:{bp:2,auto:1}},
  {id:'born20',n:T("ブリーダー"),d:T("養殖で、稚魚を20匹誕生させる"),f:'farm',ok:()=>(G.born||0)>=20,r:{bp:5,meal:3}},
  {id:'day30',n:T("一か月"),d:T("30日目を迎える"),ok:()=>G.day>=30,r:{auto:2}},
  {id:'day100',n:T("百日の航海"),d:T("100日目を迎える"),ok:()=>G.day>=100,r:{auto:5,meal:3}}];
const ACH_F={t1:'tour',tw1:'tour',tw5:'tour',rv1:'tour',br3:'branch',brall:'branch',tech1:'tech',tech18:'tech',pet1:'pet',deco6:'deco',tr5:'treasure',tr20:'treasure',o10:'orders',o50:'orders',rep3:'orders',rep5:'orders',msn10:'missions',msn50:'missions',loan:'bank',nr1:'noren',nr3:'noren',lg1:'noren',lgall:'noren'};
ACH.forEach(a=>{if(ACH_F[a.id])a.f=ACH_F[a.id]});
const achVis=()=>ACH.filter(a=>!a.f||feat(a.f));   // 未解放の機能の実績は、まだ見せない
const achRw=r=>[r.bp&&`BP+${r.bp}`,r.auto&&T("おまかせ釣り券×{1}",[r.auto]),r.meal&&T("食事券×{1}",[r.meal])].filter(Boolean).join('・');
function checkAch(){
  if(!feat('ach'))return;
  const got=[];
  achVis().forEach(a=>{if(!G.ach[a.id]&&a.ok()){G.ach[a.id]=G.day;const r=a.r;G.bp+=r.bp||0;G.tk.auto+=r.auto||0;G.tk.meal+=r.meal||0;got.push(a)}});
  if(!got.length)return;
  const tot={bp:0,auto:0,meal:0};got.forEach(a=>{for(const k in tot)tot[k]+=a.r[k]||0});
  const names=got.length<=2?got.map(a=>a.n).join('・'):T("{1}個",[got.length]);
  banner(T("実績解除！"),`${names}　${achRw(tot)}`,'#c08cff');
  toast(T("実績解除：{1}（{2}）",[got.map(a=>a.n).join('、'),achRw(tot)]));sfx(2);save();
}
function rollEvent(){G.fix=0;if(feat('bank')&&G.boat>=1&&Math.random()<.05){G.fix=repairCost();G.fixIns=G.ins;setTimeout(()=>toast(T("🔧 船が故障！ {1}",[G.ins?T("保険に入っているので修理費は無料です"):T("修理費{1}（夜に支払います）",[yen(G.fix)])])),2600)}const wr=Math.random();G.wx=feat('season')?(wr<.5?0:wr<.8?1:2):0;G.ev=null;if(feat('events')&&G.day>=3&&Math.random()<.3){G.ev=EVK[Math.floor(Math.random()*EVK.length)];const e=EVS[G.ev];banner(T("今日のできごと：{1}",[e.n]),e.d,'#6cc4ff')}}

