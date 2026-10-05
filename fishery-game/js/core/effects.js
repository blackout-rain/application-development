/* ---------- effects ---------- */
const FX={flash:0,shake:0,rain:0,col:'#fff'},PT=[];
const TIP={x:120,y:72};
let banT,banBusy=false;const banQ=[];
function banner(a,b,c){
  if(banBusy){banQ.push([a,b,c]);return}
  banBusy=true;
  const e=$('#banner');e.querySelector('b').textContent=a;e.querySelector('span').textContent=b;e.style.color=c;
  e.classList.remove('show');void e.offsetWidth;e.classList.add('show');
  clearTimeout(banT);banT=setTimeout(()=>{e.classList.remove('show');banBusy=false;if(banQ.length)banner(...banQ.shift())},2800);
}
let AC;
const JING=[[660,880],[523,659,784],[523,659,784,1047],[523,659,784,1047,1319],[523,659,784,1047,1319,1568,2093],[523,659,784,1047,1319,1568,2093,2637]];
function sfx(l){
  if(G.mute)return;
  try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();
    const t0=AC.currentTime;
    JING[Math.min(l,5)].forEach((fr,i)=>{const o=AC.createOscillator(),g=AC.createGain();o.type='triangle';o.frequency.value=fr;const s=t0+i*.09;
      g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(.16,s+.02);g.gain.exponentialRampToValueAtTime(.0001,s+.3);
      o.connect(g);g.connect(AC.destination);o.start(s);o.stop(s+.32)});
  }catch(e){}
}
function vibe(t){if(G.noVib)return;try{navigator.vibrate&&navigator.vibrate(t>=2?[60,40,60,40,120]:[60])}catch(e){}}
function burst(n,c,t){
  for(let i=0;i<n;i++){const a=rnd(-Math.PI,0)+rnd(-.3,.3),v=rnd(80,260+t*60);
    PT.push({x:TIP.x+50,y:112,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:320,life:rnd(.9,1.8),c:Math.random()<.3?'#fff':c,r:rnd(1.5,3.5+t),s:Math.random()<.4})}
  if(PT.length>400)PT.splice(0,PT.length-400);
}
function celebrate(sp,size,newSp,big){
  const t=tier(sp),c=t?TIER[t].c:newSp?'#5fdc9c':'#ffb454';
  if(t||newSp||big)banner(sp.boss?T("主を釣り上げた！"):t?`${'★'.repeat(t)} ${TIER[t].n}！`:newSp?T("新種発見！"):T("大物！"),`${sp.n} ${size}cm${newSp&&t?T("　新種！"):''}`,c);
  if(!G.noFx){burst(t?30+t*45:newSp?40:big?30:10,c,t);FX.col=c;FX.flash=t?.45+t*.1:newSp?.3:0;FX.shake=t>=4?1:t>=2?.7:0;FX.rain=t>=3?2.5:0}
  sfx(t?t+1:newSp?1:0);if(t)vibe(t);
}

