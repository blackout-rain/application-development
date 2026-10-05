/* ---------- 色違い ---------- */
// 低確率で、魚ごとに決まった「別の色」の個体が釣れる。高く売れ、図鑑に別枠で記録される
const VAR_PRICE=4,VAR_EXP=2;
const variantChance=()=>Math.min(.04,.012+.0003*sx('luk'))*(1+.2*nrLv('luck'));
const VAR_TYPES=[
  {k:'gold',l:T("金色の"),h:48,s:92,li:58,f:'sepia(1) saturate(4) hue-rotate(-8deg) brightness(1.15)'},
  {k:'albino',l:T("アルビノの"),h:350,s:28,li:90,f:'grayscale(1) brightness(1.7)'},
  {k:'black',l:T("黒い"),h:225,s:12,li:17,f:'grayscale(1) brightness(.32)'},
  {k:'blue',l:T("青い"),h:210,s:82,li:50,f:'hue-rotate(150deg) saturate(1.6)'},
  {k:'red',l:T("紅い"),h:2,s:82,li:47,f:'hue-rotate(-30deg) saturate(2.2)'},
  {k:'jade',l:T("翡翠色の"),h:150,s:62,li:44,f:'hue-rotate(90deg) saturate(1.8)'},
  {k:'purple',l:T("紫の"),h:280,s:56,li:50,f:'hue-rotate(220deg) saturate(1.6)'},
  {k:'sakura',l:T("桜色の"),h:335,s:78,li:78,f:'hue-rotate(300deg) saturate(1.3) brightness(1.25)'},
  {k:'orange',l:T("橙色の"),h:26,s:92,li:55,f:'hue-rotate(40deg) saturate(2.4)'}];
const hex2hsl=h=>{h=h.replace('#','');const r=parseInt(h.slice(0,2),16)/255,g=parseInt(h.slice(2,4),16)/255,b=parseInt(h.slice(4,6),16)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;let hh=0,ss=0;if(d){ss=d/(1-Math.abs(2*l-1));hh=mx===r?((g-b)/d%6):mx===g?((b-r)/d+2):((r-g)/d+4);hh*=60;if(hh<0)hh+=360}return[hh,ss*100,l*100]};
const hsl2hex=(h,s,l)=>{s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));return '#'+[f(0),f(8),f(4)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('')};
const nameHash=n=>[...n].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);
const VCACHE={};
// 種ごとに、元の色とちがう「別の色」を1つ決める（同じ種はいつも同じ色違い）
function vSp(sp){
  if(VCACHE[sp.n])return VCACHE[sp.n];
  const h0=nameHash(sp.n);let type,d=null;
  if(sp.d){
    const[bh,bs,bl]=hex2hsl(sp.d[0]);
    const ok=VAR_TYPES.filter(t=>t.k==='albino'?!(bl>78&&bs<25):t.k==='black'?bl>26:(bs<15||Math.min(Math.abs(t.h-bh),360-Math.abs(t.h-bh))>=55));
    type=ok[h0%ok.length];
    const[,,belL]=hex2hsl(sp.d[1]);
    const body=hsl2hex(type.h,type.s,Math.max(10,Math.min(92,type.li+(bl-50)*.25)));
    const belly=type.k==='albino'?'#fff4f4':type.k==='black'?'#5a5f6a':hsl2hex(type.h,type.s*.55,Math.min(94,belL*.5+55));
    const pat=type.k==='albino'?'#f0b8c4':type.k==='black'?'#9aa0ad':hsl2hex((type.h+35)%360,Math.min(90,type.s),Math.max(30,Math.min(70,type.li+8)));
    d=sp.d.slice();d[0]=body;d[1]=belly;if(d[4])d[4]=pat;
  }else type=VAR_TYPES[h0%VAR_TYPES.length];
  return VCACHE[sp.n]=Object.assign({},sp,{d:d||sp.d,vk:'~'+type.k,vf:sp.d?null:type.f,vt:type});
}
const spOfFish=f=>f.v?vSp(SPM.get(f.n)):SPM.get(f.n);
const fname=f=>(f.v?vSp(SPM.get(f.n)).vt.l:'')+f.n;
