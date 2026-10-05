/* ---------- 経営レポート ---------- */
const recOf = d => {
  const inc = (d.sell || 0) + (d.ord || 0) + (d.prize || 0) + (d.crew || 0) + (d.gold || 0),
    exp =
      (d.wage || 0) +
      (d.upk || 0) +
      (d.int || 0) +
      (d.proc || 0) +
      (d.fee || 0) +
      (d.repair || 0) +
      (d.ins || 0) +
      (d.feed || 0) +
      (d.meal || 0) +
      (d.tk || 0);
  return {d: d.d, inc, exp, pf: inc - exp, buy: d.buy || 0};
};
const signYen = n => (n < 0 ? '-' : '+') + yen(Math.abs(n));
// 1日ぶんの収支表。dayEnd（夜の画面）と、市場タブの「今日の収支」で使う
function pnlHtml(d, crewLabel) {
  const r = recOf(d),
    row = (l, v, neg) =>
      v
        ? `<div class="ln"><span>${l}</span><b class="num ${neg ? 'down' : 'up'}">${neg ? '-' : '+'}${yen(v)}</b></div>`
        : '';
  return T(
    '<div class="card" style="margin:0 0 8px;padding:8px 10px"><b style="font-size:.85rem">今日の収支</b>\n    {1}{2}{3}{4}{5}\n    {6}{7}{8}{9}{10}{11}{12}{13}{14}\n    <div class="ln" style="border-top:1px solid var(--line);margin-top:4px;padding-top:4px"><span><b>営業利益</b></span><b class="num {15}">{16}</b></div>\n    {17}</div>',
    [
      row(T('魚の売上'), d.sell || 0),
      row(T('注文の納品'), d.ord || 0),
      row(T('大会の賞金'), d.prize || 0),
      row(crewLabel || T('従業員の水揚げ'), d.crew || 0),
      row(T('祝い金・ボーナス'), d.gold || 0),
      row(T('従業員の給料'), d.wage || 0, 1),
      row(T('船の維持費'), d.upk || 0, 1),
      row(T('借入の利息'), d.int || 0, 1),
      row(T('加工賃'), d.proc || 0, 1),
      row(T('大会の参加費'), d.fee || 0, 1),
      row(T('船の修理費'), d.repair || 0, 1),
      row(T('保険料'), d.ins || 0, 1),
      row(T('養殖の飼料代'), d.feed || 0, 1),
      row(T('食事・券'), (d.meal || 0) + (d.tk || 0), 1),
      r.pf < 0 ? 'down' : 'up',
      signYen(r.pf),
      row(T('設備・船・人への投資'), r.buy, 1)
    ]
  );
}
function reportHtml() {
  const days = G.hist.slice(-7).map(recOf),
    today = recOf(Object.assign({d: G.day}, G.led));
  let body = T(
    '<p style="color:var(--sub);font-size:.82rem;margin:0">夜を越えると、1日ぶんの記録がたまります。</p>'
  );
  if (days.length) {
    const mx = Math.max(1, ...days.map(x => x.inc)),
      n = days.length,
      sum = k => days.reduce((a, x) => a + x[k], 0);
    const bars = days
      .map(
        x =>
          `<div class="rb"><div class="rbi" style="height:${Math.max(3, Math.round((x.inc / mx) * 100))}%"><i class="rbx" style="height:${x.inc ? Math.min(100, Math.round((x.exp / x.inc) * 100)) : 0}%"></i></div><span class="num">${x.d}</span></div>`
      )
      .join('');
    const inc = sum('inc'),
      exp = sum('exp');
    body = T(
      '<div class="rbs" role="img" aria-label="直近{1}日の収入と経費">{2}</div>\n      <div style="color:var(--sub);font-size:.72rem;margin:2px 0 8px">棒の高さ＝収入　下の濃い部分＝経費（給料・食事・券）</div>\n      <div class="kv"><span>1日の営業利益（平均）</span><b class="num {3}">{4}</b><span>経費率（経費÷収入）</span><b class="num">{5}%</b><span>投資（直近{6}日の合計）</span><b class="num">{7}</b>{8}</div>',
      [
        n,
        bars,
        sum('pf') < 0 ? 'down' : 'up',
        signYen(Math.round(sum('pf') / n)),
        inc ? Math.round((exp / inc) * 100) : 0,
        n,
        yen(sum('buy')),
        G.debt ? T('<span>借入残高</span><b class="num down">{1}</b>', [yen(G.debt)]) : ''
      ]
    );
  }
  const top = Object.entries(G.rev)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    tot = Object.values(G.rev).reduce((a, v) => a + v, 0);
  const best = top.length
    ? T('<div style="margin-top:8px"><b style="font-size:.85rem">稼ぎ頭の魚（累計の売上）</b>{1}</div>', [
        top
          .map(([n, v], i) => {
            const sp = SP.find(x => x.n === n);
            return `<div class="ln"><span>${i + 1}. ${sp ? ico(sp) : ''}${n}</span><span class="num">${yen(v)}（${Math.round((v / tot) * 100)}%）</span></div>`;
          })
          .join('')
      ])
    : '';
  return T('<h2>経営レポート</h2><div class="card" style="margin:0">{1}{2}</div>', [body, best]);
}
