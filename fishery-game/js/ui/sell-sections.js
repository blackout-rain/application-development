function fishListHtml(sorted) {
  return sorted
    .map(({f, i, p}) => {
      const sp = SP.find(s => s.n === f.n);
      return T(
        '<div class="item"><div class="t">{1}{2}{3}{4} <span class="num">{5}cm</span> <span class="stars">{6}</span></div>\n      <button class="buy" data-i="{7}">{8}</button><div class="s">鮮度 <span class="num">{9}%</span>　サイズ補正 <span class="num">×{10}</span></div>{11}{12}</div>',
        [
          ico(f.v ? vSp(sp) : sp),
          fname(f),
          gmark(f),
          tag(sp),
          f.size,
          stars(sp, f.size),
          i,
          yen(quote([i]).sum),
          f.fresh,
          sizeMul(sp, f.size).toFixed(2),
          (G.fac.farm || 0) > 0 && farmFree() > 0 && !sp.boss
            ? T(
                '<div class="row" style="grid-column:1/-1;gap:6px;margin-top:4px"><button class="chip" data-farm="{1}" style="font-size:.78rem;padding:7px 12px;min-height:38px">養殖いかだで育てる（毎日ぐんぐん大きくなる）</button></div>',
                [i]
              )
            : '',
          (G.fac.plant || 0) > 0 && procFree() > 0
            ? `<div class="row" style="grid-column:1/-1;gap:6px;margin-top:4px">${PROC.filter(
                pr => G.fac.plant >= pr.lv
              )
                .map((pr, k) =>
                  T(
                    '<button class="chip" data-proc="{1}:{2}" style="font-size:.78rem;padding:7px 12px;min-height:38px">{3}にする（売値×{4}・{5}晩・加工賃{6}）</button>',
                    [i, k, pr.n, pr.mul, pr.nights, yen(procFee(f))]
                  )
                )
                .join('')}</div>`
            : ''
        ]
      );
    })
    .join('');
}

function marketBoardHtml() {
  return NORM.filter(s => s.a <= G.boat)
    .map(s => {
      const m = G.mult[s.n],
        d = m - G.prev[s.n],
        sv = G.sat[s.n] || 0;
      return `<div class="ln"><span>${ico(s)}${s.n}${inSeason(s) ? T(' <span class="tag" style="background:var(--good)">旬</span>') : ''}</span><span class="num">${sv ? T('<span class="down" style="font-size:.78rem">需給−{1}%</span> ', [Math.round(sv * 100)]) : ''}×${m.toFixed(2)} <span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'}</span></span></div>`;
    })
    .join('');
}

function plantSectionHtml() {
  return (G.fac.plant || 0) > 0 || G.prod.length
    ? T(
        '<h2>加工場{1}</h2><div class="card" style="margin:0;font-size:.82rem">{2}\n    <div class="kv" style="margin-top:6px"><span>加工品の在庫</span><b class="num">{3}個（{4}）</b></div>\n    <button class="big" id="sellprod" style="margin-top:6px" {5}>加工品をすべて売る</button></div>',
        [
          (G.fac.plant || 0) > 0 ? ` <span class="num">${G.proc.length}/${plantCap(G.fac.plant)}</span>` : '',
          G.proc.length
            ? `<div class="kv">${G.proc.map(x => `<span>${x.kind}：${x.n}</span><b class="num">${x.until <= G.day ? T('まもなく') : T('{1}晩あと', [x.until - G.day])}</b>`).join('')}</div>`
            : T(
                '<div style="color:var(--sub)">加工中の魚はありません。下の魚箱の「干物にする」などで加工できます。</div>'
              ),
          G.prod.length,
          yen(G.prod.reduce((a, x) => a + x.v, 0)),
          G.prod.length ? '' : 'disabled'
        ]
      )
    : '';
}

