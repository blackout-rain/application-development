/* ---------- 機能の段階解放 ---------- */
// 一度に機能が増えて混乱しないよう、レベル・ランク・新しい海域・主の討伐に応じて少しずつ解放する
const nBoss=()=>Object.keys(G.bossGot).length;
const FEATS=[
  {k:'missions',n:T("デイリーミッション（街タブ）"),h:T("レベル4"),ok:()=>G.level>=4},
  {k:'report',n:T("経営レポート（市場タブ）"),h:T("レベル3"),ok:()=>G.level>=3},
  {k:'orders',n:T("注文と評判（市場タブ）"),h:T("レベル5"),ok:()=>G.level>=5},
  {k:'ach',n:T("実績（図鑑タブ）"),h:T("レベル5"),ok:()=>G.level>=5},
  {k:'bank',n:T("銀行と船の保険（街タブ）"),h:T("船を買って、沖合に出られるようになる"),ok:()=>G.boat>=1},
  {k:'season',n:T("季節と天気"),h:T("レベル8"),ok:()=>G.level>=8},
  {k:'tour',n:T("釣り大会とライバル漁師（街タブ）"),h:T("レベル10"),ok:()=>G.level>=10},
  {k:'roles',n:T("従業員の役割（営業）"),h:T("レベル10"),ok:()=>G.level>=10},
  {k:'branch',n:T("支店（街タブ）"),h:T("主を1体釣る"),ok:()=>nBoss()>=1},
  {k:'plant',n:T("加工場（自宅・設備タブ）"),h:T("深海に出られるようになる"),ok:()=>G.boat>=2},
  {k:'treasure',n:T("漂流物・宝箱"),h:T("レベル7"),ok:()=>G.level>=7},
  {k:'bait',n:T("釣具店（エサ・ルアー）"),h:T("レベル12"),ok:()=>G.level>=12},
  {k:'tide',n:T("潮（満潮）"),h:T("レベル12"),ok:()=>G.level>=12},
  {k:'farm',n:T("養殖いかだ（自宅・設備タブ）"),h:T("主を2体釣る"),ok:()=>nBoss()>=2},
  {k:'hireX',n:T("経験者の雇用（自宅・設備タブ）"),h:T("レベル15"),ok:()=>G.level>=15},
  {k:'deco',n:T("自宅の模様替え"),h:T("レベル18"),ok:()=>G.level>=18},
  {k:'pet',n:T("相棒（ペット）（街タブ）"),h:T("レベル20"),ok:()=>G.level>=20},
  {k:'tech',n:T("研究所（街タブ）"),h:T("サンゴ礁の島に出られるようになる"),ok:()=>G.boat>=3},
  {k:'noren',n:T("のれん分けと伝説の主（街タブ）"),h:T("ランク「漁業王」"),ok:()=>rankIdx()>=10||(G.nr&&G.nr.n>0)},
  {k:'events',n:T("毎朝のできごと"),h:T("ランク「船長」"),ok:()=>rankIdx()>=6}];
const feat=k=>!!(G.fu&&G.fu[k]);
function checkFeat(){
  const first=!G.fuInit;G.fuInit=1;
  const nw=FEATS.filter(f=>!feat(f.k)&&f.ok());
  if(!nw.length){if(first)save();return}
  nw.forEach(f=>{G.fu[f.k]=1});
  if(!first){banner(T("新しい機能が解放！"),nw.map(f=>f.n).join('・'),'#6cc4ff');toast(T("新機能：{1}",[nw.map(f=>f.n).join('、')]));sfx(3)}
  save();
}
function lockedHtml(){
  const l=FEATS.filter(f=>!feat(f.k));if(!l.length)return '';
  return T("<h2>これから解放される機能</h2><div class=\"card\" style=\"font-size:.82rem\">{1}{2}<div style=\"color:var(--sub);font-size:.76rem;margin-top:6px\">レベルを上げたり、新しい海域に出たり、主を釣ると、新しい機能が使えるようになります。</div></div>",[l.slice(0,6).map(f=>`<div class="ln"><span>🔒 ${f.n}</span><span style="color:var(--sub);font-size:.76rem;text-align:right">${f.h}</span></div>`).join(''),l.length>6?T("<div style=\"color:var(--sub);font-size:.76rem;margin-top:4px\">ほか{1}件</div>",[l.length-6]):'']);
}
