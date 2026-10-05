/* ---------- crew ---------- */
const CREW=[];
const COLS=['#e85d4a','#4aa3e8','#59c27a','#e8b94a','#a86be8','#e87aa8','#4ac2c2','#d9d9d9','#8fa84a','#e8844a'];
const HATS=['#2b3a4a','#c0392b','#f0e6c8','#2f6f5e','#6b4a3c'];
const crewX=i=>150+i*32;
function syncCrew(init){while(CREW.length<G.crew)CREW.push({i:CREW.length,pop:init?1:0,q:[],ev:null});CREW.length=G.crew}
function crewVal(sp,m){return Math.round(AREAS[G.boat].base/9*(avgP(sp)/AVG[G.boat])*rnd(.7,1.3)*fishMul(m)*evCrew())}
// 演出は1人あたり「いま1匹＋次の1匹」まで。それを超える分は、演出なしで水揚げだけ入れる（釣りをやめた後も、ポップが出続けないように）
function crewRound(){CREW.forEach((cr,i)=>{const m=CR()[i];if(m&&m.r===0&&Math.random()<.5){const sp=pickSpecies(G.boat),e={delay:rnd(.1,2.2),t:0,sp,val:crewVal(sp,m)};
  if(cr.q.length>=1){e.paid=1;G.money+=e.val;G.crewToday+=e.val;led('crew',e.val);earn(e.val)}else cr.q.push(e)}})}
function payCrew(e){if(e.paid)return;e.paid=1;G.money+=e.val;G.crewToday+=e.val;led('crew',e.val);earn(e.val);save();hud();renderAll()}
function flushCrew(){CREW.forEach(cr=>{if(cr.ev)payCrew(cr.ev);cr.q.forEach(payCrew);cr.ev=null;cr.q=[]})}
function crewSim(n){let sum=0;for(let k=0;k<n;k++)CR().forEach(m=>{if(m.r===0&&Math.random()<.5)sum+=crewVal(pickSpecies(G.boat),m)});if(sum){G.money+=sum;G.crewToday+=sum;led('crew',sum);earn(sum)}}
function crewStep(dt){
  CREW.forEach(cr=>{
    if(cr.pop<1)cr.pop=Math.min(1,cr.pop+dt/.6);
    if(!cr.ev&&cr.q.length)cr.ev=cr.q.shift();
    const e=cr.ev;if(!e)return;
    if(e.delay>0){e.delay-=dt;return}
    e.t+=dt;if(!e.paid&&e.t>=1.2)payCrew(e);if(e.t>=2.4)cr.ev=null;
  });
}

