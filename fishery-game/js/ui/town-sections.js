function mealEffectHtml() {
  return G.meal
    ? T('<br><b style="color:var(--good)">いまの効果：{1}（{2}）あと{3}回</b>', [
        G.meal.n,
        fxText(G.meal.fx),
        G.meal.left
      ])
    : '';
}

function rivalsHtml() {
  return feat('tour')
    ? T(
        '    <h2>ライバル漁師（週間売上）</h2><div class="card"><div class="kv" style="font-size:.84rem">{1}</div>\n      <div style="color:var(--sub);font-size:.78rem;margin-top:6px">毎週、1週間の収入（売上・水揚げ・賞金など）で競います。次の発表は {2}日目の夜。入賞でBPと評判、1位はおまかせ釣り券もらえます。{3}　通算の1位：{4}回</div></div>',
        [
          rvStandings()
            .map(
              (x, i) =>
                `<span style="${x.me ? 'color:var(--accent);font-weight:700' : ''}">${i + 1}. ${x.n}</span><b class="num">${yen(x.s)}</b>`
            )
            .join(''),
          tourNext(),
          G.rv.last ? T('<br>前回：{1}位', [G.rv.last.place + 1]) : '',
          G.rv.wins
        ]
      )
    : '';
}

function tournamentHtml() {
  return feat('tour')
    ? T(
        '    <h2>釣り大会</h2><div class="card">{1}\n      <div class="kv" style="margin-top:6px;font-size:.82rem"><span>賞金 1位／2位／3位</span><b class="num">{2}／{3}／{4}</b>{5}<span>通算</span><b class="num">{6}回出場・優勝{7}回</b></div>\n      <div style="color:var(--sub);font-size:.78rem;margin-top:6px">7日ごとに開催。参加すると、その日に自分で釣った魚のうち、いちばん高い1匹でライバル5人と競います。</div></div>',
        [
          isTourDay() && !G.home
            ? tourIn()
              ? T(
                  '<div><b>参加中！</b> 今日の最高の一匹：<b class="num">{1}</b>{2}<div style="color:var(--sub);font-size:.8rem;margin-top:4px">夜にランキングが発表されます。高く売れる魚を釣ろう（おまかせ釣りは対象外・主は除く）。</div></div>',
                  [yen(G.tour.best), G.tour.bn ? `（${G.tour.bn}）` : '']
                )
              : T(
                  '<div><b>今日は大会の日です！</b></div><button class="big" id="tourGo" style="margin-top:6px" {1}>参加する（参加費{2}）</button>',
                  [G.home || G.money < tourFee() ? 'disabled' : '', yen(tourFee())]
                )
            : T('<div>次の大会は <b class="num">{1}日目</b>（あと{2}日）</div>', [
                tourNext(),
                tourNext() - G.day
              ]),
          yen(tourPrize(0)),
          yen(tourPrize(1)),
          yen(tourPrize(2)),
          G.tourLast
            ? T('<span>前回（{1}日目）</span><b class="num">{2}位{3}</b>', [
                G.tourLast.day,
                G.tourLast.place + 1,
                G.tourLast.prize ? `・${yen(G.tourLast.prize)}` : ''
              ])
            : '',
          G.tourN,
          G.tourWin
        ]
      )
    : '';
}

function branchesHtml() {
  return feat('branch')
    ? T('    <h2>支店（産地ブランド）</h2><div class="list">{1}</div>', [
        AREAS.map((a, i) =>
          i > G.boat
            ? ''
            : T(
                '<div class="item"><div class="t">{1}支店 <span class="num">Lv{2}{3}</span></div><button class="buy" data-branch="{4}" {5}>{6}</button><div class="s">{7}の魚の売値 +{8}%（次のLvで +{9}%）・維持費 毎晩{10}ずつ増える</div></div>',
                [
                  a.name,
                  brLv(i),
                  brLv(i) >= BR_MAX ? ' MAX' : '',
                  i,
                  brLv(i) >= BR_MAX || G.money < branchCost(i, brLv(i)) ? 'disabled' : '',
                  brLv(i) >= BR_MAX ? '—' : yen(branchCost(i, brLv(i))),
                  a.name,
                  6 * brLv(i),
                  6 * (brLv(i) + 1),
                  yen(Math.round((brLv(i) >= BR_MAX ? 0 : branchCost(i, brLv(i))) * 0.003))
                ]
              )
        ).join('')
      ])
    : '';
}

function companionsHtml() {
  return feat('pet')
    ? T('    <h2>相棒（ペット）</h2><div class="list">{1}</div>', [
        PETS.map(
          p =>
            `<div class="item"><div class="t">${p.e} ${p.n}</div><button class="buy" data-pet="${p.k}" ${G.pets[p.k] && G.pet === p.k ? 'disabled' : !G.pets[p.k] && G.money < p.c ? 'disabled' : ''}>${G.pets[p.k] ? (G.pet === p.k ? T('連れている') : T('連れていく')) : yen(p.c)}</button><div class="s">${p.d}</div></div>`
        ).join('')
      ])
    : '';
}

function labHtml() {
  return feat('tech')
    ? T('    <h2>研究所</h2><div class="list">{1}</div>', [
        TECH.map(t => {
          const l = techLv(t.k),
            max = l >= t.c.length,
            c = t.c[l];
          return `<div class="item"><div class="t">${t.n} <span class="num">Lv${l}${max ? ' MAX' : ''}</span></div><button class="buy" data-tech="${t.k}" ${max || G.money < c ? 'disabled' : ''}>${max ? '—' : yen(c)}</button><div class="s">${t.d}</div></div>`;
        }).join('')
      ])
    : '';
}

