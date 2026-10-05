/* ---------- ライバル漁師（週間売上） ---------- */
// 毎晩ライバルが稼ぎ、7日ごと（大会の日の夜）に、自分の1週間の収入と順位を競う
const RV_SKILL = [0.55, 0.75, 0.95, 1.15, 1.4];
const weekStart = () => G.day - ((G.day - 1) % 7);
const weekInc = () =>
  G.hist
    .filter(h => h.d >= weekStart())
    .concat([Object.assign({d: G.day}, G.led)])
    .reduce((a, h) => a + recOf(h).inc, 0);
const rvDaily = () => tourBase() * 16 + G.crew * AREAS[G.boat].base * 0.6;
function rvStep() {
  G.rv.sc = G.rv.sc.map((v, i) => v + Math.round(rvDaily() * RV_SKILL[i] * rnd(0.7, 1.3)));
}
function rvStandings() {
  return RIVALS.map((n, i) => ({n, s: G.rv.sc[i]}))
    .concat([{n: T('あなた'), s: weekInc(), me: 1}])
    .sort((a, b) => b.s - a.s);
}
function rvSettle() {
  const all = rvStandings(),
    place = all.findIndex(x => x.me),
    bp = [2, 1, 1][place] || 0,
    rp = [4, 2, 1][place] || 0;
  if (bp) {
    G.bp += bp;
    addRep(rp);
  }
  if (place === 0) {
    G.rv.wins++;
    G.tk.auto += 2;
  }
  G.rv.last = {day: G.day, place, sc: all.map(x => x.n + ':' + x.s)};
  G.rv.sc = [0, 0, 0, 0, 0];
  return {all, place, bp, rp};
}
