/* ---------- fish art ---------- */
function drawFish(c,x,y,L,d){
  const [body,belly,shape,pat,pc,ex]=d,rx=L/2,ry=L/2*{a:.26,b:.34,r:.5,f:.55,l:.13,t:.3}[shape];
  c.save();c.translate(x,y);
  c.fillStyle=body;
  c.beginPath();c.moveTo(rx*.8,0);c.lineTo(rx*1.3,-ry*1.2-1);c.lineTo(rx*1.1,0);c.lineTo(rx*1.3,ry*1.2+1);c.closePath();c.fill();
  if(ex==='ribbon'){c.fillStyle=pc;c.fillRect(-rx*.7,-ry*2.6,rx*1.7,ry*1.8)}
  else{c.beginPath();c.moveTo(-rx*.25,-ry*.85);c.quadraticCurveTo(rx*.1,-ry*1.8,rx*.5,-ry*.8);c.closePath();c.fill()}
  if(ex==='bill'){c.beginPath();c.moveTo(-rx*.85,-ry*.2);c.lineTo(-rx*1.55,0);c.lineTo(-rx*.85,ry*.2);c.closePath();c.fill()}
  const g=c.createLinearGradient(0,-ry,0,ry);g.addColorStop(0,body);g.addColorStop(.55,body);g.addColorStop(1,belly);
  c.fillStyle=g;c.beginPath();c.ellipse(0,0,rx,ry,0,0,7);c.fill();
  c.save();c.beginPath();c.ellipse(0,0,rx,ry,0,0,7);c.clip();c.fillStyle=c.strokeStyle=pc||body;
  if(pat==='s')for(let i=-1;i<=3;i++)c.fillRect(rx*(-.25+i*.22),-ry,rx*.08,ry*2);
  else if(pat==='h')c.fillRect(-rx,-ry*.12,rx*2,Math.max(1.5,ry*.2));
  else if(pat==='w'){c.lineWidth=Math.max(1,ry*.14);for(let i=0;i<6;i++){c.beginPath();c.moveTo(-rx*.4+i*rx*.18,-ry);c.lineTo(-rx*.32+i*rx*.18,-ry*.2);c.lineTo(-rx*.4+i*rx*.18,ry*.1);c.stroke()}}
  else if(pat==='p')for(let i=0;i<10;i++){c.beginPath();c.arc(Math.sin(i*2.3)*rx*.65,Math.cos(i*3.1)*ry*.6,Math.max(1,ry*.11),0,7);c.fill()}
  c.restore();
  c.fillStyle='rgba(0,0,0,.18)';c.beginPath();c.ellipse(-rx*.1,ry*.25,rx*.18,ry*.14,.5,0,7);c.fill();
  const er=Math.max(2,ry*(ex==='bigeye'?.36:.22));
  c.fillStyle='#fff';c.beginPath();c.arc(-rx*.6,-ry*.15,er,0,7);c.fill();
  c.fillStyle='#111';c.beginPath();c.arc(-rx*.62,-ry*.15,er*.55,0,7);c.fill();
  c.restore();
}
function drawSp(c,sp,x,y,L){
  if(sp.d){drawFish(c,x,y,L,sp.d);return}
  c.save();if(sp.vf)c.filter=sp.vf;c.font=`${L*.85}px serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(sp.e,x,y);c.restore();
}
const ICONS={};
function icon(sp){
  const key=sp.n+(sp.vk||'');if(ICONS[key])return ICONS[key];
  const k=document.createElement('canvas');k.width=96;k.height=54;
  drawSp(k.getContext('2d'),sp,sp.d?46:48,28,sp.d?58:46);
  return ICONS[key]=k.toDataURL();
}
const ico=(sp,cls='')=>`<img class="ic ${cls}" src="${icon(sp)}" alt="">`;

