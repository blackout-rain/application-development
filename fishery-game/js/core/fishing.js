/* ---------- fishing core ---------- */
function pickSpecies(area=G.area,bk=null){
  const list=SP.filter(s=>s.a===area&&!s.boss);
  const bt=G.lv.bait+perks().rare+mealFx('rare')+wxRare()+tideRare()+(petFx().rare||0)+.4*sx('luk');
  const ws=list.map(s=>s.w*(s.w<=12?1+.25*bt:1)*(inSeason(s)?SEA_WEIGHT:1)*(bk&&baitOf(s).k===bk?BAIT_MUL:1));
  let r=Math.random()*ws.reduce((a,b)=>a+b,0);
  for(let i=0;i<list.length;i++){r-=ws[i];if(r<=0)return list[i]}
  return list[0];
}
function say(t){$('#msg').textContent=t}
function press(){
  if(veilOpen())return;
  if(G.home){toast(T("夜です。自宅で休んで朝を迎えよう"));openTab('home');return}
  switch(S.st){
    case'idle':
      if(G.fish.length>=cap()){if(G.autoSell&&G.fish.length){sell(G.fish.map((_,i)=>i));toast(T("魚箱がいっぱいなので自動で売りました"))}else{say(T("魚箱がいっぱい。市場で売ろう。"));return}}
      S.bk=null;if(G.baitSel&&G.bt[G.baitSel]>0){G.bt[G.baitSel]--;S.bk=G.baitSel;if(!G.bt[G.baitSel])toast(T("{1}を使い切りました（街の釣具店で買えます）",[BAITS.find(b=>b.k===G.baitSel).n]))}
      S.st='wait';S.t=rnd(1.2,3.5)/(1+.2*G.lv.bait+.03*sx('agi'))*wxWait()*tideWait();say(T("浮きを見守ろう…"));break;
    case'wait':
      S.st='idle';say(T("早すぎた。仕掛けを引き上げた。"));break;
    case'bite':hook();break;
    case'fight':S.holding=true;break;
    case'result':if(S.t>.6)next();break;
  }
  label();
}
function release(){S.holding=false}
const bossChance=()=>Math.min(.08,.03*(1+.04*sx('luk')+.1*perks().rare));
function rollFish(){
  const bs=bossOf(G.area);
  const sp=(bs&&G.comp[G.area]&&Math.random()<bossChance())?bs:pickSpecies(G.area,S.bk);
  S.sp=sp;S.size=Math.round(sp.min+(sp.max-sp.min)*Math.pow(Math.random(),Math.max(1.1,1.8-.015*sx('luk'))));S.tier=tier(sp);
  S.v=!sp.boss&&Math.random()<variantChance()?1:0;S.dsp=S.v?vSp(sp):sp;S.g=rndG();
  S.leg=sp.boss&&legOk(sp.a)&&Math.random()<.5?1:0;
}
const newFight=(sp,size)=>({pw:sp.s*(.8+.4*(size-sp.min)/(sp.max-sp.min))*(1+.2*sp.a)*lapDiff(),prog:sp.boss?25:35,tens:0,struggle:false,flip:1,timer:rnd(.6,1.2)});
function hook(){
  const sp=S.sp;
  S.f=newFight(sp,S.size);if(S.leg)S.f.pw*=1.5;
  S.st='fight';S.holding=false;
  say(S.leg?T("伝説の主がかかった！！！ 今までにない引きだ…！"):S.sp.boss?T("主がかかった！！ 全力で耐えろ！"):S.tier>=1?T("ヒット！ これは大物だ…！ 慎重に巻け！"):T("ヒット！ 巻いて寄せよう。暴れたら離してテンションを逃がす。"));
}
// 釣りの計算本体。ゲームの進行と、診断用の試算の両方から使う。o で装備・ステータスを仮に変えられる。
function fightEnv(o){o=o||{};return{rod:o.rod??G.lv.rod,line:o.line??G.lv.line,pk:perkWithMeal(),eas:G.catches<10?.5:G.catches<30?.75:1,str:o.str??sx('str'),vit:o.vit??sx('vit'),dex:o.dex??sx('dex'),foc:o.foc??sx('foc'),diff:DIFF[G.diff]*evDiff()*wxDiff()*(petFx().diff||1)}}
// 戻り値 0:継続 1:釣れた 2:糸が切れた 3:逃げられた
function stepFight(f,holding,dt,sp,E){
  const pe=f.pw<=3?f.pw:3+(f.pw-3)*.6,bs=sp.boss?sp.a:0,eas=E.eas,pk=E.pk;
  f.timer-=dt;f.flip+=((f.struggle?-1:1)-f.flip)*Math.min(1,dt*9);
  if(f.timer<=0){f.struggle=!f.struggle;f.timer=f.struggle?rnd(.6,1.4)*(1+.08*bs)*(1-Math.min(.35,.012*(E.foc||0))):rnd(.8,1.8)*(sp.boss?Math.max(.4,1-.08*bs):1)}
  if(holding){
    f.prog+=16*(1+.3*E.rod+pk.reel/100)*(1+.04*E.str)*(eas<1?1.25:1)/(.5+.5*pe)*(f.struggle?.3:1)*dt;
    f.tens+=(f.struggle?60:20)*(.6+.4*pe)*eas*(1-pk.tens/100)*(1-Math.min(.6,.025*E.vit))*E.diff/(1+.25*E.line)*dt;
  }else{
    f.tens-=45*(1+.03*E.dex)*dt;
    f.prog-=(f.struggle?10*pe*eas:2*eas)*Math.max(.3,1-.04*E.dex)*dt;
  }
  f.tens=clamp(f.tens,0,100);f.prog=Math.min(f.prog,100);
  return f.tens>=100?2:f.prog<=0?3:f.prog>=100?1:0;
}
function fightStep(dt){
  const f=S.f,r=stepFight(f,S.holding,dt,S.sp,fightEnv());
  if(r===2){S.ok=false;say(T("糸が切れた…！"));end(false);if(S.sp.boss)showBossAdvice(S.sp.a,2)}
  else if(r===3){S.ok=false;say(T("{1}に逃げられた…",[S.sp.n]));end(false);if(S.sp.boss)showBossAdvice(S.sp.a,3)}
  else if(r===1){landed()}
  else if(f.struggle)say(S.holding?T("暴れてる！ 離して！"):T("暴れてる…耐えろ"));
  else say(S.holding?T("今だ、巻け！"):T("落ち着いた。巻こう！"));
}
// 「平均的な操作（反応が少し遅く、ときどきミスする）」で何割釣れるかを試算する
function botFight(f,sp,E){
  const hist=[];let t=0,lapse=0,res=0;
  while(!res&&t<90){
    hist.push(f.struggle);const seen=hist.length>27?hist[hist.length-28]:false;
    let hold=!seen&&f.tens<58;
    if(lapse>0){lapse--;hold=!hold}else if(Math.random()<.012)lapse=14;
    res=stepFight(f,hold,1/60,sp,E);t+=1/60;
  }
  return res;
}
function simBoss(sp,E,n){
  let ok=0;
  for(let i=0;i<n;i++){
    const size=Math.round(sp.min+(sp.max-sp.min)*Math.pow(Math.random(),Math.max(1.1,1.8-.015*sx('luk'))));
    if(botFight(newFight(sp,size),sp,E)===1)ok++;
  }
  return ok/n;
}
const FSTAT=[['str',T("力")],['vit',T("体力")],['dex',T("器用さ")],['foc',T("集中力")]];
function showBossAdvice(a,why){
  const sp=bossOf(a),cur={str:sx('str'),vit:sx('vit'),dex:sx('dex'),foc:sx('foc')},N=60;
  const rate=o=>simBoss(sp,fightEnv(o),N);
  const pct=r=>Math.round(r*20)*5+'%';
  const now=rate({});
  // mk(x): xポイント上乗せした仮のステータス。5割に届く最小のxを二分探索で探す
  const find=(mk,hi)=>{if(rate(mk(0))>=.5)return 0;if(rate(mk(hi))<.5)return null;let lo=0,up=hi;for(let i=0;i<7;i++){const m=Math.round((lo+up)/2);if(rate(mk(m))>=.5)up=m;else lo=m}return up};
  const uni=now>=.5?0:find(k=>({str:cur.str+k,vit:cur.vit+k,dex:cur.dex+k}),90);
  const one=FSTAT.map(([k,n])=>[k,n,now>=.5?0:find(x=>({[k]:cur[k]+x}),160)]);
  const gear=[['rod',T("釣り竿"),G.lv.rod],['line',T("釣り糸"),G.lv.line]].filter(g=>g[2]<UP.find(u=>u.k===g[0]).c.length).map(([k,n,v])=>[n,v,rate({[k]:v+1})]);
  const title=why===2?T("糸が切れた…"):why===3?T("逃げられた…"):T("主への挑戦目安");
  const reason=why===2?T("テンションが上がりすぎました。<b>体力</b>と<b>器用さ</b>、釣り糸が効きます。"):why===3?T("寄せきれずに逃げられました。<b>力</b>と<b>器用さ</b>、釣り竿が効きます。"):'';
  let html=T("<h3>{1}</h3><p style=\"margin:0 0 8px\"><b>{2}</b>{3}</p>\n    <div class=\"card\" style=\"margin:0 0 10px\"><div class=\"kv\"><span>いまの釣れる確率の目安</span><b class=\"num\" style=\"color:{4}\">{5}</b></div>\n    <div style=\"color:var(--sub);font-size:.78rem;margin-top:4px\">平均的な操作（反応が少し遅く、ときどきミスする）での試算です。</div></div>",[title,sp.n,reason?'<br>'+reason:'',now>=.5?'var(--good)':'var(--bad)',pct(now)]);
  if(now>=.5){
    html+=T("<p>目安の5割はクリアしています。あとはタイミング次第。もう一度挑戦しよう。</p>");
  }else{
    html+=T("<b>5割釣れるための目安</b><div class=\"card\" style=\"margin:6px 0 10px\"><div style=\"font-size:.8rem;color:var(--sub);margin-bottom:4px\">力・体力・器用さをバランスよく上げる場合</div>")+
      (uni===null?T("<div>まだ届きません。レベルを上げ、釣り竿・釣り糸も強化しよう。</div>"):FSTAT.map(([k,n])=>`<div class="ln"><span>${n}</span><b class="num">${cur[k]+1} → ${cur[k]+uni+1}（+${uni}）</b></div>`).join(''))+
      T("<div style=\"font-size:.8rem;color:var(--sub);margin:8px 0 4px\">1つだけ上げる場合</div>")+
      one.map(([k,n,v])=>T("<div class=\"ln\"><span>{1}だけ</span><b class=\"num\">{2}</b></div>",[n,v===null?T("これだけでは足りない"):`${cur[k]+1} → ${cur[k]+v+1}（+${v}）`])).join('')+`</div>`;
    if(gear.length)html+=T("<b>装備を1つ上げた場合</b><div class=\"card\" style=\"margin:6px 0 10px\">{1}</div>",[gear.map(([n,v,r])=>`<div class="ln"><span>${n} Lv${v} → Lv${v+1}</span><b class="num">${pct(r)}</b></div>`).join('')]);
    html+=T("<p style=\"font-size:.82rem;color:var(--sub);margin:0 0 10px\">いまのBPは <b class=\"num\" style=\"color:var(--accent)\">{1}</b>。ステータスタブで好きなステータスに振り分けられます。</p>",[G.bp]);
  }
  html+=T("<div class=\"row\"><button class=\"ghost\" id=\"advStat\" style=\"flex:1\">ステータスを見る</button><button class=\"big\" id=\"advOk\" style=\"flex:1;width:auto\">閉じる</button></div>");
  $('#box').innerHTML=html;$('#veil').hidden=false;
  $('#advOk').onclick=()=>{$('#veil').hidden=true};
  $('#advStat').onclick=()=>{$('#veil').hidden=true;openTab('stat')};
}
const trophyBonus=()=>[0,.1,.2,.35,.45,.55][G.fac.trophy];
function expGain(sp,size,newSp,v){
  const r=sizeRatio(sp,size),tb=1+.04*nrLv('exp')+trophyBonus()+mealFx('exp')+evExp()+(petFx().exp||0);
  let e=Math.round(((8+sp.s*7+tier(sp)*20+(newSp?25:0))*(.6+.9*r)+(r>=.9?10:0))*tb);
  if(sp.boss)e+=Math.round((expNeed(Math.min(G.level,BAL.bossLvCap))*(1+.3*sp.a)+e*4)*tb);
  return Math.max(1,Math.round(e*(v?VAR_EXP:1)*BAL.expMul*(1+BAL.expEarly*Math.max(0,1-G.level/15))));   // 序盤（Lv15まで）は経験値を多めに
}
function growRoll(){const r=Math.random();return r<.4?0:r<.85?1:r<.98?2:3}   // 8つのステータスで、1レベルあたり合計6前後
function addExp(n){
  G.exp+=n;let up=0;const tot={};ST.forEach(s=>tot[s.k]=0);
  while(G.exp>=expNeed(G.level)&&G.level<99){
    G.exp-=expNeed(G.level);G.level++;up++;
    const g={};let sum=0;ST.forEach(s=>{g[s.k]=growRoll();sum+=g[s.k]});
    while(sum<3){g[ST[Math.random()*ST.length|0].k]++;sum++}
    ST.forEach(s=>{G.stat[s.k]+=g[s.k];tot[s.k]+=g[s.k]});G.bp+=3;
  }
  if(G.level>=99)G.exp=0;   // レベル上限では、経験値をためない
  if(up){
    const txt=ST.filter(s=>tot[s.k]).map(s=>`${s.n}+${tot[s.k]}`).join(' ');
    G.lastUp=`Lv.${G.level}　${txt}`;
    banner('LEVEL UP！',`Lv.${G.level}　${txt}　BP+${3*up}`,'#5fdc9c');
    toast(T("レベルアップ！ Lv.{1}　{2}　BPを振り分けよう",[G.level,txt]));sfx(3);
  }
}
function checkComplete(a){
  if(G.comp[a]||!areaSp(a).every(s=>G.dex[s.n]))return;
  G.comp[a]=1;const c=COMP[a];G.money+=c.g;led('gold',c.g);G.bp+=c.bp;
  banner(T("エリアコンプ！"),T("{1}　{2}・BP+{3}・売値+5%",[AREAS[a].name,yen(c.g),c.bp]),'#5fdc9c');
  toast(T("{1}を制覇！ ここに「主」が現れるようになった…",[AREAS[a].name]));sfx(4);save();hud();
}
function landed(){
  const sp=S.sp;
  if(G.fish.length>=cap()){const lo=G.fish.map((f,i)=>({i,p:price(f)})).sort((a,b)=>a.p-b.p)[0];if(lo){sell([lo.i]);toast(T("魚箱がいっぱいだったので、いちばん安い魚を自動で売りました"))}}   // 釣っている間に満杯になった場合
  G.fish.push(Object.assign({n:sp.n,size:S.size,fresh:100,g:S.g},S.v?{v:1}:{}));G.catches++;dcAdd('catch',1);if(tier(sp)>=1)dcAdd('rare',1);
  const newSp=!G.dex[sp.n],menu0=menuOpen().length;
  const d=G.dex[sp.n]||(G.dex[sp.n]={c:0,best:0,min:9999});
  if(S.v)d.vc=(d.vc||0)+1;
  d.g=d.g||[0,0];d.g[S.g]++;if(d.g[0]&&d.g[1]&&!d.pair){d.pair=1;const bonus=Math.round(AVG[sp.a]*8/10)*10;G.money+=bonus;led('gold',bonus);setTimeout(()=>toast(T("🧬 {1}のオスとメスがそろいました！ {2}",[sp.n,yen(bonus)])),1200)}
  const rec=!newSp&&S.size>d.best;d.c++;d.best=Math.max(d.best,S.size);d.min=Math.min(d.min,S.size);
  if(newSp&&!sp.boss&&menuOpen().length>menu0)setTimeout(()=>toast(T("🍽️ 新しい料理がメニューに加わりました：{1}（街タブ）",[menuOpen()[menuOpen().length-1].n])),1500);
  const big=S.size>=sp.max*.9,t=tier(sp);
  const xp=expGain(sp,S.size,newSp,S.v);
  const left=areaSp(sp.a).filter(s=>!G.dex[s.n]).length;
  say(T("{1}{2}{3} {4}cm {5} を釣った！{6}{7}{8}（{9}）+{10}EXP",[t?TIER[t].n+'！ ':'',S.v?vSp(sp).vt.l:'',sp.n,S.size,stars(sp,S.size),big?T("大物！"):'',newSp?(sp.boss?T(" 主を初めて釣った！"):T(" 新種！（この海域 あと{1}種）",[left])):'',rec?T(" 自己記録！"):'',yen(price(G.fish[G.fish.length-1])),xp]));
  celebrate(sp,S.size,newSp,big);
  if(S.v){const vt=vSp(sp).vt;banner(T("色違い！"),T("{1}{2} {3}cm　売値×{4}",[vt.l,sp.n,S.size,VAR_PRICE]),`hsl(${vt.h},${Math.max(40,vt.s)}%,70%)`);if(!G.noFx){burst(70,`hsl(${vt.h},90%,70%)`,3);FX.flash=.5;FX.col=`hsl(${vt.h},90%,70%)`}sfx(3);vibe(2)}
  addExp(xp);
  if(sp.boss&&!G.bossGot[sp.a]){G.bossGot[sp.a]=1;addRep(3);const bb=BOSSB[sp.a];G.money+=bb.g;led('gold',bb.g);G.bp+=bb.bp;banner(T("主の討伐ボーナス！"),`${yen(bb.g)}・BP+${bb.bp}`,'#ff8a5e')}
  if(sp.boss&&S.leg&&!G.legLap[sp.a]){G.legLap[sp.a]=1;G.leg[sp.a]=(G.leg[sp.a]||0)+1;addRep(5);const bb=BOSSB[sp.a],lg=bb.g*3;G.money+=lg;led('gold',lg);G.bp+=bb.bp*2;G.nr.pt+=4;G.nr.tot=(G.nr.tot||0)+4;banner(T("伝説の主を討伐！"),T("{1}・BP+{2}・のれん+4",[yen(lg),bb.bp*2]),'#ffd34d')}
  if(!sp.boss)checkComplete(sp.a);
  S.ok=true;tourScore(G.fish[G.fish.length-1],sp);end(true);
}
function end(){
  S.holding=false;G.min+=ATTEMPT_MIN;S.st='result';S.t=0;crewRound();useMeal();treasureRoll();save();hud();renderAll();label();
}
function next(){
  if(G.min>=DAY_END){dayEnd();return}
  S.st='idle';say('');label();
}
function label(){
  const b=$('#act');
  b.textContent={idle:T("投げる"),wait:T("待つ…（早く引くと戻る）"),bite:T("アワセ！"),fight:T("巻く（押し続ける）"),result:T("つぎへ")}[S.st];
  b.classList.toggle('down',S.st==='fight'&&S.holding);
  tutRender();
}

