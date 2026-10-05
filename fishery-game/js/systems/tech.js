/* ---------- 研究開発 ---------- */
const TECH=[
  {k:'cold',n:T("冷凍技術"),d:T("売れ残った魚の鮮度が落ちにくい（1晩の劣化 −15%／Lv）"),c:[40000,160000,640000,2500000,10000000]},
  {k:'eco',n:T("省エネ船"),d:T("船の維持費 −15%／Lv"),c:[30000,120000,480000,1900000,7700000]},
  {k:'dist',n:T("流通網"),d:T("魚の売値 +3%／Lv（最大+15%）"),c:[60000,240000,960000,3800000,15000000]},
  {k:'gear',n:T("漁具改良"),d:T("巻き上げ +5%・テンション上昇 −4%／Lv"),c:[50000,200000,800000,3200000,12800000]},
  {k:'edu',n:T("人材育成"),d:T("従業員がレベルアップするまでの日数 −12%／Lv"),c:[45000,180000,720000,2900000,11500000]},
  {k:'pack',n:T("加工技術"),d:T("加工賃 −18%／Lv・加工品の値段 +5%／Lv"),c:[50000,200000,800000,3200000,12800000]}];
const techLv=k=>(G.tech&&G.tech[k])||0;
function addRep(n){const b=repLv();G.rep+=n;if(repLv()>b)setTimeout(()=>toast(T("評判がLv{1}に上がりました！（注文の報酬・融資の上限が増えた）",[repLv()])),900)}
function newOrder(){
  const a=Math.floor(Math.random()*(G.boat+1)),l=NORM.filter(s=>s.a===a&&s.w>3),tot=l.reduce((x,s)=>x+s.w,0);
  let r=Math.random()*tot,sp=l[0];for(const s of l){r-=s.w;if(r<=0){sp=s;break}}
  const hard=Math.random()<.4,q=sp.w>=20?2+Math.floor(Math.random()*3):sp.w>=8?1+Math.floor(Math.random()*2):1;
  const o={id:++G.ordSeq,n:sp.n,q,sz:Math.round(sp.min+(sp.max-sp.min)*(hard?.5:.25)),fr:hard?90:70,until:G.day+2};
  if(Math.random()<.2)o.g=Math.random()<.5?0:1;   // オス／メスの指定
  return o;
}
function refreshOrders(){G.ord=G.ord.filter(o=>o.until>=G.day&&SP.some(s=>s.n===o.n));while(G.ord.length<ordMax())G.ord.push(newOrder())}
const ordMatch=(o,f)=>f.n===o.n&&f.size>=o.sz&&f.fresh>=o.fr&&(o.g===undefined||f.g===o.g);
// 注文のために残しておく魚（「すべて売る」で売らない）。魚箱の半分まで
function reservedIdx(){
  const set=new Set(),lim=Math.floor(cap()/2);if(!feat('orders'))return set;
  G.ord.forEach(o=>{G.fish.map((f,i)=>({f,i})).filter(x=>!set.has(x.i)&&ordMatch(o,x.f)).sort((a,b)=>price(a.f,0)-price(b.f,0)).slice(0,o.q).forEach(x=>{if(set.size<lim)set.add(x.i)})});
  return set;
}
function deliver(id){
  const o=G.ord.find(x=>x.id===id);if(!o)return;
  const cand=G.fish.map((f,i)=>({f,i})).filter(x=>ordMatch(o,x.f)).sort((a,b)=>price(a.f,0)-price(b.f,0)).slice(0,o.q);
  if(cand.length<o.q)return;
  const pay=Math.round(cand.reduce((a,x)=>a+price(x.f,0),0)*ordMul()),idx=cand.map(x=>x.i);
  G.fish=G.fish.filter((_,i)=>!idx.includes(i));G.ord=G.ord.filter(x=>x.id!==id);G.orderDone++;dcAdd('ord',1);addRep(o.fr>=90?2:1);
  G.money+=pay;led('ord',pay);earn(pay);save();hud();renderAll();toast(T("納品完了！ {1}",[yen(pay)]));sfx(2);
}
