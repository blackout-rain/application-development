/* ---------- 次の目標（いま何をすればいいかの案内） ---------- */
// p が小さいほど優先。「すぐできること」を先に、そのあとに「少し先の目標」を、最大3つ出す
function goalList() {
  const g = [],
    add = (p, ic, t, tab, pct) => g.push({p, ic, t, tab, pct});
  if (G.home) add(0, '🌙', T('夜です。自宅で休んで、朝を迎えよう'), 'home');
  const b = G.boat < BOATS.length ? BOATS[G.boat] : null;
  if (b && G.money >= b.c)
    add(1, '⛵', T('「{1}」を買えます！（{2}に出られる）', [b.n, AREAS[G.boat + 1].name]), 'home');
  if (dailyReady()) add(1, '🎁', T('デイリーボーナスを受け取れます'), 'town');
  if (feat('tour') && isTourDay() && !G.home && !tourIn())
    add(1, '🏆', T('今日は釣り大会！ 参加は街タブから'), 'town');
  if (feat('orders')) {
    const n = G.ord.filter(o => G.fish.filter(f => ordMatch(o, f)).length >= o.q).length;
    if (n) add(1, '📦', T('注文を{1}件、納品できます（売値の{2}倍）', [n, ordMul().toFixed(1)]), 'sell');
  }
  if (!G.home && G.fish.length >= cap() - 1 && !G.autoSell)
    add(1, '🐟', T('魚箱がいっぱいです（{1}/{2}）。市場で売ろう', [G.fish.length, cap()]), 'sell');
  if (G.bp > 0) add(2, '💪', T('BPが{1}あります。ステータスに振り分けよう', [G.bp]), 'stat');
  if (feat('missions')) {
    ensureMissions();
    const left = G.msn.items.filter(m => !m.done).length;
    if (left) add(3, '✅', T('今日のミッション あと{1}つ', [left]), 'town');
  }
  if (b && G.money < b.c)
    add(4, '⛵', T('次の船「{1}」まで あと{2}', [b.n, yen(b.c - G.money)]), 'home', (G.money / b.c) * 100);
  const l = areaSp(G.area),
    rem = l.filter(s => !G.dex[s.n]).length;
  if (rem > 0 && rem <= 4)
    add(
      4,
      '📖',
      T('{1}のコンプまで あと{2}種', [AREAS[G.area].name, rem]),
      'dex',
      ((l.length - rem) / l.length) * 100
    );
  if (norenReady()) add(3, '🏮', T('のれん分けができます（街タブ）。のれんで永続の強化！'), 'town');
  if (G.comp[G.area] && !G.bossGot[G.area])
    add(4, '🐉', T('{1}が、釣りの最中にまれに現れます', [bossOf(G.area).n]), null);
  if (G.crew < crewMax()) {
    const c = hireCost(1);
    if (G.money >= c) add(5, '🧑', T('従業員を雇えます（水揚げが増えます）'), 'home');
  }
  const nf = FEATS.find(f => !feat(f.k));
  if (nf) add(6, '🔓', `${nf.n}：${nf.h}`, null);
  const ri = rankIdx(),
    nr = RANKS[ri + 1];
  if (nr)
    add(
      7,
      '🎖️',
      T('次のランク「{1}」まで あと{2}', [nr[1], yen(nr[0] - G.earned)]),
      null,
      ((G.earned - RANKS[ri][0]) / (nr[0] - RANKS[ri][0])) * 100
    );
  return g.sort((a, b) => a.p - b.p).slice(0, 3);
}
function renderGoals() {
  const el = $('#nextgoals');
  if (!el) return;
  const gl = goalList();
  setHtml(
    el,
    gl.length
      ? T('<h4>次の目標</h4>') +
          gl
            .map(
              x =>
                `<button class="goal${x.p <= 1 ? ' now' : ''}" ${x.tab ? `data-gtab="${x.tab}"` : 'disabled'}><span class="gi">${x.ic}</span><span>${x.t}</span>${x.pct !== undefined ? `<span class="gp"><i style="width:${Math.max(2, Math.min(100, x.pct))}%"></i></span>` : ''}</button>`
            )
            .join('')
      : ''
  );
  el.querySelectorAll('[data-gtab]').forEach(b => (b.onclick = () => openTab(b.dataset.gtab)));
}