function farmSectionHtml() {
  return (G.fac.farm || 0) > 0 || G.farm.length
    ? T('<h2>養殖いかだ <span class="num">{1}/{2}</span></h2><div class="list">{3}</div>', [
        G.farm.length,
        farmCap(G.fac.farm),
        G.farm
          .map((x, i) => {
            const sp = SPM.get(x.n),
              nx = Math.min(sp.max, x.sz + Math.max(0.2, (sp.max - x.sz) * 0.12));
            return T(
              '<div class="item"><div class="t">{1}{2}{3} <span class="num">{4}cm</span> <span class="stars">{5}</span></div><button class="buy" data-harvest="{6}">引き上げる<br><span class="num" style="font-size:.74rem">{7}</span></button><div class="s">あしたは {8}cm（最大 {9}cm）・飼料代 毎晩{10}</div></div>',
              [
                ico(x.v ? vSp(sp) : sp),
                fname(x),
                gmark(x),
                Math.round(x.sz),
                stars(sp, Math.round(x.sz)),
                i,
                yen(farmVal(x)),
                Math.round(nx),
                sp.max,
                yen(Math.round(farmVal(x) * 0.03))
              ]
            );
          })
          .join('') ||
          T(
            '<p style="color:var(--sub);font-size:.82rem;margin:0">いかだは空です。魚箱の魚の「養殖いかだで育てる」から入れよう。</p>'
          )
      ])
    : '';
}

function ordersSectionHtml(rx) {
  return !feat('orders')
    ? ''
    : T(
        '<h2>注文（常連さんから）</h2><div style="color:var(--sub);font-size:.78rem;margin:-2px 0 6px">評判 Lv{1}（{2}pt{3}）：報酬×{4}・注文{5}件・融資の上限+{6}%</div><div class="list">{7}</div>',
        [
          repLv(),
          G.rep,
          rx ? T('・次のLvまで{1}', [rx - G.rep]) : T('・最高'),
          ordMul().toFixed(2),
          ordMax(),
          Math.round(15 * repLv()),
          G.ord
            .map(o => {
              const sp = SP.find(s => s.n === o.n),
                have = G.fish.filter(f => ordMatch(o, f)).length,
                ok = have >= o.q;
              return T(
                '<div class="item"><div class="t">{1}{2}{3} ×{4}匹</div><button class="buy" data-deliver="{5}" {6}>納品</button><div class="s">{7}cm以上・鮮度{8}%以上・売値の{9}倍{10}<br>魚箱に条件に合う魚 <span class="num {11}">{12}/{13}</span>　期限 {14}日目まで</div></div>',
                [
                  ico(sp),
                  o.n,
                  o.g !== undefined
                    ? ` <span style="color:${GCOL[o.g]};font-weight:900">${GMARK[o.g]}</span>`
                    : '',
                  o.q,
                  o.id,
                  ok ? '' : 'disabled',
                  o.sz,
                  o.fr,
                  ordMul().toFixed(2),
                  feat('bait') ? T('・好物 {1}', [baitOf(sp).n]) : '',
                  ok ? 'up' : '',
                  Math.min(have, o.q),
                  o.q,
                  o.until
                ]
              );
            })
            .join('')
        ]
      );
}

function shippingSectionHtml(sc) {
  return T(
    '<div class="card" style="margin:10px 0 0;font-size:.82rem"><b>出荷先（高い魚から、直売所の枠→卸売市場の順に自動で回します）</b>\n      <div class="kv" style="margin-top:6px"><span>卸売市場</span><b>いつでも売れる</b><span style="grid-column:1/-1;color:var(--sub);font-size:.76rem">同じ魚を続けて売ると、1匹ごとに値崩れ（−{1}%・最大−{2}%）。翌朝には半分もどります。</span>\n      <span>直売所</span><b class="num">{3}</b><span style="grid-column:1/-1;color:var(--sub);font-size:.76rem">{4}</span></div></div>',
    [
      Math.round(SAT_STEP * 100),
      Math.round(SAT_MAX * 100),
      sc ? T('今日あと {1}/{2}匹', [stallLeft(), sc]) : T('未開設'),
      sc
        ? T('売値×{1}・値崩れしにくい（半分）。枠は直売所のレベルで増えます（1日 3＋2×Lv匹）。', [STALL_MUL])
        : T('「自宅・設備」タブで直売所を強化すると使えます。')
    ]
  );
}
