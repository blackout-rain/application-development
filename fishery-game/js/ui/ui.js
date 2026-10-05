/* ---------- ui ---------- */
const setHtml=(el,h)=>{if(el._h!==h){el.innerHTML=h;el._h=h}};
function hud(){
  tutRender();
  $('#day').textContent=G.day;
  $('#clock').textContent=G.home?T("夜"):`${Math.floor(G.min/60)}:${String(G.min%60).padStart(2,'0')}`;
  $('#money').textContent=yen(G.money);
  const ri=rankIdx(),nx=RANKS[ri+1];
  $('#rank').textContent=RANKS[ri][1]+(lapOf()?T("・{1}周目",[lapOf()+1]):'');
  $('#goal').style.width=(nx?(G.earned-RANKS[ri][0])/(nx[0]-RANKS[ri][0])*100:100)+'%';
  $('#goalv').textContent=nx?T("次は「{1}」あと{2}",[nx[1],yen(nx[0]-G.earned)]):T("最高ランク！");
  $('#perk').textContent=nx?T("次の特典：{1}（タップで一覧）",[nx[3]]):T("すべての特典を獲得！");
  setHtml(document.querySelector('[data-tab=sell]'),G.fish.length?T("市場({1})",[G.fish.length]):T("市場"));
  hint();
  $('#cap').textContent=`${G.fish.length}/${cap()}`;
  $('#lv').textContent=G.level;$('#xp').style.width=Math.min(100,G.exp/expNeed(G.level)*100)+'%';
  $('#xpv').textContent=`${G.level>=99?T("最大レベル"):T("次のLvまで{1}EXP",[expNeed(G.level)-G.exp])}${G.bp?`・BP ${G.bp}`:''}`;
  setHtml(document.querySelector('[data-tab=stat]'),T("ステータス{1}",[G.bp?`<i class="dot">${G.bp}</i>`:'']));
  setHtml(document.querySelector('[data-tab=town]'),T("街{1}",[dailyReady()?'<i class="dot">!</i>':'']));
  setHtml(document.querySelector('[data-tab=set]'),T("設定{1}",[Cloud.kind==='app'&&Cloud.status==='signedout'&&hasProgress()?'<i class="dot">!</i>':'']));
  $('#tkn').textContent=G.tk.auto;
  $('#evline').textContent=[G.baitSel&&T("🪱 {1}（残り{2}）",[BAITS.find(b=>b.k===G.baitSel).n,G.bt[G.baitSel]]),G.fix>0&&T("🔧 船が故障中（{1}）",[G.ins?T("保険で無料"):T("修理費{1}・夜に支払い",[yen(G.fix)])]),isTourDay()&&!G.home&&(tourIn()?T("🏆 大会参加中：ベスト {1}",[yen(G.tour.best)]):T("🏆 今日は釣り大会！（街タブから参加）")),(feat('tide')&&!G.home&&`🌊 ${tideNow()?T("満潮中！（アタリが早く、珍しい魚が寄る）"):T("満潮 {1}:00〜{2}:00",[tideStartH(),tideStartH()+2])}`),feat('season')&&T("{1}{2}（{3}/{4}日目）・{5}{6}{7}",[SEASONS[seasonOf()].e,SEASONS[seasonOf()].n,(G.day-1)%SEASON_LEN+1,SEASON_LEN,WX[G.wx||0].e,WX[G.wx||0].n,WX[G.wx||0].d?'：'+WX[G.wx||0].d:'']),ev()&&T("{1} 今日のできごと：{2}（{3}）",[ev().e,ev().n,ev().d]),G.debt>0&&T("💳 借入 {1}",[yen(G.debt)])].filter(Boolean).join('　');
  checkFeat();checkAch();checkMsn();
  if(typeof curTab!=='undefined'&&curTab==='fish')renderGoals();
  $('#mealline').textContent=G.meal?T("食事効果：{1}（{2}）あと{3}回",[G.meal.n,fxText(G.meal.fx),G.meal.left]):'';
}
function renderAreas(){
  $('#areas').innerHTML=AREAS.map((a,i)=>{const l=areaSp(i),f=l.filter(s=>G.dex[s.n]).length;
    return `<button class="chip" data-area="${i}" aria-pressed="${G.area===i}">${i>G.boat?'🔒 ':''}${a.name} <span class="num">${f}/${l.length}</span>${G.comp[i]?' <span style="color:var(--good)">✓</span>':''}${G.comp[i]&&!G.bossGot[i]?T(" <span style=\"color:var(--bad)\">主</span>"):''}${G.bossGot[i]?T(" <span style=\"color:var(--accent)\">主✓</span>"):''}</button>`}).join('');
  $('#areas').querySelectorAll('button').forEach(b=>b.onclick=()=>{const i=+b.dataset.area;if(i>G.boat){openTab('home');toast(T("「船」を買うと出られます"));return}if(S.st!=='idle'){toast(T("釣りの合間に切り替えてね"));return}G.area=i;save();renderAreas()});
}
function renderSell(){
  const sorted=G.fish.map((f,i)=>({f,i,p:price(f)})).sort((a,b)=>b.p-a.p);
  const total=sorted.reduce((a,x)=>a+x.p,0);
  const items=sorted.map(({f,i,p})=>{
    const sp=SP.find(s=>s.n===f.n);
    return T("<div class=\"item\"><div class=\"t\">{1}{2}{3}{4} <span class=\"num\">{5}cm</span> <span class=\"stars\">{6}</span></div>\n      <button class=\"buy\" data-i=\"{7}\">{8}</button><div class=\"s\">鮮度 <span class=\"num\">{9}%</span>　サイズ補正 <span class=\"num\">×{10}</span></div>{11}{12}</div>",[ico(f.v?vSp(sp):sp),fname(f),gmark(f),tag(sp),f.size,stars(sp,f.size),i,yen(quote([i]).sum),f.fresh,sizeMul(sp,f.size).toFixed(2),(G.fac.farm||0)>0&&farmFree()>0&&!sp.boss?T("<div class=\"row\" style=\"grid-column:1/-1;gap:6px;margin-top:4px\"><button class=\"chip\" data-farm=\"{1}\" style=\"font-size:.78rem;padding:7px 12px;min-height:38px\">養殖いかだで育てる（毎日ぐんぐん大きくなる）</button></div>",[i]):'',(G.fac.plant||0)>0&&procFree()>0?`<div class="row" style="grid-column:1/-1;gap:6px;margin-top:4px">${PROC.filter(pr=>G.fac.plant>=pr.lv).map((pr,k)=>T("<button class=\"chip\" data-proc=\"{1}:{2}\" style=\"font-size:.78rem;padding:7px 12px;min-height:38px\">{3}にする（売値×{4}・{5}晩・加工賃{6}）</button>",[i,k,pr.n,pr.mul,pr.nights,yen(procFee(f))])).join('')}</div>`:''])}).join('');
  const market=NORM.filter(s=>s.a<=G.boat).map(s=>{
    const m=G.mult[s.n],d=m-G.prev[s.n],sv=G.sat[s.n]||0;
    return `<div class="ln"><span>${ico(s)}${s.n}${inSeason(s)?T(" <span class=\"tag\" style=\"background:var(--good)\">旬</span>"):''}</span><span class="num">${sv?T("<span class=\"down\" style=\"font-size:.78rem\">需給−{1}%</span> ",[Math.round(sv*100)]):''}×${m.toFixed(2)} <span class="${d>=0?'up':'down'}">${d>=0?'▲':'▼'}</span></span></div>`}).join('');
  if(feat('orders')&&!G.ordSeq)refreshOrders();   // 初回だけ。あとは毎朝
  const rsv=reservedIdx(),all=G.fish.map((_,i)=>i).filter(i=>!rsv.has(i)),qa=quote(all),sc=stallCap();
  const plantSec=(G.fac.plant||0)>0||G.prod.length?T("<h2>加工場{1}</h2><div class=\"card\" style=\"margin:0;font-size:.82rem\">{2}\n    <div class=\"kv\" style=\"margin-top:6px\"><span>加工品の在庫</span><b class=\"num\">{3}個（{4}）</b></div>\n    <button class=\"big\" id=\"sellprod\" style=\"margin-top:6px\" {5}>加工品をすべて売る</button></div>",[(G.fac.plant||0)>0?` <span class="num">${G.proc.length}/${plantCap(G.fac.plant)}</span>`:'',G.proc.length?`<div class="kv">${G.proc.map(x=>`<span>${x.kind}：${x.n}</span><b class="num">${x.until<=G.day?T("まもなく"):T("{1}晩あと",[x.until-G.day])}</b>`).join('')}</div>`:T("<div style=\"color:var(--sub)\">加工中の魚はありません。下の魚箱の「干物にする」などで加工できます。</div>"),G.prod.length,yen(G.prod.reduce((a,x)=>a+x.v,0)),G.prod.length?'':'disabled']):'';
  const farmSec=(G.fac.farm||0)>0||G.farm.length?T("<h2>養殖いかだ <span class=\"num\">{1}/{2}</span></h2><div class=\"list\">{3}</div>",[G.farm.length,farmCap(G.fac.farm),G.farm.map((x,i)=>{const sp=SPM.get(x.n),nx=Math.min(sp.max,x.sz+Math.max(.2,(sp.max-x.sz)*.12));return T("<div class=\"item\"><div class=\"t\">{1}{2}{3} <span class=\"num\">{4}cm</span> <span class=\"stars\">{5}</span></div><button class=\"buy\" data-harvest=\"{6}\">引き上げる<br><span class=\"num\" style=\"font-size:.74rem\">{7}</span></button><div class=\"s\">あしたは {8}cm（最大 {9}cm）・飼料代 毎晩{10}</div></div>",[ico(x.v?vSp(sp):sp),fname(x),gmark(x),Math.round(x.sz),stars(sp,Math.round(x.sz)),i,yen(farmVal(x)),Math.round(nx),sp.max,yen(Math.round(farmVal(x)*.03))])}).join('')||T("<p style=\"color:var(--sub);font-size:.82rem;margin:0\">いかだは空です。魚箱の魚の「養殖いかだで育てる」から入れよう。</p>")]):'';
  const rx=REPX[repLv()+1],ordSec=!feat('orders')?'':T("<h2>注文（常連さんから）</h2><div style=\"color:var(--sub);font-size:.78rem;margin:-2px 0 6px\">評判 Lv{1}（{2}pt{3}）：報酬×{4}・注文{5}件・融資の上限+{6}%</div><div class=\"list\">{7}</div>",[repLv(),G.rep,rx?T("・次のLvまで{1}",[rx-G.rep]):T("・最高"),ordMul().toFixed(2),ordMax(),Math.round(15*repLv()),G.ord.map(o=>{const sp=SP.find(s=>s.n===o.n),have=G.fish.filter(f=>ordMatch(o,f)).length,ok=have>=o.q;
    return T("<div class=\"item\"><div class=\"t\">{1}{2}{3} ×{4}匹</div><button class=\"buy\" data-deliver=\"{5}\" {6}>納品</button><div class=\"s\">{7}cm以上・鮮度{8}%以上・売値の{9}倍{10}<br>魚箱に条件に合う魚 <span class=\"num {11}\">{12}/{13}</span>　期限 {14}日目まで</div></div>",[ico(sp),o.n,o.g!==undefined?` <span style="color:${GCOL[o.g]};font-weight:900">${GMARK[o.g]}</span>`:'',o.q,o.id,ok?'':'disabled',o.sz,o.fr,ordMul().toFixed(2),feat('bait')?T("・好物 {1}",[baitOf(sp).n]):'',ok?'up':'',Math.min(have,o.q),o.q,o.until])}).join('')]);
  const ship=T("<div class=\"card\" style=\"margin:10px 0 0;font-size:.82rem\"><b>出荷先（高い魚から、直売所の枠→卸売市場の順に自動で回します）</b>\n      <div class=\"kv\" style=\"margin-top:6px\"><span>卸売市場</span><b>いつでも売れる</b><span style=\"grid-column:1/-1;color:var(--sub);font-size:.76rem\">同じ魚を続けて売ると、1匹ごとに値崩れ（−{1}%・最大−{2}%）。翌朝には半分もどります。</span>\n      <span>直売所</span><b class=\"num\">{3}</b><span style=\"grid-column:1/-1;color:var(--sub);font-size:.76rem\">{4}</span></div></div>",[Math.round(SAT_STEP*100),Math.round(SAT_MAX*100),sc?T("今日あと {1}/{2}匹",[stallLeft(),sc]):T("未開設"),sc?T("売値×{1}・値崩れしにくい（半分）。枠は直売所のレベルで増えます（1日 3＋2×Lv匹）。",[STALL_MUL]):T("「自宅・設備」タブで直売所を強化すると使えます。")]);
  $('#p-sell').innerHTML=T("<h2>魚箱（{1}/{2}）</h2><p style=\"color:var(--sub);font-size:.8rem;margin:0 0 8px\">大きい魚（★が多い魚）ほど高く売れます。</p>\n    <button class=\"big\" id=\"sellall\" {3}>すべて売る {4}</button>{5}{6}{7}{8}{9}\n    <div class=\"card\" style=\"margin:10px 0 0;font-size:.82rem\"><b>売値ボーナス</b>\n      <div class=\"kv\" style=\"margin-top:6px\"><span>直売所 Lv{10}（自宅・設備タブで強化）</span><b class=\"num\">+{11}%</b><span>ランク特典</span><b class=\"num\">+{12}%</b>{13}<span>エリアコンプ（そのエリアの魚のみ）</span><b class=\"num\">+5%／エリア</b></div>\n      <div style=\"color:var(--sub);margin-top:6px\">このほか、魚の大きさ・鮮度・今日の相場でも値段が変わります。</div></div>\n    <div class=\"list\" style=\"margin-top:10px\">{14}</div>\n    {15}\n    <h2>今日の相場</h2><p style=\"color:var(--sub);font-size:.78rem;margin:0 0 6px;{16}\">{17}の旬の魚（<span class=\"tag\" style=\"background:var(--good)\">旬</span>）は、よく釣れて売値も+{18}%です。</p><div>{19}</div>",[G.fish.length,cap(),all.length?'':'disabled',yen(qa.sum),rsv.size?T("<div style=\"color:var(--sub);font-size:.76rem;margin-top:4px\">注文に使える魚{1}匹は残します（1匹ずつなら売れます）</div>",[rsv.size]):'',ordSec,plantSec,farmSec,ship,G.lv.mkt,mktBonus(G.lv.mkt),perks().sell,feat('roles')?T("<span>営業の従業員（育てるほど増える）</span><b class=\"num\">+{1}%</b>",[Math.round(salesBonus()*100)]):'',items||T("<p style=\"color:var(--sub)\">魚箱は空です。釣りに出よう。</p>"),feat('report')?T("<h2>経営</h2>{1}{2}",[pnlHtml(G.led),reportHtml().replace(/^<h2>.*?<\/h2>/,"")]):'',feat('season')?'':'display:none',SEASONS[seasonOf()].n,Math.round((SEA_PRICE-1)*100),market]);
  $('#p-sell').querySelectorAll('.buy').forEach(b=>b.onclick=()=>sell([+b.dataset.i]));
  const sa=$('#sellall');if(sa)sa.onclick=()=>sell(all);
  $('#p-sell').querySelectorAll('[data-farm]').forEach(b=>b.onclick=()=>startFarm(+b.dataset.farm));
  $('#p-sell').querySelectorAll('[data-harvest]').forEach(b=>b.onclick=()=>harvestFarm(+b.dataset.harvest));
  $('#p-sell').querySelectorAll('[data-proc]').forEach(b=>b.onclick=()=>{const [i,k]=b.dataset.proc.split(':');startProc(+i,+k)});
  const sp2=$('#sellprod');if(sp2)sp2.onclick=sellProd;
  $('#p-sell').querySelectorAll('[data-deliver]').forEach(b=>b.onclick=()=>deliver(+b.dataset.deliver));
}
function sellCore(idx){
  const q=quote(idx);
  q.rows.forEach(r=>{G.rev[r.n]=(G.rev[r.n]||0)+r.p});
  G.sat=q.sat;G.stall+=q.stall;G.fish=G.fish.filter((_,i)=>!idx.includes(i));
  G.money+=q.sum;led('sell',q.sum);dcAdd('sold',q.sum);earn(q.sum);return q.sum;
}
function sell(idx){const n=sellCore(idx);save();hud();renderAll();return n}
function renderShop(){
  const ups=UP.map(u=>{
    const lv=G.lv[u.k],max=lv>=u.c.length,c=u.c[lv];
    return T("<div class=\"item\"><div class=\"t\">{1} <span class=\"num\">Lv{2}{3}</span></div>\n      <button class=\"buy\" data-up=\"{4}\" {5}>{6}</button><div class=\"s\">{7}<br><span style=\"opacity:.8\">自宅での見え方：{8}</span></div></div>",[u.n,lv,max?' MAX':'',u.k,max||G.money<c?'disabled':'',max?'—':yen(c),u.d,u.at])}).join('');
  const b=BOATS[G.boat];
  const boat=b?`<div class="item"><div class="t">${b.n}</div><button class="buy" data-boat="1" ${G.money<b.c?'disabled':''}>${yen(b.c)}</button><div class="s">${b.d}</div></div>`
    :T("<div class=\"item\"><div class=\"t\">{1} 保有中</div><div class=\"s\">すべての海域に出られる</div></div>",[BOATS[BOATS.length-1].n]);
  const cc=Math.round(1500*Math.pow(1.6,G.crew)/100)*100,w=AREAS[G.boat].wage,h=AREAS[G.boat].base;
  const cs=CR(),nF=cs.filter(m=>m.r===0).length,nS=cs.length-nF,wsum=cs.reduce((a,m)=>a+wageOf(m),0);
  const crew=T("<div class=\"item\"><div class=\"t\">従業員を雇う <span class=\"num\">{1}/{2}人</span></div>\n    <button class=\"buy\" data-crew=\"1\" {3}>{4}</button>\n    <div class=\"s\">{5}<br>働いた日数でレベルが上がり、水揚げも給料も増えます。一人ひとりに<b>特性</b>があります（釣り上手・商売上手・勤勉・倹約家・のんびり屋・ふつう）。給料の基本は{6}/日。雇える人数は自宅を大きくすると増えます（今は{7}人まで）。</div>\n    {8}</div>\n    {9}\n    {10}",[G.crew,crewMax(),G.crew>=crewMax()||G.money<cc?'disabled':'',G.crew>=crewMax()?'—':yen(cc),feat('roles')?T("<b>釣り師</b>は釣りに同行して、1日約{1}を水揚げ。<b>営業</b>は水揚げの代わりに、魚の売値を底上げ（Lv×+{2}%・全員で+{3}%まで）。",[yen(h),Math.round(SALES_PER*100),Math.round(SALES_MAX*100)]):T("いっしょに釣りに出て、1人あたり1日約{1}を水揚げ。",[yen(h)]),yen(w),crewMax(),!feat('hireX')?'':`<div class="row" style="grid-column:1/-1;flex-wrap:wrap;gap:6px;margin:4px 0">${[2,3,4,5,6,7,8].map(l=>T("<button class=\"chip\" data-hire=\"{1}\" {2}>経験者 Lv{3}（水揚げ×{4}・給料×{5}）{6}</button>",[l,G.crew>=crewMax()||G.money<hireCost(l)?'disabled':'',l,(1+CLV_F*(l-1)).toFixed(2),(1+CLV_W*(l-1)).toFixed(2),yen(hireCost(l))])).join('')}</div>`,cs.length&&feat('roles')?T("<div class=\"card\" style=\"margin:0;font-size:.82rem\"><div class=\"kv\"><span>釣り師／営業</span><b class=\"num\">{1}人／{2}人</b><span>営業ボーナス（売値）</span><b class=\"num\">+{3}%</b><span>給料の合計</span><b class=\"num down\">{4}/日</b></div></div>",[nF,nS,Math.round(salesBonus()*100),yen(wsum)]):'',cs.map((m,i)=>{const l=clv(m),nx=CLVX[l]&&clvx(l);return T("<div class=\"item\"><div class=\"t\">{1} <span class=\"num\">Lv{2}</span> <span class=\"stars\">{3}{4}</span> <span class=\"tag\" style=\"background:var(--panel2);color:var(--fg)\">{5}</span></div>\n      {6}\n      <div class=\"s\"><span style=\"color:var(--accent)\">{7}</span><br>{8}・給料{9}/日・{10}</div><div class=\"row\" style=\"grid-column:1/-1;justify-content:flex-end\"><button class=\"ghost\" data-retire=\"{11}\" style=\"font-size:.78rem;padding:7px 14px;min-height:36px\">辞めてもらう</button></div></div>",[m.n,l,'★'.repeat(l),'☆'.repeat(CLVX.length-l),TRAITS[m.t].n,feat('roles')?`<button class="chip" data-role="${i}" aria-pressed="${m.r?'true':'false'}" style="grid-row:span 2">${CROLE[m.r]}${m.nr!==undefined?T("<br><span style=\"font-size:.68rem\">→あした{1}</span>",[CROLE[m.nr]]):''}</button>`:'<span></span>',TRAITS[m.t].d,m.r?T("売値+{1}%",[Math.round(SALES_PER*l*(TRAITS[m.t].s||1)*100)]):T("1日約{1}を水揚げ",[yen(h*fishMul(m))]),yen(wageOf(m)),nx?T("次のLvまであと{1}日",[Math.ceil(nx-m.x)]):T("最高レベル"),i])}).join('')]);
  $('#p-shop').innerHTML=T("<h2>設備：道具</h2><div class=\"list\">{1}</div><h2>船</h2><div class=\"list\">{2}</div><h2>人</h2><div class=\"list\">{3}</div>{4}",[ups,boat,crew,feat('deco')?T("<h2>模様替え</h2><p style=\"color:var(--sub);font-size:.8rem;margin:0 0 8px\">飾りを買うと、自宅の風景に並びます。見た目だけのお楽しみです。</p><div class=\"list\">{1}</div>",[DECOS.map(d=>`<div class="item"><div class="t">${d.e} ${d.n}</div><button class="buy" data-deco="${d.k}" ${G.deco[d.k]||G.money<d.c?'disabled':''}>${G.deco[d.k]?T("設置ずみ"):yen(d.c)}</button><div class="s">${G.deco[d.k]?T("自宅に飾っています"):T("自宅の風景に飾る")}</div></div>`).join('')]):'']);
  const sh=$('#p-shop');
  sh.querySelectorAll('[data-up]').forEach(e=>e.onclick=()=>{const u=UP.find(x=>x.k===e.dataset.up);const c=u.c[G.lv[u.k]];if(G.money>=c){G.money-=c;led('buy',c);G.lv[u.k]++;save();hud();renderAll()}});
  sh.querySelectorAll('[data-boat]').forEach(e=>e.onclick=()=>{if(G.money>=b.c){G.money-=b.c;led('buy',b.c);G.boat++;G.area=G.boat;save();hud();renderAll();toast(T("{1}に出られます！釣りタブへ",[AREAS[G.boat].name]));}});
  sh.querySelectorAll('[data-deco]').forEach(e=>e.onclick=()=>{const d=DECOS.find(x=>x.k===e.dataset.deco);if(d&&!G.deco[d.k]&&G.money>=d.c){G.money-=d.c;led('buy',d.c);G.deco[d.k]=1;save();hud();renderAll();toast(T("{1}を飾りました",[d.n]));sfx(1)}});
  sh.querySelectorAll('[data-retire]').forEach(e=>e.onclick=()=>{
    if(!e.dataset.arm){e.dataset.arm=1;e.textContent=T("本当に辞めてもらう？（もう一度）");setTimeout(()=>{delete e.dataset.arm;e.textContent=T("辞めてもらう")},3000);return}
    const i=+e.dataset.retire,m=G.cr[i];if(!m)return;G.cr.splice(i,1);G.crew--;syncCrew();save();hud();renderAll();toast(T("{1}が辞めました",[m.n]))});
  sh.querySelectorAll('[data-hire]').forEach(e=>e.onclick=()=>{const l=+e.dataset.hire,c=hireCost(l);if(G.money>=c&&G.crew<crewMax()){G.money-=c;led('buy',c);G.crew++;normCrew();const m=G.cr[G.cr.length-1];m.x=clvx(l-1);save();hud();renderAll();toast(T("{1}（Lv{2}・{3}）を雇いました",[m.n,l,TRAITS[m.t].n]))}});
  sh.querySelectorAll('[data-role]').forEach(e=>e.onclick=()=>{const m=G.cr[+e.dataset.role];if(m){if(m.nr===undefined)m.nr=m.r^1;else delete m.nr;save();renderAll();if(m.nr!==undefined)toast(T("{1}は、あしたの朝から「{2}」になります",[m.n,CROLE[m.nr]]))}});
  sh.querySelectorAll('[data-crew]').forEach(e=>e.onclick=()=>{if(G.money>=cc&&G.crew<crewMax()){G.money-=cc;led('buy',cc);G.crew++;normCrew();save();hud();renderAll()}});
}
const stars=(sp,size)=>{const n=1+Math.min(4,Math.floor((size-sp.min)/(sp.max-sp.min)*5));return '★'.repeat(n)+'☆'.repeat(5-n)};
function renderDex(){
  const got=NORM.filter(s=>G.dex[s.n]).length,bg=Object.keys(G.bossGot).length;
  const card=s=>{const d=G.dex[s.n];
    return `<div class="item"><img class="ic ${d?'':'off'}" src="${icon(s)}" alt=""><div class="t">${d?s.n:'？？？'}${tag(s)}</div>
      <div class="s">${d?T("最大 <span class=\"stars\">{1}</span> <span class=\"num\">{2}cm</span><br>最小 <span class=\"stars\">{3}</span> <span class=\"num\">{4}cm</span><br>×{5}匹{6}　<span class=\"num\" style=\"opacity:.7\">({7}〜{8}cm)</span><br>性別：<span style=\"color:{9}\">♂</span>{10}　<span style=\"color:{11}\">♀</span>{12}{13}<br>色違い：{14}",[stars(s,d.best),d.best,stars(s,d.min),d.min,d.c,feat('bait')?T("・好物 {1}",[baitOf(s).n]):'',s.min,s.max,GCOL[0],d.g&&d.g[0]?`×${d.g[0]}`:'<span style="opacity:.5">？</span>',GCOL[1],d.g&&d.g[1]?`×${d.g[1]}`:'<span style="opacity:.5">？</span>',d.pair?T(" <span class=\"tag\" style=\"background:var(--good)\">ペア</span>"):'',d.vc?`<img class="ic" src="${icon(vSp(s))}" alt="" style="height:1.3em;width:auto;vertical-align:middle"> <b>${vSp(s).vt.l.replace(/の$/,'')}</b> ×${d.vc}`:'<span style="opacity:.6">？</span>']):T("{1}に生息",[AREAS[s.a].name])}</div></div>`};
  const lock=(s,i)=>`<div class="item"><img class="ic off" src="${icon(s)}" alt=""><div class="t">？？？${tag(s)}</div><div class="s">${G.comp[i]?T("この海域の主が潜んでいる…"):T("この海域をコンプすると現れる")}</div></div>`;
  $('#p-dex').innerHTML=T("<h2>図鑑 <span class=\"num\">{1}/{2}</span>　<span class=\"num\" style=\"color:var(--bad)\">主 {3}/{4}</span></h2><p style=\"color:var(--sub);font-size:.8rem;margin:0 0 10px\">★は、その魚の大きさの範囲のどのあたりかを表します（★1＝小さい、★5＝大きい）。海域の魚を全種類釣るとコンプボーナス。コンプすると主が現れます。</p>",[got,NORM.length,bg,AREAS.length])+
    (!feat('ach')?'':T("<h2>実績 <span class=\"num\">{1}/{2}</span></h2><div class=\"card\" style=\"margin:0 0 10px;font-size:.82rem\">{3}</div>",[achVis().filter(a=>G.ach[a.id]).length,achVis().length,achVis().map(a=>{const d=G.ach[a.id];return `<div class="ln" style="${d?'':'opacity:.6'}"><span>${d?'🏅':'🔒'} <b>${a.n}</b>　<span style="color:var(--sub)">${a.d}</span></span><span class="num" style="font-size:.74rem;color:${d?'var(--good)':'var(--sub)'}">${d?T("{1}日目",[d]):achRw(a.r)}</span></div>`}).join('')]))+
    AREAS.map((a,i)=>{const l=areaSp(i),f=l.filter(s=>G.dex[s.n]).length,bs=bossOf(i);
      return `<h2>${a.name} <span class="num">${f}/${l.length}</span>${G.comp[i]?T(" <span class=\"tag\" style=\"background:var(--good)\">コンプ</span>"):''}</h2><div class="dex">${l.map(card).join('')}${G.dex[bs.n]?card(bs):lock(bs,i)}</div>`}).join('');
}
let curTab='fish',ptrDown=false,dirty=false;
const TABR={fish:()=>{renderAreas();renderGoals()},sell:renderSell,town:()=>renderTown(),home:()=>{renderHome();renderShop()},stat:()=>renderStat(),dex:renderDex,set:()=>{}};
function renderAll(){hud();if(ptrDown){dirty=true;return}dirty=false;(TABR[curTab]||(()=>{}))()}
addEventListener('pointerdown',()=>{ptrDown=true},true);
['pointerup','pointercancel'].forEach(ev=>addEventListener(ev,()=>{ptrDown=false;if(dirty)setTimeout(()=>{if(!ptrDown&&dirty)renderAll()},150)},true));
