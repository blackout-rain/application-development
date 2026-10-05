/* ---------- ui ---------- */
const setHtml = (el, h) => {
  if (el._h !== h) {
    el.innerHTML = h;
    el._h = h;
  }
};
function hud() {
  tutRender();
  $('#day').textContent = G.day;
  $('#clock').textContent = G.home
    ? T('夜')
    : `${Math.floor(G.min / 60)}:${String(G.min % 60).padStart(2, '0')}`;
  $('#money').textContent = yen(G.money);
  const ri = rankIdx(),
    nx = RANKS[ri + 1];
  $('#rank').textContent = RANKS[ri][1] + (lapOf() ? T('・{1}周目', [lapOf() + 1]) : '');
  $('#goal').style.width = (nx ? ((G.earned - RANKS[ri][0]) / (nx[0] - RANKS[ri][0])) * 100 : 100) + '%';
  $('#goalv').textContent = nx ? T('次は「{1}」あと{2}', [nx[1], yen(nx[0] - G.earned)]) : T('最高ランク！');
  $('#perk').textContent = nx ? T('次の特典：{1}（タップで一覧）', [nx[3]]) : T('すべての特典を獲得！');
  setHtml(
    document.querySelector('[data-tab=sell]'),
    G.fish.length ? T('市場({1})', [G.fish.length]) : T('市場')
  );
  hint();
  $('#cap').textContent = `${G.fish.length}/${cap()}`;
  $('#lv').textContent = G.level;
  $('#xp').style.width = Math.min(100, (G.exp / expNeed(G.level)) * 100) + '%';
  $('#xpv').textContent =
    `${G.level >= 99 ? T('最大レベル') : T('次のLvまで{1}EXP', [expNeed(G.level) - G.exp])}${G.bp ? `・BP ${G.bp}` : ''}`;
  setHtml(
    document.querySelector('[data-tab=stat]'),
    T('ステータス{1}', [G.bp ? `<i class="dot">${G.bp}</i>` : ''])
  );
  setHtml(
    document.querySelector('[data-tab=town]'),
    T('街{1}', [dailyReady() ? '<i class="dot">!</i>' : ''])
  );
  setHtml(
    document.querySelector('[data-tab=set]'),
    T('設定{1}', [
      Cloud.kind === 'app' && Cloud.status === 'signedout' && hasProgress() ? '<i class="dot">!</i>' : ''
    ])
  );
  $('#tkn').textContent = G.tk.auto;
  $('#evline').textContent = [
    G.baitSel && T('🪱 {1}（残り{2}）', [BAITS.find(b => b.k === G.baitSel).n, G.bt[G.baitSel]]),
    G.fix > 0 &&
      T('🔧 船が故障中（{1}）', [G.ins ? T('保険で無料') : T('修理費{1}・夜に支払い', [yen(G.fix)])]),
    isTourDay() &&
      !G.home &&
      (tourIn()
        ? T('🏆 大会参加中：ベスト {1}', [yen(G.tour.best)])
        : T('🏆 今日は釣り大会！（街タブから参加）')),
    feat('tide') &&
      !G.home &&
      `🌊 ${tideNow() ? T('満潮中！（アタリが早く、珍しい魚が寄る）') : T('満潮 {1}:00〜{2}:00', [tideStartH(), tideStartH() + 2])}`,
    feat('season') &&
      T('{1}{2}（{3}/{4}日目）・{5}{6}{7}', [
        SEASONS[seasonOf()].e,
        SEASONS[seasonOf()].n,
        ((G.day - 1) % SEASON_LEN) + 1,
        SEASON_LEN,
        WX[G.wx || 0].e,
        WX[G.wx || 0].n,
        WX[G.wx || 0].d ? '：' + WX[G.wx || 0].d : ''
      ]),
    ev() && T('{1} 今日のできごと：{2}（{3}）', [ev().e, ev().n, ev().d]),
    G.debt > 0 && T('💳 借入 {1}', [yen(G.debt)])
  ]
    .filter(Boolean)
    .join('　');
  checkFeat();
  checkAch();
  checkMsn();
  if (typeof curTab !== 'undefined' && curTab === 'fish') renderGoals();
  $('#mealline').textContent = G.meal
    ? T('食事効果：{1}（{2}）あと{3}回', [G.meal.n, fxText(G.meal.fx), G.meal.left])
    : '';
}
function renderAreas() {
  $('#areas').innerHTML = AREAS.map((a, i) => {
    const l = areaSp(i),
      f = l.filter(s => G.dex[s.n]).length;
    return `<button class="chip" data-area="${i}" aria-pressed="${G.area === i}">${i > G.boat ? '🔒 ' : ''}${a.name} <span class="num">${f}/${l.length}</span>${G.comp[i] ? ' <span style="color:var(--good)">✓</span>' : ''}${G.comp[i] && !G.bossGot[i] ? T(' <span style="color:var(--bad)">主</span>') : ''}${G.bossGot[i] ? T(' <span style="color:var(--accent)">主✓</span>') : ''}</button>`;
  }).join('');
  $('#areas')
    .querySelectorAll('button')
    .forEach(
      b =>
        (b.onclick = () => {
          const i = +b.dataset.area;
          if (i > G.boat) {
            openTab('home');
            toast(T('「船」を買うと出られます'));
            return;
          }
          if (S.st !== 'idle') {
            toast(T('釣りの合間に切り替えてね'));
            return;
          }
          G.area = i;
          save();
          renderAreas();
        })
    );
}
function renderSell() {
  const sorted = G.fish.map((f, i) => ({f, i, p: price(f)})).sort((a, b) => b.p - a.p);
  const total = sorted.reduce((a, x) => a + x.p, 0);
  const items = fishListHtml(sorted);
  const market = marketBoardHtml();
  if (feat('orders') && !G.ordSeq) refreshOrders(); // 初回だけ。あとは毎朝
  const rsv = reservedIdx(),
    all = G.fish.map((_, i) => i).filter(i => !rsv.has(i)),
    qa = quote(all),
    sc = stallCap();
  const plantSec = plantSectionHtml();
  const farmSec = farmSectionHtml();
  const rx = REPX[repLv() + 1],
    ordSec = ordersSectionHtml(rx);
  const ship = shippingSectionHtml(sc);
  $('#p-sell').innerHTML = T(
    '<h2>魚箱（{1}/{2}）</h2><p style="color:var(--sub);font-size:.8rem;margin:0 0 8px">大きい魚（★が多い魚）ほど高く売れます。</p>\n    <button class="big" id="sellall" {3}>すべて売る {4}</button>{5}{6}{7}{8}{9}\n    <div class="card" style="margin:10px 0 0;font-size:.82rem"><b>売値ボーナス</b>\n      <div class="kv" style="margin-top:6px"><span>直売所 Lv{10}（自宅・設備タブで強化）</span><b class="num">+{11}%</b><span>ランク特典</span><b class="num">+{12}%</b>{13}<span>エリアコンプ（そのエリアの魚のみ）</span><b class="num">+5%／エリア</b></div>\n      <div style="color:var(--sub);margin-top:6px">このほか、魚の大きさ・鮮度・今日の相場でも値段が変わります。</div></div>\n    <div class="list" style="margin-top:10px">{14}</div>\n    {15}\n    <h2>今日の相場</h2><p style="color:var(--sub);font-size:.78rem;margin:0 0 6px;{16}">{17}の旬の魚（<span class="tag" style="background:var(--good)">旬</span>）は、よく釣れて売値も+{18}%です。</p><div>{19}</div>',
    [
      G.fish.length,
      cap(),
      all.length ? '' : 'disabled',
      yen(qa.sum),
      rsv.size
        ? T(
            '<div style="color:var(--sub);font-size:.76rem;margin-top:4px">注文に使える魚{1}匹は残します（1匹ずつなら売れます）</div>',
            [rsv.size]
          )
        : '',
      ordSec,
      plantSec,
      farmSec,
      ship,
      G.lv.mkt,
      mktBonus(G.lv.mkt),
      perks().sell,
      feat('roles')
        ? T('<span>営業の従業員（育てるほど増える）</span><b class="num">+{1}%</b>', [
            Math.round(salesBonus() * 100)
          ])
        : '',
      items || T('<p style="color:var(--sub)">魚箱は空です。釣りに出よう。</p>'),
      feat('report')
        ? T('<h2>経営</h2>{1}{2}', [pnlHtml(G.led), reportHtml().replace(/^<h2>.*?<\/h2>/, '')])
        : '',
      feat('season') ? '' : 'display:none',
      SEASONS[seasonOf()].n,
      Math.round((SEA_PRICE - 1) * 100),
      market
    ]
  );
  bindSell(all);
}
function sellCore(idx) {
  const q = quote(idx);
  q.rows.forEach(r => {
    G.rev[r.n] = (G.rev[r.n] || 0) + r.p;
  });
  G.sat = q.sat;
  G.stall += q.stall;
  G.fish = G.fish.filter((_, i) => !idx.includes(i));
  G.money += q.sum;
  led('sell', q.sum);
  dcAdd('sold', q.sum);
  earn(q.sum);
  return q.sum;
}
function sell(idx) {
  const n = sellCore(idx);
  save();
  hud();
  renderAll();
  return n;
}
function renderShop() {
  const ups = upgradesHtml();
  const b = BOATS[G.boat];
  const boat = boatItemHtml(b);
  const cc = Math.round((1500 * Math.pow(1.6, G.crew)) / 100) * 100; // 従業員を雇う値段（ボタンを押したときにも使う）
  const crew = crewSectionHtml(cc);
  $('#p-shop').innerHTML = T(
    '<h2>設備：道具</h2><div class="list">{1}</div><h2>船</h2><div class="list">{2}</div><h2>人</h2><div class="list">{3}</div>{4}',
    [ups, boat, crew, decoSectionHtml()]
  );
  bindShop(b, cc);
}
const stars = (sp, size) => {
  const n = 1 + Math.min(4, Math.floor(((size - sp.min) / (sp.max - sp.min)) * 5));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
};
function renderDex() {
  const got = NORM.filter(s => G.dex[s.n]).length,
    bg = Object.keys(G.bossGot).length;
  const card = s => {
    const d = G.dex[s.n];
    return `<div class="item"><img class="ic ${d ? '' : 'off'}" src="${icon(s)}" alt=""><div class="t">${d ? s.n : '？？？'}${tag(s)}</div>
      <div class="s">${d ? T('最大 <span class="stars">{1}</span> <span class="num">{2}cm</span><br>最小 <span class="stars">{3}</span> <span class="num">{4}cm</span><br>×{5}匹{6}　<span class="num" style="opacity:.7">({7}〜{8}cm)</span><br>性別：<span style="color:{9}">♂</span>{10}　<span style="color:{11}">♀</span>{12}{13}<br>色違い：{14}', [stars(s, d.best), d.best, stars(s, d.min), d.min, d.c, feat('bait') ? T('・好物 {1}', [baitOf(s).n]) : '', s.min, s.max, GCOL[0], d.g && d.g[0] ? `×${d.g[0]}` : '<span style="opacity:.5">？</span>', GCOL[1], d.g && d.g[1] ? `×${d.g[1]}` : '<span style="opacity:.5">？</span>', d.pair ? T(' <span class="tag" style="background:var(--good)">ペア</span>') : '', d.vc ? `<img class="ic" src="${icon(vSp(s))}" alt="" style="height:1.3em;width:auto;vertical-align:middle"> <b>${vSp(s).vt.l.replace(/の$/, '')}</b> ×${d.vc}` : '<span style="opacity:.6">？</span>']) : T('{1}に生息', [AREAS[s.a].name])}</div></div>`;
  };
  const lock = (s, i) =>
    `<div class="item"><img class="ic off" src="${icon(s)}" alt=""><div class="t">？？？${tag(s)}</div><div class="s">${G.comp[i] ? T('この海域の主が潜んでいる…') : T('この海域をコンプすると現れる')}</div></div>`;
  $('#p-dex').innerHTML =
    T(
      '<h2>図鑑 <span class="num">{1}/{2}</span>　<span class="num" style="color:var(--bad)">主 {3}/{4}</span></h2><p style="color:var(--sub);font-size:.8rem;margin:0 0 10px">★は、その魚の大きさの範囲のどのあたりかを表します（★1＝小さい、★5＝大きい）。海域の魚を全種類釣るとコンプボーナス。コンプすると主が現れます。</p>',
      [got, NORM.length, bg, AREAS.length]
    ) +
    (!feat('ach')
      ? ''
      : T(
          '<h2>実績 <span class="num">{1}/{2}</span></h2><div class="card" style="margin:0 0 10px;font-size:.82rem">{3}</div>',
          [
            achVis().filter(a => G.ach[a.id]).length,
            achVis().length,
            achVis()
              .map(a => {
                const d = G.ach[a.id];
                return `<div class="ln" style="${d ? '' : 'opacity:.6'}"><span>${d ? '🏅' : '🔒'} <b>${a.n}</b>　<span style="color:var(--sub)">${a.d}</span></span><span class="num" style="font-size:.74rem;color:${d ? 'var(--good)' : 'var(--sub)'}">${d ? T('{1}日目', [d]) : achRw(a.r)}</span></div>`;
              })
              .join('')
          ]
        )) +
    AREAS.map((a, i) => {
      const l = areaSp(i),
        f = l.filter(s => G.dex[s.n]).length,
        bs = bossOf(i);
      return `<h2>${a.name} <span class="num">${f}/${l.length}</span>${G.comp[i] ? T(' <span class="tag" style="background:var(--good)">コンプ</span>') : ''}</h2><div class="dex">${l.map(card).join('')}${G.dex[bs.n] ? card(bs) : lock(bs, i)}</div>`;
    }).join('');
}
let curTab = 'fish',
  ptrDown = false,
  dirty = false;
const TABR = {
  fish: () => {
    renderAreas();
    renderGoals();
  },
  sell: renderSell,
  town: () => renderTown(),
  home: () => {
    renderHome();
    renderShop();
  },
  stat: () => renderStat(),
  dex: renderDex,
  set: () => {}
};
function renderAll() {
  hud();
  if (ptrDown) {
    dirty = true;
    return;
  }
  dirty = false;
  (TABR[curTab] || (() => {}))();
}
addEventListener(
  'pointerdown',
  () => {
    ptrDown = true;
  },
  true
);
['pointerup', 'pointercancel'].forEach(ev =>
  addEventListener(
    ev,
    () => {
      ptrDown = false;
      if (dirty)
        setTimeout(() => {
          if (!ptrDown && dirty) renderAll();
        }, 150);
    },
    true
  )
);
