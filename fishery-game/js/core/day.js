/* ---------- day cycle ---------- */
function veilOpen(){return !$('#veil').hidden}
function dayEnd(){
  if(G.home)return;   // すでに夜（精算ずみ）なら、二重に精算しない
  const area=AREAS[G.boat];
  flushCrew();
  const haul=G.crewToday;G.crewToday=0;G.home=1;
  const wage=CR().reduce((a,m)=>a+wageOf(m),0);
  const rot=[];
  const decay=Math.max(8,30-5*G.lv.cool)*(1-.15*techLv('cold'));
  const keep=new Set(G.fish.map((f,i)=>({i,p:price(f)})).sort((a,b)=>b.p-a.p).slice(0,tankCap(G.fac.tank)).map(x=>x.i));
  G.fish.forEach((f,i)=>{if(!keep.has(i))f.fresh=Math.round((f.fresh-decay)*10)/10});
  const spoiled=G.fish.filter(f=>f.fresh<=0).length;
  G.fish=G.fish.filter(f=>f.fresh>0);
  const owe=(k,n)=>{const p=Math.min(n,G.money);G.money-=p;G.debt+=n-p;led(k,n);return p};   // 払えない分は借入に回る（帳消しにならない）
  const pay=owe('wage',wage);
  const upk=owe('upk',upkeepCost());
  const feed=owe('feed',G.farm.reduce((a,x)=>a+Math.round(farmVal(x)*.03),0));
  const insp=G.ins?owe('ins',premium()):0;
  let fixNote='';if(G.fix){if(G.fixIns===undefined?G.ins:G.fixIns)fixNote=T("🔧 船が故障したが、保険で修理費は無料");else{const fp=owe('repair',G.fix);fixNote=T("🔧 船が故障：修理費{1}{2}",[yen(G.fix),G.fix>fp?T("（払えない分は借入に）"):''])}G.fix=0;delete G.fixIns}
  const intr=Math.round(G.debt*LOAN_RATE),ip=owe('int',intr);   // 払えない利息は借入に上乗せ
  const ups=[];G.cr.forEach(m=>{const b=clv(m);m.x+=(TRAITS[m.t].x||1)*(1+Math.min(.5,.01*sx('lead')));if(clv(m)>b)ups.push(T("{1}がLv{2}に昇進！（{3}と給料が上がった）",[m.n,clv(m),m.r?T("売値ボーナス"):T("水揚げ")]))});
  Object.keys(G.sat).forEach(k=>{G.sat[k]*=.5;if(G.sat[k]<.004)delete G.sat[k]});G.stall=0;   // 需給は一晩で半分もどる
  SP.forEach(s=>{G.prev[s.n]=G.mult[s.n];G.mult[s.n]=clamp(G.mult[s.n]+rnd(-.15,.15)+(1-G.mult[s.n])*.2,.6,1.6)});
  const hot=NORM.slice().sort((a,b)=>(G.mult[b.n]/G.prev[b.n])-(G.mult[a.n]/G.prev[a.n]))[0];
  if(feat('tour'))rvStep();const tr=tourSettle(),rs=isTourDay()?rvSettle():null;
  $('#box').innerHTML=T("<h3>{1}日目 終了</h3>\n    {2}{3}{4}{5}{6}{7}{8}\n    <div class=\"ln\"><span>傷んで捨てた魚</span><b class=\"num\">{9}匹</b></div>{10}\n    <div class=\"ln\"><span>明日の注目</span><b>{11}が値上がり</b></div>\n    <p style=\"color:var(--sub);font-size:.85rem\">売れ残りの魚は一晩ごとに鮮度が落ち、値段も下がります。</p>\n    <button class=\"big\" id=\"nextday\">自宅に帰る</button>",[G.day,pnlHtml(G.led,T("従業員の水揚げ（{1}人）",[G.crew])),rs?T("<div class=\"card\" style=\"margin:0 0 8px;padding:8px 10px\"><b style=\"font-size:.85rem\">📊 週間売上ランキング：{1}位／6人</b><div style=\"font-size:.8rem;margin:2px 0\">{2}</div><div class=\"kv\" style=\"font-size:.78rem\">{3}</div></div>",[rs.place+1,rs.bp?T("BP+{1}・評判+{2}{3}",[rs.bp,rs.rp,rs.place===0?T("・おまかせ釣り券×2"):'']):T("入賞ならず"),rs.all.map((x,i)=>`<span style="${x.me?'color:var(--accent);font-weight:700':''}">${i+1}. ${x.n}</span><b class="num">${yen(x.s)}</b>`).join('')]):'',tr?T("<div class=\"card\" style=\"margin:0 0 8px;padding:8px 10px\"><b style=\"font-size:.85rem\">🏆 釣り大会の結果：{1}位／6人</b><div style=\"font-size:.8rem;margin:2px 0\">{2}　{3}{4}</div><div class=\"kv\" style=\"font-size:.78rem\">{5}</div></div>",[tr.place+1,tr.best?T("あなたのベスト：{1}（{2}）",[tr.bn,yen(tr.best)]):T("魚を釣れませんでした…"),tr.prize?T("賞金 +{1}",[yen(tr.prize)]):T("賞金なし"),tr.place===0?T("・おまかせ釣り券×2"):'',tr.all.map((x,i)=>`<span style="${x.me?'color:var(--accent);font-weight:700':''}">${i+1}. ${x.n}</span><b class="num">${yen(x.s)}</b>`).join('')]):'',ups.map(u=>`<div class="ln"><span>🎉 ${u}</span></div>`).join(''),fixNote?`<div class="ln"><span>${fixNote}</span></div>`:'',G.debt?T("<div class=\"ln\"><span>借入残高</span><b class=\"num down\">{1}</b></div>",[yen(G.debt)]):'',ev()?T("<div class=\"ln\"><span>今日のできごと</span><b>{1} {2}</b></div>",[ev().e,ev().n]):'',spoiled,keep.size?T("<div class=\"ln\"><span>生け簀で守った魚</span><b class=\"num\">{1}匹</b></div>",[keep.size]):'',hot.n]);
  $('#veil').hidden=false;
  $('#nextday').onclick=()=>{S.st='idle';$('#veil').hidden=true;say(T("夜です。自宅で休もう。"));save();hud();renderAll();label();openTab('home')};
  save();hud();
}
function sleep(){
  if(!G.home)return;   // 夜でないときは、日付を進めない
  G.cr.forEach(m=>{if(m.nr!==undefined){m.r=m.nr;delete m.nr}});   // 役割の変更は、朝から有効
  G.hist.push(Object.assign({d:G.day},G.led));if(G.hist.length>30)G.hist.shift();G.led={};
  G.day++;G.min=360;G.home=0;S.st='idle';rollEvent();finishProc();growFarm();if(isTourDay())setTimeout(()=>toast(T("🏆 今日は釣り大会！ 街タブから参加できます（参加費{1}）",[yen(tourFee())])),3600);const no=G.ord.length;if(feat('orders'))refreshOrders();if(G.ord.length>no)setTimeout(()=>toast(T("新しい注文が届いています（市場タブ）")),1800);save();hud();renderAll();label();
  say(T("新しい朝。今日も釣りに出よう。"));openTab('fish');toast(T("{1}日目の朝",[G.day]));
  if(Cloud.kind==='app'&&Cloud.status==='signedout'&&G.day>=2&&!G.nudged){G.nudged=1;save();setTimeout(showNudge,1500)}
}

