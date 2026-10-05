/* ---------- 釣り大会 ---------- */
// 7日ごとの大会。参加すると、その日に自分で釣った魚（主は除く）のうち、いちばん高い1匹で、ライバル5人と競う
const TOUR_EVERY=7,RIVALS=[T("ゲンさん"),T("港のカイ"),T("漁協のミサキ"),T("旅の釣り師ソウ"),T("覆面の釣り師")];
const isTourDay=()=>feat('tour')&&G.day%TOUR_EVERY===0;
const tourIn=()=>!!(G.tour&&G.tour.in&&G.tour.day===G.day);
const tourBase=()=>AVG[Math.min(G.boat,AVG.length-1)]||AVG[0];   // いま釣っている海域ではなく、到達した海域で決める（海域を切り替えても有利にならない）
const tourFee=()=>Math.round(tourBase()*3/10)*10,tourPrize=p=>Math.round(tourBase()*[40,20,10][p]/10)*10;
const tourNext=()=>(Math.floor(G.day/TOUR_EVERY)+(isTourDay()&&!G.home?0:1))*TOUR_EVERY;
function tourEnter(){
  if(!isTourDay()||G.home||tourIn())return;
  const fee=tourFee();if(G.money<fee){toast(T("参加費が足りません"));return}
  G.money-=fee;led('fee',fee);G.tour={day:G.day,in:1,best:0,bn:'',done:0};G.tourN++;save();hud();renderAll();toast(T("釣り大会にエントリー！ 今日いちばん高い魚を釣ろう"));
}
function tourScore(fi,sp){
  if(!tourIn()||sp.boss)return;
  const v=price(fi,0);if(v>G.tour.best){G.tour.best=v;G.tour.bn=`${fname(fi)} ${fi.size}cm`;toast(T("大会ベスト更新：{1}（{2}）",[G.tour.bn,yen(v)]))}
}
function tourSettle(){
  if(!tourIn()||G.tour.done)return null;
  G.tour.done=1;
  const base=tourBase(),me={n:T("あなた"),s:G.tour.best,me:1};
  const all=[1.4,1.9,2.4,3.0,3.8].map((m,i)=>({n:RIVALS[i],s:Math.round(base*m*rnd(.85,1.15))})).concat([me]).sort((a,b)=>b.s-a.s);
  const place=all.indexOf(me),prize=place<3?tourPrize(place):0;
  if(prize){G.money+=prize;led('prize',prize);earn(prize)}
  if(place===0){G.tourWin++;G.tk.auto+=2}
  addRep(place===0?5:place===1?3:place===2?2:1);
  G.tourLast={day:G.day,place,prize};
  return{all,place,prize,best:G.tour.best,bn:G.tour.bn};
}
