/* ---------- 加工場 ---------- */
const procFee = f => Math.round(price(f, 0) * PROC_FEE * (1 - 0.18 * techLv('pack')));
const procFree = () => Math.max(0, plantCap(G.fac.plant) - G.proc.length);
function startProc(i, k) {
  const f = G.fish[i],
    pr = PROC[k];
  if (!f || !pr || (G.fac.plant || 0) < pr.lv || procFree() < 1) return;
  const base = price(f, 0),
    fee = procFee(f);
  if (G.money < fee) return;
  G.money -= fee;
  led('proc', fee);
  G.fish.splice(i, 1);
  G.proc.push({
    n: f.n,
    kind: pr.n,
    v: Math.round(base * pr.mul * (1 + 0.05 * techLv('pack'))),
    until: G.day + pr.nights
  });
  save();
  hud();
  renderAll();
  toast(T('{1}を{2}にしています（{3}晩）', [f.n, pr.n, pr.nights]));
}
function finishProc() {
  const done = G.proc.filter(x => x.until <= G.day);
  if (!done.length) return;
  G.proc = G.proc.filter(x => x.until > G.day);
  done.forEach(x => G.prod.push({n: x.n, kind: x.kind, v: x.v}));
  setTimeout(() => toast(T('加工品が{1}個できあがりました（市場タブ）', [done.length])), 1200);
}
const farmFree = () => Math.max(0, farmCap(G.fac.farm) - G.farm.length);
const farmVal = x => price({n: x.n, size: Math.round(x.sz), fresh: x.fr || 100, v: x.v, g: x.g}, 0);
function startFarm(i) {
  const f = G.fish[i],
    sp = f && SPM.get(f.n);
  if (!f || sp.boss || farmFree() < 1) return;
  G.fish.splice(i, 1);
  G.farm.push(Object.assign({n: f.n, sz: f.size, fr: f.fresh, g: f.g}, f.v ? {v: 1} : {}));
  save();
  hud();
  renderAll();
  toast(T('{1}を養殖いかだに入れました', [f.n]));
}
function harvestFarm(i) {
  const x = G.farm[i];
  if (!x) return;
  if (G.fish.length + (S.st === 'wait' || S.st === 'bite' || S.st === 'fight' ? 1 : 0) >= cap()) {
    toast(T('魚箱がいっぱいです。先に売ろう'));
    return;
  }
  G.farm.splice(i, 1);
  G.fish.push(Object.assign({n: x.n, size: Math.round(x.sz), fresh: x.fr || 100, g: x.g}, x.v ? {v: 1} : {}));
  save();
  hud();
  renderAll();
  toast(T('{1}（{2}cm）を引き上げました', [x.n, Math.round(x.sz)]));
}
function growFarm() {
  G.farm.forEach(x => {
    const sp = SPM.get(x.n);
    x.sz = Math.min(sp.max, x.sz + Math.max(0.2, (sp.max - x.sz) * 0.12));
  });
  // 繁殖：同じ種のオスとメスがいると、一晩で稚魚が生まれることがある（いかだに空きがあるとき）
  const names = [...new Set(G.farm.map(x => x.n))];
  let born = 0;
  names.forEach(n => {
    const m = G.farm.filter(x => x.n === n && x.g === 0),
      f = G.farm.filter(x => x.n === n && x.g === 1);
    if (m.length && f.length && farmFree() > 0 && Math.random() < BREED_CHANCE) {
      const sp = SPM.get(n),
        pv = [...m, ...f].some(x => x.v);
      G.farm.push(
        Object.assign({n, sz: sp.min, fr: 100, g: rndG()}, pv && Math.random() < 0.25 ? {v: 1} : {})
      );
      G.born = (G.born || 0) + 1;
      born++;
    }
  });
  if (born) setTimeout(() => toast(T('🐟 養殖いかだに、稚魚が{1}匹、生まれました！', [born])), 1500);
}
function sellProd() {
  const sum = G.prod.reduce((a, x) => a + x.v, 0);
  if (!sum) return;
  G.prod.forEach(x => {
    G.rev[x.n] = (G.rev[x.n] || 0) + x.v;
  });
  G.prod = [];
  G.money += sum;
  led('sell', sum);
  earn(sum);
  save();
  hud();
  renderAll();
  toast(T('加工品を{1}で売りました', [yen(sum)]));
}
