function upgradesHtml() {
  return UP.map(u => {
    const lv = G.lv[u.k],
      max = lv >= u.c.length,
      c = u.c[lv];
    return T(
      '<div class="item"><div class="t">{1} <span class="num">Lv{2}{3}</span></div>\n      <button class="buy" data-up="{4}" {5}>{6}</button><div class="s">{7}<br><span style="opacity:.8">自宅での見え方：{8}</span></div></div>',
      [u.n, lv, max ? ' MAX' : '', u.k, max || G.money < c ? 'disabled' : '', max ? '—' : yen(c), u.d, u.at]
    );
  }).join('');
}

function boatItemHtml(b) {
  return b
    ? `<div class="item"><div class="t">${b.n}</div><button class="buy" data-boat="1" ${G.money < b.c ? 'disabled' : ''}>${yen(b.c)}</button><div class="s">${b.d}</div></div>`
    : T(
        '<div class="item"><div class="t">{1} 保有中</div><div class="s">すべての海域に出られる</div></div>',
        [BOATS[BOATS.length - 1].n]
      );
}

function crewSectionHtml(cc) {
  const w = AREAS[G.boat].wage,
    h = AREAS[G.boat].base;
  const cs = CR(),
    nF = cs.filter(m => m.r === 0).length,
    nS = cs.length - nF,
    wsum = cs.reduce((a, m) => a + wageOf(m), 0);
  return T(
    '<div class="item"><div class="t">従業員を雇う <span class="num">{1}/{2}人</span></div>\n    <button class="buy" data-crew="1" {3}>{4}</button>\n    <div class="s">{5}<br>働いた日数でレベルが上がり、水揚げも給料も増えます。一人ひとりに<b>特性</b>があります（釣り上手・商売上手・勤勉・倹約家・のんびり屋・ふつう）。給料の基本は{6}/日。雇える人数は自宅を大きくすると増えます（今は{7}人まで）。</div>\n    {8}</div>\n    {9}\n    {10}',
    [
      G.crew,
      crewMax(),
      G.crew >= crewMax() || G.money < cc ? 'disabled' : '',
      G.crew >= crewMax() ? '—' : yen(cc),
      feat('roles')
        ? T(
            '<b>釣り師</b>は釣りに同行して、1日約{1}を水揚げ。<b>営業</b>は水揚げの代わりに、魚の売値を底上げ（Lv×+{2}%・全員で+{3}%まで）。',
            [yen(h), Math.round(SALES_PER * 100), Math.round(SALES_MAX * 100)]
          )
        : T('いっしょに釣りに出て、1人あたり1日約{1}を水揚げ。', [yen(h)]),
      yen(w),
      crewMax(),
      !feat('hireX')
        ? ''
        : `<div class="row" style="grid-column:1/-1;flex-wrap:wrap;gap:6px;margin:4px 0">${[2, 3, 4, 5, 6, 7, 8].map(l => T('<button class="chip" data-hire="{1}" {2}>経験者 Lv{3}（水揚げ×{4}・給料×{5}）{6}</button>', [l, G.crew >= crewMax() || G.money < hireCost(l) ? 'disabled' : '', l, (1 + CLV_F * (l - 1)).toFixed(2), (1 + CLV_W * (l - 1)).toFixed(2), yen(hireCost(l))])).join('')}</div>`,
      cs.length && feat('roles')
        ? T(
            '<div class="card" style="margin:0;font-size:.82rem"><div class="kv"><span>釣り師／営業</span><b class="num">{1}人／{2}人</b><span>営業ボーナス（売値）</span><b class="num">+{3}%</b><span>給料の合計</span><b class="num down">{4}/日</b></div></div>',
            [nF, nS, Math.round(salesBonus() * 100), yen(wsum)]
          )
        : '',
      cs
        .map((m, i) => {
          const l = clv(m),
            nx = CLVX[l] && clvx(l);
          return T(
            '<div class="item"><div class="t">{1} <span class="num">Lv{2}</span> <span class="stars">{3}{4}</span> <span class="tag" style="background:var(--panel2);color:var(--fg)">{5}</span></div>\n      {6}\n      <div class="s"><span style="color:var(--accent)">{7}</span><br>{8}・給料{9}/日・{10}</div><div class="row" style="grid-column:1/-1;justify-content:flex-end"><button class="ghost" data-retire="{11}" style="font-size:.78rem;padding:7px 14px;min-height:36px">辞めてもらう</button></div></div>',
            [
              m.n,
              l,
              '★'.repeat(l),
              '☆'.repeat(CLVX.length - l),
              TRAITS[m.t].n,
              feat('roles')
                ? `<button class="chip" data-role="${i}" aria-pressed="${m.r ? 'true' : 'false'}" style="grid-row:span 2">${CROLE[m.r]}${m.nr !== undefined ? T('<br><span style="font-size:.68rem">→あした{1}</span>', [CROLE[m.nr]]) : ''}</button>`
                : '<span></span>',
              TRAITS[m.t].d,
              m.r
                ? T('売値+{1}%', [Math.round(SALES_PER * l * (TRAITS[m.t].s || 1) * 100)])
                : T('1日約{1}を水揚げ', [yen(h * fishMul(m))]),
              yen(wageOf(m)),
              nx ? T('次のLvまであと{1}日', [Math.ceil(nx - m.x)]) : T('最高レベル'),
              i
            ]
          );
        })
        .join('')
    ]
  );
}

function decoSectionHtml() {
  return feat('deco')
    ? T(
        '<h2>模様替え</h2><p style="color:var(--sub);font-size:.8rem;margin:0 0 8px">飾りを買うと、自宅の風景に並びます。見た目だけのお楽しみです。</p><div class="list">{1}</div>',
        [
          DECOS.map(
            d =>
              `<div class="item"><div class="t">${d.e} ${d.n}</div><button class="buy" data-deco="${d.k}" ${G.deco[d.k] || G.money < d.c ? 'disabled' : ''}>${G.deco[d.k] ? T('設置ずみ') : yen(d.c)}</button><div class="s">${G.deco[d.k] ? T('自宅に飾っています') : T('自宅の風景に飾る')}</div></div>`
          ).join('')
        ]
      )
    : '';
}