function baitShopHtml() {
  return feat('bait')
    ? T(
        '    <h2>釣具店（エサ・ルアー）</h2><div class="card"><div style="color:var(--sub);font-size:.78rem;margin-bottom:6px">魚には好物のエサがあります。つけると、好物の魚が{1}倍よく釣れます（1投で1個）。注文や大会で狙いたい魚があるときに。図鑑にも好物が載ります。</div>\n      {2}\n      <button class="ghost" id="baitOff" style="margin-top:6px" {3}>エサをつけない</button></div>',
        [
          BAIT_MUL,
          BAITS.map(b =>
            T(
              '<div class="ln" style="align-items:center;gap:6px"><span><b>{1}</b> <span style="color:var(--sub);font-size:.76rem">{2}</span><br><span class="num" style="font-size:.78rem">在庫 {3}個</span></span><span style="display:flex;gap:6px"><button class="chip" data-baitsel="{4}" aria-pressed="{5}">{6}</button><button class="chip" data-baitbuy="{7}" {8}>10個 {9}</button></span></div>',
              [
                b.n,
                b.d,
                G.bt[b.k],
                b.k,
                G.baitSel === b.k ? 'true' : 'false',
                G.baitSel === b.k ? T('使用中') : T('使う'),
                b.k,
                G.money < baitPack(b) ? 'disabled' : '',
                yen(baitPack(b))
              ]
            )
          ).join(''),
          G.baitSel ? '' : 'disabled'
        ]
      )
    : '';
}

function insuranceHtml() {
  return feat('bank')
    ? T(
        '    <h2>船の保険</h2><div class="card"><div class="kv"><span>加入状況</span><b>{1}</b><span>保険料（毎晩）</span><b class="num">{2}</b><span>故障したときの修理費</span><b class="num">{3}</b></div>\n      <button class="chip" id="insBtn" {4} style="margin-top:8px">{5}</button>\n      <div style="color:var(--sub);font-size:.78rem;margin-top:6px">朝に、ときどき船が故障します（約20日に1回）。保険に入っていると修理費は無料です（故障が起きた朝に加入していた場合）。保険料は夜の収支から引かれます。</div></div>',
        [
          G.ins ? T('加入中') : T('未加入'),
          G.boat > 0 ? yen(premium()) : '—',
          G.boat > 0 ? yen(repairCost()) : '—',
          G.boat > 0 ? '' : 'disabled',
          G.ins ? T('保険をやめる') : T('保険に入る')
        ]
      )
    : '';
}

function bankHtml() {
  return feat('bank')
    ? T(
        '    <h2>銀行</h2><div class="card"><div class="kv"><span>借入残高</span><b class="num {1}">{2}</b><span>あと借りられる額</span><b class="num">{3}</b><span>利息（毎晩・残高の{4}%）</span><b class="num">{5}</b></div>\n      <div class="row" style="margin-top:8px;flex-wrap:wrap">{6}</div>\n      <div class="row" style="margin-top:6px;flex-wrap:wrap"><button class="chip" data-repay="half" {7}>半分返す</button><button class="chip" data-repay="all" {8}>全額返す</button></div>\n      <div style="color:var(--sub);font-size:.78rem;margin-top:6px">船や設備を早く買うための資金に。利息は夜の収支で引かれます（払えない分は借入に上乗せ）。借りられる額は、これまでの売上に応じて増えます。</div></div>',
        [
          G.debt ? 'down' : '',
          yen(G.debt),
          yen(loanAvail()),
          LOAN_RATE * 100,
          yen(Math.round(G.debt * LOAN_RATE)),
          [0.25, 0.5, 1]
            .map(f => Math.floor((loanAvail() * f) / 1000) * 1000)
            .filter((a, i, ar) => a > 0 && ar.indexOf(a) === i)
            .map(a => T('<button class="chip" data-loan="{1}">{2}借りる</button>', [a, yen(a)]))
            .join('') || T('<span style="color:var(--sub);font-size:.8rem">いまは借りられません</span>'),
          G.debt && G.money ? '' : 'disabled',
          G.debt && G.money ? '' : 'disabled'
        ]
      )
    : '';
}

function mealMenuHtml() {
  const nxM = MENU.find(m => dexN() < m.need);
  const meals =
    MENU.map((m, i) =>
      dexN() < m.need
        ? ''
        : T(
            '<div class="item"><div class="t">{1}</div><button class="buy" data-meal="{2}" {3}>{4}</button><div class="s"><span style="color:var(--sub)">{5}</span><br>{6}<br><button class="chip" data-mealtk="{7}" {8} style="margin-top:6px">食事券{9}枚で食べる</button></div></div>',
            [
              m.n,
              i,
              G.money < mealCost(m) ? 'disabled' : '',
              yen(mealCost(m)),
              m.d,
              fxText(m.fx),
              i,
              G.tk.meal < m.tk ? 'disabled' : '',
              m.tk
            ]
          )
    ).join('') +
    (nxM
      ? T(
          '<div class="item" style="opacity:.6"><div class="t">🔒 {1}</div><div class="s">図鑑に載った魚があと{2}種増えると、メニューに加わります（いま{3}種）</div></div>',
          [nxM.n, nxM.need - dexN(), dexN()]
        )
      : '');
  return meals;
}
