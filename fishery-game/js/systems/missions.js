/* ---------- デイリーミッション ---------- */
// 毎朝3つ。達成するたびに小さなごほうび、3つそろえるとボーナス
const dcN = k => (G.dc && G.dc[k]) || 0;
function dcAdd(k, n) {
  if (!G.dc) G.dc = {};
  G.dc[k] = (G.dc[k] || 0) + n;
}
function newMissions() {
  const pool = [
    () => {
      const t = [6, 10, 14][Math.floor(Math.random() * 3)];
      return {k: 'catch', n: T('魚を{1}匹釣る', [t]), t};
    },
    () => {
      const t = Math.round((tourBase() * [10, 18, 26][Math.floor(Math.random() * 3)]) / 10) * 10;
      return {k: 'sold', n: T('魚を合計{1}分、売る', [yen(t)]), t};
    },
    () => ({k: 'rare', n: T('珍しい魚（レア以上）を1匹釣る'), t: 1})
  ];
  if (feat('orders')) pool.push(() => ({k: 'ord', n: T('注文を1件納品する'), t: 1}));
  const items = [],
    pick = pool.slice();
  for (let i = 0; i < 3 && pick.length; i++) {
    const m = pick.splice(Math.floor(Math.random() * pick.length), 1)[0]();
    m.r = [{auto: 1}, {meal: 1}, {auto: 1}][i];
    m.done = 0;
    items.push(m);
  }
  return items;
}
function ensureMissions() {
  if (G.msn.day !== G.day) {
    G.msn = {day: G.day, items: newMissions(), bonus: 0};
    G.dc = {};
  }
}
function checkMsn() {
  if (!feat('missions')) return;
  ensureMissions();
  const got = [];
  G.msn.items.forEach(m => {
    if (!m.done && dcN(m.k) >= m.t) {
      m.done = 1;
      G.msnDone++;
      G.bp += m.r.bp || 0;
      G.tk.auto += m.r.auto || 0;
      G.tk.meal += m.r.meal || 0;
      got.push(m);
    }
  });
  if (G.msn.items.length && G.msn.items.every(m => m.done) && !G.msn.bonus) {
    G.msn.bonus = 1;
    G.bp += 1;
    G.tk.auto += 1;
    toast(T('🎉 今日のミッションを全部達成！ BP+1・おまかせ釣り券×1'));
    sfx(3);
    save();
  } else if (got.length) {
    toast(T('ミッション達成：{1}（{2}）', [got.map(m => m.n).join('、'), achRw(got[0].r)]));
    sfx(2);
    save();
  }
}
const msnHtml = () => {
  ensureMissions();
  return T(
    '<h2>今日のミッション</h2><div class="card" style="font-size:.84rem">{1}<div style="color:var(--sub);font-size:.76rem;margin-top:6px">3つ全部で、BP+1・おまかせ釣り券×1のボーナス。{2}</div></div>',
    [
      G.msn.items
        .map(
          m =>
            `<div class="ln"><span>${m.done ? '✅' : '⬜'} ${m.n}</span><span class="num" style="font-size:.78rem;color:${m.done ? 'var(--good)' : 'var(--sub)'}">${m.done ? T('達成') : `${Math.min(dcN(m.k), m.t)}/${m.t}`}　${achRw(m.r)}</span></div>`
        )
        .join(''),
      G.msn.bonus ? T('（受け取りずみ）') : ''
    ]
  );
};
