/* ---------- rank ---------- */
const rankIdx = () => RANKS.filter(r => G.earned >= r[0]).length - 1;
function perks() {
  const o = {cap: 0, sell: 0, rare: 0, tens: 0, reel: 0};
  for (let i = 0; i <= rankIdx(); i++) {
    const p = RANKS[i][2];
    for (const k in o) o[k] += p[k] || 0;
  }
  o.sell += 4 * nrLv('sell');
  o.cap += 2 * nrLv('cap');
  return o;
}
function earn(n) {
  const b = rankIdx();
  G.earned += n;
  const a = rankIdx();
  if (a > b) {
    let gold = 0;
    for (let i = Math.max(b + 1, G.rankGot + 1); i <= a; i++) gold += RANKS[i][2].gold || 0;
    G.rankGot = Math.max(G.rankGot, a);
    G.money += gold;
    led('gold', gold);
    const r = RANKS[a];
    banner(T('ランクアップ！'), `${r[1]}　${r[3]}`, '#ffd24a');
    toast(T('ランクアップ！「{1}」 {2}', [r[1], r[3]]));
    sfx(3);
    save();
  }
}
function showRanks() {
  const ri = rankIdx(),
    pk = perks();
  const tot =
    [
      pk.sell && T('売値+{1}%', [pk.sell]),
      pk.cap && T('魚箱+{1}', [pk.cap]),
      pk.rare && T('珍しい魚が寄りやすい(+{1})', [pk.rare]),
      pk.tens && T('糸が強い(テンション-{1}%)', [pk.tens]),
      pk.reel && T('巻き上げ+{1}%', [pk.reel])
    ]
      .filter(Boolean)
      .join('、') || T('まだありません');
  $('#box').innerHTML = T(
    '<h3>ランクと特典</h3><p style="color:var(--sub);font-size:.85rem;margin:0 0 10px">ランクが上がると、祝い金と特典がもらえます。<br>現在の特典：{1}</p>\n    <div class="list">{2}</div>\n    <button class="big" id="rk" style="margin-top:12px">閉じる</button>',
    [
      tot,
      RANKS.map((r, i) =>
        i
          ? `<div class="item" style="${i === ri ? 'outline:2px solid var(--accent)' : ''}"><div class="t">${i <= ri ? '✓ ' : ''}${r[1]}</div><div class="s num" style="grid-row:span 2;text-align:right">${yen(r[0])}〜</div><div class="s">${r[3]}</div></div>`
          : ''
      ).join('')
    ]
  );
  $('#veil').hidden = false;
  $('#rk').onclick = () => ($('#veil').hidden = true);
}
// トースト：順番に表示する（前のメッセージを上書きしない）。モーダルが開いているときは、上に出して、ボタンを隠さない
let toastT,
  toastQ = [],
  toastBusy = false;
function toast(m) {
  if (toastQ.length && toastQ[toastQ.length - 1] === m) return;
  if (toastQ.length >= 4) toastQ.shift();
  toastQ.push(m);
  if (!toastBusy) toastNext();
}
function toastNext() {
  const t = $('#toast'),
    m = toastQ.shift();
  if (m === undefined) {
    toastBusy = false;
    t.hidden = true;
    return;
  }
  toastBusy = true;
  t.textContent = m;
  t.hidden = false;
  if (veilOpen()) {
    t.style.top = '12px';
    t.style.bottom = 'auto';
  } else {
    t.style.top = '';
    t.style.bottom = '';
  }
  clearTimeout(toastT);
  toastT = setTimeout(toastNext, toastQ.length ? 2400 : 3800);
}
