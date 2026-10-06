/* ---------- のれん分け（周回）と伝説の主 ---------- */
// 漁業王になったら、財産をぜんぶ手放して「のれん」をもらい、最初からやり直せる。のれんは、永続の強化に使う。
const NR = [
  {k: 'sell', n: T('売値アップ'), d: T('魚の売値 +4%／Lv'), max: 10, c: l => 6 + 3 * l},
  {k: 'exp', n: T('経験値アップ'), d: T('もらえる経験値 +4%／Lv'), max: 10, c: l => 6 + 3 * l},
  {k: 'start', n: T('はじめの資金'), d: T('周回のはじめに ¥30,000／Lv'), max: 10, c: l => 4 + 3 * l},
  {k: 'cap', n: T('大きな魚箱'), d: T('魚箱 +2匹／Lv'), max: 5, c: l => 4 + 3 * l},
  {k: 'luck', n: T('色違いの運'), d: T('色違いが出る確率 +20%／Lv'), max: 5, c: l => 5 + 3 * l}
];
const nrLv = k => (G.nr && G.nr.lv && G.nr.lv[k]) || 0;
const lapOf = () => (G.nr && G.nr.n) || 0;
const lapDiff = () => 1 + 0.06 * Math.min(10, lapOf()); // 周回ごとに、魚の引きが少し強くなる
const norenReady = () => rankIdx() >= RANKS.length - 1;
const speedBonus = () => Math.max(0, Math.ceil((600 - G.day) / 20));
const norenGain = () => 12 + Math.floor(G.earned / 1e8) + speedBonus();
const legOk = a => feat('noren') && !!G.bossGot[a] && !!G.comp[a] && !G.legLap[a];
const NR_KEEP = [
  'v',
  'syncAt',
  'syncSig',
  'fs',
  'nudged',
  'tk',
  'dailyNo',
  'streak',
  'lastSeen',
  'playSec',
  'lastUp',
  'seen',
  'tut',
  'mute',
  'noFx',
  'noVib',
  'big',
  'diff',
  'autoSell',
  'level',
  'exp',
  'bp',
  'stat',
  'alloc',
  'msnDone',
  'pets',
  'pet',
  'deco',
  'fu',
  'fuInit',
  'ach',
  'catches',
  'dex',
  'mult',
  'prev',
  'comp',
  'bossGot',
  'nr',
  'leg'
];
function norenDo() {
  if (!norenReady()) return;
  makeBackup(G, 'local', T('のれん分けする前'));
  const gain = norenGain(),
    old = G,
    f = fresh();
  NR_KEEP.forEach(k => {
    if (old[k] !== undefined) f[k] = old[k];
  });
  f.nr = Object.assign({}, old.nr, {
    lv: Object.assign({}, old.nr.lv),
    n: old.nr.n + 1,
    pt: old.nr.pt + gain,
    tot: (old.nr.tot || 0) + gain
  });
  f.money = 500 + 30000 * f.nr.lv.start;
  G = f;
  S.st = 'idle';
  CREW.length = 0;
  syncCrew(true);
  applyUi();
  save();
  label();
  say(T('のれん分け！ {1}周目のはじまりです。', [lapOf() + 1]));
  renderAll();
  openTab('fish');
  banner(T('のれん分け！'), T('のれん+{1}・{2}周目', [gain, lapOf() + 1]), '#ffb454');
  toast(T('のれんを{1}もらいました。街タブで強化に使えます', [gain]));
}
function norenBuy(k) {
  const n = NR.find(x => x.k === k);
  if (!n) return;
  const l = nrLv(k);
  if (l >= n.max) return;
  const c = n.c(l);
  if (G.nr.pt < c) return;
  G.nr.pt -= c;
  G.nr.lv[k] = l + 1;
  save();
  hud();
  renderAll();
  toast(T('{1}が Lv{2} になりました', [n.n, l + 1]));
}
function norenConfirm() {
  const g = norenGain();
  $('#box').innerHTML = T(
    '<div class="help"><h3>のれん分けする？</h3><p>これまでの財産を手放して、{1}周目を始めます。<b>のれん {2}</b> がもらえます（基本12＋売上＋早さボーナス{3}）。</p><p><b>のこるもの</b>：図鑑・実績・主の記録・レベルとステータス・BP・券・ペットと模様替え・のれんの強化</p><p><b>消えるもの</b>：お金・船・設備・従業員・養殖・研究・支店・借入・魚箱・ランク</p><p style="color:var(--sub);font-size:.82rem">周回するたび、魚の引きが少し強くなります。はじめる前の状態は、設定の「控え」から戻せます。</p><div class="row"><button class="ghost" id="nrNo">やめる</button><button class="big" id="nrYes" style="flex:1;width:auto">のれん分けする</button></div></div>',
    [lapOf() + 2, g, speedBonus()]
  );
  $('#veil').hidden = false;
  $('#nrNo').onclick = () => {
    $('#veil').hidden = true;
  };
  $('#nrYes').onclick = () => {
    $('#veil').hidden = true;
    norenDo();
  };
}
function norenHtml() {
  if (!feat('noren')) return '';
  const ready = norenReady(),
    legs = AREAS.map((a, i) =>
      G.bossGot[i] && G.comp[i]
        ? `<span class="chip" style="${G.legLap[i] ? 'opacity:.5' : ''}">${bossOf(i).n}${G.legLap[i] ? ' ✓' : ''}</span>`
        : ''
    ).join('');
  const perks = NR.map(n => {
    const l = nrLv(n.k),
      max = l >= n.max,
      c = n.c(l);
    return `<div class="item"><div class="t">${n.n} <span class="num">Lv${l}${max ? ' MAX' : ''}</span></div><button class="buy" data-nrbuy="${n.k}" ${max || G.nr.pt < c ? 'disabled' : ''}>${max ? '—' : T('のれん') + c}</button><div class="s">${n.d}</div></div>`;
  }).join('');
  return T(
    '<h2>のれん分け</h2><div class="card"><div class="kv"><span>いま</span><b class="num">{1}周目</b></div><div class="kv"><span>のれん（つかえる）</span><b class="num">{2}</b></div>\n    <button class="big" id="nrGo" {3}>{4}</button>\n    <div style="color:var(--sub);font-size:.78rem;margin-top:6px">財産を手放して最初から。のれんで、永続の強化ができます。主を倒した海域には、さらに強い<b>伝説の主</b>が現れます（海域ごとに1周に1体。倒すとのれん+4）。</div>\n    {5}\n    <div class="list" style="margin-top:8px">{6}</div></div>',
    [
      lapOf() + 1,
      G.nr.pt,
      ready ? '' : 'disabled',
      ready
        ? T('のれん分けする（のれん+{1}）', [norenGain()])
        : T('のれん分け：ランク「漁業王」になると、できます'),
      legs ? `<div class="row" style="margin-top:6px;flex-wrap:wrap">${legs}</div>` : '',
      perks
    ]
  );
}
