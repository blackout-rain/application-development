/* ---------- 最初の案内（光るボタンで、釣る→売る→道具 の流れを案内） ---------- */
function tutStep(){
  if(G.tut||!G.seen)return null;
  if(G.earned>0){return{n:3,g:curTab==='home'?'':'tab-home',t:curTab==='home'?T("ここで道具や船を買えます。まずは「エサ」がおすすめ（アタリが早くなる）"):T("売れました！お金がたまったら「自宅・設備」で道具を強化できます")}}
  if(G.fish.length>0){
    if(curTab!=='sell')return{n:2,g:'tab-sell',t:T("魚が釣れました。「市場」タブで売ってお金にしましょう")};
    return{n:2,g:'sellall',t:T("「すべて売る」を押してお金にしよう")};
  }
  if(curTab!=='fish')return{n:1,g:'',t:T("「釣り」タブにもどって、釣りを始めよう")};
  const m={idle:['act',T("「投げる」を押して釣りを始めよう")],wait:['',T("浮きが沈むのを待とう…")],bite:['act',T("今！「アワセ！」を押す")],fight:['act',T("「巻く」を押し続けて寄せよう。魚が暴れたら指を離す！")],result:['act',T("「つぎへ」を押そう")]}[S.st]||['',''];
  return{n:1,g:m[0],t:m[1]};
}
function tutDone(){G.tut=1;save();tutRender()}
function tutRender(){
  const el=$('#tut');if(!el)return;
  const p=tutStep();
  if(!p){el.hidden=true;document.body.removeAttribute('data-tut');return}
  el.hidden=false;
  const h=T("<span class=\"tn\">{1}/3</span><span class=\"tt\">{2}</span><button id=\"tutx\">案内を消す</button>",[p.n,p.t]);
  if(el.dataset.h!==h){el.dataset.h=h;el.innerHTML=h;$('#tutx').onclick=tutDone}
  if(p.g)document.body.dataset.tut=p.g;else document.body.removeAttribute('data-tut');
}
function openTab(k){
  document.querySelectorAll('nav button').forEach(x=>x.setAttribute('aria-selected',x.dataset.tab===k));
  ['fish','sell','town','home','stat','dex','set'].forEach(t=>$('#p-'+t).hidden=t!==k);
  curTab=k;
  if(k==='set')renderSet();else if(TABR[k])TABR[k]();
  if(k==='home'&&!G.tut&&G.earned>0)setTimeout(()=>{if(curTab==='home')tutDone()},4500);
  tutRender();
}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>openTab(b.dataset.tab));
