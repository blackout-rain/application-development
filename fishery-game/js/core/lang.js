/* ---------- 言語（日本語／English） ----------
   文章は T("日本語の原文",[差し込む値]) で書く。英語は EN に「原文 → 英訳」で持つ。{1}{2}… は差し込む値の場所（英語では順番を入れ替えてよい）。
   魚や人の名前のように、保存データのIDになっている日本語は NAMES で表示だけ英語にする。 */
const LANG=(()=>{try{const v=localStorage.getItem('umikaze-lang');if(v==='ja'||v==='en')return v}catch(e){}return /^ja/i.test(navigator.language||'ja')?'ja':'en'})();
document.documentElement.lang=LANG;
function localizeStatic(){
  document.title=document.title.replace('今日も大漁ですか？',T('今日も大漁ですか？'));
  document.querySelectorAll('[data-i18n]').forEach(e=>{e.textContent=T(e.dataset.i18n||e.textContent)});
  document.querySelectorAll('[data-i18n-aria]').forEach(e=>e.setAttribute('aria-label',T(e.dataset.i18nAria)));
}
document.addEventListener('DOMContentLoaded',()=>{if(LANG==='en')localizeStatic()});
const tr=v=>LANG==='en'&&typeof v==='string'&&NAMES[v]!==undefined?NAMES[v]:v;
// 英語表示のとき、画面に出た魚などの名前（保存データのIDになっている日本語）を英語に置き換える
if(LANG==='en'){
  const ks=Object.keys(NAMES).sort((a,b)=>b.length-a.length),re=ks.length?new RegExp(ks.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g'):null;
  const JPX=/[ぁ-んァ-ヶ一-龠、。（）・：！？　～]/,FWM={'、':', ','。':'. ','（':' (','）':')','・':' · ','：': ': ','！':'!','？':'?','　':' ','～':'~'};
  // 名前の置き換えと、全角の記号（、。（）・：！？）の英語の記号への置き換え
  const fix=v=>{if(!JPX.test(v))return v;let w=re?v.replace(re,m=>NAMES[m]):v;w=w.replace(/[、。（）・：！？　～]/g,m=>FWM[m]);return w.replace(/ {2,}/g,' ').replace(/ ([,.!?:)])/g,'$1').replace(/\( /g,'(')};
  const AT=['alt','title','aria-label'];
  const walkN=n=>{
    if(n.nodeType===3){const v=n.nodeValue,w=fix(v);if(w!==v)n.nodeValue=w}
    else if(n.nodeType===1){if(n.tagName==='SCRIPT'||n.tagName==='STYLE')return;AT.forEach(a=>{const v=n.getAttribute(a);if(v){const w=fix(v);if(w!==v)n.setAttribute(a,w)}});n.childNodes.forEach(walkN)}
  };
  if(re)document.addEventListener('DOMContentLoaded',()=>{
    walkN(document.body);
    const proc=ms=>ms.forEach(m=>{if(m.type==='childList')m.addedNodes.forEach(walkN);else walkN(m.target)});
    const ob=new MutationObserver(proc);
    ob.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:AT});
    window.i18nFlush=()=>proc(ob.takeRecords());   // テスト用：保留中の置き換えを、いますぐ行う
  });
}
function T(k,a){
  const s=LANG==='en'&&EN[k]!==undefined?EN[k]:k;
  return a?s.replace(/\{(\d+)\}/g,(m,i)=>tr(a[i-1])):s;
}

